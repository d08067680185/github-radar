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
from app.models import Project, DigestArchive

router = APIRouter(tags=["feed"])

SITE_URL = os.getenv("SITE_URL", "http://localhost:3000")


def _item(p: Project, en: bool = False) -> str:
    link = f"{SITE_URL}/repo/{p.full_name}"
    if en:
        title = f"{p.full_name} (score {p.score}, ⭐{p.stars:,})"
        desc = (p.readme_summary_en or p.description) or ""
        cat = f" · {p.category}" if p.category else ""
        body = f"{desc}\n\nLanguage: {p.language or '-'}{cat} | Stars: {p.stars:,} | Score: {p.score}"
    else:
        title = f"{p.full_name} (评分 {p.score}, ⭐{p.stars:,})"
        desc = (p.readme_summary or p.description) or ""
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


def _digest_item(rec: DigestArchive, en: bool = False) -> str:
    week = rec.week_date.isoformat()
    link = f"{SITE_URL}/digest/{week}"
    title = (
        f"Weekly picks · {week} ({rec.item_count} projects)" if en
        else f"本周精选 · {week}（{rec.item_count} 个项目）"
    )
    score_lbl = "Score" if en else "评分"
    # 描述用 HTML 列表（RSS 阅读器会渲染）
    lines = []
    for i, it in enumerate(rec.items or [], 1):
        gain = it.get("star_gain")
        if gain:
            gain_s = f" (+{gain:,} ⭐ this week)" if en else f"（本周 +{gain:,} ⭐）"
        else:
            gain_s = ""
        summary = (it.get("summary_en") if en else it.get("summary_zh")) or ""
        lines.append(
            f'<li><a href="{SITE_URL}/repo/{it["full_name"]}">{it["full_name"]}</a> '
            f'— {score_lbl} {it.get("score")} ⭐{it.get("stars", 0):,}{gain_s}<br>{escape(summary)}</li>'
        )
    body = "<ul>" + "".join(lines) + "</ul>"
    pub = (rec.created_at or datetime.now(timezone.utc)).strftime("%a, %d %b %Y %H:%M:%S +0000")
    return f"""    <item>
      <title>{escape(title)}</title>
      <link>{escape(link)}</link>
      <guid isPermaLink="true">{escape(link)}</guid>
      <description>{escape(body)}</description>
      <pubDate>{pub}</pubDate>
    </item>"""


@router.get("/feed/digest.xml")
def feed_digest(
    db: Session = Depends(get_db),
    limit: int = Query(20, le=52),
    lang: str = Query("zh"),
):
    """每周精选周报 RSS —— 无需邮箱，用 RSS 阅读器即可订阅周报。`?lang=en` 出英文版。"""
    en = lang == "en"
    recs = db.execute(
        select(DigestArchive).order_by(desc(DigestArchive.week_date)).limit(limit)
    ).scalars().all()
    items = "\n".join(_digest_item(r, en) for r in recs)
    now = datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S +0000")
    ch_title = "GitHub Radar — Weekly Picks" if en else "GitHub Radar — 每周精选周报"
    ch_desc = (
        "Weekly pick of the fastest-rising open-source projects of the past 7 days" if en
        else "每周精选过去 7 天上升最快的开源项目"
    )
    ch_lang = "en" if en else "zh-cn"
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>{ch_title}</title>
    <link>{escape(SITE_URL)}/digest</link>
    <description>{ch_desc}</description>
    <language>{ch_lang}</language>
    <lastBuildDate>{now}</lastBuildDate>
{items}
  </channel>
</rss>"""
    return Response(content=xml, media_type="application/rss+xml")


@router.get("/feed/new.xml")
def feed_new(
    db: Session = Depends(get_db),
    category: str | None = Query(None),
    language: str | None = Query(None),
    limit: int = Query(30, le=100),
    lang: str = Query("zh"),
):
    """最新收录的高分项目 RSS（可按 category/language 过滤）。`?lang=en` 出英文版。"""
    en = lang == "en"
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

    items = "\n".join(_item(p, en) for p in projects)
    now = datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S +0000")
    ch_title = (
        f"GitHub Radar — Newly discovered great open-source projects{escape(title_suffix)}" if en
        else f"GitHub Radar — 新发现的优质开源项目{escape(title_suffix)}"
    )
    ch_desc = (
        "Updated daily — great open-source projects surfaced by composite score" if en
        else "每日更新，综合评分筛选出的优秀开源项目"
    )
    ch_lang = "en" if en else "zh-cn"
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>{ch_title}</title>
    <link>{escape(SITE_URL)}</link>
    <description>{ch_desc}</description>
    <language>{ch_lang}</language>
    <lastBuildDate>{now}</lastBuildDate>
{items}
  </channel>
</rss>"""
    return Response(content=xml, media_type="application/rss+xml")
