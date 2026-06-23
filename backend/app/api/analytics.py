"""公开分析读端点：热门搜索 + 最多人看的项目（缓存，供首页「本周热门」板块）。"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas import ProjectOut, TopSearchOut
from app.cache import cached
from app.analytics import top_searches, top_repos

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/top-searches", response_model=list[TopSearchOut])
def get_top_searches(
    db: Session = Depends(get_db),
    days: int = Query(7, ge=1, le=90),
    limit: int = Query(10, ge=1, le=30),
):
    def loader():
        return [TopSearchOut(**r).model_dump() for r in top_searches(db, days, limit)]
    return cached("top_searches", {"d": days, "l": limit}, loader, ttl=1800)


@router.get("/top-repos", response_model=list[ProjectOut])
def get_top_repos(
    db: Session = Depends(get_db),
    days: int = Query(7, ge=1, le=90),
    limit: int = Query(10, ge=1, le=30),
):
    def loader():
        return [ProjectOut.model_validate(p).model_dump() for p in top_repos(db, days, limit)]
    return cached("top_repos", {"d": days, "l": limit}, loader, ttl=1800)
