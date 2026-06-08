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
  ];

  try {
    const [langs, cats, top] = await Promise.all([
      api.languages(),
      api.categories(),
      api.top({ limit: 200 }),
    ]);

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
    return [...staticPages, ...langPages, ...catPages, ...repoPages];
  } catch {
    return staticPages;
  }
}
