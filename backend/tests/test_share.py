"""公开收藏集分享：发布 / 公开读取 / 私密 404 / slug 稳定。"""


def _register(client, email="sharer@test.com", pw="secret123"):
    r = client.post("/api/auth/register", json={"email": email, "password": pw})
    assert r.status_code == 201, r.text
    return r.json()["access_token"]


def test_share_publish_and_public_read(client, make_project):
    make_project(full_name="acme/a")
    make_project(full_name="acme/b")
    token = _register(client)
    h = {"Authorization": f"Bearer {token}"}
    client.post("/api/favorites", json={"full_name": "acme/a", "tags": ["工具"], "note": "好用"}, headers=h)
    client.post("/api/favorites", json={"full_name": "acme/b"}, headers=h)

    # 默认未公开
    s0 = client.get("/api/me/share", headers=h).json()
    assert s0["listed"] is False and s0["slug"] is None and s0["count"] == 2

    # 开启分享 + 标题
    s1 = client.put("/api/me/share", json={"listed": True, "title": "我的精选"}, headers=h).json()
    assert s1["listed"] is True and s1["slug"] and s1["title"] == "我的精选"
    slug = s1["slug"]

    # 公开读取（无需登录）
    pub = client.get(f"/api/list/{slug}").json()
    assert pub["title"] == "我的精选" and pub["count"] == 2
    names = {it["project"]["full_name"] for it in pub["items"]}
    assert names == {"acme/a", "acme/b"}
    a = next(it for it in pub["items"] if it["project"]["full_name"] == "acme/a")
    assert a["tags"] == ["工具"] and a["note"] == "好用"


def test_unpublished_returns_404(client, make_project):
    make_project(full_name="acme/a")
    token = _register(client, email="x@test.com")
    h = {"Authorization": f"Bearer {token}"}
    client.post("/api/favorites", json={"full_name": "acme/a"}, headers=h)
    s = client.put("/api/me/share", json={"listed": True}, headers=h).json()
    slug = s["slug"]
    # 关闭后公开页 404
    client.put("/api/me/share", json={"listed": False}, headers=h)
    assert client.get(f"/api/list/{slug}").status_code == 404
    # 不存在的 slug 也 404
    assert client.get("/api/list/nonexistent").status_code == 404


def test_slug_stable_across_toggle(client, make_project):
    token = _register(client, email="y@test.com")
    h = {"Authorization": f"Bearer {token}"}
    slug1 = client.put("/api/me/share", json={"listed": True}, headers=h).json()["slug"]
    client.put("/api/me/share", json={"listed": False}, headers=h)
    slug2 = client.put("/api/me/share", json={"listed": True}, headers=h).json()["slug"]
    assert slug1 == slug2  # 关闭再开不换链接


def test_share_requires_auth(client):
    assert client.get("/api/me/share").status_code == 401
    assert client.put("/api/me/share", json={"listed": True}).status_code == 401
