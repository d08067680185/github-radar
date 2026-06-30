"""发版通知：检查关注项目是否有新 release，发邮件给用户。

逻辑：对比 project.last_release_at 与 watched_projects.last_notified_at，
若新发版则查关注该项目的用户发邮件，并更新 last_notified_at。
未配置 SMTP 时静默跳过。
"""
import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models import Project, WatchedProject, User
from app.mailer import _send_html, _smtp_ready  # type: ignore[attr-defined]
from app.config import settings

logger = logging.getLogger(__name__)

SITE = "https://radar.mxzshs.com"


def _render_release_email(user_email: str, project: Project) -> str:
    name = project.full_name
    release = project.last_release_at.strftime("%Y-%m-%d") if project.last_release_at else "—"
    radar_url = f"{SITE}/repo/{name}"
    gh_url = f"https://github.com/{name}/releases"
    return f"""<html><body style="font-family:sans-serif;color:#e6edf3;background:#0d1117;padding:24px">
<h2 style="color:#58a6ff">🛰️ GitHub Radar · 发版通知</h2>
<p>你关注的项目 <a href="{gh_url}" style="color:#58a6ff">{name}</a> 发布了新版本！</p>
<p style="color:#8b949e">发版时间：{release}</p>
<p>
  <a href="{radar_url}" style="background:#238636;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none">查看 Radar 详情</a>
  &nbsp;&nbsp;
  <a href="{gh_url}" style="color:#58a6ff">查看 Release 页面</a>
</p>
<hr style="border-color:#30363d;margin:24px 0">
<p style="color:#6e7681;font-size:12px">
  你在 GitHub Radar 关注了该项目。如需取消通知，登录后在账户页取消关注。
</p>
</body></html>"""


async def check_release_notifications(db: Session | None = None) -> int:
    """检查新发版并发通知。返回发送通知数量。

    可传入 db（测试用），不传时自建 SessionLocal。
    """
    if not _smtp_ready():
        logger.info("SMTP 未配置，跳过发版通知检查")
        return 0

    own_db = db is None
    if own_db:
        db = SessionLocal()

    sent = 0
    try:
        # 找到有新 release（last_release_at > last_notified_at 或 last_notified_at 为空）的关注记录
        stmt = (
            select(WatchedProject, Project, User)
            .join(Project, WatchedProject.project_id == Project.id)
            .join(User, WatchedProject.user_id == User.id)
            .where(
                Project.last_release_at.is_not(None),
                (WatchedProject.last_notified_at.is_(None))
                | (Project.last_release_at > WatchedProject.last_notified_at),
            )
        )
        rows = db.execute(stmt).all()

        for watch, project, user in rows:
            try:
                subject = f"[GitHub Radar] {project.full_name} 发布了新版本"
                html = _render_release_email(user.email, project)
                ok = _send_html(user.email, subject, html)
                if ok:
                    watch.last_notified_at = datetime.now(timezone.utc)
                    sent += 1
            except Exception:
                logger.exception("发版通知发送失败: %s -> %s", project.full_name, user.email)

        if sent:
            db.commit()
            logger.info("发版通知：发送 %d 封", sent)
    except Exception:
        logger.exception("check_release_notifications 异常")
    finally:
        if own_db:
            db.close()

    return sent
