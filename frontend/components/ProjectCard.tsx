"use client";

import type { Project } from "@/lib/types";
import { projectSummary, isSyntheticSummary } from "@/lib/format";
import { useLocale } from "@/lib/i18n-client";
import CompareButton from "./CompareButton";

function fmt(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default function ProjectCard({
  project,
  rank,
  metric = "score",
}: {
  project: Project;
  rank: number;
  metric?: "score" | "growth_score";
}) {
  const { t, locale } = useLocale();
  const dims = [
    { key: "growth_score", t: t.growth },
    { key: "activity_score", t: t.activity },
    { key: "health_score", t: t.health },
    { key: "heat_score", t: t.heat },
  ] as const;
  const value = metric === "growth_score" ? project.growth_score : project.score;
  const label = metric === "growth_score" ? t.growth : t.score;
  const medal = rank <= 3 ? ` medal-${rank}` : "";

  return (
    <div className="card">
      <div className={`rank${medal}`}>{rank}</div>

      <div className="body">
        <a className="repo-name" href={`/repo/${project.full_name}`}>
          {project.full_name}
        </a>
        <div className={`desc ${isSyntheticSummary(project, locale) ? "desc-faint" : ""}`}>
          {projectSummary(project, locale)}
        </div>
        <div className="meta">
          {project.language && (
            <span><span className="lang-dot" />{project.language}</span>
          )}
          <span>⭐ {fmt(project.stars)}</span>
          <span>🍴 {fmt(project.forks)}</span>
          {project.license && <span>📄 {project.license}</span>}
          <CompareButton fullName={project.full_name} />
        </div>
      </div>

      <div className="score-block">
        <div className="score-num">
          {value}<span className="lbl">{label}</span>
        </div>
        <div className="dims-mini">
          {dims.map((d) => (
            <div className="col" key={d.key} title={`${d.t} ${project[d.key]}`}>
              <div className="bar"><span style={{ width: `${project[d.key]}%` }} /></div>
              <div className="t">{d.t}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
