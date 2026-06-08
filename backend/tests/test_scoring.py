"""评分维度测试（纯函数，无需 DB/网络）。"""
from datetime import datetime, timezone, timedelta
from types import SimpleNamespace

from app.scorer.compute import heat_score, activity_score, health_score


def _now():
    return datetime.now(timezone.utc)


# ---- 热度（log 平滑）----
def test_heat_zero_for_no_stars():
    assert heat_score(0) == 0.0


def test_heat_monotonic_increasing():
    assert heat_score(1000) < heat_score(50000) < heat_score(200000)


def test_heat_bounded_0_100():
    assert 0 <= heat_score(500) <= 100
    assert heat_score(10_000_000) <= 100  # 超大值也不超 100


def test_heat_log_smoothing():
    # log 平滑：10倍 star 差距，得分差距远小于 10 倍
    low = heat_score(5000)
    high = heat_score(50000)
    assert high - low < 40  # 不是线性碾压


# ---- 活跃度（指数衰减）----
def test_activity_none_push_is_zero():
    assert activity_score(None, None) == 0.0


def test_activity_recent_higher_than_stale():
    recent = activity_score(_now() - timedelta(days=1), None)
    stale = activity_score(_now() - timedelta(days=400), None)
    assert recent > stale


def test_activity_release_adds_score():
    no_release = activity_score(_now() - timedelta(days=5), None)
    with_release = activity_score(_now() - timedelta(days=5), _now() - timedelta(days=2))
    assert with_release > no_release


def test_activity_bounded():
    v = activity_score(_now(), _now())
    assert 0 <= v <= 100


# ---- 健康度（规则）----
def _proj(**kw):
    base = dict(license=None, description=None, topics=[], homepage=None, is_archived=False)
    base.update(kw)
    return SimpleNamespace(**base)


def test_health_empty_project_low():
    # 只剩"未归档"加分
    assert health_score(_proj()) == 15


def test_health_full_project_high():
    p = _proj(license="MIT", description="desc", topics=["a", "b", "c", "d", "e"],
              homepage="https://x.com")
    assert health_score(p) == 100


def test_health_archived_penalty():
    p = _proj(license="MIT", description="d", topics=["a"], homepage="https://x", is_archived=True)
    not_archived = _proj(license="MIT", description="d", topics=["a"], homepage="https://x")
    assert health_score(p) < health_score(not_archived)


def test_health_bounded():
    p = _proj(license="MIT", description="d", topics=["a"] * 20, homepage="https://x")
    assert health_score(p) <= 100
