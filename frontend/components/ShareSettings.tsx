"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth";
import { useLocale } from "@/lib/i18n-client";
import type { ShareSettings } from "@/lib/types";

// 账户页「公开分享收藏集」：开关 + 标题 + 复制链接。
export default function ShareSettingsPanel({ token }: { token: string }) {
  const { t } = useLocale();
  const [s, setS] = useState<ShareSettings | null>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    authFetch(token, "/me/share")
      .then((r) => r.json())
      .then((d: ShareSettings) => { setS(d); setTitle(d.title || ""); })
      .catch(() => {});
  }, [token]);

  const save = async (listed: boolean) => {
    setBusy(true);
    try {
      const r = await authFetch(token, "/me/share", {
        method: "PUT",
        body: JSON.stringify({ listed, title: title.trim() || null }),
      });
      const d: ShareSettings = await r.json();
      setS(d);
    } finally {
      setBusy(false);
    }
  };

  if (!s) return null;

  const publicUrl = s.slug ? `${typeof window !== "undefined" ? window.location.origin : ""}/list/${s.slug}` : "";
  const copy = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* 忽略剪贴板失败 */ }
  };

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 16, background: "var(--surface)" }}>
      <p style={{ margin: "0 0 10px", fontSize: 14, color: "var(--muted)" }}>{t.share_desc}</p>

      {s.count === 0 ? (
        <p style={{ fontSize: 14, color: "var(--muted)" }}>{t.share_need_fav}</p>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            <span style={{
              fontSize: 13, padding: "3px 10px", borderRadius: 999,
              background: s.listed ? "var(--green)" : "var(--border)",
              color: s.listed ? "#03130a" : "var(--muted)", fontWeight: 600,
            }}>
              {s.listed ? t.share_on : t.share_off}
            </span>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>{t.share_count(s.count)}</span>
          </div>

          <input
            className="search-input"
            style={{ marginBottom: 10 }}
            value={title}
            maxLength={120}
            placeholder={t.share_title_ph}
            onChange={(e) => setTitle(e.target.value)}
          />

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="chip" disabled={busy} onClick={() => save(!s.listed)}>
              {s.listed ? t.share_toggle_off : t.share_toggle_on}
            </button>
            {s.listed && (
              <button className="chip" disabled={busy} onClick={() => save(true)}>
                {busy ? t.submitting : t.share_save}
              </button>
            )}
            {s.listed && s.slug && (
              <>
                <button className="chip" onClick={copy}>{copied ? t.share_copied : t.share_copy}</button>
                <a className="chip" href={`/list/${s.slug}`} target="_blank" rel="noopener">{t.share_view}</a>
              </>
            )}
          </div>

          {s.listed && publicUrl && (
            <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--muted)", wordBreak: "break-all" }}>{publicUrl}</p>
          )}
        </>
      )}
    </div>
  );
}
