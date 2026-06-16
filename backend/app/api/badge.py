"""可嵌入评分徽章：返回 shields 风格的 SVG，供项目在 README 里挂「GitHub Radar 评分」。

纯字符串生成，无第三方依赖；结果缓存。即使项目不存在也返回灰色 unknown 徽章
（嵌在 <img> 里不会破图），不返回 404。
"""
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Project
from app.cache import cached

router = APIRouter(prefix="/api", tags=["badge"])


def _color(score: float | None) -> str:
    if score is None:
        return "#9f9f9f"
    if score >= 80:
        return "#2ea44f"   # green
    if score >= 60:
        return "#a3a32c"   # yellow-green
    if score >= 40:
        return "#dfb317"   # yellow
    if score >= 20:
        return "#fe7d37"   # orange
    return "#e05d44"       # red


def _esc(s: str) -> str:
    return (s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            .replace('"', "&quot;"))


def _text_width(s: str) -> int:
    """粗略估算 Verdana 11px 文本像素宽（窄字符算少点），用于布局。"""
    w = 0.0
    for ch in s:
        if ch in "iIl.,:;'|!":
            w += 3.5
        elif ch in "fjtr ":
            w += 5.0
        elif ch in "mwMW":
            w += 10.0
        elif ch.isupper():
            w += 8.0
        else:
            w += 6.7
    return int(w + 0.5)


def _render_badge(label: str, message: str, color: str) -> str:
    pad = 10
    lw = _text_width(label) + pad * 2
    mw = _text_width(message) + pad * 2
    w = lw + mw
    lx = lw / 2 * 10          # 文本用 textLength 缩放坐标系（*10），更精准
    mx = (lw + mw / 2) * 10
    lt = (lw - pad * 2) * 10
    mt = (mw - pad * 2) * 10
    el, em = _esc(label), _esc(message)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="20" role="img" aria-label="{el}: {em}">
<title>{el}: {em}</title>
<linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>
<clipPath id="r"><rect width="{w}" height="20" rx="3" fill="#fff"/></clipPath>
<g clip-path="url(#r)">
<rect width="{lw}" height="20" fill="#555"/>
<rect x="{lw}" width="{mw}" height="20" fill="{color}"/>
<rect width="{w}" height="20" fill="url(#s)"/>
</g>
<g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="110" text-rendering="geometricPrecision">
<text transform="scale(.1)" x="{lx:.0f}" y="150" fill="#010101" fill-opacity=".3" textLength="{lt:.0f}">{el}</text>
<text transform="scale(.1)" x="{lx:.0f}" y="140" textLength="{lt:.0f}">{el}</text>
<text transform="scale(.1)" x="{mx:.0f}" y="150" fill="#010101" fill-opacity=".3" textLength="{mt:.0f}">{em}</text>
<text transform="scale(.1)" x="{mx:.0f}" y="140" textLength="{mt:.0f}">{em}</text>
</g>
</svg>'''


@router.get("/badge/{owner}/{name}.svg")
def score_badge(
    owner: str, name: str,
    db: Session = Depends(get_db),
    label: str = Query("GitHub Radar", max_length=40),
):
    """评分徽章 SVG。`?label=` 可自定义左侧文字。"""
    def loader():
        score = db.execute(
            select(Project.score).where(Project.full_name == f"{owner}/{name}")
        ).scalar_one_or_none()
        if score is None:
            return _render_badge(label, "unknown", _color(None))
        s = float(score)
        return _render_badge(label, f"{s:g} / 100", _color(s))

    svg = cached("badge", {"o": owner, "n": name, "l": label}, loader, ttl=3600)
    return Response(
        content=svg,
        media_type="image/svg+xml",
        headers={"Cache-Control": "max-age=3600, public"},
    )
