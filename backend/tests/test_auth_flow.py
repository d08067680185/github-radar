"""认证 + 收藏 + 推荐 端到端流程。"""


def _register(client, email="u@test.com", pw="secret123"):
    r = client.post("/api/auth/register", json={"email": email, "password": pw})
    assert r.status_code == 201, r.text
    return r.json()["access_token"]


def test_register_login_duplicate(client):
    _register(client)
    # 重复注册 409
    dup = client.post("/api/auth/register", json={"email": "u@test.com", "password": "secret123"})
    assert dup.status_code == 409
    # 登录成功
    ok = client.post("/api/auth/login", json={"email": "u@test.com", "password": "secret123"})
    assert ok.status_code == 200 and ok.json()["access_token"]
    # 错误密码 401
    bad = client.post("/api/auth/login", json={"email": "u@test.com", "password": "wrong"})
    assert bad.status_code == 401


def test_short_password_rejected(client):
    r = client.post("/api/auth/register", json={"email": "x@test.com", "password": "123"})
    assert r.status_code == 400


def test_favorites_requires_auth(client):
    assert client.get("/api/favorites").status_code == 401


def test_favorite_add_list_remove(client, make_project):
    make_project(full_name="acme/widget")
    token = _register(client)
    h = {"Authorization": f"Bearer {token}"}

    add = client.post("/api/favorites", json={"full_name": "acme/widget"}, headers=h)
    assert add.status_code == 201
    assert client.get("/api/favorites/ids", headers=h).json() == ["acme/widget"]
    lst = client.get("/api/favorites", headers=h).json()
    assert [p["full_name"] for p in lst] == ["acme/widget"]

    client.delete("/api/favorites/acme/widget", headers=h)
    assert client.get("/api/favorites/ids", headers=h).json() == []


def test_recommend_prefers_favorited_language(client, make_project):
    # 收藏一个 Rust 项目后，推荐应偏向 Rust
    make_project(full_name="fav/rust", language="Rust", category="devops", score=70)
    make_project(full_name="other/rust", language="Rust", category="devops", score=60)
    make_project(full_name="other/py", language="Python", category="ai-ml", score=95)
    token = _register(client)
    h = {"Authorization": f"Bearer {token}"}
    client.post("/api/favorites", json={"full_name": "fav/rust"}, headers=h)

    rec = client.get("/api/recommend?limit=2", headers=h).json()
    names = [p["full_name"] for p in rec]
    assert "fav/rust" not in names              # 排除已收藏
    assert names[0] == "other/rust"             # 同语言偏好加权胜过更高分的 py


def test_recommend_no_favorites_falls_back(client, make_project):
    make_project(full_name="a/top", score=99)
    token = _register(client)
    h = {"Authorization": f"Bearer {token}"}
    rec = client.get("/api/recommend", headers=h).json()
    assert rec[0]["full_name"] == "a/top"       # 无收藏回退综合榜
