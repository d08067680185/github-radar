export interface Project {
  full_name: string;
  owner: string;
  name: string;
  description: string | null;
  homepage: string | null;
  language: string | null;
  topics: string[];
  license: string | null;
  stars: number;
  forks: number;
  open_issues: number;
  score: number;
  growth_score: number;
  activity_score: number;
  health_score: number;
  heat_score: number;
  category: string | null;
  readme_summary: string | null;
  readme_summary_en: string | null;
  pushed_at: string | null;
}

export interface ProjectDetail extends Project {
  contributors: number;
  watchers: number;
  created_at: string | null;
  last_release_at: string | null;
  category_name: string | null;
}

export interface SnapshotPoint {
  date: string;
  stars: number;
  forks: number;
}

export interface Category {
  slug: string;
  name: string;
  count: number;
}

export interface Stats {
  projects: number;
  languages: number;
  categories: number;
  max_stars: number;
  updated_at: string | null;
}

export interface Mover extends Project {
  star_gain: number;
  gain_pct: number;
  window_days: number;
}

export interface Standing {
  category: string | null;
  category_name: string | null;
  rank: number;
  total: number;
  percentile: number;
  top: Project[];
}

export interface ShareSettings {
  listed: boolean;
  slug: string | null;
  title: string | null;
  count: number;
}

export interface PublicListItem {
  project: Project;
  tags: string[];
  note: string | null;
}

export interface PublicList {
  title: string;
  count: number;
  items: PublicListItem[];
}

export interface Favorite {
  project: Project;
  tags: string[];
  note: string | null;
  created_at: string;
}

export interface DigestArchiveItem {
  full_name: string;
  stars: number;
  score: number;
  star_gain: number | null;
  language: string | null;
  category: string | null;
  summary_zh: string | null;
  summary_en: string | null;
}

export interface DigestArchiveListItem {
  week_date: string;
  title: string;
  item_count: number;
}

export interface DigestArchiveDetail extends DigestArchiveListItem {
  items: DigestArchiveItem[];
}

export interface Org {
  owner: string;
  project_count: number;
  total_stars: number;
  avg_score: number;
  top_category: string | null;
  top_category_name: string | null;
  categories: Category[];
  languages: Category[];
  projects: Project[];
}

export interface MapNode {
  full_name: string;
  stars: number;
  score: number;
  growth_score: number;
  activity_score: number;
  health_score: number;
  heat_score: number;
  category: string | null;
  language: string | null;
}

export interface MapTimelineNode {
  full_name: string;
  stars: number;
  score: number;
  growth_score: number;
  category: string | null;
  language: string | null;
  series: number[];
}

export interface MapTimeline {
  dates: string[];
  nodes: MapTimelineNode[];
}
