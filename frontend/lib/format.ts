import type { Project } from "./types";
import type { Locale } from "./i18n";

type SummaryFields = Pick<Project, "description" | "language" | "topics"> & {
  readme_summary?: string | null;
  readme_summary_en?: string | null;
};

/** 当前语言对应的 AI 简介（en 用英文字段，zh 用中文字段），无则 null。 */
export function aiSummary(p: SummaryFields, locale: Locale = "zh"): string | null {
  const s = locale === "en" ? p.readme_summary_en : p.readme_summary;
  return s && s.trim() ? s.trim() : null;
}

/**
 * 项目简介：优先当前语言的 AI 简介；缺失时用 GitHub 原生描述；再缺用语言+topics 合成；都没有则占位。
 * 让每个项目卡片/详情页都有可读的简介。
 */
export function projectSummary(p: SummaryFields, locale: Locale = "zh"): string {
  const ai = aiSummary(p, locale);
  if (ai) return ai;
  if (p.description && p.description.trim()) return p.description.trim();

  const parts: string[] = [];
  if (p.language) parts.push(p.language);
  if (p.topics && p.topics.length) parts.push(p.topics.slice(0, 4).join(" / "));
  if (parts.length) return parts.join(" · ");

  return locale === "en" ? "No description" : "暂无简介";
}

/** 是否为合成/占位简介（用于样式区分）：无 AI 简介且无原生描述时为真 */
export function isSyntheticSummary(p: SummaryFields, locale: Locale = "zh"): boolean {
  return !(aiSummary(p, locale) || (p.description && p.description.trim()));
}
