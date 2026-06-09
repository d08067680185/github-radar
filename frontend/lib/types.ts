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

export interface MapNode {
  full_name: string;
  stars: number;
  score: number;
  growth_score: number;
  category: string | null;
  language: string | null;
}
