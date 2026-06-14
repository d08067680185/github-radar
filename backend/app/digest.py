"""每周精选周报：挑选本周内容 + 渲染邮件 HTML。

内容优先级：近 7 天 star 净增最大的「上升最快」项目；
若快照不足（冷启动算不出净增），回退到 Trending（growth_score），再回退综合榜。
不依赖任何外部凭证，纯读库。
"""
from datetime import date, timedelta

from sqlalchemy import select, desc, func
from sqlalchemy.orm import Session, aliased

from app.models import Project, ProjectSnapshot
from app.config import settings


def build_weekly_digest(db: Session, limit: int = 10) -> list[dict]:
    """返回本周精选项目列表（dict，含可选 star_gain）。"""
    cutoff = date.today() - timedelta(days=7)

    span = (
        select(
            ProjectSnapshot.project_id.label("pid"),
            func.min(ProjectSnapshot.snapshot_date).label("d0"),
            func.max(ProjectSnapshot.snapshot_date).label("d1"),
        )
        .where(ProjectSnapshot.snapshot_date >= cutoff)
        .group_by(ProjectSnapshot.project_id)
        .subquery()
    )
    s0 = aliased(ProjectSnapshot)
    s1 = aliased(ProjectSnapshot)
    gain = (s1.stars - s0.stars).label("gain")
    rows = db.execute(
        select(Project, gain)
        .join(span, span.c.pid == Project.id)
        .join(s0, (s0.project_id == span.c.pid) & (s0.snapshot_date == span.c.d0))
        .join(s1, (s1.project_id == span.c.pid) & (s1.snapshot_date == span.c.d1))
        .where(Project.is_archived.is_(False), span.c.d1 > span.c.d0, gain > 0)
        .order_by(desc(gain))
        .limit(limit)
    ).all()

    if rows:
        return [{"project": p, "star_gain": g} for p, g in rows]

    # 回退：Trending（growth），再回退综合榜
    fallback = db.execute(
        select(Project)
        .where(Project.is_archived.is_(False))
        .order_by(desc(Project.growth_score), desc(Project.score))
        .limit(limit)
    ).scalars().all()
    return [{"project": p, "star_gain": None} for p in fallback]


def render_weekly_html(items: list[dict], unsubscribe_url: str, locale: str = "zh") -> str:
    """渲染周报 HTML（内联样式，邮件客户端友好）。"""
    zh = locale != "en"
    site = settings.site_url.rstrip("/")
    title = "GitHub Radar · 本周精选开源项目" if zh else "GitHub Radar · This Week's Top Open Source"
    intro = "过去 7 天最值得关注的开源项目，为你精选：" if zh \
        else "The open-source projects worth your attention this past week:"
    gain_lbl = "本周新增" if zh else "this week"
    unsub_lbl = "退订周报" if zh else "Unsubscribe"
    powered = "综合评分 = 增长 + 活跃 + 健康 + 热度" if zh else "Score = growth + activity + health + heat"

    rows = []
    for i, it in enumerate(items, 1):
        p = it["project"]
        gain = it.get("star_gain")
        summary = (p.readme_summary if zh else p.readme_summary_en) or p.description or ""
        gain_html = (
            f'<span style="color:#3fb950;font-weight:600">+{gain:,} ⭐ {gain_lbl}</span> · '
            if gain else ""
        )
        rows.append(
            f'<tr><td style="padding:12px 0;border-bottom:1px solid #eee">'
            f'<div style="font-size:16px"><span style="color:#999">#{i}</span> '
            f'<a href="{site}/repo/{p.full_name}" style="color:#1f6feb;text-decoration:none;font-weight:600">{p.full_name}</a></div>'
            f'<div style="margin:4px 0;color:#555;font-size:14px">{gain_html}'
            f'评分 {p.score} · ⭐ {p.stars:,}{" · " + p.language if p.language else ""}</div>'
            f'<div style="color:#777;font-size:13px">{summary}</div>'
            f'</td></tr>'
        )
    body = "".join(rows)

    return f"""<!doctype html><html><body style="margin:0;background:#f6f8fa;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:24px">
  <div style="background:#fff;border-radius:12px;padding:24px;border:1px solid #e1e4e8">
    <h1 style="font-size:20px;margin:0 0 6px">🛰️ {title}</h1>
    <p style="color:#666;font-size:14px;margin:0 0 16px">{intro}</p>
    <table style="width:100%;border-collapse:collapse">{body}</table>
    <p style="color:#999;font-size:12px;margin-top:20px">{powered}</p>
    <p style="color:#999;font-size:12px"><a href="{unsubscribe_url}" style="color:#999">{unsub_lbl}</a> · <a href="{site}" style="color:#999">GitHub Radar</a></p>
  </div>
</div>
</body></html>"""
