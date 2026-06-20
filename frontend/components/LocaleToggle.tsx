"use client";

import { usePathname } from "next/navigation";
import { useLocale } from "@/lib/i18n-client";
import { LOCALE_COOKIE } from "@/lib/i18n";

export default function LocaleToggle() {
  const { locale } = useLocale();
  const pathname = usePathname();

  const toggle = () => {
    const next = locale === "zh" ? "en" : "zh";
    // cookie 一年有效，让未加 /en 前缀的内链也保持选定语种
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000`;

    // 切换 URL 的 /en 前缀，让语种体现在路径上（per-URL SEO）
    const isEn = pathname === "/en" || pathname.startsWith("/en/");
    let target: string;
    if (next === "en") {
      target = isEn ? pathname : pathname === "/" ? "/en" : `/en${pathname}`;
    } else {
      target = isEn ? (pathname === "/en" ? "/" : pathname.slice(3)) : pathname;
    }
    // 整页跳转：服务端按新路径/ cookie 重新渲染（中间件读取路径 + 写入 locale 头）
    window.location.assign(target);
  };

  return (
    <button className="theme-toggle" onClick={toggle}
            aria-label={locale === "zh" ? "Switch to English" : "切换为中文"}
            title={locale === "zh" ? "English" : "中文"}>
      {locale === "zh" ? "EN" : "中"}
    </button>
  );
}
