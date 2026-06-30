"use client";

import { useEffect, useState } from "react";
import { useAuth, authFetch } from "@/lib/auth";
import { useLocale } from "@/lib/i18n-client";
import { localeHref } from "@/lib/locale-link";
import type { Project, Favorite } from "@/lib/types";
import RankingList from "@/components/RankingList";
import FavoritesManager from "@/components/FavoritesManager";
import ShareSettingsPanel from "@/components/ShareSettings";

function AuthForm() {
  const { login, register } = useAuth();
  const { t, locale } = useLocale();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await (mode === "login" ? login(email, password) : register(email, password));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "操作失败");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div style={{ fontSize: 40, textAlign: "center", marginBottom: 8 }}>🛰️</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, textAlign: "center", margin: "0 0 6px" }}>
          {mode === "login" ? t.welcome : t.createAccount}
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 14, textAlign: "center", margin: "0 0 22px" }}>
          {t.auth_sub}
        </p>
        <form onSubmit={submit}>
          <input className="search-input" type="email" placeholder={t.email} value={email}
                 onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          <input className="search-input" type="password" placeholder={t.password} value={password}
                 onChange={(e) => setPassword(e.target.value)} required minLength={6}
                 autoComplete={mode === "login" ? "current-password" : "new-password"} />
          {err && <p style={{ color: "#f85149", fontSize: 13, margin: "0 0 10px" }}>{err}</p>}
          <button type="submit" className="auth-submit" disabled={busy}>
            {busy ? t.submitting : mode === "login" ? t.login : t.register}
          </button>
        </form>
        <button type="button" className="auth-switch"
                onClick={() => { setErr(""); setMode(mode === "login" ? "register" : "login"); }}>
          {mode === "login" ? t.toRegister : t.toLogin}
        </button>
        {mode === "login" && (
          <p style={{ textAlign: "center", margin: "8px 0 0" }}>
            <a href={localeHref("/account/forgot", locale)} style={{ fontSize: 13, color: "var(--muted)" }}>{t.forgotPwd}</a>
          </p>
        )}
      </div>
    </div>
  );
}

function Dashboard() {
  const { email, token, logout } = useAuth();
  const { t } = useLocale();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [recommend, setRecommend] = useState<Project[]>([]);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      authFetch(token, "/favorites").then((r) => r.json()),
      authFetch(token, "/recommend?limit=20").then((r) => r.json()),
    ]).then(([f, r]) => {
      setFavorites(f);
      setRecommend(r);
    });
  }, [token]);

  // 从收藏推断兴趣（语言 / 领域）
  const topLang = mode(favorites.map((f) => f.project.language).filter(Boolean) as string[]);

  return (
    <>
      <div className="acct-head">
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>{t.myRadar}</h1>
          <p className="page-sub" style={{ margin: "4px 0 0" }}>{email}</p>
        </div>
        <button className="chip" onClick={logout}>{t.logout}</button>
      </div>

      <div className="acct-stats">
        <div className="stat"><div className="n">{favorites.length}</div><div className="l">{t.favStat}</div></div>
        <div className="stat"><div className="n">{topLang || "—"}</div><div className="l">{t.prefLang}</div></div>
        <div className="stat"><div className="n">{recommend.length}</div><div className="l">{t.recStat}</div></div>
      </div>

      <h2 style={{ fontSize: 18, marginTop: 30 }}>{t.myFavs}</h2>
      {token && <FavoritesManager token={token} />}

      <h2 style={{ fontSize: 18, marginTop: 32 }}>{t.share_h}</h2>
      {token && <ShareSettingsPanel token={token} />}

      <h2 style={{ fontSize: 18, marginTop: 32 }}>{t.recForYou}</h2>
      <RankingList projects={recommend} metric="score" />
    </>
  );
}

function mode(arr: string[]): string | null {
  if (arr.length === 0) return null;
  const c: Record<string, number> = {};
  let best = arr[0], n = 0;
  for (const x of arr) { c[x] = (c[x] || 0) + 1; if (c[x] > n) { n = c[x]; best = x; } }
  return best;
}

export default function AccountPage() {
  const { token, loading } = useAuth();
  const { t } = useLocale();
  if (loading) return <p className="page-sub" style={{ marginTop: 40 }}>{t.loading}</p>;
  return token ? <Dashboard /> : <AuthForm />;
}
