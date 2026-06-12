"""backfill 纯函数单测：采样页选取 + 线性插值。"""
from datetime import datetime, timezone, timedelta

from app.collector.backfill import _sample_pages, _interpolate


def _dt(days_ago: float) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days_ago)


def test_sample_pages_small_repo_returns_all():
    assert _sample_pages(5, n=14) == [1, 2, 3, 4, 5]


def test_sample_pages_contains_endpoints_and_is_sorted():
    pages = _sample_pages(400, n=14)
    assert pages[0] == 1 and pages[-1] == 400
    assert pages == sorted(set(pages))
    assert len(pages) <= 14


def test_interpolate_midpoint():
    curve = [(_dt(100), 0), (_dt(0), 1000)]
    v = _interpolate(curve, _dt(50))
    assert v is not None and 480 <= v <= 520  # 线性中点 ≈ 500


def test_interpolate_outside_range_returns_none():
    curve = [(_dt(100), 0), (_dt(0), 1000)]
    assert _interpolate(curve, _dt(200)) is None  # 早于曲线起点 → 不外推


def test_interpolate_monotonic():
    curve = [(_dt(90), 100), (_dt(60), 400), (_dt(30), 700), (_dt(0), 1000)]
    values = [_interpolate(curve, _dt(d)) for d in (80, 50, 20, 5)]
    assert all(v is not None for v in values)
    assert values == sorted(values)  # 越近现在 star 越多
