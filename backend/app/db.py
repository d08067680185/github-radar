from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.config import settings

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    future=True,
    pool_size=10,
    max_overflow=20,
    # 单条 SQL 超过 10s 自动中断，防止慢查询拖垮连接池
    connect_args={"options": "-c statement_timeout=10000"},
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, future=True)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI 依赖：每请求一个 session。"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """建表 —— 仅用于本地/测试的便捷初始化（幂等）。

    生产环境用 Alembic 管理 schema：`alembic upgrade head`。
    改了 models 后：`alembic revision --autogenerate -m "xxx"` 再 upgrade。
    """
    from app import models  # noqa: F401  确保模型被注册

    Base.metadata.create_all(bind=engine)
