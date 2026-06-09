"""命令行工具：手动跑各阶段，方便调试。

用法：
  python cli.py initdb        # 建表
  python cli.py discover      # 发现+入库（需 GITHUB_TOKENS）
  python cli.py snapshot      # 写当日快照
  python cli.py score         # 重算评分
  python cli.py pipeline      # 全流程
  python cli.py seed          # 灌入假数据（无需 token，验证闭环用）
"""
import sys

from app.db import init_db, SessionLocal


def cmd_initdb():
    init_db()
    print("✅ 建表完成")


def cmd_discover():
    from app.collector.discover import discover
    db = SessionLocal()
    try:
        n = discover(db)
        print(f"✅ discover 完成：{n} 个仓库")
    finally:
        db.close()


def cmd_snapshot():
    from app.collector.snapshot import take_snapshots
    db = SessionLocal()
    try:
        n = take_snapshots(db)
        print(f"✅ snapshot 完成：{n} 条")
    finally:
        db.close()


def cmd_score():
    from app.scorer.compute import compute_all
    from app.cache import invalidate_all
    db = SessionLocal()
    try:
        n = compute_all(db)
        invalidate_all()  # 评分变了，榜单缓存须失效
        print(f"✅ score 完成：{n} 个项目（缓存已失效）")
    finally:
        db.close()


def cmd_summarize():
    from app.scorer.summarize import summarize_backfill
    db = SessionLocal()
    try:
        n = summarize_backfill(db)
        print(f"✅ summarize 完成：{n} 条双语简介（中文 readme_summary + 英文 readme_summary_en）")
    finally:
        db.close()


def cmd_prune():
    from app.collector.discover import prune_stale
    db = SessionLocal()
    try:
        n = prune_stale(db)
        print(f"✅ prune 完成：清理 {n} 个僵尸项目")
    finally:
        db.close()


def cmd_pipeline():
    cmd_discover()
    cmd_snapshot()
    cmd_score()


def cmd_seed():
    """无 token 时灌入若干真实开源项目的假数据，验证评分+页面闭环。"""
    from datetime import datetime, timezone, timedelta
    from sqlalchemy.dialects.postgresql import insert as pg_insert
    from app.models import Project
    from app.scorer.compute import compute_all

    now = datetime.now(timezone.utc)
    samples = [
        ("facebook/react", "JavaScript", 230000, 47000, 800, "MIT", now - timedelta(days=1), ["ui", "frontend", "library"]),
        ("torvalds/linux", "C", 180000, 53000, 0, "GPL-2.0", now - timedelta(days=0), ["kernel", "os"]),
        ("rust-lang/rust", "Rust", 97000, 12000, 9000, "MIT", now - timedelta(days=1), ["compiler", "language"]),
        ("python/cpython", "Python", 63000, 30000, 1700, "PSF-2.0", now - timedelta(days=1), ["language", "interpreter"]),
        ("ggerganov/llama.cpp", "C++", 70000, 10000, 400, "MIT", now - timedelta(days=0), ["ai", "llm", "inference"]),
        ("oldproject/abandoned", "Perl", 1200, 90, 300, None, now - timedelta(days=900), []),
    ]
    db = SessionLocal()
    try:
        for i, (full, lang, stars, forks, issues, lic, pushed, topics) in enumerate(samples):
            owner, name = full.split("/")
            stmt = pg_insert(Project).values(
                github_id=900000 + i, full_name=full, owner=owner, name=name,
                description=f"Demo seed for {full}", homepage="https://example.com",
                language=lang, topics=topics, license=lic,
                stars=stars, forks=forks, open_issues=issues, watchers=stars,
                pushed_at=pushed, created_at=now - timedelta(days=2000),
                last_release_at=pushed,
            ).on_conflict_do_update(
                index_elements=["github_id"],
                set_={"stars": stars, "pushed_at": pushed, "language": lang},
            )
            db.execute(stmt)
        db.commit()
        compute_all(db)
        print(f"✅ seed 完成：{len(samples)} 个项目并已评分")
    finally:
        db.close()


COMMANDS = {
    "initdb": cmd_initdb, "discover": cmd_discover, "snapshot": cmd_snapshot,
    "score": cmd_score, "prune": cmd_prune, "summarize": cmd_summarize,
    "pipeline": cmd_pipeline, "seed": cmd_seed,
}

if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in COMMANDS:
        print(__doc__)
        sys.exit(1)
    COMMANDS[sys.argv[1]]()
