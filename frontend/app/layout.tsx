import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { CompareProvider } from "@/lib/compare";
import { LocaleProvider } from "@/lib/i18n-client";
import { getLocale } from "@/lib/i18n-server";
import { getDictFor } from "@/lib/i18n";
import Nav from "@/components/Nav";
import ThemeToggle from "@/components/ThemeToggle";
import LocaleToggle from "@/components/LocaleToggle";
import DataFreshness from "@/components/DataFreshness";
import CompareBar from "@/components/CompareBar";

// 防止主题闪烁：在首屏绘制前读取 localStorage 设置 data-theme
const THEME_INIT = `(function(){try{var t=localStorage.getItem('ghradar_theme');if(t==='light')document.documentElement.dataset.theme='light';}catch(e){}})();`;

const SITE_URL = process.env.SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "GitHub Radar — 发现优秀开源项目",
    template: "%s | GitHub Radar",
  },
  description:
    "GitHub Radar 用综合评分（增长趋势、维护活跃度、项目健康度、热度）发现优秀开源项目，提供综合榜与 Trending 榜，按语言与领域分类浏览。",
  keywords: ["开源项目", "GitHub", "Trending", "开源榜单", "best open source"],
  openGraph: {
    type: "website",
    siteName: "GitHub Radar",
    title: "GitHub Radar — 发现优秀开源项目",
    description: "用综合评分发现真正优秀的开源项目。",
  },
  alternates: {
    types: { "application/rss+xml": "/feed/new.xml" },
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const t = getDictFor(locale);
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>
        <LocaleProvider locale={locale}>
          <AuthProvider>
            <CompareProvider>
              <header className="site">
                <div className="container inner">
                  <a href="/" className="logo">🛰️ GitHub Radar</a>
                  <Nav />
                  <LocaleToggle />
                  <ThemeToggle />
                </div>
              </header>
              <main className="container">{children}</main>
              <footer className="site">
                <div className="container">
                  GitHub Radar · {t.footer}
                  <DataFreshness />
                  <a href="/about">{t.nav_about}</a>
                  <a href="/feed/new.xml">{t.rss}</a>
                </div>
              </footer>
              <CompareBar />
            </CompareProvider>
          </AuthProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
