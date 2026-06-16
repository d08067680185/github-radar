"use client";

import { useState } from "react";
import { useLocale } from "@/lib/i18n-client";

export default function BadgeEmbed({
  fullName,
  siteUrl,
}: {
  fullName: string;
  siteUrl: string;
}) {
  const { t } = useLocale();
  const [copied, setCopied] = useState<"" | "md" | "html">("");

  const base = (siteUrl || "").replace(/\/$/, "");
  const badgeUrl = `${base}/proxy-api/badge/${fullName}.svg`;
  const repoUrl = `${base}/repo/${fullName}`;
  const md = `[![GitHub Radar](${badgeUrl})](${repoUrl})`;
  const html = `<a href="${repoUrl}"><img src="${badgeUrl}" alt="GitHub Radar score"></a>`;

  const copy = async (text: string, which: "md" | "html") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(""), 1800);
    } catch {
      /* ignore */
    }
  };

  return (
    <div style={{ marginTop: 28 }}>
      <h2 style={{ fontSize: 18, marginBottom: 6 }}>{t.badge_h}</h2>
      <p className="page-sub" style={{ margin: "0 0 12px" }}>{t.badge_sub}</p>

      {/* 实时预览（走同域代理，应用内可显示） */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/proxy-api/badge/${fullName}.svg`} alt="GitHub Radar score" style={{ height: 20, marginBottom: 12 }} />

      <div style={{ display: "grid", gap: 10 }}>
        {[
          { k: "md" as const, label: t.badge_copy_md, code: md },
          { k: "html" as const, label: t.badge_copy_html, code: html },
        ].map((row) => (
          <div key={row.k} style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
            <code
              style={{
                flex: 1,
                fontSize: 12,
                padding: "8px 10px",
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                overflowX: "auto",
                whiteSpace: "nowrap",
                color: "var(--muted)",
              }}
            >
              {row.code}
            </code>
            <button className="chip" onClick={() => copy(row.code, row.k)} style={{ whiteSpace: "nowrap" }}>
              {copied === row.k ? t.badge_copied : row.label}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
