"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useLocale } from "@/lib/i18n-client";

const OPTIONS = [
  "score",
  "stars",
  "growth",
  "activity",
  "forks",
  "updated",
  "newest",
] as const;

export default function SortSelect({ current = "score" }: { current?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { t } = useLocale();

  const labels: Record<(typeof OPTIONS)[number], string> = {
    score: t.sort_score,
    stars: t.sort_stars,
    growth: t.sort_growth,
    activity: t.sort_activity,
    forks: t.sort_forks,
    updated: t.sort_updated,
    newest: t.sort_newest,
  };

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const sp = new URLSearchParams(Array.from(params.entries()));
    if (value && value !== "score") sp.set("sort", value);
    else sp.delete("sort");
    sp.delete("page"); // 换排序回到第 1 页
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted)" }}>
      {t.sortBy}
      <select
        value={OPTIONS.includes(current as (typeof OPTIONS)[number]) ? current : "score"}
        onChange={onChange}
        style={{
          padding: "6px 10px",
          background: "var(--surface)",
          color: "var(--text)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        {OPTIONS.map((o) => (
          <option key={o} value={o}>
            {labels[o]}
          </option>
        ))}
      </select>
    </label>
  );
}
