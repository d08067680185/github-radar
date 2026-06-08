"use client";

import { useEffect, useState } from "react";
import { useAuth, authFetch } from "@/lib/auth";
import { useLocale } from "@/lib/i18n-client";

export default function FavoriteButton({ fullName }: { fullName: string }) {
  const { token } = useAuth();
  const { t } = useLocale();
  const [fav, setFav] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    authFetch(token, "/favorites/ids")
      .then((r) => (r.ok ? r.json() : []))
      .then((ids: string[]) => setFav(ids.includes(fullName)))
      .catch(() => {});
  }, [token, fullName]);

  if (!token) {
    return (
      <a className="chip" href="/account">{t.loginToFav}</a>
    );
  }

  const toggle = async () => {
    setBusy(true);
    try {
      if (fav) {
        await authFetch(token, `/favorites/${fullName}`, { method: "DELETE" });
        setFav(false);
      } else {
        await authFetch(token, "/favorites", {
          method: "POST",
          body: JSON.stringify({ full_name: fullName }),
        });
        setFav(true);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button className={`chip ${fav ? "active" : ""}`} onClick={toggle} disabled={busy}>
      {fav ? t.faved : t.fav}
    </button>
  );
}
