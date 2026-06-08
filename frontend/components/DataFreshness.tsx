import { api } from "@/lib/api";
import { getLocale } from "@/lib/i18n-server";

function relative(iso: string, en: boolean): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3.6e6);
  if (en) {
    if (h < 1) return "updated just now";
    if (h < 24) return `updated ${h}h ago`;
    return `updated ${Math.floor(h / 24)}d ago`;
  }
  if (h < 1) return "刚刚更新";
  if (h < 24) return `${h} 小时前更新`;
  return `${Math.floor(h / 24)} 天前更新`;
}

export default async function DataFreshness() {
  try {
    const [s, locale] = await Promise.all([api.stats(), getLocale()]);
    if (!s.updated_at) return null;
    return <span> · 🕒 {relative(s.updated_at, locale === "en")}</span>;
  } catch {
    return null;
  }
}
