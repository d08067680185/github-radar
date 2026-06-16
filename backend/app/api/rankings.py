"""榜单接口：综合优质榜 + Trending 榜。结果走 Redis 缓存。"""
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import select, desc, func
from sqlalchemy.orm import Session

from sqlalchemy.orm import aliased

from app.db import get_db
from app.models import Project, CollectLog, ProjectSnapshot
from app.schemas import ProjectOut, CategoryOut, MapNodeOut, MoverOut
from app.scorer.classify import all_categories
from app.cache import cached

router = APIRouter(prefix="/api", tags=["rankings"])


def _base_query(language: str | None, category: str | None):
    stmt = select(Project).where(Project.is_archived.is_(False))
    if language:
        stmt = stmt.where(Project.language == language)
    if category:
        stmt = stmt.where(Project.category == category)
    return stmt


def _count(db: Session, language: str | None, category: str | None) -> int:
    """匹配条件的总数（缓存），用于翻页。"""
    def loader():
        stmt = select(func.count()).select_from(Project).where(Project.is_archived.is_(False))
        if language:
            stmt = stmt.where(Project.language == language)
        if category:
            stmt = stmt.where(Project.category == category)
        return db.execute(stmt).scalar_one()
    return cached("count", {"lang": language, "cat": category}, loader)


def _serialize(projects) -> list[dict]:
    return [ProjectOut.model_validate(p).model_dump(mode="json") for p in projects]


@router.get("/rankings/top", response_model=list[ProjectOut])
def top_ranking(
    response: Response,
    db: Session = Depends(get_db),
    language: str | None = Query(None),
    category: str | None = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
):
    """综合优质榜：按 score 降序（长期靠谱）。总数见 X-Total-Count 头。"""
    def loader():
        stmt = (
            _base_query(language, category)
            .order_by(desc(Project.score)).offset(offset).limit(limit)
        )
        return _serialize(db.execute(stmt).scalars().all())
    response.headers["X-Total-Count"] = str(_count(db, language, category))
    return cached("top", {"lang": language, "cat": category, "limit": limit, "off": offset}, loader)


@router.get("/rankings/trending", response_model=list[ProjectOut])
def trending_ranking(
    response: Response,
    db: Session = Depends(get_db),
    language: str | None = Query(None),
    category: str | None = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
):
    """Trending 榜：按 growth_score 降序（正在火）。总数见 X-Total-Count 头。"""
    def loader():
        stmt = (
            _base_query(language, category)
            .order_by(desc(Project.growth_score), desc(Project.score))
            .offset(offset).limit(limit)
        )
        return _serialize(db.execute(stmt).scalars().all())
    response.headers["X-Total-Count"] = str(_count(db, language, category))
    return cached("trending", {"lang": language, "cat": category, "limit": limit, "off": offset}, loader)


@router.get("/rankings/rising", response_model=list[ProjectOut])
def rising_stars(
    response: Response,
    db: Session = Depends(get_db),
    days: int = Query(90, ge=7, le=365),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
):
    """本周新星：近 days 天创建的新项目，按 growth+score 排序（专题页用）。"""
    from datetime import datetime, timedelta, timezone
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    def loader():
        stmt = (
            select(Project)
            .where(Project.is_archived.is_(False), Project.created_at >= cutoff)
            .order_by(desc(Project.growth_score), desc(Project.score))
            .offset(offset).limit(limit)
        )
        return _serialize(db.execute(stmt).scalars().all())

    def count_loader():
        return db.execute(
            select(func.count()).select_from(Project)
            .where(Project.is_archived.is_(False), Project.created_at >= cutoff)
        ).scalar_one()

    response.headers["X-Total-Count"] = str(
        cached("rising_count", {"days": days}, count_loader)
    )
    return cached("rising", {"days": days, "limit": limit, "off": offset}, loader)


def _movers_span(cutoff):
    """[今天-days, 今天] 窗口内每个项目的最早/最晚快照日。"""
    return (
        select(
            ProjectSnapshot.project_id.label("pid"),
            func.min(ProjectSnapshot.snapshot_date).label("d0"),
            func.max(ProjectSnapshot.snapshot_date).label("d1"),
        )
        .where(ProjectSnapshot.snapshot_date >= cutoff)
        .group_by(ProjectSnapshot.project_id)
        .subquery()
    )


@router.get("/rankings/movers", response_model=list[MoverOut])
def movers(
    response: Response,
    db: Session = Depends(get_db),
    days: int = Query(7, ge=1, le=90),
    limit: int = Query(10, le=100),
    offset: int = Query(0, ge=0),
):
    """上升最快：窗口内 star 绝对增量最大的项目（首页模块 + Trending 时间窗）。

    取每个项目在 [今天-days, 今天] 窗口内最早/最晚两条快照，算 star 净增。
    需要至少两天快照（冷启动只有单日时返回空）。总数见 X-Total-Count。
    """
    from datetime import date, timedelta
    cutoff = date.today() - timedelta(days=days)

    def count_loader():
        span = _movers_span(cutoff)
        s0 = aliased(ProjectSnapshot)
        s1 = aliased(ProjectSnapshot)
        gain = s1.stars - s0.stars
        return db.execute(
            select(func.count())
            .select_from(Project)
            .join(span, span.c.pid == Project.id)
            .join(s0, (s0.project_id == span.c.pid) & (s0.snapshot_date == span.c.d0))
            .join(s1, (s1.project_id == span.c.pid) & (s1.snapshot_date == span.c.d1))
            .where(Project.is_archived.is_(False), span.c.d1 > span.c.d0, gain > 0)
        ).scalar_one()

    def loader():
        span = _movers_span(cutoff)
        s0 = aliased(ProjectSnapshot)
        s1 = aliased(ProjectSnapshot)
        gain = (s1.stars - s0.stars).label("gain")
        stmt = (
            select(Project, s0.stars.label("then"), s1.stars.label("now"))
            .join(span, span.c.pid == Project.id)
            .join(s0, (s0.project_id == span.c.pid) & (s0.snapshot_date == span.c.d0))
            .join(s1, (s1.project_id == span.c.pid) & (s1.snapshot_date == span.c.d1))
            .where(Project.is_archived.is_(False), span.c.d1 > span.c.d0, gain > 0)
            .order_by(desc(gain))
            .offset(offset).limit(limit)
        )
        out = []
        for p, then, now in db.execute(stmt).all():
            d = ProjectOut.model_validate(p).model_dump(mode="json")
            d["star_gain"] = now - then
            d["gain_pct"] = round((now - then) / then * 100, 2) if then else 0.0
            d["window_days"] = days
            out.append(d)
        return out

    response.headers["X-Total-Count"] = str(cached("movers_count", {"days": days}, count_loader))
    return cached("movers", {"days": days, "limit": limit, "off": offset}, loader)


@router.get("/languages", response_model=list[str])
def languages(db: Session = Depends(get_db)):
    """已收录的语言列表（用于前端筛选）。"""
    def loader():
        rows = db.execute(
            select(Project.language).where(Project.language.is_not(None)).distinct()
        ).scalars().all()
        return sorted(rows)
    return cached("languages", {}, loader)


@router.get("/map", response_model=list[MapNodeOut])
def map_nodes(db: Session = Depends(get_db), limit: int = Query(400, le=800)):
    """气泡星系地图节点：按 score 降序取头部 N 个精简节点（缓存）。"""
    def loader():
        rows = db.execute(
            select(
                Project.full_name, Project.stars, Project.score,
                Project.growth_score, Project.category, Project.language,
            )
            .where(Project.is_archived.is_(False))
            .order_by(desc(Project.score))
            .limit(limit)
        ).all()
        return [
            {"full_name": r.full_name, "stars": r.stars, "score": float(r.score),
             "growth_score": float(r.growth_score), "category": r.category,
             "language": r.language}
            for r in rows
        ]
    return cached("map", {"limit": limit}, loader)


@router.get("/stats")
def stats(db: Session = Depends(get_db)):
    """站点总览统计（首页 Hero 用）。"""
    def loader():
        total = db.execute(
            select(func.count()).select_from(Project).where(Project.is_archived.is_(False))
        ).scalar_one()
        langs = db.execute(
            select(func.count(func.distinct(Project.language))).where(Project.language.is_not(None))
        ).scalar_one()
        cats = db.execute(
            select(func.count(func.distinct(Project.category))).where(Project.category.is_not(None))
        ).scalar_one()
        max_stars = db.execute(select(func.max(Project.stars))).scalar_one() or 0
        updated = db.execute(
            select(func.max(CollectLog.created_at)).where(
                CollectLog.task == "score", CollectLog.status == "ok"
            )
        ).scalar_one_or_none()
        return {
            "projects": total, "languages": langs, "categories": cats,
            "max_stars": max_stars,
            "updated_at": updated.isoformat() if updated else None,
        }
    return cached("stats", {}, loader)


@router.get("/languages/stats", response_model=list[CategoryOut])
def language_stats(db: Session = Depends(get_db)):
    """各语言项目数（按数量降序），用于语言页展示。复用 CategoryOut(slug=name)。"""
    def loader():
        rows = db.execute(
            select(Project.language, func.count())
            .where(Project.language.is_not(None), Project.is_archived.is_(False))
            .group_by(Project.language)
            .order_by(func.count().desc())
        ).all()
        return [CategoryOut(slug=lang, name=lang, count=n).model_dump() for lang, n in rows]
    return cached("lang_stats", {}, loader)


@router.get("/categories", response_model=list[CategoryOut])
def categories(db: Session = Depends(get_db)):
    """领域分类列表 + 各分类项目数（用于导航/子榜）。"""
    def loader():
        counts = dict(
            db.execute(
                select(Project.category, func.count())
                .where(Project.category.is_not(None))
                .group_by(Project.category)
            ).all()
        )
        return [
            CategoryOut(slug=c["slug"], name=c["name"], count=counts.get(c["slug"], 0)).model_dump()
            for c in all_categories()
        ]
    return cached("categories", {}, loader)
