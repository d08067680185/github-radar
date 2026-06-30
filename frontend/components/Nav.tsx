"use client";

import { usePathname } from "next/navigation";
import { useLocale } from "@/lib/i18n-client";
import { localeHref } from "@/lib/locale-link";

export default function Nav() {
  const pathname = usePathname();
  const { t, locale } = useLocale();
  const rawLinks = [
    { href: "/", label: t.nav_top },
    { href: "/trending", label: t.nav_trending },
    { href: "/rising", label: t.nav_rising },
    { href: "/categories", label: t.nav_categories },
    { href: "/languages", label: t.nav_languages },
    { href: "/map", label: t.nav_map },
    { href: "/insights", label: t.nav_insights },
    { href: "/picks", label: t.nav_picks },
    { href: "/digest", label: t.nav_digest },
    { href: "/search", label: t.nav_search },
    { href: "/account", label: t.nav_account },
  ];
  const links = rawLinks.map((l) => ({ ...l, href: localeHref(l.href, locale) }));
  // 首页链接（"/" 或 "/en"）用精确匹配，避免高亮传递到所有子路径
  const isActive = (href: string) =>
    href === "/" || href === "/en" ? pathname === href : pathname.startsWith(href);

  return (
    <nav>
      {links.map((l) => (
        <a key={l.href} href={l.href} className={isActive(l.href) ? "active" : ""}>
          {l.label}
        </a>
      ))}
    </nav>
  );
}
