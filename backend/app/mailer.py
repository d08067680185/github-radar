"""邮件推送：密码重置 + 每周精选周报。

未配置 SMTP 时自动跳过（降级桩），配置后即生效。
"""
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.config import settings
from app.models import Project

logger = logging.getLogger(__name__)


def _smtp_ready() -> bool:
    return bool(settings.smtp_host and settings.smtp_user and settings.smtp_password)


def _render_digest(projects: list[Project]) -> str:
    items = "\n".join(
        f'<li><a href="https://github.com/{p.full_name}">{p.full_name}</a> '
        f"— 评分 {p.score} ⭐{p.stars:,}<br>"
        f'<span style="color:#666">{p.readme_summary or p.description or ""}</span></li>'
        for p in projects
    )
    return f"""<html><body>
    <h2>GitHub Radar · 今日优质开源项目</h2>
    <ul>{items}</ul>
    <p style="color:#999;font-size:12px">综合评分筛选 · 退订请回复本邮件</p>
    </body></html>"""


def _send_html(to_email: str, subject: str, html: str) -> bool:
    """发送一封 HTML 邮件。未配置 SMTP 时返回 False（跳过）。"""
    if not _smtp_ready():
        logger.info("SMTP 未配置，邮件跳过：%s", subject)
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from or settings.smtp_user
    msg["To"] = to_email
    msg.attach(MIMEText(html, "html", "utf-8"))
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(msg)
        logger.info("已发送邮件至 %s（%s）", to_email, subject)
        return True
    except Exception as e:  # noqa: BLE001
        logger.warning("邮件发送失败 %s：%s", to_email, e)
        return False


def send_reset_email(to_email: str, link: str) -> bool:
    """发送密码重置邮件。"""
    html = f"""<html><body>
    <h2>GitHub Radar · 重置密码</h2>
    <p>点击下面的链接设置新密码（1 小时内有效）：</p>
    <p><a href="{link}">{link}</a></p>
    <p style="color:#999;font-size:12px">如果这不是你的操作，忽略本邮件即可。</p>
    </body></html>"""
    return _send_html(to_email, "GitHub Radar · 重置密码", html)


def send_weekly_digest(db, limit: int = 10) -> int:
    """给所有活跃订阅者发周报，返回成功发送数。SMTP 未配置则返回 0。"""
    from sqlalchemy import select
    from datetime import datetime, timezone
    from app.models import Subscriber
    from app.digest import build_weekly_digest, render_weekly_html

    if not _smtp_ready():
        logger.info("SMTP 未配置，周报推送整体跳过。")
        return 0

    subs = db.execute(select(Subscriber).where(Subscriber.active.is_(True))).scalars().all()
    if not subs:
        return 0
    items = build_weekly_digest(db, limit=limit)
    if not items:
        return 0

    site = settings.site_url.rstrip("/")
    subject = "GitHub Radar · 本周精选开源项目"
    sent = 0
    for sub in subs:
        unsub = f"{site}/unsubscribe?token={sub.token}"
        html = render_weekly_html(items, unsub, sub.locale)
        if _send_html(sub.email, subject, html):
            sub.last_sent_at = datetime.now(timezone.utc)
            sent += 1
    db.commit()
    logger.info("周报发送完成：%d/%d", sent, len(subs))
    return sent


def send_digest(to_email: str, projects: list[Project]) -> bool:
    """发送一封日报。未配置 SMTP 时返回 False（跳过）。"""
    if not _smtp_ready():
        logger.info("SMTP 未配置，邮件推送跳过。")
        return False
    if not projects:
        return False
    return _send_html(to_email, "GitHub Radar · 今日优质开源项目", _render_digest(projects))
