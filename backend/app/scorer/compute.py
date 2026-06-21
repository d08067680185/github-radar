"""综合评分。

Phase 1：先实现 heat + activity + growth(若有快照)，health 用轻量规则。
权重见蓝图：
  score = 0.30*growth + 0.25*activity + 0.25*health + 0.20*heat
冷启动期 growth 无快照 → 置 0，并把权重临时归一化到其余三项。
"""
import logging
import math
from datetime import date, datetime, timezone, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Project, ProjectSnapshot, CollectLog
from app.scorer.classify import classify

logger = logging.getLogger(__name__)

W_GROWTH, W_ACTIVITY, W_HEALTH, W_HEAT = 0.30, 0.25, 0.25, 0.20

# heat 归一化基准：log10(stars) 大致落在 [2.7(=500), 5.3(=200k)]
_HEAT_LO, _HEAT_HI = math.log10(500), math.log10(200_000)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def heat_score(stars: int) -> float:
    """log 平滑，避免超级项目碾压。归一化到 0~100。"""
    if stars <= 0:
        return 0.0
    v = math.log10(stars)
    pct = (v - _HEAT_LO) / (_HEAT_HI - _HEAT_LO)
    return max(0.0, min(1.0, pct)) * 100


def activity_score(pushed_at: datetime | None, last_release_at: datetime | None) -> float:
    """基于最近 push / release 距今天数做指数衰减。"""
    if pushed_at is None:
        return 0.0
    days = (_now() - pushed_at).days
    # 半衰期 ~30 天：30 天前的活跃度算一半
    push_part = math.exp(-days / 43.0) * 80  # 满分 80
    rel_part = 0.0
    if last_release_at is not None:
        rdays = (_now() - last_release_at).days
        rel_part = math.exp(-rdays / 90.0) * 20  # release 加分，满分 20
    return max(0.0, min(100.0, push_part + rel_part))


def health_score(p: Project) -> float:
    """轻量规则打分：有无 license / 描述 / topics / 主页 / 未归档。"""
    score = 0.0
    if p.license:
        score += 30
    if p.description:
        score += 20
    if p.topics:
        score += min(len(p.topics), 5) * 4  # 最多 20
    if p.homepage:
        score += 15
    if not p.is_archived:
        score += 15
    return min(100.0, score)


def growth_score(db: Session, project_id: int, current_stars: int) -> float | None:
    """近 7 日 star 增速归一化。无足够快照返回 None（冷启动）。"""
    cutoff = date.today() - timedelta(days=7)
    snap = db.execute(
        select(ProjectSnapshot.stars)
        .where(
            ProjectSnapshot.project_id == project_id,
            ProjectSnapshot.snapshot_date <= cutoff,
        )
        .order_by(ProjectSnapshot.snapshot_date.desc())
        .limit(1)
    ).scalar_one_or_none()
    if snap is None:
        return None
    rate = (current_stars - snap) / max(snap, 1)  # 7 日增长率
    # 7 日增长 20% 视为很高 → 映射到接近满分
    return max(0.0, min(1.0, rate / 0.20)) * 100


def compute_all(db: Session) -> int:
    projects = db.query(Project).all()
    for p in projects:
        heat = heat_score(p.stars)
        activity = activity_score(p.pushed_at, p.last_release_at)
        health = health_score(p)
        growth = growth_score(db, p.id, p.stars)

        if growth is None:
            # 冷启动：把 growth 权重按比例分摊给其余三项
            denom = W_ACTIVITY + W_HEALTH + W_HEAT
            total = (
                W_ACTIVITY * activity + W_HEALTH * health + W_HEAT * heat
            ) / denom
            growth = 0.0
        else:
            total = (
                W_GROWTH * growth + W_ACTIVITY * activity
                + W_HEALTH * health + W_HEAT * heat
            )

        p.growth_score = round(growth, 2)
        p.activity_score = round(activity, 2)
        p.health_score = round(health, 2)
        p.heat_score = round(heat, 2)
        p.score = round(total, 2)
        p.category = classify(p.topics, p.language, p.description, p.readme_summary_en)

    db.add(CollectLog(task="score", status="ok", repos_affected=len(projects)))
    db.commit()
    logger.info("评分完成，处理 %d 个项目", len(projects))
    return len(projects)
