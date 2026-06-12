// 轻量 i18n：cookie 存 locale（zh 默认 / en 可选），中英双字典。
// 服务端组件用 getDict()，客户端组件用 useLocale()/useDict()。
export type Locale = "zh" | "en";
export const LOCALE_COOKIE = "ghradar_locale";

export const dict = {
  zh: {
    // 导航
    nav_top: "综合榜", nav_trending: "Trending", nav_rising: "新星", nav_categories: "分类",
    nav_languages: "语言", nav_search: "搜索", nav_map: "星图", nav_account: "我的", nav_about: "关于",
    // 星图地图
    map_h: "🌌 开源星图", map_sub: "头部项目的星系全景 —— 气泡=项目，大小=Star，颜色=领域，按领域聚成星团。悬停看详情、点击进入、可拖拽。",
    map_hint: "悬停查看 · 点击进入项目 · 拖拽移动 · 点图例高亮领域", map_loading: "正在排布星系…",
    // 通用
    rss: "📡 RSS 订阅", viewAll: "查看全部 →", backToList: "← 返回榜单",
    score: "评分", growth: "增长", activity: "活跃", health: "健康", heat: "热度",
    prev: "← 上一页", next: "下一页 →",
    // Hero
    hero_title_1: "发现真正优秀的", hero_title_2: "开源项目",
    hero_desc: "不只看 Star —— 用增长趋势、维护活跃度、项目健康度与热度的综合评分，每天为你筛选并排序 GitHub 上最值得关注的开源项目。",
    hero_search_ph: "搜索项目、技术、关键词…",
    stat_projects: "收录项目", stat_languages: "编程语言", stat_categories: "技术领域", stat_maxstars: "最高 Star",
    // 首页/榜单
    home_h: "🏆 综合优质榜", home_sub: "按综合评分排序 —— 长期靠谱、值得关注。",
    trending_h: "🔥 Trending 榜", trending_sub: "按近期 star 增长趋势排序 —— 抓住正在崛起的项目。",
    rising_h: "🌟 本季新星", rising_sub: "近 90 天创建、增长最快的新项目 —— 第一时间发现明日之星。",
    cats_h: "🗂️ 按领域浏览", cats_sub: "每个领域的优秀开源项目预览，点「查看全部」进入完整榜单。",
    langs_h: "💻 按语言浏览",
    // 搜索
    search_h: "搜索开源项目", search_sub: "按关键词与多条件筛选，找到你需要的优秀开源项目。",
    search_ph: "关键词：名称 / 描述 / topic…", allLangs: "全部语言", allCats: "全部领域",
    sort_score: "综合评分", sort_growth: "增长趋势", sort_stars: "Star 数", sort_activity: "活跃度",
    sortBy: "排序：", noStar: "不限 Star", searchBtn: "搜索",
    search_empty: "输入关键词或选择筛选条件开始搜索。试试这些：",
    resultsFound: (n: number) => `找到 ${n.toLocaleString()} 个结果`,
    // 详情
    similar_h: "🔗 相似项目", trend_h: "Star 趋势", viewOnGh: "在 GitHub 上查看 →",
    release_h: "🚀 最新版本", readme_h: "📖 README 摘录", readme_more: "阅读完整 README →",
    overallScore: "综合评分", createdAt: "创建于", lastPush: "最近 push", lastRelease: "最近 release",
    share: "↗ 分享", shared: "✓ 已复制链接", fav: "☆ 收藏", faved: "★ 已收藏",
    cmp: "⇄ 对比", cmped: "✓ 对比中", loginToFav: "登录后收藏",
    // 账户
    welcome: "欢迎回来", createAccount: "创建账号",
    auth_sub: "登录后可收藏项目、获取个性化推荐",
    email: "邮箱", password: "密码（至少 6 位）",
    login: "登录", register: "注册", submitting: "提交中…",
    toRegister: "没有账号？去注册", toLogin: "已有账号？去登录",
    myRadar: "我的 GitHub Radar", logout: "退出登录",
    favStat: "收藏项目", prefLang: "偏好语言", recStat: "为你推荐",
    myFavs: "⭐ 我的收藏", recForYou: "✨ 为你推荐",
    // 页脚
    footer: "数据来自 GitHub API · 综合评分 = 0.30 增长 + 0.25 活跃 + 0.25 健康 + 0.20 热度",
    loading: "加载中…",
  },
  en: {
    nav_top: "Top", nav_trending: "Trending", nav_rising: "Rising", nav_categories: "Categories",
    nav_languages: "Languages", nav_search: "Search", nav_map: "Galaxy", nav_account: "Account", nav_about: "About",
    map_h: "🌌 Open Source Galaxy", map_sub: "A galaxy of top projects — bubble = project, size = stars, color = domain, clustered by domain. Hover for details, click to open, drag to move.",
    map_hint: "Hover for details · click to open · drag to move · click legend to highlight", map_loading: "Arranging the galaxy…",
    rss: "📡 RSS", viewAll: "View all →", backToList: "← Back to list",
    score: "Score", growth: "Growth", activity: "Activity", health: "Health", heat: "Heat",
    prev: "← Prev", next: "Next →",
    hero_title_1: "Discover truly great", hero_title_2: "open source",
    hero_desc: "Beyond stars — a composite score from growth trend, maintenance activity, project health and popularity. We surface and rank the most noteworthy GitHub projects, every day.",
    hero_search_ph: "Search projects, tech, keywords…",
    stat_projects: "Projects", stat_languages: "Languages", stat_categories: "Categories", stat_maxstars: "Top stars",
    home_h: "🏆 Top Projects", home_sub: "Ranked by composite score — consistently solid, worth following.",
    trending_h: "🔥 Trending", trending_sub: "Ranked by recent star growth — catch the rising stars.",
    rising_h: "🌟 Rising Stars", rising_sub: "Fastest-growing projects created in the last 90 days — spot tomorrow's stars first.",
    cats_h: "🗂️ Browse by Category", cats_sub: "A preview of top projects per domain. Click “View all” for the full board.",
    langs_h: "💻 Browse by Language",
    search_h: "Search Projects", search_sub: "Filter by keyword and multiple criteria to find what you need.",
    search_ph: "Keyword: name / description / topic…", allLangs: "All languages", allCats: "All categories",
    sort_score: "Score", sort_growth: "Growth", sort_stars: "Stars", sort_activity: "Activity",
    sortBy: "Sort: ", noStar: "Any stars", searchBtn: "Search",
    search_empty: "Enter a keyword or pick filters to start. Try these:",
    resultsFound: (n: number) => `${n.toLocaleString()} results`,
    similar_h: "🔗 Similar Projects", trend_h: "Star Trend", viewOnGh: "View on GitHub →",
    release_h: "🚀 Latest Release", readme_h: "📖 README Excerpt", readme_more: "Read full README →",
    overallScore: "Overall score", createdAt: "Created", lastPush: "Last push", lastRelease: "Last release",
    share: "↗ Share", shared: "✓ Link copied", fav: "☆ Save", faved: "★ Saved",
    cmp: "⇄ Compare", cmped: "✓ Comparing", loginToFav: "Log in to save",
    welcome: "Welcome back", createAccount: "Create account",
    auth_sub: "Log in to save projects and get personalized picks",
    email: "Email", password: "Password (min 6 chars)",
    login: "Log in", register: "Sign up", submitting: "Submitting…",
    toRegister: "No account? Sign up", toLogin: "Have an account? Log in",
    myRadar: "My GitHub Radar", logout: "Log out",
    favStat: "Saved", prefLang: "Top language", recStat: "Recommended",
    myFavs: "⭐ My Saved", recForYou: "✨ For You",
    footer: "Data from GitHub API · Score = 0.30 growth + 0.25 activity + 0.25 health + 0.20 heat",
    loading: "Loading…",
  },
};

export type Dict = (typeof dict)["zh"];

export function getDictFor(locale: Locale): Dict {
  return dict[locale];
}

// 领域 slug → 本地化名称（后端 classify.py 只给中文名，前端按 locale 映射）
const CAT_LABELS: Record<string, { zh: string; en: string }> = {
  "ai-ml": { zh: "AI / 机器学习", en: "AI / ML" },
  "web-frontend": { zh: "Web 前端", en: "Web Frontend" },
  backend: { zh: "后端 / 框架", en: "Backend / Framework" },
  database: { zh: "数据库 / 存储", en: "Database / Storage" },
  devops: { zh: "DevOps / 基础设施", en: "DevOps / Infra" },
  data: { zh: "数据 / 大数据", en: "Data / Big Data" },
  mobile: { zh: "移动开发", en: "Mobile" },
  security: { zh: "安全", en: "Security" },
  devtools: { zh: "开发工具", en: "Dev Tools" },
  "game-graphics": { zh: "游戏 / 图形", en: "Game / Graphics" },
  blockchain: { zh: "区块链 / Web3", en: "Blockchain / Web3" },
};

/** 领域名按 locale 取；未知 slug 回退传入的 fallback（后端中文名）或 slug */
export function catName(slug: string | null | undefined, locale: Locale, fallback?: string | null): string {
  if (!slug) return fallback || "";
  return CAT_LABELS[slug]?.[locale] || fallback || slug;
}

// 领域固定顺序（决定星系团在画布上沿圆周的角度位置）
export const CAT_ORDER = [
  "ai-ml", "web-frontend", "backend", "database", "devops",
  "data", "mobile", "security", "devtools", "game-graphics", "blockchain",
];

// 领域 slug → 颜色（气泡星系 + 图例共用，11 色尽量区分）
export const CAT_COLORS: Record<string, string> = {
  "ai-ml": "#7c5cff",        // 紫
  "web-frontend": "#2dd4bf", // 青
  backend: "#3b82f6",        // 蓝
  database: "#f59e0b",       // 琥珀
  devops: "#22c55e",         // 绿
  data: "#06b6d4",           // 天蓝
  mobile: "#ec4899",         // 粉
  security: "#ef4444",       // 红
  devtools: "#a3a3a3",       // 灰
  "game-graphics": "#f97316",// 橙
  blockchain: "#eab308",     // 金
};
export const CAT_FALLBACK_COLOR = "#94a3b8"; // 未分类/未知

export function catColor(slug: string | null | undefined): string {
  return (slug && CAT_COLORS[slug]) || CAT_FALLBACK_COLOR;
}
