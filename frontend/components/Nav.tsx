"use client";

import { usePathname } from "next/navigation";
import { useLocale } from "@/lib/i18n-client";

export default function Nav() {
  const pathname = usePathname();
  const { t } = useLocale();
  const links = [
    { href: "/", label: t.nav_top },
    { href: "/trending", label: t.nav_trending },
    { href: "/rising", label: t.nav_rising },
    { href: "/categories", label: t.nav_categories },
    { href: "/languages", label: t.nav_languages },
    { href: "/map", label: t.nav_map },
    { href: "/insights", label: t.nav_insights },
    { href: "/picks", label: t.nav_picks },
    { href: "/search", label: t.nav_search },
    { href: "/account", label: t.nav_account },
  ];
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

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
