"""周报订阅 + 退订 + 周报内容构建 测试。"""
from datetime import date, timedelta


def test_subscribe_idempotent_and_reactivate(client, db):
    from app.models import Subscriber
    r1 = client.post("/api/subscribe", json={"email": "a@test.com"})
    assert r1.status_code == 200
    # 重复订阅不报错（幂等），仍只有一条
    r2 = client.post("/api/subscribe", json={"email": "A@test.com"})  # 大小写归一
    assert r2.status_code == 200
    subs = db.execute(__import__("sqlalchemy").select(Subscriber)).scalars().all()
    assert len(subs) == 1 and subs[0].active is True and subs[0].email == "a@test.com"


def test_unsubscribe_by_token(client, db):
    from sqlalchemy import select
    from app.models import Subscriber
    client.post("/api/subscribe", json={"email": "b@test.com"})
    sub = db.execute(select(Subscriber).where(Subscriber.email == "b@test.com")).scalar_one()
    tok = sub.token
    assert client.post("/api/unsubscribe", json={"token": tok}).status_code == 200
    db.refresh(sub)
    assert sub.active is False
    # 无效 token 也返回 ok（不泄露）
    assert client.post("/api/unsubscribe", json={"token": "nope"}).status_code == 200


def test_digest_preview_html(client, make_project):
    make_project(full_name="acme/star", stars=9000, score=88)
    r = client.get("/api/digest/preview")
    assert r.status_code == 200
    assert "acme/star" in r.text and "GitHub Radar" in r.text


def test_build_weekly_digest_prefers_movers(db, make_project):
    from app.models import ProjectSnapshot
    from app.digest import build_weekly_digest
    big = make_project(full_name="a/mover", stars=5000, growth_score=10)
    make_project(full_name="a/trend", stars=8000, growth_score=99)  # 高 growth 但无快照增量
    today = date.today()
    db.add_all([
        ProjectSnapshot(project_id=big.id, snapshot_date=today - timedelta(days=6),
                        stars=4000, forks=0, open_issues=0),
        ProjectSnapshot(project_id=big.id, snapshot_date=today, stars=5000, forks=0, open_issues=0),
    ])
    db.commit()
    items = build_weekly_digest(db, limit=10)
    # 有真实快照增量 → 优先 movers（a/mover 在首位，带 star_gain）
    assert items[0]["project"].full_name == "a/mover"
    assert items[0]["star_gain"] == 1000


def test_build_weekly_digest_falls_back_to_trending(db, make_project):
    from app.digest import build_weekly_digest
    make_project(full_name="a/low", growth_score=5, score=10)
    make_project(full_name="a/hot", growth_score=80, score=50)
    items = build_weekly_digest(db, limit=10)
    # 无任何快照增量 → 回退 trending（按 growth_score），star_gain 为 None
    assert items[0]["project"].full_name == "a/hot"
    assert items[0]["star_gain"] is None
