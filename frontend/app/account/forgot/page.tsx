"use client";

import { useState } from "react";
import { useLocale } from "@/lib/i18n-client";
import { localeHref } from "@/lib/locale-link";

export default function ForgotPage() {
  const { t, locale } = useLocale();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setMsg(""); setBusy(true);
    try {
      const res = await fetch("/proxy-api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || "操作失败");
      setMsg(d.message || t.resetSent);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "操作失败");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div style={{ fontSize: 40, textAlign: "center", marginBottom: 8 }}>🔑</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, textAlign: "center", margin: "0 0 6px" }}>
          {t.forgotPwd}
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 14, textAlign: "center", margin: "0 0 22px" }}>
          {t.forgotSub}
        </p>
        <form onSubmit={submit}>
          <input className="search-input" type="email" placeholder={t.email} value={email}
                 onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          {err && <p style={{ color: "#f85149", fontSize: 13, margin: "0 0 10px" }}>{err}</p>}
          {msg && <p style={{ color: "var(--green, #3fb950)", fontSize: 13, margin: "0 0 10px" }}>{msg}</p>}
          <button type="submit" className="auth-submit" disabled={busy}>
            {busy ? t.submitting : t.sendResetLink}
          </button>
        </form>
        <p style={{ textAlign: "center", margin: "12px 0 0" }}>
          <a href={localeHref("/account", locale)} style={{ fontSize: 13, color: "var(--muted)" }}>{t.toLogin}</a>
        </p>
      </div>
    </div>
  );
}
