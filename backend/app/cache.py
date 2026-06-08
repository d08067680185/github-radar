"""Redis 缓存层：缓存榜单查询，pipeline 跑完整体失效。

Redis 不可用时自动降级为直连 DB（不影响功能，只是没缓存）。
"""
import json
import logging

import redis

from app.config import settings

logger = logging.getLogger(__name__)

_NAMESPACE = "ghradar"
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


def invalidate_all():
    """清空本系统所有缓存（pipeline 跑完调用）。"""
    if _client is None:
        return 0
    try:
        keys = list(_client.scan_iter(f"{_NAMESPACE}:*"))
        if keys:
            _client.delete(*keys)
        logger.info("缓存已失效：%d 个 key", len(keys))
        return len(keys)
    except Exception as e:  # noqa: BLE001
        logger.warning("缓存失效失败：%s", e)
        return 0
