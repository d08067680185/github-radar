import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import { getDict, getLocale } from "@/lib/i18n-server";
import { catName } from "@/lib/i18n";
import RankingList from "@/components/RankingList";
import SortSelect from "@/components/SortSelect";

export const revalidate = 3600;

function fmt(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

async function load(owner: string, sort?: string) {
  try {
    return await api.org(owner, sort);
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ owner: string }>;
}): Promise<Metadata> {
  const { owner } = await params;
  const org = await load(owner);
  if (!org) return { title: owner };
  const title = `${owner} — ${org.project_count} 个上榜开源项目`;
  const desc = `${owner} 名下共 ${org.project_count} 个上榜项目，总计 ${org.total_stars.toLocaleString()} Star。`;
  return {
    title,
    description: desc,
    alternates: { canonical: `/org/${owner}` },
    openGraph: { title, description: desc, type: "profile" },
  };
}

export default async function OrgPage({
  params,
  searchParams,
}: {
  params: Promise<{ owner: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const { owner } = await params;
  const sort = (await searchParams).sort || "score";
  const [t, locale, org] = await Promise.all([getDict(), getLocale(), load(owner, sort)]);
  if (!org) notFound();

  const stats = [
    { label: t.org_projects, value: org.project_count.toLocaleString() },
    { label: t.org_totalstars, value: `⭐ ${fmt(org.total_stars)}` },
    { label: t.org_avgscore, value: org.avg_score },
    ...(org.top_category
      ? [{ label: t.org_topcat, value: catName(org.top_category, locale, org.top_category_name) }]
      : []),
  ];

  return (
    <>
      <a href="/" style={{ fontSize: 13, color: "var(--muted)" }}>{t.backToList}</a>
      <h1 className="page-title">{owner}</h1>
      <p className="page-sub">{t.org_by}</p>

      {/* 概览统计卡 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: 12,
          margin: "16px 0 24px",
        }}
      >
        {stats.map((s) => (
          <div
            key={s.label}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "14px 16px",
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text)" }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* 技术栈 / 领域分布 chips */}
      {(org.languages.length > 0 || org.categories.length > 0) && (
        <div style={{ marginBottom: 24, display: "grid", gap: 12 }}>
          {org.languages.length > 0 && (
            <div className="meta">
              <span style={{ color: "var(--muted)" }}>{t.org_langs}:</span>
              {org.languages.map((l) => (
                <a key={l.slug} className="chip" href={`/lang/${encodeURIComponent(l.slug)}`}>
                  {l.name} · {l.count}
                </a>
              ))}
            </div>
          )}
          {org.categories.length > 0 && (
            <div className="meta">
              <span style={{ color: "var(--muted)" }}>{t.org_cats}:</span>
              {org.categories.map((c) => (
                <a key={c.slug} className="chip" href={`/category/${c.slug}`}>
                  {catName(c.slug, locale, c.name)} · {c.count}
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h2 className="page-title" style={{ fontSize: 22 }}>{t.org_all_projects}</h2>
        <SortSelect current={sort} />
      </div>
      <RankingList projects={org.projects} metric="score" />
    </>
  );
}
