"""周报订阅：订阅 / 退订 / 邮件预览（无需登录）。"""
import secrets

from fastapi import APIRouter, Depends
from fastapi.responses import HTMLResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Subscriber, DigestArchive
from app.schemas import (
    SubscribeIn, UnsubscribeIn, DigestArchiveListOut, DigestArchiveDetailOut,
)
from app.ratelimit import rate_limit
from app.config import settings
from app.cache import cached
from sqlalchemy import desc

router = APIRouter(prefix="/api", tags=["subscribe"])

# 防滥用：同一 IP 每分钟最多订阅 3 次
_sub_rl = rate_limit("subscribe", limit=3, window_sec=60)


@router.post("/subscribe", dependencies=[Depends(_sub_rl)])
def subscribe(body: SubscribeIn, db: Session = Depends(get_db)):
    """订阅周报。幂等：已存在则重新激活。不泄露邮箱是否已存在。"""
    email = body.email.lower()
    locale = "en" if body.locale == "en" else "zh"
    sub = db.execute(select(Subscriber).where(Subscriber.email == email)).scalar_one_or_none()
    if sub is None:
        sub = Subscriber(email=email, token=secrets.token_urlsafe(24),
                         active=True, locale=locale)
        db.add(sub)
    else:
        sub.active = True
        sub.locale = locale
    db.commit()
    return {"status": "ok"}


@router.post("/unsubscribe")
def unsubscribe(body: UnsubscribeIn, db: Session = Depends(get_db)):
    """凭 token 退订（一键，无需登录）。token 无效也返回 ok（不泄露）。"""
    sub = db.execute(
        select(Subscriber).where(Subscriber.token == body.token)
    ).scalar_one_or_none()
    if sub is not None:
        sub.active = False
        db.commit()
    return {"status": "ok"}


@router.get("/digest/archive", response_model=list[DigestArchiveListOut])
def digest_archive_list(db: Session = Depends(get_db), limit: int = 52):
    """周报历史存档列表（按周倒序，不含条目明细）。公开、缓存。"""
    def loader():
        rows = db.execute(
            select(DigestArchive.week_date, DigestArchive.title, DigestArchive.item_count)
            .order_by(desc(DigestArchive.week_date))
            .limit(limit)
        ).all()
        return [
            {"week_date": r.week_date.isoformat(), "title": r.title, "item_count": r.item_count}
            for r in rows
        ]
    return cached("digest_archive_list", {"limit": limit}, loader)


@router.get("/digest/archive/{week}", response_model=DigestArchiveDetailOut)
def digest_archive_detail(week: str, db: Session = Depends(get_db)):
    """某一周的周报存档详情（含结构化条目）。公开、缓存。week 形如 2026-06-15。"""
    from fastapi import HTTPException
    from datetime import date
    try:
        week_date = date.fromisoformat(week)
    except ValueError:
        raise HTTPException(404, "invalid week")
    rec = db.execute(
        select(DigestArchive).where(DigestArchive.week_date == week_date)
    ).scalar_one_or_none()
    if rec is None:
        raise HTTPException(404, "digest not found")
    return DigestArchiveDetailOut(
        week_date=rec.week_date, title=rec.title,
        item_count=rec.item_count, items=rec.items or [],
    )


@router.get("/digest/preview", response_class=HTMLResponse)
def digest_preview(db: Session = Depends(get_db), locale: str = "zh"):
    """渲染当前周报 HTML（供预览，不发送）。公开——只含公开榜单数据。"""
    from app.digest import build_weekly_digest, render_weekly_html
    items = build_weekly_digest(db, limit=10)
    site = settings.site_url.rstrip("/")
    return render_weekly_html(items, f"{site}/unsubscribe?token=PREVIEW", locale)
