"""RSS 订阅源：近期收录的高分项目。

让用户用 RSS 阅读器订阅"新发现的优质开源项目"，是榜单站的高价值留存功能。
"""
import os
from datetime import datetime, timezone
from xml.sax.saxutils import escape

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy import select, desc
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Project

router = APIRouter(tags=["feed"])

SITE_URL = os.getenv("SITE_URL", "http://localhost:3000")


def _item(p: Project) -> str:
    link = f"{SITE_URL}/repo/{p.full_name}"
    title = f"{p.full_name} (评分 {p.score}, ⭐{p.stars:,})"
    desc = p.description or ""
    cat = f" · {p.category}" if p.category else ""
    body = f"{desc}\n\n语言: {p.language or '-'}{cat} | Stars: {p.stars:,} | 综合评分: {p.score}"
    pub = (p.fetched_at or datetime.now(timezone.utc)).strftime("%a, %d %b %Y %H:%M:%S +0000")
    return f"""    <item>
      <title>{escape(title)}</title>
      <link>{escape(link)}</link>
      <guid isPermaLink="true">{escape(link)}</guid>
      <description>{escape(body)}</description>
      <pubDate>{pub}</pubDate>
    </item>"""


@router.get("/feed/new.xml")
def feed_new(
    db: Session = Depends(get_db),
    category: str | None = Query(None),
    language: str | None = Query(None),
    limit: int = Query(30, le=100),
):
    """最新收录的高分项目 RSS（可按 category/language 过滤，做精准订阅）。"""
    stmt = select(Project).where(Project.is_archived.is_(False))
    if category:
        stmt = stmt.where(Project.category == category)
    if language:
        stmt = stmt.where(Project.language == language)
    # 按收录时间倒序 = 最新发现的优质项目
    stmt = stmt.order_by(desc(Project.fetched_at), desc(Project.score)).limit(limit)
    projects = db.execute(stmt).scalars().all()

    title_suffix = ""
    if category:
        title_suffix = f" · {category}"
    elif language:
        title_suffix = f" · {language}"

    items = "\n".join(_item(p) for p in projects)
    now = datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S +0000")
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>GitHub Radar — 新发现的优质开源项目{escape(title_suffix)}</title>
    <link>{escape(SITE_URL)}</link>
    <description>每日更新，综合评分筛选出的优秀开源项目</description>
    <language>zh-cn</language>
    <lastBuildDate>{now}</lastBuildDate>
{items}
  </channel>
</rss>"""
    return Response(content=xml, media_type="application/rss+xml")
