import type { Metadata } from "next";
import { api } from "@/lib/api";
import type { ProjectDetail } from "@/lib/types";

export const metadata: Metadata = {
  title: "项目对比",
  description: "并排对比多个开源项目的综合评分与四个维度。",
};

function fmt(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ repos?: string }>;
}) {
  const reposParam = (await searchParams).repos || "";
  const names = reposParam.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 4);

  const results = await Promise.all(
    names.map(async (full) => {
      const [owner, name] = full.split("/");
      if (!owner || !name) return null;
      try {
        return await api.project(owner, name);
      } catch {
        return null;
      }
    })
  );
  const projects = results.filter((p): p is ProjectDetail => p !== null);

  const { getDict, getLocale } = await import("@/lib/i18n-server");
  const { catName } = await import("@/lib/i18n");
  const t = await getDict();
  const locale = await getLocale();
  const en = locale === "en";
  const DIMS = [
    { key: "score", label: t.overallScore, accent: true },
    { key: "growth_score", label: t.growth },
    { key: "activity_score", label: t.activity },
    { key: "health_score", label: t.health },
    { key: "heat_score", label: t.heat },
  ] as const;

  if (projects.length === 0) {
    return (
      <>
        <h1 className="page-title">{en ? "Compare Projects" : "项目对比"}</h1>
        <p className="page-sub">
          {en
            ? "No projects selected. Click “⇄ Compare” on a list or detail page (up to 4), then come back."
            : "还没有选择项目。在榜单或详情页点「⇄ 对比」加入项目（最多 4 个）后再来这里。"}
        </p>
        <a className="chip" href="/">{t.backToList}</a>
      </>
    );
  }

  const best: Record<string, number> = {};
  for (const d of DIMS) best[d.key] = Math.max(...projects.map((p) => Number(p[d.key])));

  return (
    <>
      <h1 className="page-title">{en ? "⇄ Compare Projects" : "⇄ 项目对比"}</h1>
      <p className="page-sub">{en ? "Green highlights the best in each dimension." : "绿色高亮为该维度表现最优的项目。"}</p>

      <div className="cmp-grid" style={{ gridTemplateColumns: `160px repeat(${projects.length}, 1fr)` }}>
        {/* 头行 */}
        <div className="cmp-cell cmp-head" />
        {projects.map((p) => (
          <div className="cmp-cell cmp-head" key={p.full_name}>
            <a className="repo-name" href={`/repo/${p.full_name}`}>{p.full_name}</a>
            <div className="meta" style={{ marginTop: 6 }}>
              {p.language && <span><span className="lang-dot" />{p.language}</span>}
              <span>⭐ {fmt(p.stars)}</span>
            </div>
          </div>
        ))}

        {/* 维度行 */}
        {DIMS.map((d) => (
          <CompareRow key={d.key} dim={d} projects={projects} best={best[d.key]} />
        ))}

        {/* 其他信息 */}
        <div className="cmp-cell cmp-rowlabel">Forks</div>
        {projects.map((p) => <div className="cmp-cell" key={p.full_name}>{fmt(p.forks)}</div>)}
        <div className="cmp-cell cmp-rowlabel">License</div>
        {projects.map((p) => <div className="cmp-cell" key={p.full_name}>{p.license || "-"}</div>)}
        <div className="cmp-cell cmp-rowlabel">{en ? "Category" : "领域"}</div>
        {projects.map((p) => <div className="cmp-cell" key={p.full_name}>{catName(p.category, locale, p.category_name) || "-"}</div>)}
      </div>
    </>
  );
}

function CompareRow({
  dim, projects, best,
}: {
  dim: { key: string; label: string; accent?: boolean };
  projects: ProjectDetail[];
  best: number;
}) {
  return (
    <>
      <div className="cmp-cell cmp-rowlabel">{dim.label}</div>
      {projects.map((p) => {
        const v = Number(p[dim.key as keyof ProjectDetail]);
        const isBest = v === best && projects.length > 1;
        return (
          <div className="cmp-cell" key={p.full_name}>
            <div className={`cmp-val ${isBest ? "best" : ""} ${dim.accent ? "accent" : ""}`}>{v}</div>
            <div className="bar"><span style={{ width: `${v}%` }} /></div>
          </div>
        );
      })}
    </>
  );
}
