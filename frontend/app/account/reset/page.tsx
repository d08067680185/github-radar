"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useLocale } from "@/lib/i18n-client";

function ResetForm() {
  const { t } = useLocale();
  const router = useRouter();
  const { applyToken } = useAuth();
  const token = useSearchParams().get("token") || "";
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const res = await fetch("/proxy-api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || "操作失败");
      // 重置成功直接登录
      applyToken(d.access_token, d.email);
      router.push("/account");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "操作失败");
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return <p className="page-sub" style={{ marginTop: 40, textAlign: "center" }}>{t.resetInvalid}</p>;
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div style={{ fontSize: 40, textAlign: "center", marginBottom: 8 }}>🔒</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, textAlign: "center", margin: "0 0 6px" }}>
          {t.resetPwd}
        </h1>
        <form onSubmit={submit} style={{ marginTop: 18 }}>
          <input className="search-input" type="password" placeholder={t.password} value={password}
                 onChange={(e) => setPassword(e.target.value)} required minLength={6}
                 autoComplete="new-password" />
          {err && <p style={{ color: "#f85149", fontSize: 13, margin: "0 0 10px" }}>{err}</p>}
          <button type="submit" className="auth-submit" disabled={busy}>
            {busy ? t.submitting : t.resetPwd}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}
