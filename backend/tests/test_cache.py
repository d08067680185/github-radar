"""跨 worker 定时任务锁测试（不依赖真实 Redis，用假客户端模拟 NX 语义）。"""
import app.cache as cache


class _FakeRedis:
    def __init__(self):
        self.store: dict[str, str] = {}

    def set(self, key, value, nx=False, ex=None):
        if nx and key in self.store:
            return None
        self.store[key] = value
        return True


def test_acquire_job_lock_no_redis_fails_open():
    # conftest 的 _no_redis 已把 _client 设为 None：Redis 不可用时应放行（返回 True）
    assert cache.acquire_job_lock("daily_pipeline") is True


def test_acquire_job_lock_dedups_same_day(monkeypatch):
    monkeypatch.setattr(cache, "_client", _FakeRedis())
    assert cache.acquire_job_lock("daily_pipeline") is True   # 第一个 worker 抢到锁
    assert cache.acquire_job_lock("daily_pipeline") is False  # 第二个 worker 同一天再抢，失败


def test_acquire_job_lock_different_jobs_independent(monkeypatch):
    monkeypatch.setattr(cache, "_client", _FakeRedis())
    assert cache.acquire_job_lock("daily_pipeline") is True
    assert cache.acquire_job_lock("weekly_digest") is True  # 不同任务名互不影响
