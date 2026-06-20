import type { MetadataRoute } from "next";
import { api } from "@/lib/api";

const SITE = process.env.SITE_URL || "http://localhost:3000";

type Entry = MetadataRoute.Sitemap[number];

// 每条 URL 带 hreflang 备用链接：中文走规范路径、英文走 /en 前缀，
// 让搜索引擎把 / 与 /en/* 识别为同一内容的两种语言版本。
function entry(
  path: string,
  opts: { lastModified: Date; changeFrequency: Entry["changeFrequency"]; priority: number },
): Entry {
  const enPath = path === "/" ? "/en" : `/en${path}`;
  return {
    url: `${SITE}${path}`,
    lastModified: opts.lastModified,
    changeFrequency: opts.changeFrequency,
    priority: opts.priority,
    alternates: { languages: { zh: `${SITE}${path}`, en: `${SITE}${enPath}` } },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPages: MetadataRoute.Sitemap = [
    entry("/", { lastModified: now, changeFrequency: "daily", priority: 1 }),
    entry("/trending", { lastModified: now, changeFrequency: "daily", priority: 0.9 }),
    entry("/categories", { lastModified: now, changeFrequency: "weekly", priority: 0.7 }),
    entry("/languages", { lastModified: now, changeFrequency: "weekly", priority: 0.7 }),
    entry("/digest", { lastModified: now, changeFrequency: "weekly", priority: 0.7 }),
    entry("/topics", { lastModified: now, changeFrequency: "weekly", priority: 0.7 }),
    entry("/rising", { lastModified: now, changeFrequency: "daily", priority: 0.7 }),
    entry("/picks", { lastModified: now, changeFrequency: "weekly", priority: 0.7 }),
    entry("/insights", { lastModified: now, changeFrequency: "weekly", priority: 0.6 }),
    entry("/map", { lastModified: now, changeFrequency: "weekly", priority: 0.5 }),
    entry("/about", { lastModified: now, changeFrequency: "monthly", priority: 0.4 }),
  ];

  try {
    const [langs, cats, top, digests, topicList] = await Promise.all([
      api.languages(),
      api.categories(),
      api.top({ limit: 200 }),
      api.digestArchive().catch(() => []),
      api.topics(60).catch(() => []),
    ]);
    const topicPages: MetadataRoute.Sitemap = topicList.map((tp) =>
      entry(`/topic/${encodeURIComponent(tp.slug)}`, { lastModified: now, changeFrequency: "weekly", priority: 0.5 }),
    );
    const digestPages: MetadataRoute.Sitemap = digests.map((d) =>
      entry(`/digest/${d.week_date}`, { lastModified: now, changeFrequency: "monthly", priority: 0.5 }),
    );
    const langPages: MetadataRoute.Sitemap = langs.map((l) =>
      entry(`/lang/${encodeURIComponent(l)}`, { lastModified: now, changeFrequency: "daily", priority: 0.6 }),
    );
    const catPages: MetadataRoute.Sitemap = cats.map((c) =>
      entry(`/category/${c.slug}`, { lastModified: now, changeFrequency: "daily", priority: 0.6 }),
    );
    const repoPages: MetadataRoute.Sitemap = top.map((p) =>
      entry(`/repo/${p.full_name}`, { lastModified: now, changeFrequency: "daily", priority: 0.5 }),
    );
    return [...staticPages, ...langPages, ...catPages, ...repoPages, ...digestPages, ...topicPages];
  } catch {
    return staticPages;
  }
}
