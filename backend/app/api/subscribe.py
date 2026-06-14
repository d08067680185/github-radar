"""周报订阅：订阅 / 退订 / 邮件预览（无需登录）。"""
import secrets

from fastapi import APIRouter, Depends
from fastapi.responses import HTMLResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Subscriber
from app.schemas import SubscribeIn, UnsubscribeIn
from app.ratelimit import rate_limit
from app.config import settings

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


@router.get("/digest/preview", response_class=HTMLResponse)
def digest_preview(db: Session = Depends(get_db), locale: str = "zh"):
    """渲染当前周报 HTML（供预览，不发送）。公开——只含公开榜单数据。"""
    from app.digest import build_weekly_digest, render_weekly_html
    items = build_weekly_digest(db, limit=10)
    site = settings.site_url.rstrip("/")
    return render_weekly_html(items, f"{site}/unsubscribe?token=PREVIEW", locale)
