import type { Metadata } from "next";
import { api } from "@/lib/api";
import { getLocale } from "@/lib/i18n-server";
import { catName, catColor, CAT_ORDER } from "@/lib/i18n";

export const revalidate = 3600;
export async function generateMetadata(): Promise<Metadata> {
  const en = (await getLocale()) === "en";
  return en
    ? {
        title: "Insights · Open-source ecosystem data",
        description:
          "A panorama of GitHub Radar's catalog: language distribution, technical-domain distribution, and the flagship open-source project of each field.",
      }
    : {
        title: "Insights · 开源生态数据洞察",
        description:
          "GitHub Radar 收录项目的全景数据：编程语言分布、技术领域分布，以及每个领域的旗舰开源项目。",
      };
}

const LANG_TOP = 15; // 语言榜展示前 N

export default async function InsightsPage() {
  const en = (await getLocale()) === "en";

  const [stats, langStats, cats] = await Promise.all([
    api.stats(),
    api.languageStats(), // 已按 count 降序
    api.categories(),
  ]);

  // 领域按固定顺序排列（与星图一致），取各领域 #1 旗舰项目
  const catBySlug = new Map(cats.map((x) => [x.slug, x]));
  const orderedCats = CAT_ORDER.map((slug) => catBySlug.get(slug)).filter(
    (x): x is NonNullable<typeof x> => Boolean(x)
  );
  const flagships = await Promise.all(
    orderedCats.map(async (cat) => {
      const items = await api.top({ category: cat.slug, limit: 1 });
      return { cat, top: items[0] ?? null };
    })
  );

  const topLangs = langStats.slice(0, LANG_TOP);
  const langMax = Math.max(1, ...topLangs.map((l) => l.count));
  const catMax = Math.max(1, ...orderedCats.map((c) => c.count));

  const c = en
    ? {
        h1: "Ecosystem Insights",
        intro:
          "A bird's-eye view of every project on GitHub Radar — how the catalog breaks down by language and domain, and the flagship project leading each field.",
        langH: "Languages by project count",
        langSub: `Top ${LANG_TOP} languages among ${stats.projects.toLocaleString()} ranked projects.`,
        catH: "Projects by domain",
        catSub: "How the catalog distributes across technical domains.",
        flagH: "Flagship of each domain",
        flagSub: "The #1 project by composite score in every category.",
        viewAll: "View all →",
        projects: "projects",
        stat_projects: "Projects",
        stat_languages: "Languages",
        stat_categories: "Domains",
        stat_maxstars: "Top stars",
      }
    : {
        h1: "开源生态洞察",
        intro:
          "GitHub Radar 全部收录项目的鸟瞰图——按语言、按领域如何分布，以及领跑每个领域的旗舰项目。",
        langH: "语言分布",
        langSub: `${stats.projects.toLocaleString()} 个收录项目中，排名前 ${LANG_TOP} 的语言。`,
        catH: "领域分布",
        catSub: "收录项目在各技术领域的分布情况。",
        flagH: "各领域旗舰",
        flagSub: "每个领域综合评分排名第一的项目。",
        viewAll: "查看全部 →",
        projects: "个项目",
        stat_projects: "收录项目",
        stat_languages: "编程语言",
        stat_categories: "技术领域",
        stat_maxstars: "最高 Star",
      };

  const STAT_CELLS = [
    { label: c.stat_projects, value: stats.projects.toLocaleString() },
    { label: c.stat_languages, value: stats.languages.toLocaleString() },
    { label: c.stat_categories, value: stats.categories.toLocaleString() },
    { label: c.stat_maxstars, value: `${Math.round(stats.max_stars / 1000)}k` },
  ];

  return (
    <article style={{ maxWidth: 860, margin: "0 auto", paddingBottom: 48 }}>
      <h1 className="page-title">{c.h1}</h1>
      <p className="page-sub" style={{ fontSize: 15, lineHeight: 1.8 }}>{c.intro}</p>

      {/* 概览数字 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginTop: 6,
        }}
      >
        {STAT_CELLS.map((s) => (
          <div
            key={s.label}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "14px 12px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 850, color: "var(--accent)", letterSpacing: "-0.02em" }}>
              {s.value}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* 语言分布 */}
      <section style={{ marginTop: 36 }}>
        <h2 style={{ fontSize: 20, margin: "0 0 2px" }}>{c.langH}</h2>
        <p className="page-sub" style={{ margin: "0 0 16px" }}>{c.langSub}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {topLangs.map((l) => (
            <a
              key={l.slug}
              href={`/lang/${encodeURIComponent(l.slug)}`}
              style={{ display: "flex", alignItems: "center", gap: 12 }}
            >
              <span
                style={{
                  flex: "0 0 auto",
                  width: 110,
                  fontSize: 13.5,
                  color: "var(--text)",
                  textAlign: "right",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {l.name}
              </span>
              <span style={{ flex: 1, height: 22, background: "var(--bg-soft)", borderRadius: 6, overflow: "hidden" }}>
                <span
                  style={{
                    display: "block",
                    height: "100%",
                    width: `${(l.count / langMax) * 100}%`,
                    background: "var(--accent-grad)",
                    borderRadius: 6,
                    minWidth: 3,
                  }}
                />
              </span>
              <span
                style={{
                  flex: "0 0 auto",
                  width: 48,
                  fontSize: 13,
                  color: "var(--muted)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {l.count}
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* 领域分布 */}
      <section style={{ marginTop: 40 }}>
        <h2 style={{ fontSize: 20, margin: "0 0 2px" }}>{c.catH}</h2>
        <p className="page-sub" style={{ margin: "0 0 16px" }}>{c.catSub}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {orderedCats.map((cat) => {
            const color = catColor(cat.slug);
            return (
              <a
                key={cat.slug}
                href={`/category/${cat.slug}`}
                style={{ display: "flex", alignItems: "center", gap: 12 }}
              >
                <span
                  style={{
                    flex: "0 0 auto",
                    width: 130,
                    fontSize: 13.5,
                    color: "var(--text)",
                    textAlign: "right",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {catName(cat.slug, en ? "en" : "zh", cat.name)}
                </span>
                <span style={{ flex: 1, height: 22, background: "var(--bg-soft)", borderRadius: 6, overflow: "hidden" }}>
                  <span
                    style={{
                      display: "block",
                      height: "100%",
                      width: `${(cat.count / catMax) * 100}%`,
                      background: color,
                      borderRadius: 6,
                      minWidth: 3,
                    }}
                  />
                </span>
                <span
                  style={{
                    flex: "0 0 auto",
                    width: 48,
                    fontSize: 13,
                    color: "var(--muted)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {cat.count}
                </span>
              </a>
            );
          })}
        </div>
      </section>

      {/* 各领域旗舰 */}
      <section style={{ marginTop: 40 }}>
        <h2 style={{ fontSize: 20, margin: "0 0 2px" }}>{c.flagH}</h2>
        <p className="page-sub" style={{ margin: "0 0 16px" }}>{c.flagSub}</p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(248px, 1fr))",
            gap: 12,
          }}
        >
          {flagships.map(({ cat, top }) => {
            const color = catColor(cat.slug);
            return (
              <div
                key={cat.slug}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderLeft: `3px solid ${color}`,
                  borderRadius: "var(--radius)",
                  padding: "14px 16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color }}>
                    {catName(cat.slug, en ? "en" : "zh", cat.name)}
                  </span>
                  <a href={`/category/${cat.slug}`} style={{ fontSize: 11.5, color: "var(--muted)" }}>
                    {cat.count} {c.projects}
                  </a>
                </div>
                {top ? (
                  <a
                    href={`/repo/${top.owner}/${top.name}`}
                    style={{ display: "block", marginTop: 8 }}
                  >
                    <div style={{ fontSize: 15.5, fontWeight: 750 }}>{top.name}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>
                      {top.owner} · ⭐ {top.stars.toLocaleString()}
                    </div>
                  </a>
                ) : (
                  <div style={{ marginTop: 8, fontSize: 13, color: "var(--faint)" }}>—</div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </article>
  );
}
