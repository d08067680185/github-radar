"""Admin 端点鉴权 + 功能集成测试。"""
import pytest


TEST_TOKEN = "test-admin-secret"


@pytest.fixture
def admin_client(client, monkeypatch):
    """将 settings.admin_token 临时设为测试 token，返回已配置的 client。"""
    from app import config as cfg
    monkeypatch.setattr(cfg.settings, "admin_token", TEST_TOKEN)
    return client


def test_admin_no_token(client, monkeypatch):
    from app import config as cfg
    monkeypatch.setattr(cfg.settings, "admin_token", TEST_TOKEN)
    r = client.get("/admin/quality")
    assert r.status_code == 401


def test_admin_wrong_token(client, monkeypatch):
    from app import config as cfg
    monkeypatch.setattr(cfg.settings, "admin_token", TEST_TOKEN)
    r = client.get("/admin/quality", headers={"X-Admin-Token": "wrong"})
    assert r.status_code == 401


def test_admin_disabled(client):
    """未配置 ADMIN_TOKEN 时一律 403。"""
    from app import config as cfg
    orig = cfg.settings.admin_token
    cfg.settings.admin_token = ""
    r = client.get("/admin/quality", headers={"X-Admin-Token": "anything"})
    cfg.settings.admin_token = orig
    assert r.status_code == 403


def test_admin_quality(admin_client, make_project):
    make_project(full_name="a/p1", score=80)
    make_project(full_name="a/p2", score=40)
    r = admin_client.get("/admin/quality", headers={"X-Admin-Token": TEST_TOKEN})
    assert r.status_code == 200
    body = r.json()
    assert "total_projects" in body
    assert body["total_projects"] >= 2
    assert "by_category" in body
    assert "score_distribution" in body
    assert "unclassified_pct" in body
    assert "ai_summary_coverage" in body
    assert "snapshot_coverage_7d" in body
    assert "active_subscribers" in body


def test_admin_logs(admin_client):
    r = admin_client.get("/admin/logs", headers={"X-Admin-Token": TEST_TOKEN})
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_admin_analytics_summary(admin_client):
    r = admin_client.get("/admin/analytics-summary", headers={"X-Admin-Token": TEST_TOKEN})
    assert r.status_code == 200
    body = r.json()
    assert "total_searches_7d" in body
    assert "total_views_7d" in body
    assert "top_searches" in body
    assert "top_repos" in body
