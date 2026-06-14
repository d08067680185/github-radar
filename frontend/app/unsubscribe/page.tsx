"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/lib/i18n-client";

export default function UnsubscribePage() {
  const { t } = useLocale();
  const [state, setState] = useState<"busy" | "ok" | "err" | "invalid">("busy");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setState("invalid");
      return;
    }
    fetch("/proxy-api/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => setState(r.ok ? "ok" : "err"))
      .catch(() => setState("err"));
  }, []);

  const msg = {
    busy: t.unsub_doing,
    ok: t.unsub_ok,
    err: t.unsub_err,
    invalid: t.unsub_invalid,
  }[state];

  return (
    <div style={{ maxWidth: 480, margin: "60px auto", textAlign: "center" }}>
      <h1 className="page-title">{t.unsub_h}</h1>
      <p className="page-sub" style={{ fontSize: 16 }}>{msg}</p>
      <a href="/" className="chip" style={{ marginTop: 16, display: "inline-block" }}>
        {t.backToList}
      </a>
    </div>
  );
}
