"""收藏：增 / 删 / 查 / 改标签备注 / 导出（均需登录）。"""
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import select, delete
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Project, Favorite, User
from app.schemas import ProjectOut, FavoriteIn, FavoritePatch, FavoriteOut
from app.auth import get_current_user

router = APIRouter(prefix="/api/favorites", tags=["favorites"])


def _resolve_project(db: Session, full_name: str) -> Project:
    p = db.execute(select(Project).where(Project.full_name == full_name)).scalar_one_or_none()
    if p is None:
        raise HTTPException(404, "项目不存在")
    return p


def _user_favorite(db: Session, user: User, full_name: str) -> tuple[Favorite, Project]:
    p = _resolve_project(db, full_name)
    fav = db.execute(
        select(Favorite).where(Favorite.user_id == user.id, Favorite.project_id == p.id)
    ).scalar_one_or_none()
    if fav is None:
        raise HTTPException(404, "未收藏该项目")
    return fav, p


def _clean_tags(tags: list[str] | None) -> list[str]:
    """去空格、去空、去重、限长，避免脏标签。"""
    if not tags:
        return []
    seen: list[str] = []
    for t in tags:
        t = (t or "").strip()[:32]
        if t and t not in seen:
            seen.append(t)
    return seen[:20]


@router.get("", response_model=list[FavoriteOut])
def list_favorites(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    tag: str | None = Query(None, description="只看带该标签的收藏"),
):
    """收藏列表（含标签/备注/收藏时间），可按标签筛选，按收藏时间倒序。"""
    stmt = (
        select(Favorite, Project)
        .join(Project, Favorite.project_id == Project.id)
        .where(Favorite.user_id == user.id)
        .order_by(Favorite.created_at.desc())
    )
    if tag:
        stmt = stmt.where(Favorite.tags.any(tag))
    rows = db.execute(stmt).all()
    return [
        FavoriteOut(project=ProjectOut.model_validate(p), tags=f.tags or [],
                    note=f.note, created_at=f.created_at)
        for f, p in rows
    ]


@router.get("/ids", response_model=list[str])
def favorite_ids(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """返回已收藏项目的 full_name 列表（前端高亮收藏按钮用）。"""
    stmt = (
        select(Project.full_name)
        .join(Favorite, Favorite.project_id == Project.id)
        .where(Favorite.user_id == user.id)
    )
    return db.execute(stmt).scalars().all()


@router.get("/tags", response_model=list[str])
def list_tags(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """该用户用过的所有标签（去重、排序），供前端筛选条。"""
    rows = db.execute(
        select(Favorite.tags).where(Favorite.user_id == user.id)
    ).scalars().all()
    tags: set[str] = set()
    for arr in rows:
        tags.update(arr or [])
    return sorted(tags)


@router.post("", status_code=201)
def add_favorite(
    body: FavoriteIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    p = _resolve_project(db, body.full_name)
    fav = db.execute(
        select(Favorite).where(Favorite.user_id == user.id, Favorite.project_id == p.id)
    ).scalar_one_or_none()
    tags = _clean_tags(body.tags)
    if fav is None:
        db.add(Favorite(user_id=user.id, project_id=p.id, tags=tags, note=body.note))
    else:  # 已收藏：合并新标签 / 覆盖备注（若给了）
        if tags:
            fav.tags = _clean_tags((fav.tags or []) + tags)
        if body.note is not None:
            fav.note = body.note
    db.commit()
    return {"status": "ok", "full_name": body.full_name}


@router.patch("/{owner}/{name}", status_code=200)
def update_favorite(
    owner: str, name: str,
    body: FavoritePatch,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """整体替换标签 / 备注（None 表示该字段不动）。"""
    fav, _ = _user_favorite(db, user, f"{owner}/{name}")
    if body.tags is not None:
        fav.tags = _clean_tags(body.tags)
    if body.note is not None:
        fav.note = body.note.strip() or None
    db.commit()
    return {"status": "ok", "tags": fav.tags or [], "note": fav.note}


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


@router.get("/export")
def export_favorites(
    fmt: str = Query("json", pattern="^(json|markdown)$"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """导出收藏：json（结构化）或 markdown（可读清单，按标签分组）。"""
    rows = db.execute(
        select(Favorite, Project)
        .join(Project, Favorite.project_id == Project.id)
        .where(Favorite.user_id == user.id)
        .order_by(Favorite.created_at.desc())
    ).all()

    if fmt == "json":
        data = [
            {
                "full_name": p.full_name,
                "url": f"https://github.com/{p.full_name}",
                "description": p.description,
                "language": p.language,
                "stars": p.stars,
                "score": float(p.score),
                "tags": f.tags or [],
                "note": f.note,
                "saved_at": f.created_at.isoformat(),
            }
            for f, p in rows
        ]
        return Response(
            content=__import__("json").dumps(data, ensure_ascii=False, indent=2),
            media_type="application/json",
            headers={"Content-Disposition": 'attachment; filename="github-radar-favorites.json"'},
        )

    # markdown：按标签分组（未打标签归入「未分组」）
    from collections import defaultdict
    groups: dict[str, list] = defaultdict(list)
    for f, p in rows:
        keys = (f.tags or []) or ["未分组"]
        for k in keys:
            groups[k].append((f, p))

    lines = ["# GitHub Radar 收藏夹", "", f"共 {len(rows)} 个项目。", ""]
    for tag in sorted(groups):
        lines.append(f"## {tag}")
        lines.append("")
        for f, p in groups[tag]:
            note = f" — {f.note}" if f.note else ""
            desc = f" — {p.description}" if p.description else ""
            lines.append(f"- [{p.full_name}](https://github.com/{p.full_name}) ⭐{p.stars:,}{desc}{note}")
        lines.append("")
    return Response(
        content="\n".join(lines),
        media_type="text/markdown; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="github-radar-favorites.md"'},
    )
