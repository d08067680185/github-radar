"""基于 Redis 的固定窗口限流（依赖注入式）。

Redis 不可用时自动放行（降级），不阻断正常服务。
"""
import logging
import time

from fastapi import Request, HTTPException, status

from app.cache import _client as _redis  # 复用已建立的 Redis 连接

logger = logging.getLogger(__name__)


def _client_ip(request: Request) -> str:
    # 反向代理后取真实 IP（生产经 nginx 时 X-Forwarded-For 第一段）
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def rate_limit(name: str, limit: int, window_sec: int):
    """返回一个 FastAPI 依赖：同一 IP 在 window 内最多 limit 次。"""
    def dependency(request: Request) -> None:
        if _redis is None:
            return  # 降级放行
        key = f"ghradar:rl:{name}:{_client_ip(request)}:{int(time.time()) // window_sec}"
        try:
            n = _redis.incr(key)
            if n == 1:
                _redis.expire(key, window_sec)
            if n > limit:
                raise HTTPException(
                    status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"请求过于频繁，请 {window_sec} 秒后再试",
                )
        except HTTPException:
            raise
        except Exception as e:  # noqa: BLE001
            logger.warning("限流检查失败，放行：%s", e)
    return dependency
