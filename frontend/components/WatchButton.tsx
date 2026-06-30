"use client";

import { useEffect, useState } from "react";
import { useAuth, authFetch } from "@/lib/auth";
import { useLocale } from "@/lib/i18n-client";
import { localeHref } from "@/lib/locale-link";

export default function WatchButton({ fullName }: { fullName: string }) {
  const { token } = useAuth();
  const { t, locale } = useLocale();
  const [watching, setWatching] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    authFetch(token, "/me/watches/ids")
      .then((r) => (r.ok ? r.json() : []))
      .then((ids: string[]) => setWatching(ids.includes(fullName)))
      .catch(() => {});
  }, [token, fullName]);

  if (!token) {
    return (
      <a className="chip" href={localeHref("/account", locale)}>{t.loginToWatch}</a>
    );
  }

  const toggle = async () => {
    setBusy(true);
    try {
      if (watching) {
        await authFetch(token, `/me/watches/${fullName}`, { method: "DELETE" });
        setWatching(false);
      } else {
        const [owner, name] = fullName.split("/");
        await authFetch(token, `/me/watches/${owner}/${name}`, { method: "POST" });
        setWatching(true);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button className={`chip ${watching ? "active" : ""}`} onClick={toggle} disabled={busy}>
      {watching ? t.watching : t.watch}
    </button>
  );
}
