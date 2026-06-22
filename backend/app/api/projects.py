"""项目详情 + star 历史趋势 + 相似项目接口。"""
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, desc, case, or_, func
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Project, ProjectSnapshot
from app.schemas import ProjectDetailOut, SnapshotPoint, ProjectOut, StandingOut
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


@router.get("/projects/{owner}/{name}/standing", response_model=StandingOut)
def project_standing(owner: str, name: str, db: Session = Depends(get_db)):
    """项目在其所属领域内的相对定位：排名 / 总数 / 百分位 + 领域 Top 5。

    用现有评分数据，让用户一眼看出项目在同类中的地位。无领域则返回空（前端隐藏）。
    """
    p = db.execute(
        select(Project).where(Project.full_name == f"{owner}/{name}")
    ).scalar_one_or_none()
    if p is None:
        raise HTTPException(404, "project not found")
    if not p.category:
        return StandingOut()

    def loader():
        cat = p.category
        base = (Project.category == cat) & (Project.is_archived.is_(False))
        total = db.scalar(select(func.count()).where(base)) or 0
        # 竞赛排名：领域内 score 严格更高者数 + 1（同分并列）
        higher = db.scalar(select(func.count()).where(base, Project.score > p.score)) or 0
        rank = higher + 1
        rows = db.execute(
            select(Project).where(base).order_by(desc(Project.score)).limit(5)
        ).scalars().all()
        top = [ProjectOut.model_validate(r).model_dump() for r in rows]
        percentile = round((total - rank) / total * 100, 1) if total else 0.0
        return StandingOut(
            category=cat,
            category_name=category_name(cat),
            rank=rank,
            total=total,
            percentile=percentile,
            top=top,
        ).model_dump()

    return cached("standing", {"o": owner, "n": name}, loader, ttl=3600)


@router.get("/projects/{owner}/{name}/extras")
def project_extras(owner: str, name: str, db: Session = Depends(get_db)):
    """详情页增强内容：README 摘录 + 最新 release。

    按需到 GitHub 取（README 走 raw 无需配额），Redis 缓存 24h，
    best-effort：任一部分失败返回空字段，不报错。
    """
    p = db.execute(
        select(Project.id).where(Project.full_name == f"{owner}/{name}")
    ).scalar_one_or_none()
    if p is None:
        raise HTTPException(404, "project not found")

    def loader():
        import httpx
        from app.config import settings

        readme_excerpt = None
        release = None
        with httpx.Client(timeout=15.0, follow_redirects=True) as client:
            # README：raw 直取（无配额），markdown 清洗成纯文本摘录
            try:
                r = client.get(
                    f"https://raw.githubusercontent.com/{owner}/{name}/HEAD/README.md"
                )
                if r.status_code == 200 and r.text:
                    readme_excerpt = _clean_markdown(r.text)[:1200] or None
            except Exception:
                pass
            # 最新 release（REST，1 次配额）
            try:
                tokens = settings.token_list
                headers = {"Authorization": f"Bearer {tokens[0]}"} if tokens else {}
                r = client.get(
                    f"https://api.github.com/repos/{owner}/{name}/releases/latest",
                    headers=headers,
                )
                if r.status_code == 200:
                    d = r.json()
                    body = (d.get("body") or "").strip()
                    release = {
                        "tag": d.get("tag_name"),
                        "name": d.get("name") or d.get("tag_name"),
                        "published_at": d.get("published_at"),
                        "url": d.get("html_url"),
                        "notes_excerpt": _clean_markdown(body)[:600] or None,
                    }
            except Exception:
                pass
        return {"readme_excerpt": readme_excerpt, "latest_release": release}

    return cached("extras", {"o": owner, "n": name}, loader, ttl=86400)


def _clean_markdown(md: str) -> str:
    """markdown → 可读纯文本摘录：去 badge/图片/HTML/链接标记/代码块/标题井号。"""
    import re
    text = re.sub(r"```.*?```", " ", md, flags=re.S)          # 代码块
    text = re.sub(r"<!--.*?-->", " ", text, flags=re.S)        # 注释
    text = re.sub(r"<[^>]+>", " ", text)                       # HTML 标签
    text = re.sub(r"!\[[^\]]*\]\([^)]*\)", " ", text)          # 图片/badge
    text = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", text)       # 链接 → 锚文本
    text = re.sub(r"^#{1,6}\s*", "", text, flags=re.M)         # 标题井号
    text = re.sub(r"[*_`>|]+", " ", text)                      # 其余标记
    text = re.sub(r"\s+", " ", text)                           # 压空白
    return text.strip()


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
