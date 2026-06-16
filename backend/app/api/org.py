"""组织/作者维度：把同一 owner 名下所有上榜项目聚合成一页。

填补「只能按语言/领域浏览」的空白——可看某个组织/个人的整体战绩
（总 star、领域/语言分布、项目列表）。结果走 Redis 缓存。
"""
from collections import Counter

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, desc, func
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Project
from app.schemas import OrgOut, ProjectOut, CategoryOut
from app.scorer.classify import category_name
from app.cache import cached
from app.api.rankings import order_clauses, SORT_OPTIONS

router = APIRouter(prefix="/api", tags=["org"])


@router.get("/org/{owner}", response_model=OrgOut)
def org_detail(owner: str, db: Session = Depends(get_db), sort: str = Query("score")):
    """某 owner 名下所有未归档项目的聚合视图。项目列表可用 sort 切换排序。"""
    if sort not in SORT_OPTIONS:
        sort = "score"

    def loader():
        rows = db.execute(
            select(Project)
            .where(Project.owner == owner, Project.is_archived.is_(False))
            .order_by(*order_clauses(sort))
        ).scalars().all()
        if not rows:
            return None

        total_stars = sum(p.stars for p in rows)
        avg_score = round(sum(float(p.score) for p in rows) / len(rows), 2)

        cat_counter = Counter(p.category for p in rows if p.category)
        lang_counter = Counter(p.language for p in rows if p.language)
        top_cat = cat_counter.most_common(1)[0][0] if cat_counter else None

        categories = [
            CategoryOut(slug=slug, name=category_name(slug) or slug, count=n)
            for slug, n in cat_counter.most_common()
        ]
        languages = [
            CategoryOut(slug=lang, name=lang, count=n)
            for lang, n in lang_counter.most_common()
        ]

        return OrgOut(
            owner=owner,
            project_count=len(rows),
            total_stars=total_stars,
            avg_score=avg_score,
            top_category=top_cat,
            top_category_name=category_name(top_cat),
            categories=categories,
            languages=languages,
            projects=[ProjectOut.model_validate(p) for p in rows],
        ).model_dump(mode="json")

    result = cached("org", {"owner": owner, "sort": sort}, loader)
    if result is None:
        raise HTTPException(404, "owner not found")
    return result
