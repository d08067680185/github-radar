import type {
  Project, ProjectDetail, SnapshotPoint, Category, Stats, MapNode, MapTimeline, Org, Mover,
  DigestArchiveListItem, DigestArchiveDetail, Standing, PublicList, TopSearch,
} from "./types";

const API_BASE = process.env.API_BASE || "http://127.0.0.1:8077";

// 数据/列表类请求默认实时取（cache:"no-store"），新鲜度靠后端 Redis 缓存（TTL 1h）兜底。
// 2026-07-14 事故：fetch Data Cache 把空库期的 [] 持久化到容器磁盘，后端恢复后全站仍
// “暂无数据”（force-dynamic 也挡不住 fetch 级缓存）。只有明确传 revalidate 的低风险
// 端点（extras/热门统计等）才走 ISR 缓存。
function fetchOpts(revalidate?: number): RequestInit {
  return revalidate === undefined
    ? { cache: "no-store" }
    : { next: { revalidate } };
}

async function get<T>(path: string, revalidate?: number): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, fetchOpts(revalidate));
  if (!res.ok) throw new Error(`API ${path} -> ${res.status}`);
  return res.json();
}

// 返回数据 + 总数（读 X-Total-Count 头），用于翻页
export interface Paged {
  items: Project[];
  total: number;
}
async function getPaged(path: string, revalidate?: number): Promise<Paged> {
  const res = await fetch(`${API_BASE}${path}`, fetchOpts(revalidate));
  if (!res.ok) throw new Error(`API ${path} -> ${res.status}`);
  const total = Number(res.headers.get("X-Total-Count") || 0);
  const items = await res.json();
  return { items, total };
}

interface RankParams {
  language?: string;
  category?: string;
  sort?: string;
  limit?: number;
  offset?: number;
}

export interface SearchParams {
  q?: string;
  language?: string;
  category?: string;
  min_stars?: number;
  created_after?: string;
  sort?: "score" | "growth" | "stars" | "activity";
  limit?: number;
  offset?: number;
}

function qs(params: RankParams | SearchParams): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "" && v !== null) sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const PER_PAGE = 30;

export const api = {
  top: (p: RankParams = {}) => get<Project[]>(`/api/rankings/top${qs(p)}`),
  trending: (p: RankParams = {}) => get<Project[]>(`/api/rankings/trending${qs(p)}`),
  topPaged: (p: RankParams = {}) => getPaged(`/api/rankings/top${qs(p)}`),
  trendingPaged: (p: RankParams = {}) => getPaged(`/api/rankings/trending${qs(p)}`),
  risingPaged: (p: RankParams & { days?: number } = {}) =>
    getPaged(`/api/rankings/rising${qs(p)}`),
  languages: () => get<string[]>("/api/languages"),
  languageStats: () => get<Category[]>("/api/languages/stats"),
  categories: () => get<Category[]>("/api/categories"),
  stats: () => get<Stats>("/api/stats"),
  mapNodes: (limit = 400) => get<MapNode[]>(`/api/map?limit=${limit}`),
  mapTimeline: (limit = 300, days = 30) =>
    get<MapTimeline>(`/api/map/timeline?limit=${limit}&days=${days}`),
  project: (owner: string, name: string) =>
    get<ProjectDetail>(`/api/projects/${owner}/${name}`),
  history: (owner: string, name: string, days = 90) =>
    get<SnapshotPoint[]>(`/api/projects/${owner}/${name}/history?days=${days}`),
  similar: (owner: string, name: string, limit = 6) =>
    get<Project[]>(`/api/projects/${owner}/${name}/similar?limit=${limit}`),
  extras: (owner: string, name: string) =>
    get<{
      readme_excerpt: string | null;
      latest_release: {
        tag: string | null; name: string | null;
        published_at: string | null; url: string | null;
        notes_excerpt: string | null;
      } | null;
    }>(`/api/projects/${owner}/${name}/extras`, 86400),
  searchPaged: (p: SearchParams) => getPaged(`/api/search${qs(p)}`, 60),
  org: (owner: string, sort?: string) =>
    get<Org>(`/api/org/${encodeURIComponent(owner)}${sort ? `?sort=${sort}` : ""}`),
  movers: (days = 7, limit = 6) =>
    get<Mover[]>(`/api/rankings/movers?days=${days}&limit=${limit}`),
  moversPaged: (p: { days?: number; limit?: number; offset?: number } = {}) =>
    getPaged(`/api/rankings/movers${qs(p)}`),
  topics: (limit = 60) => get<Category[]>(`/api/topics?limit=${limit}`),
  topicPaged: (topic: string, p: { sort?: string; limit?: number; offset?: number } = {}) =>
    getPaged(`/api/topic/${encodeURIComponent(topic)}${qs(p)}`),
  standing: (owner: string, name: string) =>
    get<Standing>(`/api/projects/${owner}/${name}/standing`),
  topSearches: (days = 7, limit = 8) =>
    get<TopSearch[]>(`/api/analytics/top-searches?days=${days}&limit=${limit}`, 600),
  topRepos: (days = 7, limit = 6) =>
    get<Project[]>(`/api/analytics/top-repos?days=${days}&limit=${limit}`, 600),
  publicList: (slug: string) =>
    get<PublicList>(`/api/list/${encodeURIComponent(slug)}`, 300),
  digestArchive: () => get<DigestArchiveListItem[]>(`/api/digest/archive`),
  digestArchiveDetail: (week: string) =>
    get<DigestArchiveDetail>(`/api/digest/archive/${encodeURIComponent(week)}`),
};
