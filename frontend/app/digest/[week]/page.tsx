import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import { getDict, getLocale } from "@/lib/i18n-server";

export const revalidate = 3600;

function fmt(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

async function load(week: string) {
  try {
    return await api.digestArchiveDetail(week);
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ week: string }>;
}): Promise<Metadata> {
  const { week } = await params;
  const d = await load(week);
  if (!d) return { title: "周报" };
  const title = `每周精选 · ${week}`;
  return {
    title,
    description: `GitHub Radar ${week} 当周精选 ${d.item_count} 个上升最快的开源项目。`,
    alternates: { canonical: `/digest/${week}` },
  };
}

export default async function DigestDetailPage({
  params,
}: {
  params: Promise<{ week: string }>;
}) {
  const { week } = await params;
  const [t, locale, d] = await Promise.all([getDict(), getLocale(), load(week)]);
  if (!d) notFound();

  return (
    <>
      <a href="/digest" style={{ fontSize: 13, color: "var(--muted)" }}>{t.digest_back}</a>
      <h1 className="page-title">📰 {week}</h1>
      <p className="page-sub">{t.digest_items(d.item_count)}</p>

      <div style={{ display: "grid", gap: 10, margin: "18px 0" }}>
        {d.items.map((it, i) => {
          const summary = locale === "en" ? it.summary_en : it.summary_zh;
          return (
            <div
              key={it.full_name}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "14px 16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span style={{ color: "var(--faint)", fontWeight: 700 }}>#{i + 1}</span>
                <a className="repo-name" href={`/repo/${it.full_name}`}>{it.full_name}</a>
                <span style={{ flex: 1 }} />
                {it.star_gain != null && it.star_gain > 0 && (
                  <span style={{ color: "var(--green)", fontWeight: 700, fontSize: 14, whiteSpace: "nowrap" }}>
                    +{it.star_gain.toLocaleString()} ⭐
                  </span>
                )}
              </div>
              {summary && (
                <div style={{ fontSize: 13, color: "var(--muted)", margin: "6px 0 0" }}>{summary}</div>
              )}
              <div style={{ fontSize: 12, color: "var(--faint)", marginTop: 6 }}>
                {it.language && <>{it.language} · </>}⭐ {fmt(it.stars)} · {t.score} {it.score}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
