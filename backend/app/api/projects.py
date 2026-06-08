"""项目详情 + star 历史趋势 + 相似项目接口。"""
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, desc, case, or_
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Project, ProjectSnapshot
from app.schemas import ProjectDetailOut, SnapshotPoint, ProjectOut
from app.scorer.classify import category_name
from app.cache import cached

router = APIRouter(prefix="/api", tags=["projects"])


@router.get("/projects/{owner}/{name}", response_model=ProjectDetailOut)
def project_detail(owner: str, name: str, db: Session = Depends(get_db)):
    p = db.execute(
        select(Project).where(Project.full_name == f"{owner}/{name}")
    ).scalar_one_or_none()
    if p is None:
        raise HTTPException(404, "project not found")
    out = ProjectDetailOut.model_validate(p)
    out.category_name = category_name(p.category)
    return out


@router.get("/projects/{owner}/{name}/similar", response_model=list[ProjectOut])
def similar_projects(
    owner: str, name: str,
    limit: int = Query(6, le=20),
    db: Session = Depends(get_db),
):
    """相似项目：同领域优先、次同语言，按综合分降序（排除自身）。"""
    p = db.execute(
        select(Project.id, Project.category, Project.language)
        .where(Project.full_name == f"{owner}/{name}")
    ).first()
    if p is None:
        raise HTTPException(404, "project not found")
    if not p.category and not p.language:
        return []

    def loader():
        conds = []
        if p.category:
            conds.append(Project.category == p.category)
        if p.language:
            conds.append(Project.language == p.language)
        # 同领域排在同语言前面
        relevance = case((Project.category == p.category, 0), else_=1) if p.category else None
        stmt = (
            select(Project)
            .where(Project.id != p.id, Project.is_archived.is_(False), or_(*conds))
        )
        stmt = stmt.order_by(relevance, desc(Project.score)) if relevance is not None \
            else stmt.order_by(desc(Project.score))
        rows = db.execute(stmt.limit(limit)).scalars().all()
        return [ProjectOut.model_validate(r).model_dump(mode="json") for r in rows]

    return cached("similar", {"fn": f"{owner}/{name}", "limit": limit}, loader)


@router.get("/projects/{owner}/{name}/history", response_model=list[SnapshotPoint])
def project_history(
    owner: str, name: str,
    days: int = Query(90, le=365),
    db: Session = Depends(get_db),
):
    """返回 star 历史序列，供前端画趋势图。"""
    p = db.execute(
        select(Project.id).where(Project.full_name == f"{owner}/{name}")
    ).scalar_one_or_none()
    if p is None:
        raise HTTPException(404, "project not found")
    since = date.today() - timedelta(days=days)
    rows = db.execute(
        select(ProjectSnapshot.snapshot_date, ProjectSnapshot.stars, ProjectSnapshot.forks)
        .where(ProjectSnapshot.project_id == p, ProjectSnapshot.snapshot_date >= since)
        .order_by(ProjectSnapshot.snapshot_date)
    ).all()
    return [
        SnapshotPoint(date=r.snapshot_date, stars=r.stars, forks=r.forks)
        for r in rows
    ]
