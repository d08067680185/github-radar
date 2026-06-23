"""轻量分析：聚合查询 + 公开端点。直接插 AnalyticsEvent 测聚合（track() 用独立 session 不便测）。"""
from app.models import AnalyticsEvent
from app.analytics import top_searches, top_repos, KIND_SEARCH, KIND_REPO_VIEW, normalize_query


def _ev(db, kind, key):
    db.add(AnalyticsEvent(kind=kind, key=key))


def test_normalize_query():
    assert normalize_query("  React Hooks ") == "react hooks"
    assert normalize_query("") == ""


def test_top_searches_aggregation(db):
    for k in ["react", "react", "react", "vue", "vue"]:
        _ev(db, KIND_SEARCH, k)
    _ev(db, KIND_REPO_VIEW, "a/b")  # 不应混入搜索榜
    db.commit()
    out = top_searches(db, days=7, limit=10)
    assert out[0] == {"query": "react", "count": 3}
    assert out[1] == {"query": "vue", "count": 2}
    assert all(r["query"] != "a/b" for r in out)


def test_top_repos_joins_projects(db, make_project):
    make_project(full_name="acme/hot")
    make_project(full_name="acme/cold")
    for _ in range(3):
        _ev(db, KIND_REPO_VIEW, "acme/hot")
    _ev(db, KIND_REPO_VIEW, "acme/cold")
    _ev(db, KIND_REPO_VIEW, "ghost/gone")  # 不在库 → 不应出现
    db.commit()
    repos = top_repos(db, days=7, limit=10)
    names = [p.full_name for p in repos]
    assert names[0] == "acme/hot"
    assert "acme/cold" in names
    assert "ghost/gone" not in names


def test_top_searches_endpoint(client, db):
    _ev(db, KIND_SEARCH, "rust")
    db.commit()
    out = client.get("/api/analytics/top-searches").json()
    assert any(r["query"] == "rust" for r in out)
