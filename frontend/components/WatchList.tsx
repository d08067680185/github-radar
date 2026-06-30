"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth";
import { useLocale } from "@/lib/i18n-client";
import { localeHref } from "@/lib/locale-link";
import type { Project } from "@/lib/types";

export default function WatchList({ token }: { token: string }) {
  const { t, locale } = useLocale();
  const [items, setItems] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch(token, "/me/watches")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Project[]) => { setItems(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  const unwatch = async (fullName: string) => {
    const [owner, name] = fullName.split("/");
    await authFetch(token, `/me/watches/${owner}/${name}`, { method: "DELETE" });
    setItems((prev) => prev.filter((p) => p.full_name !== fullName));
  };

  if (loading) return <p className="page-sub">{t.loading}</p>;
  if (items.length === 0) return <p className="page-sub">{t.watch_empty}</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
      {items.map((p) => (
        <div key={p.full_name} style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 12, padding: "10px 14px",
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
        }}>
          <div style={{ minWidth: 0 }}>
            <a href={localeHref(`/repo/${p.full_name}`, locale)} className="repo-name"
               style={{ fontSize: 14, display: "block" }}>
              {p.full_name}
            </a>
            {p.description && (
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {p.description}
              </p>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>⭐ {p.stars?.toLocaleString()}</span>
            <button className="chip" style={{ fontSize: 12 }} onClick={() => unwatch(p.full_name)}>
              {t.watching} ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
