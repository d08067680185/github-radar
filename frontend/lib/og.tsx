import { ImageResponse } from "next/og";

// 列表型页面共用的 OG 卡片（1200×630）：品牌 + 分类标签 + 大标题 + 副标题 + 项目名 chips。
// 各 opengraph-image.tsx 取好数据后调 listOgImage(...) 即可，避免重复布局代码。
// Satori 约束：每个有多个子节点的 div 必须显式 display:flex。
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_ALT = "GitHub Radar";
export const OG_CONTENT_TYPE = "image/png";

export function listOgImage({
  label,
  title,
  subtitle,
  chips,
}: {
  label: string;
  title: string;
  subtitle: string;
  chips: string[];
}) {
  const shown = chips.slice(0, 5);
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
          <div style={{ display: "flex", fontSize: 26, color: "#4f8cff", fontWeight: 700 }}>{label}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 800, lineHeight: 1.1 }}>{title}</div>
          {subtitle ? (
            <div style={{ display: "flex", fontSize: 32, color: "#3ddc84", marginTop: 16, fontWeight: 700 }}>
              {subtitle}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {shown.map((c) => (
            <div
              key={c}
              style={{
                display: "flex", fontSize: 24, color: "#c8d2e0",
                padding: "8px 18px", borderRadius: 999,
                background: "rgba(79,140,255,0.12)", border: "1px solid rgba(79,140,255,0.3)",
              }}
            >
              {c}
            </div>
          ))}
          {chips.length > shown.length ? (
            <div style={{ display: "flex", fontSize: 24, color: "#8a97ad", padding: "8px 12px" }}>
              +{chips.length - shown.length}
            </div>
          ) : null}
        </div>
      </div>
    ),
    OG_SIZE
  );
}
