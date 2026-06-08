"""集成测试夹具：独立测试库 + TestClient。

需要 Postgres 在跑（本地 docker compose / CI 的 postgres service）；
连不上则该 fixture 下的测试整体 skip，纯函数单测不受影响。
"""
import os

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

TEST_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+psycopg://radar:radar@localhost:5432/github_radar_test",
)


@pytest.fixture(autouse=True)
def _no_redis(monkeypatch):
    """测试中禁用 Redis（缓存/限流），避免跨测试串数据。"""
    import app.cache
    import app.ratelimit
    monkeypatch.setattr(app.cache, "_client", None)
    monkeypatch.setattr(app.ratelimit, "_redis", None)


def _ensure_test_db():
    """连到 postgres 默认库，按需创建测试库。连不上则返回 False。"""
    import psycopg
    admin_url = TEST_URL.rsplit("/", 1)[0].replace("postgresql+psycopg", "postgresql") + "/postgres"
    dbname = TEST_URL.rsplit("/", 1)[1]
    try:
        conn = psycopg.connect(admin_url, autocommit=True, connect_timeout=3)
    except Exception:
        return False
    try:
        exists = conn.execute(
            "SELECT 1 FROM pg_database WHERE datname=%s", (dbname,)
        ).fetchone()
        if not exists:
            conn.execute(f'CREATE DATABASE "{dbname}"')
    finally:
        conn.close()
    return True


@pytest.fixture(scope="session")
def engine():
    if not _ensure_test_db():
        pytest.skip("Postgres 不可用，跳过集成测试")
    from app.db import Base
    from app import models  # noqa: F401  注册模型
    eng = create_engine(TEST_URL, future=True)
    Base.metadata.drop_all(eng)
    Base.metadata.create_all(eng)
    yield eng
    eng.dispose()


@pytest.fixture
def db(engine):
    """每个测试前清空所有表，保证隔离。"""
    from app.db import Base
    Session = sessionmaker(bind=engine, future=True)
    s = Session()
    for tbl in reversed(Base.metadata.sorted_tables):
        s.execute(tbl.delete())
    s.commit()
    yield s
    s.close()


@pytest.fixture
def client(engine, db):
    from fastapi.testclient import TestClient
    from app.main import app
    from app.db import get_db
    Session = sessionmaker(bind=engine, future=True)

    def _override():
        s = Session()
        try:
            yield s
        finally:
            s.close()

    app.dependency_overrides[get_db] = _override
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def make_project(db):
    """工厂：快速插入一个项目（带合理默认值）。"""
    from datetime import datetime, timezone
    from app.models import Project
    _seq = {"n": 0}

    def _make(**kw):
        _seq["n"] += 1
        i = _seq["n"]
        defaults = dict(
            github_id=1000 + i, full_name=f"owner{i}/repo{i}", owner=f"owner{i}",
            name=f"repo{i}", language="Python", topics=[], stars=1000 * i,
            forks=10, open_issues=5, score=50 + i, growth_score=0,
            activity_score=50, health_score=50, heat_score=50,
            category="ai-ml", is_archived=False,
            pushed_at=datetime.now(timezone.utc),
        )
        defaults.update(kw)
        p = Project(**defaults)
        db.add(p)
        db.commit()
        db.refresh(p)
        return p

    return _make
