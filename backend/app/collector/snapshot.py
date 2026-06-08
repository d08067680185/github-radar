"""每日快照：把当前 star/fork/issue 数写入 project_snapshots。

系统护城河 —— 越早开始攒，趋势数据越值钱。每天每项目一条，幂等。
"""
import logging
from datetime import date

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.models import Project, ProjectSnapshot, CollectLog

logger = logging.getLogger(__name__)


def take_snapshots(db: Session, snapshot_date: date | None = None) -> int:
    """为所有项目写当日快照（幂等：同日重复跑则覆盖）。"""
    snapshot_date = snapshot_date or date.today()
    projects = db.query(
        Project.id, Project.stars, Project.forks,
        Project.open_issues, Project.contributors,
    ).all()

    count = 0
    for p in projects:
        stmt = pg_insert(ProjectSnapshot).values(
            project_id=p.id,
            snapshot_date=snapshot_date,
            stars=p.stars,
            forks=p.forks,
            open_issues=p.open_issues,
            contributors=p.contributors or 0,
        ).on_conflict_do_update(
            constraint="uq_snapshot_project_date",
            set_={
                "stars": p.stars,
                "forks": p.forks,
                "open_issues": p.open_issues,
                "contributors": p.contributors or 0,
            },
        )
        db.execute(stmt)
        count += 1

    db.add(CollectLog(task="snapshot", status="ok", repos_affected=count,
                      detail=str(snapshot_date)))
    db.commit()
    logger.info("snapshot 完成，写入 %d 条（%s）", count, snapshot_date)
    return count
