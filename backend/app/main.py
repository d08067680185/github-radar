import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, BackgroundTasks, Header, HTTPException, status, Depends
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import init_db, SessionLocal
from app.api import rankings, projects, search, feed, auth_api, favorites, recommend, admin
from app.auth import require_admin
from app.collector.discover import discover
from app.collector.snapshot import take_snapshots
from app.scorer.compute import compute_all
from app.cache import invalidate_all

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s | %(message)s")
logger = logging.getLogger(__name__)

_scheduler = None


def _init_sentry():
    if not settings.sentry_dsn:
        return
    try:
        import sentry_sdk
        sentry_sdk.init(dsn=settings.sentry_dsn, traces_sample_rate=0.1)
        logger.info("Sentry 错误监控已启用")
    except ImportError:
        logger.warning("已配置 SENTRY_DSN 但未安装 sentry-sdk")


@asynccontextmanager
async def lifespan(app: FastAPI):
    _init_sentry()
    # 生产安全自检
    if settings.jwt_secret == "change-me-in-production":
        logger.warning("⚠️ JWT_SECRET 仍为默认值，生产环境必须改成随机长字符串！")
    if not settings.admin_token:
        logger.info("ADMIN_TOKEN 未配置，/admin 端点已禁用（安全默认）")
    init_db()
    global _scheduler
    if settings.enable_scheduler:
        from app.scheduler import start_scheduler
        _scheduler = start_scheduler()
        logger.info("每日自动流水线已启用")
    else:
        logger.info("调度器未启用（ENABLE_SCHEDULER=false），数据用 cli.py / /admin 手动刷新")
    yield
    if _scheduler:
        _scheduler.shutdown(wait=False)


app = FastAPI(title="GitHub Radar", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count"],
)
app.include_router(rankings.router)
app.include_router(projects.router)
app.include_router(search.router)
app.include_router(feed.router)
app.include_router(auth_api.router)
app.include_router(favorites.router)
app.include_router(recommend.router)
app.include_router(admin.router)


# ---- 手动触发流水线（需管理令牌；生产可由 scheduler 自动跑）----
@app.post("/admin/run-pipeline", dependencies=[Depends(require_admin)])
def run_pipeline(background: BackgroundTasks):
    def _job():
        db = SessionLocal()
        try:
            discover(db)
            take_snapshots(db)
            compute_all(db)
            invalidate_all()
        finally:
            db.close()
    background.add_task(_job)
    return {"status": "started", "detail": "discover→snapshot→score 后台运行中"}


@app.get("/healthz")
def healthz():
    return {"ok": True}


@app.get("/status")
def status_check():
    """运维探活：DB/Redis 连通性 + 数据新鲜度（最近成功评分时间）。

    供 uptime 监控轮询：data_stale=true 表示流水线可能挂了（>36h 未更新）。
    """
    from datetime import datetime, timezone, timedelta
    from sqlalchemy import select, func
    from app.models import CollectLog
    from app.cache import _client as redis_client

    out = {"ok": True, "db": False, "redis": False, "last_score_at": None, "data_stale": True}
    db = SessionLocal()
    try:
        last = db.execute(
            select(func.max(CollectLog.created_at)).where(
                CollectLog.task == "score", CollectLog.status == "ok"
            )
        ).scalar_one_or_none()
        out["db"] = True
        if last:
            out["last_score_at"] = last.isoformat()
            out["data_stale"] = (datetime.now(timezone.utc) - last) > timedelta(hours=36)
    except Exception:  # noqa: BLE001
        out["ok"] = False
    finally:
        db.close()

    try:
        if redis_client is not None:
            redis_client.ping()
            out["redis"] = True
    except Exception:  # noqa: BLE001
        pass

    return out
