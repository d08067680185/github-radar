"""APScheduler：每日采集 → 快照 → 评分 的流水线。"""
import logging

from apscheduler.schedulers.background import BackgroundScheduler

from app.db import SessionLocal
from app.models import CollectLog
from app.collector.discover import discover, prune_stale
from app.collector.snapshot import take_snapshots
from app.scorer.compute import compute_all
from app.scorer.summarize import summarize_backfill
from app.cache import invalidate_all

logger = logging.getLogger(__name__)


def _alert(exc: Exception):
    """上报异常：Sentry(若启用) + collect_logs。"""
    try:
        import sentry_sdk
        sentry_sdk.capture_exception(exc)
    except Exception:  # noqa: BLE001  sentry 未装/未配置则忽略
        pass


def daily_pipeline():
    """发现 → 快照 → 评分 → 失效缓存。失败则上报告警,不中断进程。"""
    db = SessionLocal()
    try:
        logger.info("=== 每日流水线开始 ===")
        discover(db)
        take_snapshots(db)
        compute_all(db)
        prune_stale(db)
        try:
            summarize_backfill(db)  # best-effort：无 key/余额不足时内部已优雅跳过
        except Exception:
            logger.exception("AI 简介步骤出错（不影响其余流水线）")
        invalidate_all()
        logger.info("=== 每日流水线完成 ===")
    except Exception as e:  # noqa: BLE001
        logger.exception("每日流水线出错")
        _alert(e)
        try:
            db.rollback()
            db.add(CollectLog(task="pipeline", status="error", detail=str(e)[:1000]))
            db.commit()
        except Exception:  # noqa: BLE001
            logger.exception("写入失败日志也出错")
    finally:
        db.close()


def weekly_digest():
    """每周：先存档本周精选（无论 SMTP），再给订阅者发邮件（SMTP 未配置则跳过）。"""
    from app.mailer import send_weekly_digest
    from app.digest import archive_current_digest
    from app.cache import invalidate_all
    db = SessionLocal()
    try:
        rec = archive_current_digest(db)
        logger.info("本周周报已存档：%s（%d 项）", rec.week_date, rec.item_count)
        invalidate_all()  # 让 /digest 列表立即可见
        sent = send_weekly_digest(db)
        logger.info("每周周报任务完成，发送 %d 封", sent)
    except Exception as e:  # noqa: BLE001
        logger.exception("每周周报任务出错")
        _alert(e)
    finally:
        db.close()


def start_scheduler() -> BackgroundScheduler:
    scheduler = BackgroundScheduler(timezone="UTC")
    # 每天 UTC 02:00 跑（避开 GitHub 高峰）
    scheduler.add_job(daily_pipeline, "cron", hour=2, minute=0, id="daily_pipeline")
    # 每周一 UTC 03:00 发周报（流水线之后，数据已最新）
    scheduler.add_job(weekly_digest, "cron", day_of_week="mon", hour=3, minute=0, id="weekly_digest")
    scheduler.start()
    logger.info("调度器已启动：每日 UTC 02:00 流水线 + 每周一 03:00 周报")
    return scheduler
