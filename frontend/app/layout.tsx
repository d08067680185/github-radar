import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { CompareProvider } from "@/lib/compare";
import { LocaleProvider } from "@/lib/i18n-client";
import { getLocale, getCanonicalPath } from "@/lib/i18n-server";
import { getDictFor } from "@/lib/i18n";
import { localeHref } from "@/lib/locale-link";
import Nav from "@/components/Nav";
import ThemeToggle from "@/components/ThemeToggle";
import LocaleToggle from "@/components/LocaleToggle";
import DataFreshness from "@/components/DataFreshness";
import CompareBar from "@/components/CompareBar";
import CommandPalette from "@/components/CommandPalette";
import CommandPaletteTrigger from "@/components/CommandPaletteTrigger";

// 防止主题闪烁：在首屏绘制前读取 localStorage 设置 data-theme
const THEME_INIT = `(function(){try{var t=localStorage.getItem('ghradar_theme');if(t==='light')document.documentElement.dataset.theme='light';}catch(e){}})();`;

const SITE_URL = process.env.SITE_URL || "http://localhost:3000";

// 元数据按 locale 出（中间件已据 /en 路径写入 locale 头，getDict 读得到），
// 让英文页的 title/description/OG 也是英文 —— 英文 SEO 的关键。
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = getDictFor(locale);
  const rss = locale === "en" ? "/feed/new.xml?lang=en" : "/feed/new.xml";
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t.meta_title, template: "%s | GitHub Radar" },
    description: t.meta_desc,
    keywords: t.meta_keywords.split(",").map((s) => s.trim()),
    openGraph: {
      type: "website",
      siteName: "GitHub Radar",
      title: t.meta_title,
      description: t.meta_og_desc,
    },
    alternates: { types: { "application/rss+xml": rss } },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const t = getDictFor(locale);

  // hreflang 对照：中文走规范路径，英文走 /en 前缀；x-default 指向中文（默认语种）。
  // 让搜索引擎知道 / ↔ /en 是同一内容的两种语言版本，各自独立索引。
  const canonicalPath = await getCanonicalPath();
  const zhUrl = `${SITE_URL}${canonicalPath}`;
  const enUrl = `${SITE_URL}${canonicalPath === "/" ? "/en" : `/en${canonicalPath}`}`;

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        <link rel="alternate" hrefLang="zh" href={zhUrl} />
        <link rel="alternate" hrefLang="en" href={enUrl} />
        <link rel="alternate" hrefLang="x-default" href={zhUrl} />
        <link rel="canonical" href={locale === "en" ? enUrl : zhUrl} />
      </head>
      <body>
        <LocaleProvider locale={locale}>
          <AuthProvider>
            <CompareProvider>
              <a href="#main" className="skip-link">{t.skip_to_content}</a>
              <header className="site">
                <div className="container inner">
                  <a href={localeHref("/", locale)} className="logo">🛰️ GitHub Radar</a>
                  <Nav />
                  <CommandPaletteTrigger />
                  <LocaleToggle />
                  <ThemeToggle />
                </div>
              </header>
              <main id="main" className="container">{children}</main>
              <footer className="site">
                <div className="container">
                  GitHub Radar · {t.footer}
                  <DataFreshness />
                  <a href={localeHref("/topics", locale)}>{t.nav_topics}</a>
                  <a href={localeHref("/about", locale)}>{t.nav_about}</a>
                  <a href={locale === "en" ? "/feed/new.xml?lang=en" : "/feed/new.xml"}>{t.rss}</a>
                </div>
              </footer>
              <CompareBar />
              <CommandPalette />
            </CompareProvider>
          </AuthProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
