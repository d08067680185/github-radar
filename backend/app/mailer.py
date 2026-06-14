"""邮件订阅推送（预留）。

把新发现的高分项目摘要邮件推送给订阅者。
未配置 SMTP 时自动跳过（降级桩），配置后即生效。

订阅者存储已预留 Subscription 表（见 models 后续 Phase）。当前先实现发送能力。
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
    """发送一封 HTML 邮件。未配置 SMTP 返回 False。"""
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
    ok = _send_html(to_email, "GitHub Radar · 重置密码", html)
    if ok:
        logger.info("已发送重置邮件至 %s", to_email)
    return ok


def send_digest(to_email: str, projects: list[Project]) -> bool:
    """发送一封日报。未配置 SMTP 时返回 False（跳过）。"""
    if not _smtp_ready():
        logger.info("SMTP 未配置，邮件推送跳过。")
        return False
    if not projects:
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "GitHub Radar · 今日优质开源项目"
    msg["From"] = settings.smtp_from or settings.smtp_user
    msg["To"] = to_email
    msg.attach(MIMEText(_render_digest(projects), "html", "utf-8"))

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(msg)
        logger.info("已发送日报至 %s", to_email)
        return True
    except Exception as e:  # noqa: BLE001
        logger.warning("邮件发送失败 %s：%s", to_email, e)
        return False
