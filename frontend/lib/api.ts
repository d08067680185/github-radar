import type {
  Project, ProjectDetail, SnapshotPoint, Category, Stats, MapNode, MapTimeline, Org, Mover,
  DigestArchiveListItem, DigestArchiveDetail,
} from "./types";

const API_BASE = process.env.API_BASE || "http://127.0.0.1:8077";

// ISR：默认每 1 小时增量再生成（榜单日更，1h 足够新鲜又省压）
const REVALIDATE = 3600;

async function get<T>(path: string, revalidate: number = REVALIDATE): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    next: { revalidate },
  });
  if (!res.ok) throw new Error(`API ${path} -> ${res.status}`);
  return res.json();
}

// 返回数据 + 总数（读 X-Total-Count 头），用于翻页
export interface Paged {
  items: Project[];
  total: number;
}
async function getPaged(path: string, revalidate: number = REVALIDATE): Promise<Paged> {
  const res = await fetch(`${API_BASE}${path}`, { next: { revalidate } });
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
  digestArchive: () => get<DigestArchiveListItem[]>(`/api/digest/archive`),
  digestArchiveDetail: (week: string) =>
    get<DigestArchiveDetail>(`/api/digest/archive/${encodeURIComponent(week)}`),
};
