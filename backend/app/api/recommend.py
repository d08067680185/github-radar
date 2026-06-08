"""个性化推荐：基于收藏的语言/领域偏好，推荐未收藏的高分项目。

打分思路：偏好命中加权 + 项目自身综合评分。无收藏时回退到综合榜 Top。
"""
from collections import Counter

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, desc
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Project, Favorite, User
from app.schemas import ProjectOut
from app.auth import get_current_user

router = APIRouter(prefix="/api/recommend", tags=["recommend"])


@router.get("", response_model=list[ProjectOut])
def recommend(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(20, le=50),
):
    # 1. 取用户收藏
    favs = db.execute(
        select(Project.id, Project.language, Project.category)
        .join(Favorite, Favorite.project_id == Project.id)
        .where(Favorite.user_id == user.id)
    ).all()

    fav_ids = {f.id for f in favs}

    # 2. 无收藏 → 回退综合榜
    if not favs:
        stmt = (
            select(Project)
            .where(Project.is_archived.is_(False))
            .order_by(desc(Project.score))
            .limit(limit)
        )
        return db.execute(stmt).scalars().all()

    # 3. 统计偏好权重（归一化）
    lang_pref = Counter(f.language for f in favs if f.language)
    cat_pref = Counter(f.category for f in favs if f.category)
    total = len(favs)

    # 4. 候选池：高分未收藏项目（取较大池子再重排）
    pool = db.execute(
        select(Project)
        .where(Project.is_archived.is_(False))
        .order_by(desc(Project.score))
        .limit(400)
    ).scalars().all()

    def personal_score(p: Project) -> float:
        base = float(p.score)  # 0~100
        lang_boost = (lang_pref.get(p.language, 0) / total) * 40  # 偏好语言最多 +40
        cat_boost = (cat_pref.get(p.category, 0) / total) * 40    # 偏好领域最多 +40
        return base + lang_boost + cat_boost

    ranked = sorted(
        (p for p in pool if p.id not in fav_ids),
        key=personal_score,
        reverse=True,
    )
    return ranked[:limit]
