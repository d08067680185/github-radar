"""公开收藏集分享：把整个收藏夹发布成一个公开页（tags 作分区、note 作点评）。

- `/api/me/share`（需登录）：读 / 改自己的分享设置（开关 + 标题，slug 一经生成即稳定）。
- `/api/list/{slug}`（公开）：按 slug 读某人的公开收藏集，仅当 public_listed=True。
"""
import secrets

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Project, Favorite, User
from app.schemas import (
    ProjectOut, ShareSettingsIn, ShareSettingsOut, PublicListOut, PublicListItem,
)
from app.auth import get_current_user

router = APIRouter(tags=["share"])


def _fav_count(db: Session, user_id: int) -> int:
    return db.scalar(select(func.count()).where(Favorite.user_id == user_id)) or 0


@router.get("/api/me/share", response_model=ShareSettingsOut)
def get_share(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return ShareSettingsOut(
        listed=user.public_listed,
        slug=user.public_slug,
        title=user.public_title,
        count=_fav_count(db, user.id),
    )


@router.put("/api/me/share", response_model=ShareSettingsOut)
def update_share(
    body: ShareSettingsIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """开启 / 关闭公开分享并设标题。首次开启时生成稳定 slug（关闭再开不换链接）。"""
    if body.listed and not user.public_slug:
        # 生成不易猜的短 slug，极小概率撞库时重试
        for _ in range(5):
            cand = secrets.token_urlsafe(9)[:12]
            if not db.scalar(select(User.id).where(User.public_slug == cand)):
                user.public_slug = cand
                break
        else:
            raise HTTPException(500, "生成分享链接失败，请重试")
    user.public_listed = body.listed
    if body.title is not None:
        user.public_title = (body.title.strip() or None)
    db.commit()
    return ShareSettingsOut(
        listed=user.public_listed,
        slug=user.public_slug,
        title=user.public_title,
        count=_fav_count(db, user.id),
    )


@router.get("/api/list/{slug}", response_model=PublicListOut)
def public_list(slug: str, db: Session = Depends(get_db)):
    """公开收藏集（无需登录）。未发布或不存在一律 404（不泄露用户是否存在）。"""
    user = db.execute(
        select(User).where(User.public_slug == slug, User.public_listed.is_(True))
    ).scalar_one_or_none()
    if user is None:
        raise HTTPException(404, "列表不存在或未公开")

    rows = db.execute(
        select(Favorite, Project)
        .join(Project, Favorite.project_id == Project.id)
        .where(Favorite.user_id == user.id)
        .order_by(Favorite.created_at.desc())
    ).all()
    items = [
        PublicListItem(project=ProjectOut.model_validate(p), tags=f.tags or [], note=f.note)
        for f, p in rows
    ]
    title = user.public_title or "GitHub Radar 收藏集"
    return PublicListOut(title=title, count=len(items), items=items)
