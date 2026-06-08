"""管理后台只读看板（需 X-Admin-Token）。

供运维观测数据质量：采集日志、评分分布、分类/语言分布、僵尸数、配额。
"""
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, case
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Project, CollectLog
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
        "with_snapshots_pct": None,  # 留待快照积累后计算
    }
