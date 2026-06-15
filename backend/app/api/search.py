"""搜索 + 多条件筛选接口。"""
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import select, desc, or_, func
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Project
from app.schemas import ProjectOut, SuggestOut
from app.cache import cached

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


@router.get("/search/suggest", response_model=list[SuggestOut])
def suggest(
    db: Session = Depends(get_db),
    q: str = Query(..., min_length=1, max_length=60, description="自动补全前缀/子串"),
    limit: int = Query(8, le=20),
):
    """搜索自动补全：按 full_name 匹配，名称前缀命中优先、再按 score。结果缓存。

    优先「名称以 q 开头」（最相关），其次「名称包含 q」，最后描述包含 q。
    """
    ql = q.strip().lower()
    if not ql:
        return []

    def loader():
        starts = f"{ql}%"
        contains = f"%{ql}%"
        # 相关性：name 前缀=0，full_name 包含=1，其余=2
        from sqlalchemy import case
        relevance = case(
            (func.lower(Project.name).like(starts), 0),
            (func.lower(Project.full_name).like(contains), 1),
            else_=2,
        )
        stmt = (
            select(Project.full_name, Project.stars, Project.language, Project.category)
            .where(
                Project.is_archived.is_(False),
                or_(
                    func.lower(Project.full_name).like(contains),
                    func.lower(Project.description).like(contains),
                ),
            )
            .order_by(relevance, desc(Project.score))
            .limit(limit)
        )
        rows = db.execute(stmt).all()
        return [
            {"full_name": r.full_name, "stars": r.stars,
             "language": r.language, "category": r.category}
            for r in rows
        ]

    return cached("suggest", {"q": ql, "limit": limit}, loader, ttl=600)


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
