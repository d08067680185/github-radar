"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth";
import { useLocale } from "@/lib/i18n-client";

interface KeyRow {
  id: number;
  key_prefix: string;
  name: string;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
}

export default function APIKeysPanel({ token }: { token: string }) {
  const { locale } = useLocale();
  const en = locale === "en";
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = () =>
    authFetch(token, "/me/api-keys")
      .then((r) => (r.ok ? r.json() : []))
      .then(setKeys)
      .catch(() => {});

  useEffect(() => { load(); }, [token]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true); setErr("");
    try {
      const r = await authFetch(token, "/me/api-keys", {
        method: "POST",
        body: JSON.stringify({ name: name.trim() }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.detail || "创建失败"); return; }
      setNewKey(d.key);
      setName("");
      load();
    } catch { setErr("创建失败"); }
    finally { setBusy(false); }
  };

  const revoke = async (id: number) => {
    await authFetch(token, `/me/api-keys/${id}`, { method: "DELETE" });
    setKeys((prev) => prev.filter((k) => k.id !== id));
  };

  return (
    <div>
      {newKey && (
        <div style={{
          background: "rgba(35,134,54,.15)", border: "1px solid var(--green)",
          borderRadius: "var(--radius)", padding: "12px 16px", marginBottom: 14,
        }}>
          <p style={{ fontSize: 13, margin: "0 0 6px", color: "var(--green)", fontWeight: 600 }}>
            {en ? "Copy your key now — it won't be shown again." : "请立即复制 Key，之后不再显示。"}
          </p>
          <code style={{ fontSize: 12, wordBreak: "break-all" }}>{newKey}</code>
          <button className="chip" style={{ marginLeft: 10, fontSize: 12 }}
            onClick={() => { navigator.clipboard.writeText(newKey); }}>
            {en ? "Copy" : "复制"}
          </button>
          <button className="chip" style={{ marginLeft: 6, fontSize: 12 }}
            onClick={() => setNewKey("")}>✕</button>
        </div>
      )}

      <form onSubmit={create} style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={en ? "Key name (e.g. my-script)" : "Key 名称（如 my-script）"}
          style={{ flex: 1, padding: "8px 12px", fontSize: 13 }}
          maxLength={80}
        />
        <button type="submit" className="chip active" disabled={busy}>
          {busy ? "…" : en ? "Generate" : "生成"}
        </button>
      </form>
      {err && <p style={{ color: "#f85149", fontSize: 13, marginBottom: 8 }}>{err}</p>}

      {keys.length === 0
        ? <p style={{ fontSize: 13, color: "var(--muted)" }}>{en ? "No API keys yet." : "暂无 API Key。"}</p>
        : (
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ color: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
                <th style={{ textAlign: "left", padding: "4px 8px" }}>{en ? "Name" : "名称"}</th>
                <th style={{ textAlign: "left", padding: "4px 8px" }}>{en ? "Prefix" : "前缀"}</th>
                <th style={{ textAlign: "left", padding: "4px 8px" }}>{en ? "Last used" : "最近使用"}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} style={{ borderBottom: "1px solid var(--border-soft)" }}>
                  <td style={{ padding: "8px 8px" }}>{k.name}</td>
                  <td style={{ padding: "8px 8px" }}><code style={{ fontSize: 12 }}>{k.key_prefix}…</code></td>
                  <td style={{ padding: "8px 8px", color: "var(--muted)" }}>
                    {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : "—"}
                  </td>
                  <td style={{ padding: "8px 8px" }}>
                    <button className="chip" style={{ fontSize: 12 }} onClick={() => revoke(k.id)}>
                      {en ? "Revoke" : "吊销"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      }
      <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 10 }}>
        {en
          ? <>API documentation: <a href="/en/developers" className="link">/developers</a></>
          : <>API 文档：<a href="/developers" className="link">/developers</a></>
        }
      </p>
    </div>
  );
}
