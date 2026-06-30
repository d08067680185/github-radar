"""管理后台只读看板（需 X-Admin-Token）。

供运维观测数据质量：采集日志、评分分布、分类/语言分布、僵尸数、配额。
"""
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, case
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Project, CollectLog, ProjectSnapshot, Subscriber, AnalyticsEvent
from app.auth import require_admin

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


@router.get("/logs")
def recent_logs(db: Session = Depends(get_db), limit: int = Query(30, le=200)):
    """最近的采集/评分/清理日志。"""
    rows = db.execute(
        select(CollectLog).order_by(CollectLog.id.desc()).limit(limit)
    ).scalars().all()
    return [
        {"id": r.id, "task": r.task, "status": r.status,
         "repos": r.repos_affected, "detail": r.detail,
         "at": r.created_at.isoformat() if r.created_at else None}
        for r in rows
    ]


@router.get("/quality")
def data_quality(db: Session = Depends(get_db)):
    """数据质量总览。"""
    total = db.execute(select(func.count()).select_from(Project)).scalar_one()

    # 评分分布（分桶）
    bucket = case(
        (Project.score >= 90, "90-100"),
        (Project.score >= 70, "70-89"),
        (Project.score >= 50, "50-69"),
        else_="<50",
    )
    score_dist = dict(
        db.execute(select(bucket, func.count()).group_by(bucket)).all()
    )

    by_category = dict(
        db.execute(
            select(Project.category, func.count())
            .group_by(Project.category).order_by(func.count().desc())
        ).all()
    )
    by_language = dict(
        db.execute(
            select(Project.language, func.count())
            .where(Project.language.is_not(None))
            .group_by(Project.language).order_by(func.count().desc()).limit(10)
        ).all()
    )

    # 僵尸数（>30天未见）+ 最近各任务运行
    stale_cut = datetime.now(timezone.utc) - timedelta(days=30)
    stale = db.execute(
        select(func.count()).select_from(Project).where(Project.last_seen_at < stale_cut)
    ).scalar_one()

    last_runs = {}
    for task in ("discover", "snapshot", "score", "prune"):
        row = db.execute(
            select(CollectLog.created_at, CollectLog.status)
            .where(CollectLog.task == task).order_by(CollectLog.id.desc()).limit(1)
        ).first()
        last_runs[task] = (
            {"at": row.created_at.isoformat(), "status": row.status} if row else None
        )

    # 数据覆盖率
    unclassified = db.execute(
        select(func.count()).select_from(Project).where(
            (Project.category.is_(None)) | (Project.category == "")
        )
    ).scalar_one()
    unclassified_pct = round(unclassified / total * 100, 1) if total else 0

    with_summary = db.execute(
        select(func.count()).select_from(Project).where(Project.readme_summary.is_not(None))
    ).scalar_one()
    ai_summary_coverage = round(with_summary / total * 100, 1) if total else 0

    # 有 ≥7 条快照的项目数（使用子查询）
    snap_subq = (
        select(ProjectSnapshot.project_id, func.count().label("cnt"))
        .group_by(ProjectSnapshot.project_id)
        .having(func.count() >= 7)
        .subquery()
    )
    with_7snap = db.execute(select(func.count()).select_from(snap_subq)).scalar_one()
    snapshot_coverage_7d = round(with_7snap / total * 100, 1) if total else 0

    # 订阅者统计
    active_subscribers = db.execute(
        select(func.count()).select_from(Subscriber).where(Subscriber.active.is_(True))
    ).scalar_one()
    week_cut = datetime.now(timezone.utc) - timedelta(days=7)
    new_subscribers_7d = db.execute(
        select(func.count()).select_from(Subscriber).where(Subscriber.created_at >= week_cut)
    ).scalar_one()

    return {
        "total_projects": total,
        "score_distribution": score_dist,
        "by_category": by_category,
        "top_languages": by_language,
        "stale_projects": stale,
        "last_runs": last_runs,
        "archived": db.execute(
            select(func.count()).select_from(Project).where(Project.is_archived.is_(True))
        ).scalar_one(),
        "unclassified_pct": unclassified_pct,
        "ai_summary_coverage": ai_summary_coverage,
        "snapshot_coverage_7d": snapshot_coverage_7d,
        "active_subscribers": active_subscribers,
        "new_subscribers_7d": new_subscribers_7d,
    }


@router.get("/analytics-summary")
def analytics_summary(db: Session = Depends(get_db)):
    """分析数据概览：近7天搜索量、浏览量、Top10搜索词、Hot项目。"""
    week_cut = datetime.now(timezone.utc) - timedelta(days=7)

    total_searches_7d = db.execute(
        select(func.count()).select_from(AnalyticsEvent).where(
            AnalyticsEvent.kind == "search",
            AnalyticsEvent.created_at >= week_cut,
        )
    ).scalar_one()

    total_views_7d = db.execute(
        select(func.count()).select_from(AnalyticsEvent).where(
            AnalyticsEvent.kind == "repo_view",
            AnalyticsEvent.created_at >= week_cut,
        )
    ).scalar_one()

    top_searches = db.execute(
        select(AnalyticsEvent.key, func.count().label("cnt"))
        .where(AnalyticsEvent.kind == "search", AnalyticsEvent.created_at >= week_cut)
        .group_by(AnalyticsEvent.key)
        .order_by(func.count().desc())
        .limit(10)
    ).all()

    top_repos = db.execute(
        select(AnalyticsEvent.key, func.count().label("cnt"))
        .where(AnalyticsEvent.kind == "repo_view", AnalyticsEvent.created_at >= week_cut)
        .group_by(AnalyticsEvent.key)
        .order_by(func.count().desc())
        .limit(10)
    ).all()

    return {
        "total_searches_7d": total_searches_7d,
        "total_views_7d": total_views_7d,
        "top_searches": [{"key": r.key, "count": r.cnt} for r in top_searches],
        "top_repos": [{"key": r.key, "count": r.cnt} for r in top_repos],
    }
