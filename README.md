# GitHub Radar 🛰️

优秀开源项目发现 / 榜单系统。详细设计见 [BLUEPRINT.md](./BLUEPRINT.md)。

## Phase 1 已完成

采集 → 每日快照 → 评分 → 榜单 的完整闭环：
- **采集**：GitHub GraphQL API，多 token 轮换 + 限流重试
- **快照**：每日记录 star/fork/issue（系统护城河，算增长趋势）
- **评分**：综合 = 0.30 增长 + 0.25 活跃 + 0.25 健康 + 0.20 热度(log平滑)，冷启动期自动重分配 growth 权重
- **双榜**：综合优质榜（按 score）+ Trending 榜（按 growth）
- **接口**：`/api/rankings/top`、`/api/rankings/trending`、`/api/languages`
- **调度**：APScheduler 每日 UTC 02:00 自动跑流水线

## 快速开始

```bash
# 1. 启动 PostgreSQL + Redis
docker compose up -d

# 2. 后端
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
cp .env.example .env        # 填入 GITHUB_TOKENS

# 3. 建表
.venv/bin/python cli.py initdb

# 4a. 无 token 先看效果：灌假数据
.venv/bin/python cli.py seed

# 4b. 有 token 跑真实采集
.venv/bin/python cli.py pipeline   # discover → snapshot → score

# 5. 启动服务
.venv/bin/uvicorn app.main:app --reload --port 8077
# 打开 http://127.0.0.1:8077/  看榜单页
```

## CLI

```bash
python cli.py initdb      # 建表
python cli.py discover    # 发现+入库（需 token）
python cli.py snapshot    # 写当日快照
python cli.py score       # 重算评分
python cli.py pipeline    # 全流程
python cli.py seed        # 假数据（验证用）
```

## 目录

```
backend/app/
├── config.py            配置 / token 池
├── db.py                数据库连接 + 建表
├── models.py            projects / project_snapshots / collect_logs
├── schemas.py           Pydantic 输出模型
├── collector/
│   ├── github_client.py GraphQL 封装 + 轮换 + 限流
│   ├── discover.py      发现新项目并 upsert
│   └── snapshot.py      每日快照
├── scorer/compute.py    四维评分
├── api/rankings.py      榜单接口
├── scheduler.py         APScheduler 每日流水线
└── main.py              FastAPI 入口 + 榜单页
```

## Phase 2 已完成

- **领域分类**：`scorer/classify.py` 按 topics/语言/描述映射到 11 个领域，集成进评分流水线
- **详情/趋势接口**：`/api/projects/{owner}/{name}` + `/history`（star 时间序列）
- **Next.js 前端**（`frontend/`，App Router + ISR 1h）：
  - 综合榜 `/`、Trending 榜 `/trending`
  - 语言子榜 `/lang/[language]`、领域子榜 `/category/[slug]`（SSG 预生成）
  - 项目详情页 `/repo/[owner]/[name]`：四维评分条 + 纯 SVG star 趋势图（零依赖、SEO 友好）
  - **SEO**：动态 metadata、`sitemap.xml`（含所有榜单/语言/分类/Top200 详情页）、`robots.txt`、JSON-LD 结构化数据

### 前端启动

```bash
cd frontend
npm install
cp .env.example .env.local        # 设 API_BASE 指向后端，SITE_URL 设为正式域名
npm run dev                        # http://localhost:3000
# 或生产构建
API_BASE=http://127.0.0.1:8077 npm run build && npm start
```

## Phase 3 已完成

- **搜索 + 多条件筛选**：`/api/search`（关键词匹配名称/描述/topics + language/category/min_stars 筛选 + score/growth/stars/activity 排序）；前端 `/search` 页（SSR + GET 表单，SEO 友好）
- **RSS 订阅源**：`/feed/new.xml`（近期收录的高分项目，支持 `?category=` / `?language=` 精准订阅），前端经 Next rewrite 同域代理 + `<link rel=alternate>` 自动发现
- **Redis 缓存层**：`cache.py` 缓存所有榜单查询（TTL 1h），pipeline / score 跑完自动失效；Redis 不可用时自动降级直连 DB

> ⚠️ 改了数据后必须失效缓存：`cli.py score` 和 `cli.py pipeline`（经 score）已内置 `invalidate_all()`。手动改库后记得跑一次 score，否则前端读到旧榜单。

## Phase 4 已完成（不依赖外部凭证的部分）

- **用户系统**：`api/auth_api.py` 注册/登录（bcrypt + JWT），`auth.py` 鉴权依赖
- **收藏**：`api/favorites.py` 增/删/查 + `/ids`（前端高亮用），需登录
- **个性化推荐**：`api/recommend.py` 基于收藏的语言/领域偏好加权推荐未收藏的高分项目；无收藏时回退综合榜
- **前端**：`lib/auth.tsx`（JWT 存 localStorage）、`/account` 页（登录/注册 + 收藏列表 + 推荐）、详情页「收藏」按钮；浏览器侧经 Next rewrite `/proxy-api` → 后端同域

### Phase 4 预留（等凭证接入即生效，未配置自动跳过）

- **AI 摘要**：`scorer/summarize.py` —— 用 Claude `claude-opus-4-8` 生成一句话中文亮点，详情页展示 `✨`。设 `ANTHROPIC_API_KEY` 后 `summarize_missing()` 即生效。
- **邮件推送**：`mailer.py` —— `send_digest()` 发送日报。设 `SMTP_*` 后即生效。
- 接入方式：在 `backend/.env` 填对应 key；摘要可挂进 scheduler 流水线，邮件需先建订阅者表（下一步）。

> ⚠️ JWT_SECRET 生产务必改成随机长字符串（`.env`）。
```
