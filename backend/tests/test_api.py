"""API 端点集成测试（带真实测试库）。"""


def test_top_ranking_order_and_total(client, make_project):
    make_project(full_name="a/low", score=10)
    make_project(full_name="a/high", score=99)
    make_project(full_name="a/mid", score=50)
    r = client.get("/api/rankings/top?limit=2")
    assert r.status_code == 200
    body = r.json()
    assert [p["full_name"] for p in body] == ["a/high", "a/mid"]  # 按 score 降序
    assert r.headers["X-Total-Count"] == "3"


def test_top_pagination_offset(client, make_project):
    for i in range(5):
        make_project(full_name=f"a/r{i}", score=i)
    page1 = client.get("/api/rankings/top?limit=2&offset=0").json()
    page2 = client.get("/api/rankings/top?limit=2&offset=2").json()
    assert {p["full_name"] for p in page1} & {p["full_name"] for p in page2} == set()


def test_archived_excluded(client, make_project):
    make_project(full_name="a/live", is_archived=False)
    make_project(full_name="a/dead", is_archived=True)
    names = [p["full_name"] for p in client.get("/api/rankings/top").json()]
    assert "a/live" in names and "a/dead" not in names


def test_search_filters(client, make_project):
    make_project(full_name="a/py", language="Python", stars=5000)
    make_project(full_name="a/rs", language="Rust", stars=8000)
    out = client.get("/api/search?language=Rust").json()
    assert [p["full_name"] for p in out] == ["a/rs"]
    # min_stars 过滤
    out2 = client.get("/api/search?min_stars=6000").json()
    assert [p["full_name"] for p in out2] == ["a/rs"]


def test_search_keyword(client, make_project):
    make_project(full_name="a/kube", description="a kubernetes tool")
    make_project(full_name="a/other", description="something else")
    out = client.get("/api/search?q=kubernetes").json()
    assert [p["full_name"] for p in out] == ["a/kube"]


def test_project_detail_and_404(client, make_project):
    make_project(full_name="acme/widget", category="ai-ml")
    ok = client.get("/api/projects/acme/widget")
    assert ok.status_code == 200
    assert ok.json()["category_name"] == "AI / 机器学习"
    assert client.get("/api/projects/no/such").status_code == 404


def test_similar_same_category_first(client, make_project):
    make_project(full_name="me/self", category="ai-ml", language="Python", score=90)
    make_project(full_name="x/samecat", category="ai-ml", language="Go", score=80)
    make_project(full_name="y/samelang", category="devops", language="Python", score=85)
    out = client.get("/api/projects/me/self/similar").json()
    names = [p["full_name"] for p in out]
    assert "me/self" not in names                 # 排除自身
    assert names[0] == "x/samecat"                # 同领域优先于同语言


def test_stats(client, make_project):
    make_project(language="Python", category="ai-ml", stars=1000)
    make_project(language="Rust", category="devops", stars=9000)
    s = client.get("/api/stats").json()
    assert s["projects"] == 2
    assert s["languages"] == 2
    assert s["max_stars"] == 9000
