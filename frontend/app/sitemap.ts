import type { MetadataRoute } from "next";
import { api } from "@/lib/api";

const SITE = process.env.SITE_URL || "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/trending`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE}/categories`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE}/languages`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE}/digest`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE}/topics`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE}/rising`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE}/picks`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE}/insights`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE}/map`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
  ];

  try {
    const [langs, cats, top, digests, topicList] = await Promise.all([
      api.languages(),
      api.categories(),
      api.top({ limit: 200 }),
      api.digestArchive().catch(() => []),
      api.topics(60).catch(() => []),
    ]);
    const topicPages: MetadataRoute.Sitemap = topicList.map((tp) => ({
      url: `${SITE}/topic/${encodeURIComponent(tp.slug)}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.5,
    }));
    const digestPages: MetadataRoute.Sitemap = digests.map((d) => ({
      url: `${SITE}/digest/${d.week_date}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    }));

    const langPages: MetadataRoute.Sitemap = langs.map((l) => ({
      url: `${SITE}/lang/${encodeURIComponent(l)}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.6,
    }));
    const catPages: MetadataRoute.Sitemap = cats.map((c) => ({
      url: `${SITE}/category/${c.slug}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.6,
    }));
    const repoPages: MetadataRoute.Sitemap = top.map((p) => ({
      url: `${SITE}/repo/${p.full_name}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.5,
    }));
    return [...staticPages, ...langPages, ...catPages, ...repoPages, ...digestPages, ...topicPages];
  } catch {
    return staticPages;
  }
}
