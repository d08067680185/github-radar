import type { Project } from "@/lib/types";
import ProjectCard from "./ProjectCard";

export default function RankingList({
  projects,
  metric = "score",
  startRank = 0,
}: {
  projects: Project[];
  metric?: "score" | "growth_score";
  startRank?: number;
}) {
  if (!projects.length) {
    return <p className="page-sub">暂无数据。运行后端流水线后将自动出现。</p>;
  }
  return (
    <div className="list">
      {projects.map((p, i) => (
        <ProjectCard key={p.full_name} project={p} rank={startRank + i + 1} metric={metric} />
      ))}
    </div>
  );
}
