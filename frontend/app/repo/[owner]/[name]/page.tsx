import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import { projectSummary, aiSummary } from "@/lib/format";
import { getDict, getLocale } from "@/lib/i18n-server";
import { catName } from "@/lib/i18n";
import RankingList from "@/components/RankingList";
import StarTrend from "@/components/StarTrend";
import GrowthBadges from "@/components/GrowthBadges";
import FavoriteButton from "@/components/FavoriteButton";
import CompareButton from "@/components/CompareButton";
import ShareButton from "@/components/ShareButton";

export const revalidate = 3600;

async function load(owner: string, name: string) {
  try {
    const [project, history] = await Promise.all([
      api.project(owner, name),
      api.history(owner, name, 90),
    ]);
    return { project, history };
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ owner: string; name: string }>;
}): Promise<Metadata> {
  const { owner, name } = await params;
  const data = await load(owner, name);
  if (!data) return {};
  const { project } = data;
  const locale = await getLocale();
  const desc =
    aiSummary(project, locale) || project.description ||
    (locale === "en"
      ? `Open-source score, star trend and maintenance activity for ${project.full_name}.`
      : `${project.full_name} 的开源项目评分、star 趋势与维护活跃度分析。`);
  const title = `${project.full_name} — 综合评分 ${project.score}`;
  return {
    title,
    description: desc,
    alternates: { canonical: `/repo/${project.full_name}` },
    openGraph: { title, description: desc, type: "article" },
    twitter: { card: "summary", title, description: desc },
  };
}

export default async function RepoPage({
  params,
}: {
  params: Promise<{ owner: string; name: string }>;
}) {
  const { owner, name } = await params;
  const data = await load(owner, name);
  if (!data) notFound();
  const { project, history } = data;
  const similar = await api.similar(owner, name, 6).catch(() => []);
  const extras = await api
    .extras(owner, name)
    .catch(() => ({ readme_excerpt: null, latest_release: null }));
  const t = await getDict();
  const locale = await getLocale();

  const dateFmt = (iso: string | null) =>
    iso ? new Date(iso).toISOString().slice(0, 10) : "—";

  // JSON-LD 结构化数据（有助于搜索引擎理解）
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name: project.name,
    description: project.description,
    codeRepository: `https://github.com/${project.full_name}`,
    programmingLanguage: project.language,
    license: project.license,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <a href="/" style={{ fontSize: 13, color: "var(--muted)" }}>{t.backToList}</a>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <h1 className="page-title">{project.full_name}</h1>
        <div style={{ marginTop: 28, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <ShareButton fullName={project.full_name} score={project.score} />
          <CompareButton fullName={project.full_name} />
          <FavoriteButton fullName={project.full_name} />
        </div>
      </div>
      {aiSummary(project, locale) && (
        <p style={{ fontSize: 15, color: "var(--text)", margin: "0 0 8px" }}>✨ {aiSummary(project, locale)}</p>
      )}
      {project.description ? (
        <p className="page-sub">{project.description}</p>
      ) : (
        !aiSummary(project, locale) && <p className="page-sub">{projectSummary(project, locale)}</p>
      )}

      <div className="meta" style={{ marginBottom: 16 }}>
        {project.language && <span><span className="lang-dot" />{project.language}</span>}
        <span>⭐ {project.stars.toLocaleString()}</span>
        <span>🍴 {project.forks.toLocaleString()}</span>
        <span>🐛 {project.open_issues.toLocaleString()} open issues</span>
        {project.license && <span>📄 {project.license}</span>}
        {project.category && (
          <a className="chip active" href={`/category/${project.category}`}>{catName(project.category, locale, project.category_name)}</a>
        )}
      </div>

      <div className="meta" style={{ marginBottom: 16, color: "var(--faint)" }}>
        <span>{t.createdAt} {dateFmt(project.created_at)}</span>
        <span>{t.lastPush} {dateFmt(project.pushed_at)}</span>
        {project.last_release_at && <span>{t.lastRelease} {dateFmt(project.last_release_at)}</span>}
      </div>

      <div style={{ margin: "8px 0 4px", fontSize: 14, color: "var(--muted)" }}>
        {t.overallScore} <b style={{ color: "var(--green)", fontSize: 22 }}>{project.score}</b> / 100
      </div>

      <div className="dims">
        {[
          { key: "growth_score", label: t.growth },
          { key: "activity_score", label: t.activity },
          { key: "health_score", label: t.health },
          { key: "heat_score", label: t.heat },
        ].map((d) => {
          const v = project[d.key as keyof typeof project] as number;
          return (
            <div className="dim" key={d.key}>
              <div className="v">{v}</div>
              <div className="k">{d.label}</div>
              <div className="bar"><span style={{ width: `${v}%` }} /></div>
            </div>
          );
        })}
      </div>

      {project.topics.length > 0 && (
        <div style={{ margin: "16px 0" }}>
          {project.topics.map((topic) => (
            <span className="topic-tag" key={topic}>{topic}</span>
          ))}
        </div>
      )}

      <h2 style={{ fontSize: 18, marginTop: 28 }}>{t.trend_h}</h2>
      <GrowthBadges history={history} />
      <StarTrend points={history} />

      {extras.latest_release?.tag && (
        <section style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 18 }}>{t.release_h}</h2>
          <div style={{
            padding: "12px 16px", borderRadius: 8,
            background: "var(--card-bg, rgba(128,128,128,.06))",
            border: "1px solid var(--border, rgba(128,128,128,.15))",
          }}>
            <div style={{ display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
              <b>{extras.latest_release.name || extras.latest_release.tag}</b>
              {extras.latest_release.published_at && (
                <span style={{ fontSize: 13, color: "var(--faint)" }}>
                  {extras.latest_release.published_at.slice(0, 10)}
                </span>
              )}
              {extras.latest_release.url && (
                <a href={extras.latest_release.url} target="_blank" rel="noopener" style={{ fontSize: 13 }}>
                  Release Notes →
                </a>
              )}
            </div>
            {extras.latest_release.notes_excerpt && (
              <p style={{ fontSize: 14, color: "var(--muted)", margin: "8px 0 0" }}>
                {extras.latest_release.notes_excerpt}
              </p>
            )}
          </div>
        </section>
      )}

      {extras.readme_excerpt && (
        <section style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 18 }}>{t.readme_h}</h2>
          <p style={{ fontSize: 14, lineHeight: 1.8, color: "var(--muted)" }}>
            {extras.readme_excerpt}…{" "}
            <a href={`https://github.com/${project.full_name}#readme`} target="_blank" rel="noopener">
              {t.readme_more}
            </a>
          </p>
        </section>
      )}

      <p style={{ marginTop: 24 }}>
        <a href={`https://github.com/${project.full_name}`} target="_blank" rel="noopener">
          {t.viewOnGh}
        </a>
      </p>

      {similar.length > 0 && (
        <section style={{ marginTop: 36 }}>
          <h2 style={{ fontSize: 18 }}>{t.similar_h}</h2>
          <RankingList projects={similar} metric="score" />
        </section>
      )}
    </>
  );
}
