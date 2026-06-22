import type { Standing } from "@/lib/types";
import { type Locale, type Dict, catName } from "@/lib/i18n";

// 详情页「领域定位」：项目在其所属领域内的排名 / 百分位 + 领域 Top5 对照。
// server 组件，纯展示。standing.category 为 null 时不渲染（调用方已 guard，双保险）。
export default function StandingCard({
  standing,
  currentFullName,
  locale,
  t,
}: {
  standing: Standing;
  currentFullName: string;
  locale: Locale;
  t: Dict;
}) {
  if (!standing.category) return null;
  const cat = catName(standing.category, locale, standing.category_name);
  const pct = Math.max(0, Math.min(100, standing.percentile));

  return (
    <section style={{ marginTop: 28 }}>
      <h2 style={{ fontSize: 18 }}>{t.standing_h}</h2>

      <div style={{ fontSize: 14, color: "var(--text)", margin: "8px 0 6px" }}>
        {t.standing_rank(cat, standing.rank, standing.total)}
      </div>
      {/* 百分位进度条 */}
      <div style={{ height: 8, borderRadius: 6, background: "var(--border)", overflow: "hidden" }}>
        <span style={{ display: "block", height: "100%", width: `${pct}%`, background: "var(--green)" }} />
      </div>
      <div style={{ fontSize: 13, color: "var(--muted)", margin: "6px 0 14px" }}>
        {t.standing_pct(pct)}
      </div>

      {/* 领域 Top5 紧凑小榜，高亮当前项目 */}
      {standing.top.length > 0 && (
        <>
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 6 }}>{t.standing_top}</div>
          <div style={{ display: "grid", gap: 4 }}>
            {standing.top.map((p, i) => {
              const isCurrent = p.full_name === currentFullName;
              return (
                <div
                  key={p.full_name}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "7px 10px", borderRadius: 8, fontSize: 14,
                    background: isCurrent ? "var(--border)" : "transparent",
                    border: `1px solid ${isCurrent ? "var(--green)" : "var(--border)"}`,
                  }}
                >
                  <span style={{ color: "var(--muted)", width: 24 }}>#{i + 1}</span>
                  <a href={`/repo/${p.full_name}`} style={{ color: "var(--accent)", textDecoration: "none", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.full_name}
                  </a>
                  {isCurrent && (
                    <span style={{ fontSize: 11, color: "var(--green)", whiteSpace: "nowrap" }}>⟵ {t.standing_thisone}</span>
                  )}
                  <b style={{ color: "var(--green)", width: 44, textAlign: "right" }}>{p.score}</b>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
