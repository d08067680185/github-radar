import type { Project } from "./types";

/**
 * 项目简介：优先 GitHub 原生描述；缺失时用语言+topics 合成；都没有则占位。
 * 让每个项目卡片/详情页都有可读的简介，无需额外成本。
 */
export function projectSummary(
  p: Pick<Project, "description" | "language" | "topics"> & { readme_summary?: string | null },
): string {
  // 优先 AI 中文简介
  if (p.readme_summary && p.readme_summary.trim()) return p.readme_summary.trim();
  if (p.description && p.description.trim()) return p.description.trim();

  const parts: string[] = [];
  if (p.language) parts.push(p.language);
  if (p.topics && p.topics.length) parts.push(p.topics.slice(0, 4).join(" / "));
  if (parts.length) return parts.join(" · ");

  return "暂无简介";
}

/** 是否为合成/占位简介（用于样式区分）：无 AI 简介且无原生描述时为真 */
export function isSyntheticSummary(
  p: Pick<Project, "description"> & { readme_summary?: string | null },
): boolean {
  return !((p.readme_summary && p.readme_summary.trim()) || (p.description && p.description.trim()));
}
