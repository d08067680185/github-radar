"""隐私友好的轻量分析：记录 + 聚合「热门搜索 / 最多人看的项目」。

设计：无 cookie / 无 IP / 无任何 PII，只存 (kind, key, created_at)。
记录走 BackgroundTasks（独立 session，best-effort，绝不拖慢/打断请求）。
"""
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, func, desc, delete

from app.db import SessionLocal
from app.models import AnalyticsEvent, Project

logger = logging.getLogger(__name__)

KIND_SEARCH = "search"
KIND_REPO_VIEW = "repo_view"


def normalize_query(q: str) -> str:
    """搜索词归一化：小写、去首尾空格、限长，便于聚合。"""
    return (q or "").strip().lower()[:100]


def track(kind: str, key: str) -> None:
    """记录一条事件。自带 session，吞掉所有异常——分析失败绝不影响主流程。"""
    key = (key or "").strip()
    if not key:
        return
    try:
        db = SessionLocal()
        try:
            db.add(AnalyticsEvent(kind=kind, key=key[:200]))
            db.commit()
        finally:
            db.close()
    except Exception as e:  # noqa: BLE001
        logger.debug("analytics track 跳过：%s", e)


def top_searches(db, days: int = 7, limit: int = 10) -> list[dict]:
    """窗口内最热搜索词（按次数降序）。"""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    rows = db.execute(
        select(AnalyticsEvent.key, func.count().label("c"))
        .where(AnalyticsEvent.kind == KIND_SEARCH, AnalyticsEvent.created_at >= cutoff)
        .group_by(AnalyticsEvent.key)
        .order_by(desc("c"))
        .limit(limit)
    ).all()
    return [{"query": k, "count": c} for k, c in rows]


def top_repos(db, days: int = 7, limit: int = 10) -> list[Project]:
    """窗口内最多人看的项目（join 回 projects，未归档）。"""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    counts = (
        select(AnalyticsEvent.key, func.count().label("c"))
        .where(AnalyticsEvent.kind == KIND_REPO_VIEW, AnalyticsEvent.created_at >= cutoff)
        .group_by(AnalyticsEvent.key)
        .order_by(desc("c"))
        .limit(limit * 3)  # 多取些，过滤掉已不在库的旧项目后仍够数
        .subquery()
    )
    rows = db.execute(
        select(Project)
        .join(counts, counts.c.key == Project.full_name)
        .where(Project.is_archived.is_(False))
        .order_by(desc(counts.c.c))
        .limit(limit)
    ).scalars().all()
    return rows


def prune_old(db, days: int = 90) -> int:
    """清理超过 N 天的事件，控制表体积。返回删除行数。"""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    res = db.execute(delete(AnalyticsEvent).where(AnalyticsEvent.created_at < cutoff))
    db.commit()
    return res.rowcount or 0
