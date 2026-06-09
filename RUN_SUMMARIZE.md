# 生成 AI 双语简介（服务器操作手册）

给所有项目生成一句话亮点：中文写入 `readme_summary`、英文写入 `readme_summary_en`，
前端按当前语言（中/英）自动择一展示。模型用最便宜的 **Haiku 4.5** + Batches API（5 折），
全量 2300+ 项目双语成本大约几毛到一两美元。

> 前提：console（platform.claude.com）的 **Credit balance 已有余额**，且 `.env.prod` 里
> `ANTHROPIC_API_KEY` 已填。已确认本机调用正常。

## 一、在服务器上执行（按顺序，三条）

SSH 登录服务器后，进入 `github-radar` 仓库目录（就是平时部署的那个目录），依次执行：

```bash
# 1) 拉取双语代码（若自动同步已拉过，这步会显示 Already up to date，无妨）
git pull

# 2) 重建容器：后端启动会自动跑 alembic upgrade head，加上 readme_summary_en 这一列
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

# 3) 跑双语回填（前台运行，会打印进度，跑完才返回）
docker compose -f docker-compose.prod.yml --env-file .env.prod exec backend python cli.py summarize
```

第 3 条会打印类似：

```
提交 Batches：4600 条请求（2300 项目 × 双语缺口）
Batches 处理中：...
✅ summarize 完成：4600 条双语简介（中文 readme_summary + 英文 readme_summary_en）
```

Batches 是异步轮询，**几分钟到 ~1 小时**跑完。期间命令会一直挂着，正常现象。
（嫌占终端可在命令前后加 `nohup ... &`，或用 `tmux`/`screen`。）

## 二、跑完后验证

```bash
# 看几条结果（中英都该有值）
docker compose -f docker-compose.prod.yml --env-file .env.prod exec backend \
  python -c "from app.db import SessionLocal; from app.models import Project; from sqlalchemy import select; \
db=SessionLocal(); \
[print(p.full_name, '|', p.readme_summary, '|', p.readme_summary_en) for p in \
db.execute(select(Project).where(Project.readme_summary_en.is_not(None)).limit(5)).scalars()]"
```

浏览器打开 https://radar.mxzshs.com ：
- 中文模式：卡片/详情页 ✨ 显示中文简介；
- 右上角切到 **English**：同样位置变成英文简介。

> 若页面还是旧的：榜单走 ISR 缓存，详情页 `revalidate=3600`。简介不经 `score`/`pipeline`
> 不会主动失效 Redis；最稳妥是等 ISR 到期，或重启一次 frontend 容器：
> `docker compose -f docker-compose.prod.yml --env-file .env.prod restart frontend`

## 三、可幂等续跑 / 日常增量

- **可中断续跑**：只处理「缺中文 或 缺英文」的项目。中途断了，再跑一遍 `cli.py summarize` 会接着补，不会重复花钱。
- **以后新项目**：`ENABLE_SCHEDULER=true`（生产已开），每天 02:00 UTC 的 `daily_pipeline`
  会 best-effort 调 `summarize_backfill` 自动补新项目的双语简介。所以这次手动全量跑完后，
  后续基本不用再管。

## 常见问题

- **余额不足**：报 `credit balance is too low` → 去 platform.claude.com 充值后重跑。代码会优雅跳过、不崩流水线。
- **`exec backend` 报找不到容器**：确认服务名是 `backend`（`docker compose ... ps` 查看），且容器在 `Up` 状态。
- **想先小规模试**：把第 3 条换成 `... python -c "from app.db import SessionLocal; from app.scorer.summarize import summarize_missing; summarize_missing(SessionLocal(), limit=5)"`（同步、即时、只 5 个）。
