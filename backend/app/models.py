from datetime import datetime, date

from sqlalchemy import (
    BigInteger, String, Text, Integer, Numeric, Boolean,
    DateTime, Date, ForeignKey, UniqueConstraint, Index, func,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Project(Base):
    """项目主表 —— 当前快照 + 评分。"""
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    github_id: Mapped[int] = mapped_column(BigInteger, unique=True, index=True)
    full_name: Mapped[str] = mapped_column(Text, unique=True)  # owner/repo
    owner: Mapped[str] = mapped_column(Text)
    name: Mapped[str] = mapped_column(Text)

    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    homepage: Mapped[str | None] = mapped_column(Text, nullable=True)
    language: Mapped[str | None] = mapped_column(String(64), index=True, nullable=True)
    topics: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)
    license: Mapped[str | None] = mapped_column(String(128), nullable=True)
    readme_summary: Mapped[str | None] = mapped_column(Text, nullable=True)        # 中文一句话简介
    readme_summary_en: Mapped[str | None] = mapped_column(Text, nullable=True)     # 英文一句话简介

    stars: Mapped[int] = mapped_column(Integer, default=0)
    forks: Mapped[int] = mapped_column(Integer, default=0)
    open_issues: Mapped[int] = mapped_column(Integer, default=0)
    contributors: Mapped[int] = mapped_column(Integer, default=0)
    watchers: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    pushed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_release_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # 评分（每日重算）
    score: Mapped[float] = mapped_column(Numeric(6, 2), default=0, index=True)
    growth_score: Mapped[float] = mapped_column(Numeric(6, 2), default=0)
    activity_score: Mapped[float] = mapped_column(Numeric(6, 2), default=0)
    health_score: Mapped[float] = mapped_column(Numeric(6, 2), default=0)
    heat_score: Mapped[float] = mapped_column(Numeric(6, 2), default=0)

    category: Mapped[str | None] = mapped_column(String(64), index=True, nullable=True)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)

    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    # 最近一次被发现任务命中的时间——长期未命中视为僵尸（删除/转移/跌出阈值），可清理
    last_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

    snapshots: Mapped[list["ProjectSnapshot"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )


class ProjectSnapshot(Base):
    """历史快照 —— 每日一条/项目。系统护城河，用于算增长趋势。"""
    __tablename__ = "project_snapshots"
    __table_args__ = (
        UniqueConstraint("project_id", "snapshot_date", name="uq_snapshot_project_date"),
        Index("idx_snapshots_project_date", "project_id", "snapshot_date"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    project_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("projects.id", ondelete="CASCADE")
    )
    snapshot_date: Mapped[date] = mapped_column(Date)
    stars: Mapped[int] = mapped_column(Integer)
    forks: Mapped[int] = mapped_column(Integer)
    open_issues: Mapped[int] = mapped_column(Integer)
    contributors: Mapped[int] = mapped_column(Integer, default=0)

    project: Mapped["Project"] = relationship(back_populates="snapshots")


class CollectLog(Base):
    """采集任务日志 —— 监控限流/失败。"""
    __tablename__ = "collect_logs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    task: Mapped[str] = mapped_column(String(64))          # discover / snapshot / score
    status: Mapped[str] = mapped_column(String(32))        # ok / error
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    repos_affected: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class DigestArchive(Base):
    """每周精选周报的历史存档（可公开浏览 + SEO）。每周一条，按 week_date 幂等。"""
    __tablename__ = "digest_archives"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    week_date: Mapped[date] = mapped_column(Date, unique=True, index=True)  # 该周周一
    title: Mapped[str] = mapped_column(Text)
    item_count: Mapped[int] = mapped_column(Integer, default=0)
    # 结构化条目：[{full_name, stars, score, star_gain, language, summary_zh, summary_en}, ...]
    items: Mapped[list] = mapped_column(JSONB, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Subscriber(Base):
    """周报邮件订阅者。token 用于一键退订（无需登录）。"""
    __tablename__ = "subscribers"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True)  # 退订令牌
    active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    locale: Mapped[str] = mapped_column(String(8), default="zh", server_default="zh")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class User(Base):
    """用户。"""
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # 公开收藏集分享：整个收藏夹可发布成一个公开页（tags 作分区、note 作点评）。
    # slug 一经生成即稳定（关闭再开不换链接）；public_listed 控制是否对外可见。
    public_slug: Mapped[str | None] = mapped_column(String(32), unique=True, index=True, nullable=True)
    public_listed: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    public_title: Mapped[str | None] = mapped_column(String(120), nullable=True)

    favorites: Mapped[list["Favorite"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class Favorite(Base):
    """用户收藏的项目。"""
    __tablename__ = "favorites"
    __table_args__ = (
        UniqueConstraint("user_id", "project_id", name="uq_favorite_user_project"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    project_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("projects.id", ondelete="CASCADE")
    )
    tags: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list, server_default="{}")  # 用户自定义分组标签
    note: Mapped[str | None] = mapped_column(Text, nullable=True)                              # 私人备注
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="favorites")
    project: Mapped["Project"] = relationship()


class AnalyticsEvent(Base):
    """隐私友好的轻量分析事件：只记 类型 + 键 + 时间，无 cookie / IP / 任何 PII。

    kind: 'search'（key=归一化查询词）/ 'repo_view'（key=full_name）。
    用于聚合「热门搜索 / 最多人看的项目」，旧事件由 pipeline 定期清理。
    """
    __tablename__ = "analytics_events"
    __table_args__ = (
        Index("idx_analytics_kind_created", "kind", "created_at"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    kind: Mapped[str] = mapped_column(String(16))
    key: Mapped[str] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
