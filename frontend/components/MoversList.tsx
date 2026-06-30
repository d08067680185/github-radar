"use client";

import type { Mover } from "@/lib/types";
import { useLocale } from "@/lib/i18n-client";
import { localeHref } from "@/lib/locale-link";

function fmt(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export default function MoversList({
  movers,
  startRank = 0,
}: {
  movers: Mover[];
  startRank?: number;
}) {
  const { t, locale } = useLocale();
  if (!movers.length) {
    return <p className="page-sub">{t.tw_empty}</p>;
  }
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {movers.map((m, i) => {
        const rank = startRank + i + 1;
        const medal = rank <= 3 ? ` medal-${rank}` : "";
        return (
          <div
            key={m.full_name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "12px 16px",
            }}
          >
            <div className={`rank${medal}`} style={{ minWidth: 28, textAlign: "center" }}>{rank}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <a className="repo-name" href={localeHref(`/repo/${m.full_name}`, locale)}>{m.full_name}</a>
              <div style={{ fontSize: 12, color: "var(--faint)", marginTop: 3 }}>
                {m.language && <>{m.language} · </>}⭐ {fmt(m.stars)} · {t.score} {m.score}
              </div>
            </div>
            <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
              <div style={{ color: "var(--green)", fontWeight: 800, fontSize: 18 }}>
                +{m.star_gain.toLocaleString()}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>{t.tw_gain} ⭐ · +{m.gain_pct}%</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
