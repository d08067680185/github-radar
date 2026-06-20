import type { MetadataRoute } from "next";

const SITE = process.env.SITE_URL || "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    // 工具/账户类页面无 SEO 价值，禁止抓取（含 /en 前缀版，避免索引退订/登录页）
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/unsubscribe", "/account", "/admin", "/compare",
        "/en/unsubscribe", "/en/account", "/en/admin", "/en/compare",
      ],
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
