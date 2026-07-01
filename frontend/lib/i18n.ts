// 轻量 i18n：cookie 存 locale（zh 默认 / en 可选），中英双字典。
// 服务端组件用 getDict()，客户端组件用 useLocale()/useDict()。
export type Locale = "zh" | "en";
export const LOCALE_COOKIE = "ghradar_locale";

export const dict = {
  zh: {
    // 站点元数据（SEO：title/description/keywords，按 locale 出）
    meta_title: "GitHub Radar — 发现优秀开源项目",
    meta_desc: "GitHub Radar 用综合评分（增长趋势、维护活跃度、项目健康度、热度）发现优秀开源项目，提供综合榜与 Trending 榜，按语言与领域分类浏览。",
    meta_og_desc: "用综合评分发现真正优秀的开源项目。",
    meta_keywords: "开源项目, GitHub, Trending, 开源榜单, best open source",
    nf_title: "404 — 没找到", nf_desc: "这个项目还没被 GitHub Radar 收录，或链接有误。", nf_back: "回到综合榜",
    // 导航
    nav_top: "综合榜", nav_trending: "Trending", nav_rising: "新星", nav_categories: "分类",
    nav_languages: "语言", nav_search: "搜索", nav_map: "星图", nav_insights: "洞察", nav_picks: "精选", nav_digest: "周报", nav_account: "我的", nav_about: "关于",
    // 星图地图
    map_h: "🌌 开源星图", map_sub: "头部项目的星系全景 —— 气泡=项目，大小=Star，颜色=领域，按领域聚成星团。悬停看详情、点击进入、可拖拽。",
    map_hint: "滚轮缩放 · 拖拽平移 · 悬停查看 · 点击进入 · 点图例筛领域", map_loading: "正在排布星系…",
    map_search_ph: "在星图中搜索项目…", map_size_by: "大小：", map_size_stars: "Star", map_size_score: "评分", map_size_growth: "增长",
    map_reset: "复位视图", map_no_match: "未找到",
    map_group_by: "聚团：", map_group_cat: "领域", map_group_lang: "语言", map_other: "其它",
    map_time: "时间轴", map_now: "实时", map_detail: "进入详情 →",
    map_empty: "星图数据暂时加载不出来，请稍后刷新重试。",
    // 通用
    rss: "📡 RSS 订阅", viewAll: "查看全部 →", backToList: "← 返回榜单", skip_to_content: "跳到主内容",
    cmdk_ph: "搜索项目，或跳转页面…", cmdk_projects: "项目", cmdk_pages: "页面", cmdk_hint: "快速搜索",
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
    // 组织/作者
    org_by: "作者 / 组织", org_projects: "上榜项目", org_totalstars: "总 Star", org_avgscore: "平均分",
    org_topcat: "主攻领域", org_langs: "技术栈", org_cats: "领域分布", org_all_projects: "全部项目",
    org_by_link: (o: string) => `查看 ${o} 的全部项目 →`, org_notfound: "未找到该作者/组织的上榜项目。",
    movers_h: "🚀 近期上升最快", movers_sub: (d: number) => `按最近 ${d} 天 star 净增排序`, movers_gain: "新增",
    hot_h: "🔥 本周热门", hot_searches: "热门搜索", hot_repos: "最多人看", hot_sub: "来自访客的真实浏览与搜索（隐私友好，不含任何个人信息）",
    tw_all: "综合", tw_day: "今日", tw_week: "本周", tw_month: "本月",
    tw_sub: (d: number) => `按最近 ${d} 天 star 净增排序 —— 抓住正在爆发的项目。`,
    tw_empty: "该时间窗暂无足够快照数据，过几天再来看。", tw_gain: "净增",
    timeline_h: "📅 项目时间线", tl_created: "创建", tl_release: "最新发布", tl_push: "最近提交",
    cats_h: "🗂️ 按领域浏览", cats_sub: "每个领域的优秀开源项目预览，点「查看全部」进入完整榜单。",
    langs_h: "💻 按语言浏览",
    topics_h: "🏷️ 按 Topic 浏览", topics_sub: "按 GitHub topic 标签发现项目 —— 比领域更细的兴趣入口。",
    topic_h: (tp: string) => `🏷️ #${tp}`, topic_sub: (tp: string) => `带 “${tp}” 标签的优秀开源项目，按综合评分排序。`,
    nav_topics: "Topics",
    // 搜索
    search_h: "搜索开源项目", search_sub: "按关键词与多条件筛选，找到你需要的优秀开源项目。",
    search_ph: "关键词：名称 / 描述 / topic…", allLangs: "全部语言", allCats: "全部领域",
    sort_score: "综合评分", sort_growth: "增长趋势", sort_stars: "Star 数", sort_activity: "活跃度",
    sort_forks: "Fork 数", sort_updated: "最近更新", sort_newest: "最新创建",
    sortBy: "排序：", noStar: "不限 Star", searchBtn: "搜索",
    anyYear: "不限年份", createdAfter: "创建于",
    search_empty: "输入关键词或选择筛选条件开始搜索。试试这些：",
    resultsFound: (n: number) => `找到 ${n.toLocaleString()} 个结果`,
    // 详情
    badge_h: "🛡️ 嵌入评分徽章", badge_sub: "把这个项目的 GitHub Radar 评分挂到你的 README：",
    badge_copy_md: "复制 Markdown", badge_copy_html: "复制 HTML", badge_copied: "✓ 已复制",
    similar_h: "🔗 相似项目", trend_h: "Star 趋势", viewOnGh: "在 GitHub 上查看 →",
    release_h: "🚀 最新版本", readme_h: "📖 README 摘录", readme_more: "阅读完整 README →",
    standing_h: "📊 领域定位",
    standing_rank: (cat: string, rank: number, total: number) => `${cat} 领域第 ${rank} / 共 ${total} 个`,
    standing_pct: (pct: number) => `超过该领域 ${pct}% 的项目`,
    standing_top: "领域 Top 5", standing_thisone: "本项目",
    overallScore: "综合评分", createdAt: "创建于", lastPush: "最近 push", lastRelease: "最近 release",
    share: "↗ 分享", shared: "✓ 已复制链接", share_more: "📤 更多分享方式…",
    fav: "☆ 收藏", faved: "★ 已收藏",
    watch: "🔔 关注", watching: "🔔 已关注", loginToWatch: "登录后关注",
    watch_tab: "关注", watch_empty: "还没有关注任何项目",
    cmp: "⇄ 对比", cmped: "✓ 对比中", loginToFav: "登录后收藏",
    // 账户
    welcome: "欢迎回来", createAccount: "创建账号",
    auth_sub: "登录后可收藏项目、获取个性化推荐",
    email: "邮箱", password: "密码（至少 6 位）",
    login: "登录", register: "注册", submitting: "提交中…",
    toRegister: "没有账号？去注册", toLogin: "已有账号？去登录",
    forgotPwd: "忘记密码？", forgotSub: "输入注册邮箱，我们会发送重置链接",
    sendResetLink: "发送重置链接", resetSent: "重置链接已发送，请查收邮箱",
    resetPwd: "设置新密码", resetInvalid: "重置链接无效，请重新申请",
    myRadar: "我的 GitHub Radar", logout: "退出登录",
    favStat: "收藏项目", prefLang: "偏好语言", recStat: "为你推荐",
    myFavs: "⭐ 我的收藏", recForYou: "✨ 为你推荐",
    // 收藏管理
    fav_all: "全部", fav_edit: "编辑", fav_save: "保存", fav_cancel: "取消",
    fav_tags_ph: "标签（逗号分隔）", fav_note_ph: "备注…", fav_no_tag: "未分组",
    fav_export_json: "⬇ 导出 JSON", fav_export_md: "⬇ 导出 Markdown",
    fav_filter_by: "按标签筛选：", fav_remove: "移除",
    share_h: "🔗 公开分享收藏集",
    share_desc: "把整个收藏夹发布成一个公开页，标签自动成为分区、备注成为点评。任何人凭链接可看。",
    share_on: "已公开", share_off: "未公开", share_toggle_on: "开启公开", share_toggle_off: "关闭公开",
    share_title_ph: "给你的收藏集起个标题（如「我的全栈精选」）",
    share_save: "保存", share_saved: "已保存", share_copy: "复制链接", share_copied: "已复制",
    share_view: "查看公开页 →", share_need_fav: "先收藏一些项目再公开吧。",
    share_count: (n: number) => `当前 ${n} 个收藏将出现在公开页`,
    list_ungrouped: "未分组", list_empty: "这个收藏集还是空的。",
    list_count: (n: number) => `共 ${n} 个项目`,
    list_footer: "由 GitHub Radar 生成 · 发现优秀开源项目",
    // 页脚
    footer: "数据来自 GitHub API · 综合评分 = 0.30 增长 + 0.25 活跃 + 0.25 健康 + 0.20 热度",
    loading: "加载中…",
    // 周报订阅
    sub_h: "📬 每周精选周报", sub_sub: "每周一封，精选过去 7 天上升最快的开源项目，免费。",
    sub_ph: "你的邮箱", sub_btn: "订阅", sub_ok: "✅ 订阅成功！周报每周一发送。",
    sub_err: "订阅失败，请稍后再试", sub_preview: "预览周报样例 →",
    // 周报存档
    digest_h: "📰 每周精选周报", digest_sub: "每周精选过去 7 天上升最快的开源项目 —— 历史存档，随时回看。",
    digest_empty: "还没有存档的周报，第一期即将发布。", digest_items: (n: number) => `${n} 个项目`,
    digest_view: "查看本期 →", digest_back: "← 全部周报", digest_gain: "本周新增",
    unsub_h: "退订周报", unsub_doing: "正在退订…", unsub_ok: "✅ 已退订，不会再收到周报。",
    unsub_err: "退订失败，链接可能已失效。", unsub_invalid: "缺少退订令牌。",
  },
  en: {
    meta_title: "GitHub Radar — Discover great open-source projects",
    meta_desc: "GitHub Radar surfaces great open-source projects via a composite score (growth trend, maintenance activity, project health, popularity), with an Overall board and a Trending board, browsable by language and domain.",
    meta_og_desc: "Discover truly great open-source projects via a composite score.",
    meta_keywords: "open source, GitHub, trending, open source ranking, best open source projects",
    nf_title: "404 — Not found", nf_desc: "This project isn't in GitHub Radar yet, or the link is broken.", nf_back: "Back to the top board",
    nav_top: "Top", nav_trending: "Trending", nav_rising: "Rising", nav_categories: "Categories",
    nav_languages: "Languages", nav_search: "Search", nav_map: "Galaxy", nav_insights: "Insights", nav_picks: "Picks", nav_digest: "Digest", nav_account: "Account", nav_about: "About",
    map_h: "🌌 Open Source Galaxy", map_sub: "A galaxy of top projects — bubble = project, size = stars, color = domain, clustered by domain. Hover for details, click to open, drag to move.",
    map_hint: "Scroll to zoom · drag to pan · hover for details · click to open · click legend to filter", map_loading: "Arranging the galaxy…",
    map_search_ph: "Search projects in the galaxy…", map_size_by: "Size: ", map_size_stars: "Stars", map_size_score: "Score", map_size_growth: "Growth",
    map_reset: "Reset view", map_no_match: "No match",
    map_group_by: "Cluster: ", map_group_cat: "Domain", map_group_lang: "Language", map_other: "Other",
    map_time: "Timeline", map_now: "Now", map_detail: "Open details →",
    map_empty: "Galaxy data failed to load. Please refresh and try again.",
    rss: "📡 RSS", viewAll: "View all →", backToList: "← Back to list", skip_to_content: "Skip to content",
    cmdk_ph: "Search projects, or jump to a page…", cmdk_projects: "Projects", cmdk_pages: "Pages", cmdk_hint: "Quick search",
    score: "Score", growth: "Growth", activity: "Activity", health: "Health", heat: "Heat",
    prev: "← Prev", next: "Next →",
    hero_title_1: "Discover truly great", hero_title_2: "open source",
    hero_desc: "Beyond stars — a composite score from growth trend, maintenance activity, project health and popularity. We surface and rank the most noteworthy GitHub projects, every day.",
    hero_search_ph: "Search projects, tech, keywords…",
    stat_projects: "Projects", stat_languages: "Languages", stat_categories: "Categories", stat_maxstars: "Top stars",
    home_h: "🏆 Top Projects", home_sub: "Ranked by composite score — consistently solid, worth following.",
    trending_h: "🔥 Trending", trending_sub: "Ranked by recent star growth — catch the rising stars.",
    rising_h: "🌟 Rising Stars", rising_sub: "Fastest-growing projects created in the last 90 days — spot tomorrow's stars first.",
    org_by: "Author / Org", org_projects: "Ranked projects", org_totalstars: "Total stars", org_avgscore: "Avg score",
    org_topcat: "Focus area", org_langs: "Tech stack", org_cats: "Category mix", org_all_projects: "All projects",
    org_by_link: (o: string) => `View all projects by ${o} →`, org_notfound: "No ranked projects found for this author/org.",
    movers_h: "🚀 Fastest Rising", movers_sub: (d: number) => `Ranked by net star gain over the last ${d} days`, movers_gain: "gained",
    hot_h: "🔥 Trending This Week", hot_searches: "Top searches", hot_repos: "Most viewed", hot_sub: "Real visitor views and searches (privacy-friendly, no personal data)",
    tw_all: "Overall", tw_day: "Today", tw_week: "This week", tw_month: "This month",
    tw_sub: (d: number) => `Ranked by net star gain over the last ${d} days — catch what's exploding now.`,
    tw_empty: "Not enough snapshot data for this window yet — check back in a few days.", tw_gain: "gained",
    timeline_h: "📅 Timeline", tl_created: "Created", tl_release: "Latest release", tl_push: "Last push",
    cats_h: "🗂️ Browse by Category", cats_sub: "A preview of top projects per domain. Click “View all” for the full board.",
    langs_h: "💻 Browse by Language",
    topics_h: "🏷️ Browse by Topic", topics_sub: "Discover projects by GitHub topic — a finer-grained entry than categories.",
    topic_h: (tp: string) => `🏷️ #${tp}`, topic_sub: (tp: string) => `Top open-source projects tagged “${tp}”, ranked by composite score.`,
    nav_topics: "Topics",
    search_h: "Search Projects", search_sub: "Filter by keyword and multiple criteria to find what you need.",
    search_ph: "Keyword: name / description / topic…", allLangs: "All languages", allCats: "All categories",
    sort_score: "Score", sort_growth: "Growth", sort_stars: "Stars", sort_activity: "Activity",
    sort_forks: "Forks", sort_updated: "Updated", sort_newest: "Newest",
    sortBy: "Sort: ", noStar: "Any stars", searchBtn: "Search",
    anyYear: "Any year", createdAfter: "Created",
    search_empty: "Enter a keyword or pick filters to start. Try these:",
    resultsFound: (n: number) => `${n.toLocaleString()} results`,
    badge_h: "🛡️ Embed score badge", badge_sub: "Add this project's GitHub Radar score to your README:",
    badge_copy_md: "Copy Markdown", badge_copy_html: "Copy HTML", badge_copied: "✓ Copied",
    similar_h: "🔗 Similar Projects", trend_h: "Star Trend", viewOnGh: "View on GitHub →",
    standing_h: "📊 Domain Standing",
    standing_rank: (cat: string, rank: number, total: number) => `#${rank} of ${total} in ${cat}`,
    standing_pct: (pct: number) => `Ahead of ${pct}% of projects in this domain`,
    standing_top: "Top 5 in domain", standing_thisone: "This project",
    release_h: "🚀 Latest Release", readme_h: "📖 README Excerpt", readme_more: "Read full README →",
    overallScore: "Overall score", createdAt: "Created", lastPush: "Last push", lastRelease: "Last release",
    share: "↗ Share", shared: "✓ Link copied", share_more: "📤 More ways to share…",
    fav: "☆ Save", faved: "★ Saved",
    watch: "🔔 Watch", watching: "🔔 Watching", loginToWatch: "Log in to watch",
    watch_tab: "Watching", watch_empty: "No watched projects yet",
    cmp: "⇄ Compare", cmped: "✓ Comparing", loginToFav: "Log in to save",
    welcome: "Welcome back", createAccount: "Create account",
    auth_sub: "Log in to save projects and get personalized picks",
    email: "Email", password: "Password (min 6 chars)",
    login: "Log in", register: "Sign up", submitting: "Submitting…",
    toRegister: "No account? Sign up", toLogin: "Have an account? Log in",
    forgotPwd: "Forgot password?", forgotSub: "Enter your email and we will send a reset link",
    sendResetLink: "Send reset link", resetSent: "Reset link sent, check your inbox",
    resetPwd: "Set new password", resetInvalid: "Invalid reset link, please request again",
    myRadar: "My GitHub Radar", logout: "Log out",
    favStat: "Saved", prefLang: "Top language", recStat: "Recommended",
    myFavs: "⭐ My Saved", recForYou: "✨ For You",
    fav_all: "All", fav_edit: "Edit", fav_save: "Save", fav_cancel: "Cancel",
    fav_tags_ph: "Tags (comma separated)", fav_note_ph: "Note…", fav_no_tag: "Untagged",
    fav_export_json: "⬇ Export JSON", fav_export_md: "⬇ Export Markdown",
    fav_filter_by: "Filter by tag: ", fav_remove: "Remove",
    share_h: "🔗 Share your collection",
    share_desc: "Publish your whole saved list as a public page — tags become sections, notes become commentary. Anyone with the link can view it.",
    share_on: "Public", share_off: "Private", share_toggle_on: "Make public", share_toggle_off: "Make private",
    share_title_ph: "Give your collection a title (e.g. \"My full-stack picks\")",
    share_save: "Save", share_saved: "Saved", share_copy: "Copy link", share_copied: "Copied",
    share_view: "View public page →", share_need_fav: "Save some projects first, then publish.",
    share_count: (n: number) => `${n} saved project${n === 1 ? "" : "s"} will appear on the public page`,
    list_ungrouped: "Untagged", list_empty: "This collection is empty.",
    list_count: (n: number) => `${n} project${n === 1 ? "" : "s"}`,
    list_footer: "Generated by GitHub Radar · Discover great open source",
    footer: "Data from GitHub API · Score = 0.30 growth + 0.25 activity + 0.25 health + 0.20 heat",
    loading: "Loading…",
    sub_h: "📬 Weekly Digest", sub_sub: "One email a week with the fastest-rising open-source projects of the past 7 days. Free.",
    sub_ph: "Your email", sub_btn: "Subscribe", sub_ok: "✅ Subscribed! Digest goes out every Monday.",
    sub_err: "Subscription failed, please try again later", sub_preview: "Preview a sample digest →",
    digest_h: "📰 Weekly Digest", digest_sub: "A weekly pick of the fastest-rising open-source projects — archived, browse anytime.",
    digest_empty: "No archived digests yet — the first issue is coming soon.", digest_items: (n: number) => `${n} projects`,
    digest_view: "View issue →", digest_back: "← All digests", digest_gain: "gained this week",
    unsub_h: "Unsubscribe", unsub_doing: "Unsubscribing…", unsub_ok: "✅ Unsubscribed. You won't receive the digest anymore.",
    unsub_err: "Unsubscribe failed, the link may have expired.", unsub_invalid: "Missing unsubscribe token.",
  },
};

export type Dict = (typeof dict)["zh"];

export function getDictFor(locale: Locale): Dict {
  return dict[locale];
}

// 领域 slug → 本地化名称（后端 classify.py 只给中文名，前端按 locale 映射）
const CAT_LABELS: Record<string, { zh: string; en: string }> = {
  learning: { zh: "学习资源 / Awesome", en: "Learning / Awesome" },
  "ai-ml": { zh: "AI / 机器学习", en: "AI / ML" },
  "agent-skills": { zh: "AI Agent Skills / 技能包", en: "AI Agent Skills" },
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
  "ai-ml", "agent-skills", "web-frontend", "backend", "database", "devops",
  "data", "mobile", "security", "devtools", "game-graphics", "blockchain", "learning",
];

// 领域 slug → 颜色（气泡星系 + 图例共用，11 色尽量区分）
export const CAT_COLORS: Record<string, string> = {
  "ai-ml": "#7c5cff",        // 紫
  "agent-skills": "#d946ef", // 紫红
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
  learning: "#84cc16",       // 柠檬绿（区别于 devops 的草绿）
};
export const CAT_FALLBACK_COLOR = "#94a3b8"; // 未分类/未知

export function catColor(slug: string | null | undefined): string {
  return (slug && CAT_COLORS[slug]) || CAT_FALLBACK_COLOR;
}

// 语言 → 颜色（星图语言模式用）。常用语言用 GitHub 风格色，其余按名字 hash 生成稳定色。
export const LANG_COLORS: Record<string, string> = {
  JavaScript: "#f1e05a", TypeScript: "#3178c6", Python: "#3572A5", Rust: "#dea584",
  Go: "#00ADD8", Java: "#b07219", C: "#9aa0a6", "C++": "#f34b7d", "C#": "#178600",
  Ruby: "#701516", PHP: "#4F5D95", Swift: "#F05138", Kotlin: "#A97BFF", Dart: "#00B4AB",
  Shell: "#89e051", HTML: "#e34c26", CSS: "#563d7c", Vue: "#41b883", Zig: "#ec915c",
  Lua: "#9c66ff", Scala: "#c22d40", Elixir: "#6e4a7e", Haskell: "#5e5086",
  "Jupyter Notebook": "#DA5B0B", Clojure: "#db5855", OCaml: "#ef7a08",
};

export function langColor(lang: string | null | undefined): string {
  if (!lang) return CAT_FALLBACK_COLOR;
  if (LANG_COLORS[lang]) return LANG_COLORS[lang];
  let h = 0;
  for (let i = 0; i < lang.length; i++) h = (h * 31 + lang.charCodeAt(i)) % 360;
  return `hsl(${h}, 60%, 58%)`;
}
