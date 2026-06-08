# GitHub Radar — 优秀开源项目收集 / 榜单系统 蓝图文档

> 定位：对外公开的开源项目榜单 / 导航站（GitHub Trending 增强版）
> 创建日期：2026-06-07
> 技术栈：Next.js + FastAPI + PostgreSQL + Redis

---

## 1. 产品定位

做一个**对外公开**的优秀开源项目发现 / 榜单站点，相比 GitHub Trending 的增强点：

- 不只看 star 绝对值，而是用**综合评分模型**（增长趋势 + 活跃度 + 健康度 + 热度）。
- 提供**领域 / 语言分类**浏览与筛选。
- 积累**历史快照**，提供 star 增长趋势图（核心护城河）。
- 双榜：「Trending 榜」抓正在火的，「综合优质榜」抓长期靠谱的。

### 设计约束（公开站点带来的）
1. **SEO 是命脉** —— 必须服务端渲染或静态生成，页面可被搜索引擎抓取。
2. **读多写少 + 高并发读** —— 数据每天更新几次，访问量大，重度缓存 / 静态化。
3. **数据可信可追溯** —— 历史快照支撑趋势图。

---

## 2. 技术栈

| 层 | 选型 | 理由 |
|----|------|------|
| 前端 | **Next.js (React)** | SSR/SSG 对 SEO 友好；可复用 React 经验（明熙Shop 已用 Next.js 14）|
| 后端 | **FastAPI (Python)** | 采集、评分、API；团队强项 |
| 数据库 | **PostgreSQL** | 历史快照 + 并发读 + 时序查询 |
| 缓存 | **Redis** | 榜单结果缓存，抗高并发读 |
| 调度 | **APScheduler** | 定时采集 + 重算评分 |
| 部署 | 云服务器 + CDN | 复用现有运维经验 |

> 备选：前端若想极致省运维，可改为**纯 SSG**——每日评分跑完生成静态 HTML 部署到 CDN，SEO 满分、抗压极强。日更场景非常适合。

---

## 3. 系统架构

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│  采集层      │ →  │  处理/评分层  │ →  │  存储层      │ →  │  展示/API层   │
│ Collector   │    │  Scorer      │    │  PostgreSQL │    │  FastAPI      │
│ (GitHub API)│    │              │    │  + Redis    │    │  + Next.js    │
└─────────────┘    └──────────────┘    └─────────────┘    └──────────────┘
      ↑                                                          ↓
  APScheduler(每日)                                       用户/搜索引擎/RSS
```

---

## 4. 数据模型

### projects（项目主表 — 当前快照）
```sql
CREATE TABLE projects (
    id              BIGSERIAL PRIMARY KEY,
    github_id       BIGINT UNIQUE NOT NULL,
    full_name       TEXT UNIQUE NOT NULL,          -- owner/repo
    owner           TEXT NOT NULL,
    name            TEXT NOT NULL,
    description     TEXT,
    homepage        TEXT,
    language        TEXT,
    topics          TEXT[],                         -- 标签
    license         TEXT,
    readme_summary  TEXT,                           -- 可选: AI 摘要

    stars           INT DEFAULT 0,
    forks           INT DEFAULT 0,
    open_issues     INT DEFAULT 0,
    contributors    INT DEFAULT 0,
    watchers        INT DEFAULT 0,

    created_at      TIMESTAMPTZ,
    pushed_at       TIMESTAMPTZ,                    -- 最近 push
    last_release_at TIMESTAMPTZ,

    -- 评分（每日重算）
    score           NUMERIC(6,2) DEFAULT 0,
    growth_score    NUMERIC(6,2) DEFAULT 0,
    activity_score  NUMERIC(6,2) DEFAULT 0,
    health_score    NUMERIC(6,2) DEFAULT 0,
    heat_score      NUMERIC(6,2) DEFAULT 0,

    category        TEXT,                           -- 领域分类
    is_archived     BOOLEAN DEFAULT FALSE,
    fetched_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_projects_score    ON projects(score DESC);
CREATE INDEX idx_projects_language ON projects(language);
CREATE INDEX idx_projects_category ON projects(category);
```

### project_snapshots（历史快照 — 每日一条 / 项目）
> 系统护城河：别人只能抓当前值，你积累的趋势无法复制。**尽早开始每天存。**
```sql
CREATE TABLE project_snapshots (
    id            BIGSERIAL PRIMARY KEY,
    project_id    BIGINT REFERENCES projects(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    stars         INT,
    forks         INT,
    open_issues   INT,
    contributors  INT,
    UNIQUE(project_id, snapshot_date)
);
CREATE INDEX idx_snapshots_project_date ON project_snapshots(project_id, snapshot_date DESC);
```

### 辅助表
- `categories`：领域分类定义（id, name, slug, keywords[]）
- `collect_logs`：采集任务日志（用于监控限流 / 失败重试）
- `subscriptions`（Phase 3）：邮件 / RSS 订阅

---

## 5. 评分模型

每个维度先归一化到 0~100，综合评分加权：

```
score = 0.30 × growth_score    # 近 7/30 日 star 增速（带时间衰减）
      + 0.25 × activity_score  # 距上次 commit/release 天数、issue 响应
      + 0.25 × health_score    # README/LICENSE/测试/CI/文档齐全度
      + 0.20 × heat_score      # log(stars) 平滑，避免大项目碾压
```

### 各维度算法要点
- **growth_score**：`(stars_now - stars_7d_ago) / max(stars_7d_ago, 1)`，再做对数 / 分位归一化。需要快照数据，冷启动期先用 0。
- **activity_score**：基于 `pushed_at`、`last_release_at` 距今天数做指数衰减；issue 关闭率作加分。
- **health_score**：规则打分——有无 README、LICENSE、CI 配置文件、测试目录、wiki、topics。可通过 GraphQL / 仓库文件树检测。
- **heat_score**：`log10(stars + 1)` 归一化。用 log 避免超级项目永远霸榜。

### 双榜分离
- **Trending 榜** = 按 growth_score 排序（正在火）。
- **综合优质榜** = 按 score 排序（长期靠谱）。
- 可再按 language / category 切分子榜。

---

## 6. 采集策略（避开限流）

GitHub API 限流：
- 认证后 REST **5000 次/小时**；Search API 单独限流 **30 次/分钟**。
- 优先用 **GraphQL API**（一次拿全字段，更省额度）。

策略：
- **多 token 轮换** + 失败重试（指数退避）+ 本地缓存。
- **增量更新**：主榜项目每天更新；长尾项目降频（每周）。
- 用 Search API 按 `stars:>N`、`language:`、`created:`、`pushed:` 发现新项目。
- 补充抓 GitHub Trending HTML（官方无 API），喂给「正在火」发现池。
- 所有采集写 `collect_logs`，监控剩余额度。

---

## 7. 目录结构（建议）

```
github-radar/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI 入口
│   │   ├── config.py            # 配置 / token 池
│   │   ├── db.py                # PostgreSQL 连接
│   │   ├── models.py            # SQLAlchemy 模型
│   │   ├── schemas.py           # Pydantic
│   │   ├── api/
│   │   │   ├── rankings.py      # 榜单接口
│   │   │   ├── projects.py      # 详情接口
│   │   │   └── search.py        # 搜索 / 筛选
│   │   ├── collector/
│   │   │   ├── github_client.py # GraphQL/REST 封装 + 限流
│   │   │   ├── discover.py      # 发现新项目
│   │   │   └── snapshot.py      # 每日快照
│   │   ├── scorer/
│   │   │   ├── growth.py
│   │   │   ├── activity.py
│   │   │   ├── health.py
│   │   │   └── compute.py       # 综合评分
│   │   └── scheduler.py         # APScheduler 任务
│   ├── alembic/                 # 数据库迁移
│   └── requirements.txt
├── frontend/                    # Next.js
│   ├── app/
│   │   ├── page.tsx             # 首页 / 综合榜
│   │   ├── trending/page.tsx    # Trending 榜
│   │   ├── lang/[language]/     # 按语言子榜
│   │   ├── category/[slug]/     # 按领域子榜
│   │   └── repo/[owner]/[name]/ # 项目详情 + 趋势图
│   ├── components/
│   └── lib/api.ts
├── docker-compose.yml           # postgres + redis + backend + frontend
└── README.md
```

---

## 8. 分阶段落地

### Phase 1 — MVP（先跑通闭环，攒历史数据）
- [ ] 建表（projects + project_snapshots）
- [ ] GitHub 采集脚本（GraphQL，按 stars 发现 + 拉详情）
- [ ] 每日快照任务（APScheduler）
- [ ] 基础评分（先上 heat + activity，growth 等数据攒够再加）
- [ ] 一个能看的榜单页（Next.js SSG）

### Phase 2 — 完整评分 + SEO
- [ ] 四维度完整评分模型
- [ ] 领域分类（关键词 / topics 映射）
- [ ] 项目详情页 + star 趋势图
- [ ] SEO：sitemap、meta、结构化数据、SSG/ISR

### Phase 3 — 发现与留存
- [ ] 搜索 + 多条件筛选
- [ ] RSS / 邮件订阅（新优质项目推送）
- [ ] Redis 缓存优化

### Phase 4 — 可选增强
- [ ] 用户系统 + 收藏
- [ ] 个性化推荐
- [ ] README AI 摘要 / 多语言

---

## 9. 关键风险与对策

| 风险 | 对策 |
|------|------|
| GitHub API 限流 | 多 token 轮换 + GraphQL + 增量更新 + 缓存 |
| 冷启动无趋势数据 | growth_score 前期置 0，尽早开始每日快照 |
| star 数据被刷 | 用增长加速度 + 多维度交叉验证，不单看 star |
| SEO 不收录 | SSG/SSR + sitemap + 高质量内容页 |
| 超级项目霸榜 | heat 用 log，trending 与综合榜分离 |
```
