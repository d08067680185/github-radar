"""搜索 + 多条件筛选接口。"""
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import select, desc, or_, func
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Project
from app.schemas import ProjectOut

router = APIRouter(prefix="/api", tags=["search"])

_SORT_FIELDS = {
    "score": Project.score,
    "growth": Project.growth_score,
    "stars": Project.stars,
    "activity": Project.activity_score,
}


def _apply_filters(stmt, q, language, category, min_stars):
    if q:
        pattern = f"%{q.lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(Project.full_name).like(pattern),
                func.lower(Project.description).like(pattern),
                func.lower(func.array_to_string(Project.topics, " ")).like(pattern),
            )
        )
    if language:
        stmt = stmt.where(Project.language == language)
    if category:
        stmt = stmt.where(Project.category == category)
    if min_stars:
        stmt = stmt.where(Project.stars >= min_stars)
    return stmt


@router.get("/search", response_model=list[ProjectOut])
def search(
    response: Response,
    db: Session = Depends(get_db),
    q: str | None = Query(None, max_length=100, description="关键词：匹配名称/描述/topics"),
    language: str | None = Query(None),
    category: str | None = Query(None),
    min_stars: int = Query(0, ge=0),
    sort: str = Query("score", pattern="^(score|growth|stars|activity)$"),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
):
    base = _apply_filters(
        select(Project).where(Project.is_archived.is_(False)), q, language, category, min_stars
    )
    total = db.execute(
        _apply_filters(
            select(func.count()).select_from(Project).where(Project.is_archived.is_(False)),
            q, language, category, min_stars,
        )
    ).scalar_one()
    response.headers["X-Total-Count"] = str(total)

    stmt = base.order_by(desc(_SORT_FIELDS[sort])).offset(offset).limit(limit)
    return db.execute(stmt).scalars().all()
