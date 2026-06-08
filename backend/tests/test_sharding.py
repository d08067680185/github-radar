"""search_repos_sharded 自适应二分逻辑测试（mock 网络，无需 DB/token）。"""
import re

import pytest

from app.collector.github_client import GitHubClient


def _make_client(universe: list[int]):
    """universe = star 值列表，代表全站仓库。mock 掉网络方法。"""
    c = GitHubClient(tokens=["fake-token"])
    repos = [
        {"github_id": i, "full_name": f"r/{i}", "stars": s}
        for i, s in enumerate(sorted(universe, reverse=True))
    ]

    def _in_range(q: str):
        m = re.search(r"stars:(\d+)\.\.(\d+)", q)
        if m:
            lo, hi = int(m.group(1)), int(m.group(2))
        else:
            ge = int(re.search(r"stars:>=(\d+)", q).group(1))
            lo, hi = ge, 10**9
        return [r for r in repos if lo <= r["stars"] <= hi]

    def fake_count(q):
        rng = _in_range(q)
        return len(rng), (rng[0]["stars"] if rng else 0)

    def fake_fetch(q, cap):
        return _in_range(q)[:cap]

    c._search_count = fake_count
    c._fetch_query = fake_fetch
    return c


def test_small_universe_single_shard():
    c = _make_client([1000, 800, 600])  # 全部 <1000 条
    out = c.search_repos_sharded(min_stars=500, max_total=100)
    assert len(out) == 3
    c.close()


def test_large_universe_bisects_past_1000():
    # 2500 个 star 互不相同的仓库 → 必须二分（单查询上限 1000）
    universe = list(range(500, 500 + 2500))
    c = _make_client(universe)
    out = c.search_repos_sharded(min_stars=500, max_total=2500)
    ids = [r["github_id"] for r in out]
    assert len(out) == 2500
    assert len(set(ids)) == 2500          # 跨分片去重，无重复
    c.close()


def test_respects_max_total():
    universe = list(range(500, 500 + 2000))
    c = _make_client(universe)
    out = c.search_repos_sharded(min_stars=500, max_total=300)
    assert len(out) == 300
    c.close()


def test_high_star_first():
    # 返回应从高 star 开始（综合榜要头部）
    universe = list(range(500, 500 + 1500))
    c = _make_client(universe)
    out = c.search_repos_sharded(min_stars=500, max_total=10)
    stars = [r["stars"] for r in out]
    assert stars == sorted(stars, reverse=True)
    assert max(stars) == 1999
    c.close()


def test_empty_universe():
    c = _make_client([])
    assert c.search_repos_sharded(min_stars=500, max_total=100) == []
    c.close()
