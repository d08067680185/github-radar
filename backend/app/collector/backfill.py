"""回填历史 star 数据：用 stargazers API 的 starred_at 重建过去的 star 曲线。

原理：GET /repos/{owner}/{name}/stargazers?per_page=100&page=p
（Accept: application/vnd.github.star+json）返回每个 star 的时间戳，
第 p 页第一条对应「第 (p-1)*100 个 star 的时刻」。
按页均匀采样 → 得到 (时间, star数) 曲线 → 线性插值出每周点位 → 写入 project_snapshots。

限制：API 只能访问前 400 页（4 万 star），所以只给 stars<=40000 的项目回填——
中小/新项目恰是趋势数据最有价值的人群。幂等：on conflict do nothing，不覆盖真实快照。
"""
import logging
import time
from bisect import bisect_left
from datetime import datetime, date, timedelta, timezone

import httpx
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Project, ProjectSnapshot, CollectLog

logger = logging.getLogger(__name__)

API = "https://api.github.com"
MAX_PAGE = 400          # stargazers API 硬上限（400页×100=4万 star）
SAMPLES = 14            # 每项目采样页数（≈14 次请求）
BACKFILL_DAYS = 365     # 回填过去一年
POINT_STEP_DAYS = 7     # 每周一个点位


def _sample_pages(total_pages: int, n: int = SAMPLES) -> list[int]:
    """1..total_pages 均匀取 n 页（含首尾，去重保序）。"""
    if total_pages <= n:
        return list(range(1, total_pages + 1))
    step = (total_pages - 1) / (n - 1)
    return sorted({round(1 + i * step) for i in range(n)})


def _fetch_star_curve(
    client: httpx.Client, full_name: str, stars: int, token: str
) -> list[tuple[datetime, int]]:
    """采样 stargazers 页，返回升序 (时刻, 累计star数) 曲线。失败返回空。"""
    total_pages = min((stars + 99) // 100, MAX_PAGE)
    if total_pages < 2:
        return []
    points: list[tuple[datetime, int]] = []
    for page in _sample_pages(total_pages):
        try:
            resp = client.get(
                f"{API}/repos/{full_name}/stargazers",
                params={"per_page": 100, "page": page},
                headers={
                    "Authorization": f"Bearer {token}",
                    "Accept": "application/vnd.github.star+json",
                },
            )
            if resp.status_code in (403, 429):
                wait = int(resp.headers.get("retry-after", "10"))
                logger.warning("%s 限流，等待 %ds", full_name, min(wait, 60))
                time.sleep(min(wait, 60))
                resp = client.get(
                    f"{API}/repos/{full_name}/stargazers",
                    params={"per_page": 100, "page": page},
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Accept": "application/vnd.github.star+json",
                    },
                )
            resp.raise_for_status()
            rows = resp.json()
            if not rows:
                continue
            ts = datetime.fromisoformat(rows[0]["starred_at"].replace("Z", "+00:00"))
            points.append((ts, (page - 1) * 100))
        except Exception as e:
            logger.warning("%s 第 %d 页抓取失败：%s", full_name, page, e)
            continue
    points.sort()
    # 终点：现在 = 当前 star 数
    points.append((datetime.now(timezone.utc), stars))
    return points


def _interpolate(curve: list[tuple[datetime, int]], at: datetime) -> int | None:
    """曲线内线性插值；at 超出曲线范围返回 None（不外推，宁缺毋滥）。"""
    if not curve or at < curve[0][0] or at > curve[-1][0]:
        return None
    keys = [p[0] for p in curve]
    i = bisect_left(keys, at)
    if i == 0:
        return curve[0][1]
    (t0, v0), (t1, v1) = curve[i - 1], curve[i]
    if t1 == t0:
        return v1
    frac = (at - t0).total_seconds() / (t1 - t0).total_seconds()
    return round(v0 + frac * (v1 - v0))


def backfill(db: Session, top_n: int = 100, max_stars: int = 40000) -> int:
    """给 score 最高且 stars<=max_stars 的 top_n 个项目回填周度历史快照。

    返回写入的快照条数。幂等：已有同日快照的不覆盖。
    """
    tokens = settings.token_list
    if not tokens:
        raise RuntimeError("未配置 GITHUB_TOKENS")

    projects = db.execute(
        select(Project)
        .where(Project.is_archived.is_(False),
               Project.stars > 200, Project.stars <= max_stars)
        .order_by(Project.score.desc())
        .limit(top_n)
    ).scalars().all()

    now = datetime.now(timezone.utc)
    targets = [
        now - timedelta(days=d)
        for d in range(POINT_STEP_DAYS, BACKFILL_DAYS + 1, POINT_STEP_DAYS)
    ]

    written = 0
    with httpx.Client(timeout=30.0) as client:
        for idx, p in enumerate(projects):
            token = tokens[idx % len(tokens)]
            curve = _fetch_star_curve(client, p.full_name, p.stars, token)
            if len(curve) < 3:
                continue
            rows = []
            for at in targets:
                v = _interpolate(curve, at)
                if v is None or v <= 0:
                    continue
                rows.append({
                    "project_id": p.id,
                    "snapshot_date": at.date(),
                    "stars": v,
                    # 历史 fork/issue 无法重建，置 0（趋势图只用 stars）
                    "forks": 0,
                    "open_issues": 0,
                })
            if rows:
                stmt = pg_insert(ProjectSnapshot).values(rows).on_conflict_do_nothing(
                    constraint="uq_snapshot_project_date"
                )
                res = db.execute(stmt)
                # executemany 下 rowcount 可能为 -1，按提交行数计
                written += res.rowcount if (res.rowcount or 0) > 0 else len(rows)
                db.commit()
            if (idx + 1) % 10 == 0:
                logger.info("回填进度 %d/%d（已写 %d 条）", idx + 1, len(projects), written)

    db.add(CollectLog(task="backfill", status="ok", repos_affected=len(projects),
                      detail=f"wrote {written} weekly snapshots (top {top_n}, <= {max_stars} stars)"))
    db.commit()
    logger.info("backfill 完成：%d 个项目，写入 %d 条历史快照", len(projects), written)
    return written
