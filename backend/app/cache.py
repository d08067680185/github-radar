"""Redis 缓存层：缓存榜单查询，pipeline 跑完整体失效。

Redis 不可用时自动降级为直连 DB（不影响功能，只是没缓存）。
"""
import json
import logging

import redis

from app.config import settings

logger = logging.getLogger(__name__)

# 缓存结构版本：**任何带 cached() 的接口响应结构变化（加/删字段、改类型）都要 +1**。
# 版本进 key 命名空间 → 旧结构缓存自然失效，根治「改结构忘清缓存 → Pydantic 校验 500」。
_CACHE_VERSION = 2
_ROOT = "ghradar"
_NAMESPACE = f"{_ROOT}:v{_CACHE_VERSION}"
_DEFAULT_TTL = 3600  # 1 小时，与前端 ISR 对齐

try:
    _client: redis.Redis | None = redis.from_url(
        settings.redis_url, decode_responses=True, socket_connect_timeout=2
    )
    _client.ping()
    logger.info("Redis 已连接")
except Exception as e:  # noqa: BLE001
    logger.warning("Redis 不可用，缓存降级为直连 DB：%s", e)
    _client = None


def _key(name: str, params: dict) -> str:
    parts = ":".join(f"{k}={v}" for k, v in sorted(params.items()) if v is not None)
    return f"{_NAMESPACE}:{name}:{parts}"


def cached(name: str, params: dict, loader, ttl: int = _DEFAULT_TTL):
    """通用缓存：命中返回缓存；否则调用 loader()（返回可 JSON 序列化对象）并写缓存。"""
    if _client is None:
        return loader()
    key = _key(name, params)
    try:
        hit = _client.get(key)
        if hit is not None:
            return json.loads(hit)
        value = loader()
        _client.setex(key, ttl, json.dumps(value, default=str))
        return value
    except Exception as e:  # noqa: BLE001
        logger.warning("缓存读写失败，回退 DB：%s", e)
        return loader()


def acquire_job_lock(name: str, ttl: int = 21600) -> bool:
    """跨 worker 定时任务去重：uvicorn --workers N 时每个 worker 各自起一个 APScheduler
    实例，同一 cron 任务会在同一时刻被触发 N 次。以「任务名+当天日期」为 key 做 Redis
    NX 抢锁，只有抢到的 worker 真正执行，其余直接跳过。

    Redis 不可用时放行（返回 True）——宁可偶发重复跑，也不让整条流水线因 Redis 挂了而彻底不跑。
    """
    if _client is None:
        return True
    from datetime import datetime, timezone
    key = f"{_ROOT}:jl:{name}:{datetime.now(timezone.utc).date().isoformat()}"
    try:
        return bool(_client.set(key, "1", nx=True, ex=ttl))
    except Exception as e:  # noqa: BLE001
        logger.warning("任务锁获取失败，放行执行：%s", e)
        return True


def invalidate_all():
    """清空本系统所有缓存（pipeline 跑完调用）。扫 root 前缀，连旧版本残留一并清。"""
    if _client is None:
        return 0
    try:
        keys = list(_client.scan_iter(f"{_ROOT}:*"))
        # 保留限流键（ghradar:rl:*）和任务锁（ghradar:jl:*），只清数据缓存
        keys = [k for k in keys if not k.startswith(f"{_ROOT}:rl:") and not k.startswith(f"{_ROOT}:jl:")]
        if keys:
            _client.delete(*keys)
        logger.info("缓存已失效：%d 个 key", len(keys))
        return len(keys)
    except Exception as e:  # noqa: BLE001
        logger.warning("缓存失效失败：%s", e)
        return 0


def ensure_cache_version():
    """启动时调用：缓存结构版本变了就自动清空旧缓存（部署即生效，无需手动清）。"""
    if _client is None:
        return
    marker = f"{_ROOT}:cachever"
    try:
        prev = _client.get(marker)
        if prev != str(_CACHE_VERSION):
            n = invalidate_all()
            _client.set(marker, str(_CACHE_VERSION))
            logger.info("缓存版本 %s→v%s，已自动清空 %d 个旧 key", prev, _CACHE_VERSION, n)
    except Exception as e:  # noqa: BLE001
        logger.warning("缓存版本检查失败：%s", e)
