import { ImageResponse } from "next/og";
import { api } from "@/lib/api";

export const alt = "GitHub Radar 收藏集";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let list = null;
  try {
    list = await api.publicList(slug);
  } catch {
    /* fall through to fallback card */
  }

  const title = list ? list.title : "GitHub Radar 收藏集";
  const count = list ? list.count : 0;
  // 取前 5 个项目名做预览 chips
  const names = list ? list.items.slice(0, 5).map((it) => it.project.full_name) : [];

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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 30, color: "#8a97ad" }}>🛰️ GitHub Radar</div>
          <div style={{ display: "flex", fontSize: 26, color: "#4f8cff", fontWeight: 700 }}>精选收藏集</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 800, lineHeight: 1.1 }}>📚 {title}</div>
          <div style={{ display: "flex", fontSize: 32, color: "#3ddc84", marginTop: 16, fontWeight: 700 }}>
            {count} 个精选开源项目
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {names.map((n) => (
            <div
              key={n}
              style={{
                display: "flex", fontSize: 24, color: "#c8d2e0",
                padding: "8px 18px", borderRadius: 999,
                background: "rgba(79,140,255,0.12)", border: "1px solid rgba(79,140,255,0.3)",
              }}
            >
              {n}
            </div>
          ))}
          {count > names.length && (
            <div style={{ display: "flex", fontSize: 24, color: "#8a97ad", padding: "8px 12px" }}>
              +{count - names.length}
            </div>
          )}
        </div>
      </div>
    ),
    { ...size }
  );
}
