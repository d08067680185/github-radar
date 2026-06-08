"""收藏：增 / 删 / 查（均需登录）。"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, delete
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Project, Favorite, User
from app.schemas import ProjectOut, FavoriteIn
from app.auth import get_current_user

router = APIRouter(prefix="/api/favorites", tags=["favorites"])


def _resolve_project(db: Session, full_name: str) -> Project:
    p = db.execute(select(Project).where(Project.full_name == full_name)).scalar_one_or_none()
    if p is None:
        raise HTTPException(404, "项目不存在")
    return p


@router.get("", response_model=list[ProjectOut])
def list_favorites(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    stmt = (
        select(Project)
        .join(Favorite, Favorite.project_id == Project.id)
        .where(Favorite.user_id == user.id)
        .order_by(Favorite.created_at.desc())
    )
    return db.execute(stmt).scalars().all()


@router.get("/ids", response_model=list[str])
def favorite_ids(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """返回已收藏项目的 full_name 列表（前端高亮收藏按钮用）。"""
    stmt = (
        select(Project.full_name)
        .join(Favorite, Favorite.project_id == Project.id)
        .where(Favorite.user_id == user.id)
    )
    return db.execute(stmt).scalars().all()


@router.post("", status_code=201)
def add_favorite(
    body: FavoriteIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    p = _resolve_project(db, body.full_name)
    exists = db.execute(
        select(Favorite).where(Favorite.user_id == user.id, Favorite.project_id == p.id)
    ).scalar_one_or_none()
    if not exists:
        db.add(Favorite(user_id=user.id, project_id=p.id))
        db.commit()
    return {"status": "ok", "full_name": body.full_name}


@router.delete("/{owner}/{name}", status_code=204)
def remove_favorite(
    owner: str, name: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    p = _resolve_project(db, f"{owner}/{name}")
    db.execute(
        delete(Favorite).where(Favorite.user_id == user.id, Favorite.project_id == p.id)
    )
    db.commit()
