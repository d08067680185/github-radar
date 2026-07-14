# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

GitHub Radar 是一个面向公众的优秀开源项目榜单/发现站点（**已上线 radar.mxzshs.com**）：采集 GitHub 项目 → 四维综合评分 → 双榜（综合榜 + Trending）+ 搜索/分类/语言/Topic/组织浏览 + 对比/收藏/推荐 + 公开收藏集分享 + 每周精选周报（邮件+RSS）+ 气泡星图 + 隐私友好访客分析。**中英双语（per-URL SEO，`/en/*`）**。后端 FastAPI + PostgreSQL + Redis，前端 Next.js（App Router）。

## 常用命令

基础设施（PostgreSQL + Redis）始终先起：
```bash
docker compose up -d           # 本地开发用的 pg + redis（非生产编排）
```

后端（`backend/`，用 venv，注意 Python 3.14 下依赖须用 `>=` 而非固定版本）：
```bash
.venv/bin/uvicorn app.main:app --reload --port 8077   # 开发服务
.venv/bin/python -m pytest                            # 全部测试（纯函数单测 + 集成测试）
.venv/bin/python -m pytest tests/test_scoring.py::test_heat_log_smoothing  # 单个测试
.venv/bin/python cli.py pipeline                      # 手动跑 discover→snapshot→score（需 GITHUB_TOKENS）
.venv/bin/python cli.py seed                          # 灌假数据（无 token 时验证闭环）
```
测试分两类：纯函数单测（classify/scoring/sharding，无需 DB）始终跑；**集成测试**（`test_api.py`/`test_auth_flow.py`，TestClient + 真实库）需 Postgres，连不上自动 skip。集成测试用独立库 `github_radar_test`（conftest 自动建），`TEST_DATABASE_URL` 可覆盖。`conftest._no_redis` 测试中禁用 Redis 缓存/限流避免串数据。

`cli.py` 子命令：`initdb` / `discover` / `snapshot` / `score` / `prune`（清僵尸）/ `summarize`（AI 中文简介回填）/ `pipeline` / `seed`。**`score` 和 `pipeline` 会自动失效 Redis 缓存**——手动改库后必须跑一次 `score`，否则前端读到旧榜单。

前端（`frontend/`）：
```bash
npm run dev                    # 开发服务（:3000，需后端在 :8077）
npm run build                  # 生产构建（会在构建期向后端取数做 SSG，所以后端必须在跑）
npx tsc --noEmit               # 类型检查（CI 用这个，不需要后端）
npm run e2e                    # Playwright 冒烟（需前后端都在跑）
```

数据库迁移（Alembic 是生产 schema 的唯一来源；`init_db()` 的 `create_all` 仅供本地/测试）：
```bash
.venv/bin/alembic upgrade head                         # 应用迁移
.venv/bin/alembic revision --autogenerate -m "msg"     # 改了 models 后生成迁移
```

## 架构要点（需读多文件才能理解的“大图”）

### 数据流主线
`collector`（采集）→ `models.Project` 入库 →（每日）`ProjectSnapshot` 快照 → `scorer.compute`（评分+分类写回 Project）→ `api` 读榜 →（前端 SSG/ISR + 浏览器）。`scheduler.daily_pipeline` 把 discover→snapshot→score→invalidate 串成每日 UTC 02:00 任务，**仅当 `ENABLE_SCHEDULER=true` 时启用**（本地默认关，省配额）。

### 评分模型（`scorer/compute.py`）— 系统大脑
`score = 0.30*growth + 0.25*activity + 0.25*health + 0.20*heat`，每维归一化 0–100。关键设计：
- **heat 用 log10 平滑**，避免超级项目永远霸榜
- **growth 依赖 `project_snapshots` 历史**；快照不足（冷启动）时 growth 记 0，并把其权重按比例分摊给其余三维
- 分类（`classify.py`，**12 类**含「学习资源/Awesome」）也在 `compute_all` 里写回；信号优先级 = topics/描述 命中 > **AI 英文简介（`readme_summary_en`）兜底** > 语言强信号兜底。改数据后需重跑 score。⚠️带连字符的关键词（如 `machine-learning`）只有 topics 能匹配，描述/简介经 tokenize 会拆词

### 护城河 = 每日快照
`project_snapshots`（每日每项目一条 star/fork/issue）是不可再生的核心资产——Trending/增长% 完全依赖它。它靠 scheduler 每天累积，所以**生产必须开 scheduler 且做 DB 备份**（`scripts/backup_db.sh`）。

### 采集器（`collector/`）— 多维度发现 + 绕过 1000 上限
GitHub Search API 单查询硬上限 1000 条。`github_client.search_repos_sharded()` 用**自适应 star 区间二分**（高 star 优先）绕过：区间命中 >1000 就劈半递归，直到 ≤1000 再翻页，按 `github_id` 去重。`discover()` 用**策略表**编排三路并合并去重：`head`（头部按 star）+ `rising`（近期创建已有 star）+ `active`（近期有 push 的中小项目），全部走 `.env` 配置。client 内置多 token 轮换 + 5xx/限流重试 + 配额追踪（`quota_remaining`）。

### 缓存（`cache.py`）— 含版本化（改结构必读）
榜单类查询（top/trending/stats/languages/categories）+ **项目详情（`project_detail`）+ standing + 收藏集读端点 + 分析读端点**都走 Redis 缓存（TTL 1h，分析 30min）；**`/api/search` 不走缓存**（每次实时查 + 算 count）。Redis 不可用时**自动降级直连 DB**。`invalidate_all()` 在 score/pipeline 后清缓存（保留 `:rl:` 限流键），`ratelimit.py` 复用同一 Redis 连接。
> ⚠️**缓存版本化根治 stale→500**：命名空间 `ghradar:v{N}`，常量 `_CACHE_VERSION`。**给任何带 `cached()` 的接口加/改响应字段后，必须 `_CACHE_VERSION += 1`**——否则旧结构缓存过不了新 Pydantic 校验 → 该接口 500（曾因 /api/map 加字段没 bump 导致星图空白事故）。启动时 `ensure_cache_version()` 检测版本变化自动清空旧 key。
> ⚠️ `cached()` 用 `json.dumps(default=str)` 序列化（datetime → str，FastAPI response_model 再解析回来）。负缓存：detail 接口项目不存在时缓存 `None`（404 也缓存，避免反复直查）。

### 前端取数的两条路径（关键）
- **服务端组件（SSG/ISR）**：通过 `lib/api.ts` 用 `process.env.API_BASE` **直连后端**（server-to-server，不经 CORS）。翻页用 `topPaged/trendingPaged/searchPaged`（读 `X-Total-Count` 头）。
- **客户端组件（登录/收藏/推荐/对比）**：浏览器经 **Next rewrite `/proxy-api/*` → 后端 `/api/*`** 同域请求（见 `next.config.js`），避免跨域；`/feed/*` 同理代理。
认证态（`lib/auth.tsx`）和对比清单（`lib/compare.tsx`）存 localStorage，用 React Context 提供。

### 主题切换的防闪烁
`layout.tsx` 在 `<head>` 注入 inline 脚本，在 React 水合前就给 `<html>` 设 `data-theme`；因此 `<html>` 必须带 `suppressHydrationWarning`（否则水合报错）。浅色变量在 `globals.css` 的 `:root[data-theme="light"]`。

### AI 双语简介（`scorer/summarize.py`）
给项目生成一句话亮点，**中文写入 `Project.readme_summary`、英文写入 `Project.readme_summary_en`**（两套 system 提示词，见 `LANGS`）。**模型用 Haiku 4.5（最便宜）**；批量回填走 **Batches API**（再打 5 折，`summarize_backfill`，异步轮询）——**每个项目按缺失语言各发一条请求**，`custom_id` 形如 `p-{id}-zh` / `p-{id}-en`；日常少量用同步 `summarize_missing`。只处理「缺中文 或 缺英文」且有素材(description 或 topics)的项目，幂等可续跑。需 `ANTHROPIC_API_KEY`（未配/余额不足时**优雅跳过、返回 0、不崩流水线**）。已接入 `daily_pipeline`（best-effort）。前端 `projectSummary(p, locale)` / `aiSummary(p, locale)`（`lib/format.ts`）**按当前 locale 择一**：en 用 `readme_summary_en`、zh 用 `readme_summary`，无则回退 GitHub 描述，再无则「语言·topics」。两个字段都已加入 `ProjectOut`。
> 坑：`mentionableUsers.totalCount` 等**昂贵聚合字段不能进 50 节点的批量 search 查询**（触发 `RESOURCE_LIMITS_EXCEEDED`，曾搞挂 discover，已废弃 contributors 采集）。

### i18n（中英双语，**per-URL 路由 + cookie**）
**`/en/*` = 英文、其余 = 中文，路径权威**（`middleware.ts`）：访问 `/en/*` 时去前缀**重写**到真实页面 + 写请求头 `x-ghradar-locale`/`x-ghradar-path` + 同步 cookie。`getLocale()`（`lib/i18n-server.ts`）优先级 = **请求头（路径权威，让无 cookie 的爬虫在 /en 也拿英文）> cookie `ghradar_locale` > 默认 zh**。
- **服务端组件**用 `getDict()`/`getLocale()`/`getCanonicalPath()`；**客户端组件**用 `useLocale()`（`lib/i18n-client.tsx` 的 `LocaleProvider` 由服务端 locale 注入）。字典 `lib/i18n.ts`（zh/en 两份，**不要加 `as const`**——会让 zh 值变字面量类型致 en 不兼容；支持函数式键如 `topic_h(tp)`）。
- `layout.tsx` 输出 `hreflang`(zh/en/x-default) + `canonical`；页面元数据用 **`generateMetadata()` 按 locale 出中/英** title/description/OG（不能用静态 `export const metadata`，否则 /en 仍是中文 → 削弱英文 SEO）。`LocaleToggle` 切换 URL 的 /en 前缀（非仅 cookie）。
- ⚠️ `middleware` matcher **只排除具体静态资产扩展名**，不能用 `.*\.\w+$` 笼统排除（会误伤带点仓库名如 `/en/repo/vercel/next.js`）。公开收藏集 not-found 等 soft-404 页要在 generateMetadata 加 `robots:{index:false}`（`force-dynamic` 流式下 `notFound()` 返回 200）。

### OG 分享图 + JSON-LD 结构化数据（SEO）
- **OG 图**：`next/og` 动态生成 1200×630 卡片。列表型页面（org/digest/topic/category/lang/list）共用助手 `lib/og.tsx` 的 `listOgImage({label,title,subtitle,chips})`；详情页 `/repo` 有独立的四维评分卡。Next 自动把同段 `opengraph-image.tsx` 注入该页 `og:image`。**Satori 约束：每个有多个子节点的 `<div>` 必须显式 `display:flex`**，否则 500。图片路由 dev 不热重载，改完重启 dev。
- **JSON-LD**：`lib/jsonld.ts`（`itemListLd` 榜单 ItemList / `collectionLd` 收藏集 CollectionPage，每项是带 `codeRepository` 的 `SoftwareSourceCode`、position=排名）+ `components/JsonLd.tsx` 薄渲染组件。已接入首页/分类/语言/Topic（ItemList）+ 公开收藏集（CollectionPage）+ 详情页（SoftwareSourceCode）+ 首页（WebSite+SearchAction）。

### 公开收藏集分享（`api/share.py`）
用户把整个收藏夹一键发布成公开页（`tags` 作分区、`note` 作点评）。**每人一个列表**：`User.public_slug`（一经生成即稳定，关闭再开不换链接）/`public_listed`/`public_title`。`PUT /api/me/share`（JWT，首次开启 `secrets.token_urlsafe` 生成 slug）+ 公开 `GET /api/list/{slug}`（未发布/不存在一律 404 不泄露）。前端 `/list/[slug]`（按 tag 分组，可索引但不进 sitemap）+ 账户页 `ShareSettings` 组件。

### 隐私友好访客分析（`analytics.py`）
**无 cookie / 无 IP / 无任何 PII**，`AnalyticsEvent` 只存 `kind`(search/repo_view)+`key`+`created_at`。`track()` 用**独立 SessionLocal + 吞所有异常**（best-effort，绝不拖慢/打断请求），由 search/detail 端点经 **`BackgroundTasks`** 调用。⚠️**detail 的 track 必须在 `cached()` 外**（命中缓存也要计数）；search 仅 `offset=0` 计数（防翻页重复）。`top_searches/top_repos` 聚合 → 公开端点（缓存 30min）→ 首页 `TrendingNow`「🔥 本周热门」板块。pipeline 每天 `prune_old(90)` 清旧事件。⚠️测试里测聚合要**直接插 `AnalyticsEvent` 行**（`track()` 用真实库 session，不走测试库）。

### 周报 / 邮件（`digest.py` + `mailer.py` + `subscribe.py`）
`digest.build_weekly_digest`（近 7 天 star 净增优先，回退 Trending）→ scheduler 周一任务**先 `archive_current_digest`（无论 SMTP 都存档，供 /digest 页 + RSS）再 `send_weekly_digest`**。`mailer._send_html` 按端口选 TLS（**465→`SMTP_SSL`、其余→STARTTLS**），`render_weekly_html` 按 locale 出中/英。**SMTP 未配置时全程优雅跳过、不崩**。⚠️Hostinger 等 Business Email **不能用别名登录**（SMTP_USER 须真实邮箱，From 可用别名）。

### 评分算法细节（`scorer/compute.py`，改权重/算法必读）
每个维度是独立纯函数，归一化到 0–100；`compute_all` 逐项目算完写回 `Project` 各字段（`score`/`growth_score`/...）+ `category`。
- **heat**：`log10(stars)` 线性映射到 `[_HEAT_LO=log10(500), _HEAT_HI=log10(200000)]` 区间再 clamp。stars≤0 记 0。
- **activity**：基于距今天数的指数衰减。push 部分 `exp(-days/43)*80`（半衰期~30天，满分 80）+ release 部分 `exp(-rdays/90)*20`（满分 20）。`pushed_at` 为空记 0。
- **health**：规则加分 = license(30) + description(20) + topics(每个4，最多20) + homepage(15) + 未归档(15)，封顶 100。**注意：当前不使用 `contributors` 字段**（虽已采集）。
- **growth**：取 ≤7天前最近一条快照，`rate=(now-then)/then`，按 `rate/0.20` 映射（7日涨20%≈满分）。**无快照返回 `None`**（不是 0）——`compute_all` 据此判定冷启动并把 growth 的 0.30 权重按比例分摊给其余三维（`total = (W_act*act+W_hea*hea+W_heat*heat)/(W_act+W_hea+W_heat)`）。
改算法后务必更新 `tests/test_scoring.py`（纯函数，断言单调性/边界/衰减方向）。

### 前端组件职责（`frontend/components/`）
- `ProjectCard` / `RankingList`：榜单卡片（Top3 金银铜奖牌 + 四维迷你条），`RankingList` 的 `startRank` 让排名跨页连续。卡片简介走 `lib/format.ts` 的 `projectSummary()`（GitHub 描述 → 语言·topics 合成 → 占位三级兜底）。
- `Nav`（client，`usePathname` 高亮当前页）、`ThemeToggle`、`DataFreshness`（async server，读 stats.updated_at）、`Pagination`（服务端渲染、`?page=` 驱动、窗口化页码）。
- `CompareButton` + `CompareBar` + `/compare`：对比清单存 localStorage（`lib/compare.tsx`，最多 4）。**CompareButton 不在 `ready` 前返回 null**——按未选中态渲染以保证 SSR 与首屏一致，避免水合不匹配。
- `FavoriteButton` / `ShareButton`：客户端，需 `useAuth` token；ShareButton 优先 `navigator.share`，降级复制链接。
- `GrowthBadges` / `StarTrend`：详情页从 history 算 7/30 日增长% + 纯 SVG 趋势图（无图表库依赖）。

### API 端点速查（鉴权列：公开 / JWT=需登录 Bearer / Admin=需 X-Admin-Token）
榜单类全部走 Redis 缓存；翻页端点返回 `X-Total-Count` 头。

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/rankings/top` | 公开 | 综合榜，支持 `language/category/limit/offset` |
| GET | `/api/rankings/trending` | 公开 | 按 growth 排序，同上参数 |
| GET | `/api/search` | 公开 | `q/language/category/min_stars/sort/limit/offset`（**未缓存**，含 count） |
| GET | `/api/projects/{owner}/{name}` | 公开 | 项目详情（ProjectDetailOut，**已缓存**；记录浏览埋点） |
| GET | `/api/projects/{owner}/{name}/history` | 公开 | star 历史序列（趋势图用） |
| GET | `/api/projects/{owner}/{name}/standing` | 公开 | 领域内排名/百分位 + 领域 Top5（详情页「领域定位」） |
| GET | `/api/stats` | 公开 | 首页统计 + `updated_at` |
| GET | `/api/languages` | 公开 | 语言名数组（筛选下拉用） |
| GET | `/api/languages/stats` | 公开 | 语言+数量（语言页用，复用 CategoryOut） |
| GET | `/api/categories` | 公开 | 领域+数量 |
| POST | `/api/auth/register` `/api/auth/login` | 公开（限流） | 返回 JWT；register 5/min、login 10/min per IP |
| GET/POST/DELETE | `/api/favorites`、`/api/favorites/ids`、`/api/favorites/{owner}/{name}` | **JWT** | 收藏增删查 |
| GET | `/api/recommend` | **JWT** | 个性化推荐（无收藏回退综合榜） |
| GET/PUT | `/api/me/share` | **JWT** | 读/改公开收藏集设置（开关+标题，PUT 限流） |
| GET | `/api/list/{slug}` | 公开 | 某用户的公开收藏集（未发布 404） |
| GET | `/api/analytics/top-searches` `/top-repos` | 公开 | 热门搜索 / 最多人看（缓存 30min） |
| GET | `/api/topics` `/api/topic/{topic}` `/api/org/{owner}` | 公开 | Topic 云 / Topic 榜 / 组织聚合 |
| POST | `/api/subscribe` `/api/unsubscribe` | 公开（限流） | 周报订阅 / 退订 |
| GET | `/api/digest/archive` `/feed/digest.xml` | 公开 | 周报存档 / RSS（`?lang=en` 出英文） |
| GET | `/api/badge/{owner}/{name}.svg` | 公开 | 可嵌入评分徽章（shields 风格纯 SVG） |
| GET | `/feed/new.xml` | 公开 | RSS（`?category=`/`?language=`/`?lang=en` 过滤）；**无 `/api` 前缀** |
| GET | `/api/projects/{owner}/{name}/similar` | 公开 | 相似项目（同领域优先） |
| POST | `/admin/run-pipeline` | **Admin** | 手动触发流水线（后台任务） |
| GET | `/admin/logs` `/admin/quality` | **Admin** | 采集日志 / 数据质量看板 |
| GET | `/healthz` `/status` | 公开 | 探活；`/status` 含 db/redis/data_stale |

鉴权：`require_admin`（`auth.py`）查 `X-Admin-Token`，未配 `ADMIN_TOKEN` 一律拒绝。auth 端点经 `ratelimit.py`（Redis 固定窗口）限流。

## 部署（**已上线 radar.mxzshs.com**）
`docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build [frontend|backend]`（先 `cp .env.prod.example .env.prod` 填密钥）。后端容器入口**自动跑 `alembic upgrade head`**；前端 Next standalone；宿主机 nginx 反代到前端（后端不对外暴露，浏览器只经前端 `/proxy-api` 同域访问）。生产 `ENABLE_SCHEDULER=true`、SMTP 已配（周报每周一 UTC 03:00 发）。`/status`（`data_stale`>36h 表示流水线可能挂）。部署后跑 `./scripts/smoke.sh` 冒烟（打 16 项关键接口/页面校验 200+非空，**map≥100 节点防星图空白**那类静默故障）。
> 部署关键约定（踩坑总结）：
> - **改了带 `cached()` 的接口响应结构 → 必 `_CACHE_VERSION += 1`**（见缓存段），否则 stale→500。
> - **数据/列表页一律 `export const dynamic="force-dynamic"`，别用 `revalidate` ISR**——否则部署/构建期后端不可达会把空数据烤进静态页长期服务。
> - **fetch 一律走 `lib/api.ts` 的 `get/getPaged`（默认 `cache:"no-store"`），别给 fetch 传 `next:{revalidate}`**——`force-dynamic` 管不住 fetch 级 Data Cache（2026-07-14 事故：空库期的 `[]` 被持久化到容器磁盘缓存，后端恢复后全站仍「暂无数据」，需手动清 `.next/cache` 才恢复）。仅 extras/热门统计等低风险端点可显式传 revalidate。新鲜度靠后端 Redis 缓存兜底，前端不缓存不会加重 DB 压力。
> - **只改前端就只 rebuild `frontend`**；改后端或加迁移要 rebuild `backend`（入口自动迁移）。
> - 具体部署机/SSH/凭证等基础设施细节不写进本公开仓库（见私有部署笔记）。

## 安全约定
- `/admin/*` 端点需 `X-Admin-Token` 头匹配 `ADMIN_TOKEN`；**未配置 `ADMIN_TOKEN` 则一律拒绝**（安全默认）
- 生产必须改 `JWT_SECRET`（默认值会在启动日志告警）
- 密钥放 `.env`/`.env.prod`（已 gitignore），勿提交
