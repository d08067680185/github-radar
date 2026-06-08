import { ImageResponse } from "next/og";
import { api } from "@/lib/api";

export const alt = "GitHub Radar 项目评分";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const DIMS = [
  { key: "growth_score", label: "增长" },
  { key: "activity_score", label: "活跃" },
  { key: "health_score", label: "健康" },
  { key: "heat_score", label: "热度" },
] as const;

export default async function OgImage({
  params,
}: {
  params: Promise<{ owner: string; name: string }>;
}) {
  const { owner, name } = await params;
  let project = null;
  try {
    project = await api.project(owner, name);
  } catch {
    /* fall through to fallback card */
  }

  const fullName = project ? project.full_name : `${owner}/${name}`;
  const score = project ? String(project.score) : "—";
  const stars = project ? project.stars.toLocaleString() : "";
  const sub = project ? `${project.language || "开源项目"}  ·  ⭐ ${stars}` : "开源项目";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          justifyContent: "space-between", padding: 64,
          background: "linear-gradient(135deg, #0a0e16 0%, #141a27 100%)",
          color: "#e8edf6", fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 30, color: "#8a97ad" }}>🛰️ GitHub Radar</div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 800 }}>{fullName}</div>
          <div style={{ display: "flex", fontSize: 30, color: "#8a97ad", marginTop: 12 }}>{sub}</div>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 28 }}>
            {project &&
              DIMS.map((d) => (
                <div key={d.key} style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", fontSize: 40, fontWeight: 800 }}>
                    {String(project[d.key])}
                  </div>
                  <div style={{ display: "flex", fontSize: 22, color: "#8a97ad" }}>{d.label}</div>
                </div>
              ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ display: "flex", fontSize: 96, fontWeight: 800, color: "#3ddc84" }}>{score}</div>
            <div style={{ display: "flex", fontSize: 26, color: "#8a97ad" }}>综合评分 / 100</div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
