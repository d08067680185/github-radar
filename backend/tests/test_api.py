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


def test_top_sort_options(client, make_project):
    make_project(full_name="a/p1", score=50, stars=9000, forks=10, growth_score=20)
    make_project(full_name="a/p2", score=90, stars=1000, forks=99, growth_score=80)
    # 默认 score 降序
    assert [p["full_name"] for p in client.get("/api/rankings/top").json()] == ["a/p2", "a/p1"]
    # 按 stars
    assert [p["full_name"] for p in client.get("/api/rankings/top?sort=stars").json()] == ["a/p1", "a/p2"]
    # 按 forks
    assert [p["full_name"] for p in client.get("/api/rankings/top?sort=forks").json()] == ["a/p2", "a/p1"]
    # 按 growth
    assert [p["full_name"] for p in client.get("/api/rankings/top?sort=growth").json()] == ["a/p2", "a/p1"]
    # 非法 sort 回退 score
    assert [p["full_name"] for p in client.get("/api/rankings/top?sort=bogus").json()] == ["a/p2", "a/p1"]


def test_top_sort_newest_updated(client, make_project):
    from datetime import datetime, timezone, timedelta
    now = datetime.now(timezone.utc)
    make_project(full_name="a/old", created_at=now - timedelta(days=100), pushed_at=now - timedelta(days=50), score=80)
    make_project(full_name="a/new", created_at=now - timedelta(days=2), pushed_at=now - timedelta(days=1), score=10)
    assert [p["full_name"] for p in client.get("/api/rankings/top?sort=newest").json()] == ["a/new", "a/old"]
    assert [p["full_name"] for p in client.get("/api/rankings/top?sort=updated").json()] == ["a/new", "a/old"]


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


def test_standing_rank_and_percentile(client, make_project):
    # 同领域 4 个项目，按 score 竞赛排名
    make_project(full_name="a/top", category="ai-ml", score=90)
    make_project(full_name="a/second", category="ai-ml", score=70)
    make_project(full_name="a/third", category="ai-ml", score=50)
    make_project(full_name="a/last", category="ai-ml", score=10)
    # 别的领域不应计入
    make_project(full_name="b/other", category="web-frontend", score=99)

    out = client.get("/api/projects/a/second/standing").json()
    assert out["category"] == "ai-ml"
    assert out["rank"] == 2
    assert out["total"] == 4
    assert out["percentile"] == 50.0  # (4-2)/4*100
    assert [p["full_name"] for p in out["top"]] == ["a/top", "a/second", "a/third", "a/last"]


def test_standing_no_category(client, make_project):
    make_project(full_name="a/uncat", category=None)
    out = client.get("/api/projects/a/uncat/standing").json()
    assert out["category"] is None
    assert out["top"] == []


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


def test_map_nodes(client, make_project):
    make_project(full_name="a/low", score=10, stars=500, category="ai-ml", language="Python")
    make_project(full_name="a/high", score=99, stars=9000, category="web-frontend", language="TS")
    make_project(full_name="a/arch", score=80, is_archived=True)
    out = client.get("/api/map?limit=10").json()
    names = [n["full_name"] for n in out]
    assert names == ["a/high", "a/low"]          # 按 score 降序、排除归档
    # 精简字段齐全（含四维供侧栏），且不含 description/topics 等重字段
    n = out[0]
    assert set(n) == {"full_name", "stars", "score", "growth_score", "activity_score",
                      "health_score", "heat_score", "category", "language"}


def test_map_timeline(client, make_project, db):
    from datetime import date, timedelta
    from app.models import ProjectSnapshot
    p = make_project(full_name="a/grow", stars=5000, score=90)
    make_project(full_name="a/nohist", stars=3000, score=80)  # 无快照 → 恒定
    today = date.today()
    db.add_all([
        ProjectSnapshot(project_id=p.id, snapshot_date=today - timedelta(days=2), stars=4000, forks=0, open_issues=0),
        ProjectSnapshot(project_id=p.id, snapshot_date=today, stars=5000, forks=0, open_issues=0),
    ])
    db.commit()
    out = client.get("/api/map/timeline?days=30").json()
    assert len(out["dates"]) == 2                     # 两个快照日
    grow = next(n for n in out["nodes"] if n["full_name"] == "a/grow")
    assert grow["series"] == [4000, 5000]             # 按日期对齐
    nohist = next(n for n in out["nodes"] if n["full_name"] == "a/nohist")
    assert nohist["series"] == [3000, 3000]           # 无快照 → 当前 stars 恒定


def test_map_respects_limit(client, make_project):
    for i in range(5):
        make_project(score=i)
    assert len(client.get("/api/map?limit=3").json()) == 3


def test_score_badge_svg(client, make_project):
    make_project(full_name="acme/widget", score=87)
    r = client.get("/api/badge/acme/widget.svg")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("image/svg+xml")
    assert "<svg" in r.text and "87 / 100" in r.text
    assert "GitHub Radar" in r.text
    # 自定义 label
    r2 = client.get("/api/badge/acme/widget.svg?label=Radar+Score")
    assert "Radar Score" in r2.text


def test_score_badge_unknown_returns_grey(client):
    # 不存在的项目也返回有效 SVG（unknown），不 404，便于 <img> 嵌入
    r = client.get("/api/badge/no/such.svg")
    assert r.status_code == 200 and "unknown" in r.text


def test_topics_aggregate_and_filter(client, make_project):
    make_project(full_name="a/x", topics=["cli", "rust"], score=90)
    make_project(full_name="a/y", topics=["cli", "go"], score=80)
    make_project(full_name="a/z", topics=["web"], score=70)
    make_project(full_name="a/dead", topics=["cli"], is_archived=True)  # 归档不计
    # 热门 topic 聚合：cli 出现 2 次（排除归档）排第一
    tops = client.get("/api/topics").json()
    counts = {t["slug"]: t["count"] for t in tops}
    assert counts["cli"] == 2 and counts.get("web") == 1
    # 单 topic 项目榜（按 score 降序）
    r = client.get("/api/topic/cli")
    assert r.headers["X-Total-Count"] == "2"
    assert [p["full_name"] for p in r.json()] == ["a/x", "a/y"]


def test_search_suggest_prefix_first(client, make_project):
    make_project(full_name="vercel/next.js", name="next.js", stars=9000, score=95)
    make_project(full_name="remix-run/remix", name="remix", description="builds on next", stars=8000, score=80)
    make_project(full_name="nextauthjs/next-auth", name="next-auth", stars=5000, score=70)
    out = client.get("/api/search/suggest?q=next").json()
    names = [s["full_name"] for s in out]
    # 名称以 next 开头的排在前（next.js / next-auth），描述命中的 remix 靠后
    assert names[0] in ("vercel/next.js", "nextauthjs/next-auth")
    assert "remix-run/remix" in names and names.index("remix-run/remix") > 0
    # 精简字段
    assert set(out[0]) == {"full_name", "stars", "language", "category"}


def test_search_suggest_empty_query_rejected(client):
    assert client.get("/api/search/suggest?q=").status_code == 422


def test_movers_by_star_gain(client, make_project, db):
    from datetime import date, timedelta
    from app.models import ProjectSnapshot
    big = make_project(full_name="a/big", stars=12000)
    small = make_project(full_name="a/small", stars=1100)
    make_project(full_name="a/flat", stars=5000)   # 无快照 → 不出现
    today = date.today()
    # big: 10000→12000 (+2000), small: 1000→1100 (+100)
    db.add_all([
        ProjectSnapshot(project_id=big.id, snapshot_date=today - timedelta(days=6),
                        stars=10000, forks=0, open_issues=0),
        ProjectSnapshot(project_id=big.id, snapshot_date=today, stars=12000, forks=0, open_issues=0),
        ProjectSnapshot(project_id=small.id, snapshot_date=today - timedelta(days=6),
                        stars=1000, forks=0, open_issues=0),
        ProjectSnapshot(project_id=small.id, snapshot_date=today, stars=1100, forks=0, open_issues=0),
    ])
    db.commit()
    r = client.get("/api/rankings/movers?days=7&limit=10")
    out = r.json()
    assert [p["full_name"] for p in out] == ["a/big", "a/small"]   # 按绝对增量降序
    assert out[0]["star_gain"] == 2000
    assert out[1]["gain_pct"] == 10.0                              # 100/1000
    assert r.headers["X-Total-Count"] == "2"                       # 翻页总数
    # 翻页：offset 跳过第一个
    page2 = client.get("/api/rankings/movers?days=7&limit=1&offset=1").json()
    assert [p["full_name"] for p in page2] == ["a/small"]


def test_movers_empty_without_two_snapshots(client, make_project, db):
    from datetime import date
    from app.models import ProjectSnapshot
    p = make_project(full_name="a/one")
    db.add(ProjectSnapshot(project_id=p.id, snapshot_date=date.today(),
                           stars=100, forks=0, open_issues=0))
    db.commit()
    assert client.get("/api/rankings/movers").json() == []          # 单日快照 → 空


def test_org_aggregation(client, make_project):
    make_project(full_name="acme/a", owner="acme", category="ai-ml",
                 language="Python", stars=3000, score=90)
    make_project(full_name="acme/b", owner="acme", category="ai-ml",
                 language="Go", stars=2000, score=70)
    make_project(full_name="acme/dead", owner="acme", stars=999,
                 is_archived=True)            # 归档不计
    make_project(full_name="other/c", owner="other", stars=5000)
    r = client.get("/api/org/acme")
    assert r.status_code == 200
    body = r.json()
    assert body["owner"] == "acme"
    assert body["project_count"] == 2                      # 排除归档与他人
    assert body["total_stars"] == 5000
    assert body["avg_score"] == 80.0
    assert body["top_category"] == "ai-ml"
    assert [p["full_name"] for p in body["projects"]] == ["acme/a", "acme/b"]  # score 降序
    # 语言分布两种
    assert {c["slug"] for c in body["languages"]} == {"Python", "Go"}


def test_org_404(client, make_project):
    make_project(owner="someone")
    assert client.get("/api/org/nobody").status_code == 404


def test_stats(client, make_project):
    make_project(language="Python", category="ai-ml", stars=1000)
    make_project(language="Rust", category="devops", stars=9000)
    s = client.get("/api/stats").json()
    assert s["projects"] == 2
    assert s["languages"] == 2
    assert s["max_stars"] == 9000
