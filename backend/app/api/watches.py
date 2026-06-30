"""项目关注：关注 / 取消 / 列表 / 批量 id（均需登录）。"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, delete
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Project, WatchedProject, User
from app.schemas import ProjectOut
from app.auth import get_current_user

router = APIRouter(prefix="/api/me/watches", tags=["watches"])


def _resolve_project(db: Session, owner: str, name: str) -> Project:
    p = db.execute(
        select(Project).where(Project.full_name == f"{owner}/{name}")
    ).scalar_one_or_none()
    if p is None:
        raise HTTPException(404, "项目不存在")
    return p


@router.get("/ids", response_model=list[str])
def watch_ids(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """返回已关注项目的 full_name 列表（前端按钮状态用）。"""
    stmt = (
        select(Project.full_name)
        .join(WatchedProject, WatchedProject.project_id == Project.id)
        .where(WatchedProject.user_id == user.id)
    )
    return db.execute(stmt).scalars().all()


@router.get("", response_model=list[ProjectOut])
def list_watches(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
):
    """关注列表（含完整项目信息），按关注时间倒序。"""
    stmt = (
        select(Project)
        .join(WatchedProject, WatchedProject.project_id == Project.id)
        .where(WatchedProject.user_id == user.id)
        .order_by(WatchedProject.created_at.desc())
        .limit(limit).offset(offset)
    )
    return db.execute(stmt).scalars().all()


@router.post("/{owner}/{name}", status_code=201)
def watch(
    owner: str, name: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """关注项目（幂等）。"""
    p = _resolve_project(db, owner, name)
    exists = db.execute(
        select(WatchedProject).where(
            WatchedProject.user_id == user.id,
            WatchedProject.project_id == p.id,
        )
    ).scalar_one_or_none()
    if not exists:
        db.add(WatchedProject(user_id=user.id, project_id=p.id))
        db.commit()
    return {"status": "ok", "full_name": p.full_name}


@router.delete("/{owner}/{name}", status_code=204)
def unwatch(
    owner: str, name: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """取消关注。"""
    p = _resolve_project(db, owner, name)
    db.execute(
        delete(WatchedProject).where(
            WatchedProject.user_id == user.id,
            WatchedProject.project_id == p.id,
        )
    )
    db.commit()
