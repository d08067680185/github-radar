"""发现新项目并 upsert 入库。

多维度发现：合并三路候选池，互补覆盖（按 github_id 去重）
  1. head   头部按 star —— 全站最高星，长期靠谱
  2. rising 新秀 —— 近期创建已有 star，成长快的黑马
  3. active 活跃中小 —— star 中小但近期持续更新，潜力股
"""
import logging
from datetime import datetime, date, timedelta, timezone

from sqlalchemy import delete, select, func
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Project, CollectLog
from app.collector.github_client import GitHubClient

logger = logging.getLogger(__name__)


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    # GitHub 返回 ISO8601，如 2024-01-02T03:04:05Z
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


# 入库时需要做时间字段解析的列
_DT_FIELDS = ("created_at", "pushed_at", "last_release_at")


def discover(db: Session, min_stars: int | None = None, max_repos: int | None = None) -> int:
    """拉取热门仓库并 upsert。返回处理的仓库数。"""
    min_stars = min_stars or settings.discover_min_stars
    max_repos = max_repos or settings.discover_max_repos

    today = date.today()
    rising_since = (today - timedelta(days=settings.discover_rising_days)).isoformat()
    active_since = (today - timedelta(days=settings.discover_active_days)).isoformat()

    client = GitHubClient()
    try:
        # 三路发现，按 github_id 合并去重
        merged: dict[int, dict] = {}
        breakdown: dict[str, int] = {}

        strategies = [
            ("head", dict(min_stars=min_stars, max_total=max_repos)),
            ("rising", dict(min_stars=min_stars, max_total=settings.discover_rising_max,
                            extra_q=f"created:>={rising_since}")),
            ("active", dict(min_stars=min_stars, max_total=settings.discover_active_max,
                            extra_q=f"pushed:>={active_since}",
                            star_max=settings.discover_active_star_max)),
        ]
        for name, kwargs in strategies:
            found = client.search_repos_sharded(**kwargs)
            new = sum(1 for r in found if r["github_id"] not in merged)
            for r in found:
                merged[r["github_id"]] = r
            breakdown[name] = len(found)
            logger.info("策略 %s：抓 %d 个（新增 %d）", name, len(found), new)

        repos = list(merged.values())
        quota = client.quota_remaining
    except Exception as e:
        db.add(CollectLog(task="discover", status="error", detail=str(e)[:1000]))
        db.commit()
        raise
    finally:
        client.close()

    now = datetime.now(timezone.utc)
    count = 0
    for r in repos:
        row = dict(r)
        for f in _DT_FIELDS:
            row[f] = _parse_dt(row.get(f))
        row["last_seen_at"] = now  # 本次命中 → 刷新存活时间戳

        stmt = pg_insert(Project).values(**row)
        # 已存在则更新变动字段（不动 score，由评分任务负责）
        update_cols = {
            c: stmt.excluded[c]
            for c in (
                "full_name", "owner", "name", "description", "homepage",
                "language", "topics", "license", "stars", "forks",
                "watchers", "open_issues", "is_archived",
                "created_at", "pushed_at", "last_release_at", "last_seen_at",
            )
        }
        stmt = stmt.on_conflict_do_update(
            index_elements=["github_id"], set_=update_cols
        )
        db.execute(stmt)
        count += 1

    bd = ", ".join(f"{k}={v}" for k, v in breakdown.items())
    db.add(CollectLog(
        task="discover", status="ok", repos_affected=count,
        detail=f"[{bd}] 合并去重={count}, min_stars={min_stars}, quota_left={quota}",
    ))
    db.commit()
    logger.info("discover 完成：三路合并去重后 %d 个（%s，剩余配额 %s）", count, bd, quota)
    return count


def prune_stale(db: Session, stale_days: int | None = None) -> int:
    """清理僵尸项目：超过 N 天未被任何发现策略命中（删除/转移/长期跌出阈值）。

    防止库随时间腐烂。返回删除条数。安全阀：只在库里有足量数据时才清，
    避免某次 discover 异常导致 last_seen 未刷新而误删。
    """
    stale_days = stale_days or settings.discover_stale_days
    cutoff = datetime.now(timezone.utc) - timedelta(days=stale_days)

    total = db.execute(select(func.count()).select_from(Project)).scalar_one()
    stale_count = db.execute(
        select(func.count()).select_from(Project).where(Project.last_seen_at < cutoff)
    ).scalar_one()

    # 安全阀：若"僵尸"占比 > 50%，多半是采集出问题而非真僵尸，不删，仅告警
    if total > 0 and stale_count / total > 0.5:
        logger.warning("prune 中止：僵尸占比 %.0f%% 过高，疑似采集异常", stale_count / total * 100)
        db.add(CollectLog(task="prune", status="error",
                          detail=f"aborted: stale {stale_count}/{total} too high"))
        db.commit()
        return 0

    db.execute(delete(Project).where(Project.last_seen_at < cutoff))
    db.add(CollectLog(task="prune", status="ok", repos_affected=stale_count,
                      detail=f"removed stale (> {stale_days}d unseen)"))
    db.commit()
    logger.info("prune 完成：清理 %d 个僵尸项目（>%d 天未见）", stale_count, stale_days)
    return stale_count
