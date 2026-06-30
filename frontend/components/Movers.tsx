"use client";

import type { Mover } from "@/lib/types";
import { useLocale } from "@/lib/i18n-client";
import { localeHref } from "@/lib/locale-link";

function fmt(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export default function Movers({ movers }: { movers: Mover[] }) {
  const { t, locale } = useLocale();
  if (!movers.length) return null;
  const days = movers[0].window_days;

  return (
    <section style={{ marginBottom: 32 }}>
      <div className="section-head">
        <h2 className="page-title">{t.movers_h}</h2>
      </div>
      <p className="page-sub">{t.movers_sub(days)}</p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 12,
          marginTop: 12,
        }}
      >
        {movers.map((m) => (
          <a
            key={m.full_name}
            href={localeHref(`/repo/${m.full_name}`, locale)}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "12px 14px",
              textDecoration: "none",
              display: "block",
            }}
          >
            <div style={{ fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {m.full_name}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 8 }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: "var(--green)" }}>
                +{m.star_gain.toLocaleString()}
              </span>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>
                {t.movers_gain} ⭐ · +{m.gain_pct}%
              </span>
            </div>
            <div style={{ fontSize: 12, color: "var(--faint)", marginTop: 6 }}>
              {m.language && <>{m.language} · </>}⭐ {fmt(m.stars)}
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
