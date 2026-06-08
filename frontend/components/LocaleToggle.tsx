"use client";

import { useLocale } from "@/lib/i18n-client";
import { LOCALE_COOKIE } from "@/lib/i18n";

export default function LocaleToggle() {
  const { locale } = useLocale();

  const toggle = () => {
    const next = locale === "zh" ? "en" : "zh";
    // 一年有效期，写 cookie 后刷新让服务端按新 locale 渲染
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000`;
    location.reload();
  };

  return (
    <button className="theme-toggle" onClick={toggle}
            aria-label={locale === "zh" ? "Switch to English" : "切换为中文"}
            title={locale === "zh" ? "English" : "中文"}>
      {locale === "zh" ? "EN" : "中"}
    </button>
  );
}
