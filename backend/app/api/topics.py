"""按 GitHub topic 浏览：热门 topic 聚合 + 单 topic 项目榜。

topic 存在 Project.topics（ARRAY）里，比 11 个领域分类更细，
适合做大量发现入口 + SEO 落地页。结果走 Redis 缓存。
"""
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import select, desc, func
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Project
from app.schemas import ProjectOut, CategoryOut
from app.cache import cached

router = APIRouter(prefix="/api", tags=["topics"])


@router.get("/topics", response_model=list[CategoryOut])
def topics(db: Session = Depends(get_db), limit: int = Query(60, le=200)):
    """热门 topic + 项目数（按数量降序）。复用 CategoryOut(slug=name=topic)。"""
    def loader():
        unnested = (
            select(func.unnest(Project.topics).label("topic"))
            .where(Project.is_archived.is_(False))
            .subquery()
        )
        rows = db.execute(
            select(unnested.c.topic, func.count().label("n"))
            .group_by(unnested.c.topic)
            .order_by(desc("n"))
            .limit(limit)
        ).all()
        return [CategoryOut(slug=tp, name=tp, count=n).model_dump() for tp, n in rows]
    return cached("topics", {"limit": limit}, loader)


@router.get("/topic/{topic}", response_model=list[ProjectOut])
def topic_projects(
    topic: str,
    response: Response,
    db: Session = Depends(get_db),
    limit: int = Query(30, le=200),
    offset: int = Query(0, ge=0),
):
    """带某 topic 的项目，按综合分降序。总数见 X-Total-Count。"""
    def count_loader():
        return db.execute(
            select(func.count()).select_from(Project)
            .where(Project.is_archived.is_(False), Project.topics.any(topic))
        ).scalar_one()

    def loader():
        rows = db.execute(
            select(Project)
            .where(Project.is_archived.is_(False), Project.topics.any(topic))
            .order_by(desc(Project.score))
            .offset(offset).limit(limit)
        ).scalars().all()
        return [ProjectOut.model_validate(p).model_dump(mode="json") for p in rows]

    response.headers["X-Total-Count"] = str(cached("topic_count", {"t": topic}, count_loader))
    return cached("topic", {"t": topic, "limit": limit, "off": offset}, loader)
