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
import BadgeEmbed from "@/components/BadgeEmbed";
import RadarChart from "@/components/RadarChart";
import StandingCard from "@/components/StandingCard";

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
  // 4 个后端请求并行（原本串行，extras 还会同步打 GitHub，串行时阻塞整页）
  const [data, similar, standing, extras] = await Promise.all([
    load(owner, name),
    api.similar(owner, name, 6).catch(() => []),
    api.standing(owner, name).catch(() => null),
    api.extras(owner, name).catch(() => ({ readme_excerpt: null, latest_release: null })),
  ]);
  if (!data) notFound();
  const { project, history } = data;
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
      <a href={`/org/${project.owner}`} style={{ fontSize: 13, color: "var(--muted)", display: "inline-block", margin: "0 0 8px" }}>
        {t.org_by_link(project.owner)}
      </a>
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

      <div style={{ margin: "8px 0 4px" }}>
        <RadarChart
          axes={[t.growth, t.activity, t.health, t.heat]}
          series={[{
            label: project.full_name,
            color: "#4f8cff",
            values: [project.growth_score, project.activity_score, project.health_score, project.heat_score],
          }]}
        />
      </div>

      {project.topics.length > 0 && (
        <div style={{ margin: "16px 0" }}>
          {project.topics.map((topic) => (
            <a className="topic-tag" key={topic} href={`/topic/${encodeURIComponent(topic)}`}>{topic}</a>
          ))}
        </div>
      )}

      {standing?.category && (
        <StandingCard standing={standing} currentFullName={project.full_name} locale={locale} t={t} />
      )}

      <h2 style={{ fontSize: 18, marginTop: 28 }}>{t.trend_h}</h2>
      <GrowthBadges history={history} />
      <StarTrend points={history} />

      {(() => {
        const events = [
          { label: t.tl_created, iso: project.created_at, icon: "🎉" },
          { label: t.tl_release, iso: project.last_release_at, icon: "🚀" },
          { label: t.tl_push, iso: project.pushed_at, icon: "💻" },
        ]
          .filter((e) => e.iso)
          .sort((a, b) => +new Date(a.iso!) - +new Date(b.iso!));
        if (events.length === 0) return null;
        return (
          <>
            <h2 style={{ fontSize: 18, marginTop: 28 }}>{t.timeline_h}</h2>
            <div style={{ borderLeft: "2px solid var(--border)", marginLeft: 10, paddingLeft: 18, marginTop: 10 }}>
              {events.map((e) => (
                <div key={e.label} style={{ position: "relative", padding: "6px 0" }}>
                  <span style={{ position: "absolute", left: -27, fontSize: 14 }}>{e.icon}</span>
                  <span style={{ color: "var(--muted)", fontSize: 13 }}>{dateFmt(e.iso)}</span>
                  <span style={{ color: "var(--text)", fontSize: 14, marginLeft: 10 }}>{e.label}</span>
                </div>
              ))}
            </div>
          </>
        );
      })()}

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

      <BadgeEmbed fullName={project.full_name} siteUrl={process.env.SITE_URL || ""} />

      {similar.length > 0 && (
        <section style={{ marginTop: 36 }}>
          <h2 style={{ fontSize: 18 }}>{t.similar_h}</h2>
          <RankingList projects={similar} metric="score" />
        </section>
      )}
    </>
  );
}
