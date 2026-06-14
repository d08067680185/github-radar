"use client";

import { useState } from "react";
import { useLocale } from "@/lib/i18n-client";

export default function SubscribeBox() {
  const { t, locale } = useLocale();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "ok" | "err">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("busy");
    try {
      const res = await fetch("/proxy-api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale }),
      });
      setState(res.ok ? "ok" : "err");
    } catch {
      setState("err");
    }
  };

  return (
    <section
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: "20px 22px",
        margin: "40px 0 8px",
        textAlign: "center",
      }}
    >
      <h2 style={{ fontSize: 18, margin: "0 0 6px" }}>{t.sub_h}</h2>
      <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 14px" }}>{t.sub_sub}</p>
      {state === "ok" ? (
        <p style={{ color: "var(--green)", fontWeight: 600 }}>{t.sub_ok}</p>
      ) : (
        <form
          onSubmit={submit}
          style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}
        >
          <input
            className="search-input"
            style={{ margin: 0, maxWidth: 280 }}
            type="email"
            required
            placeholder={t.sub_ph}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" className="chip active" disabled={state === "busy"}>
            {t.sub_btn}
          </button>
        </form>
      )}
      {state === "err" && (
        <p style={{ color: "#f85149", fontSize: 13, marginTop: 10 }}>{t.sub_err}</p>
      )}
      <p style={{ marginTop: 12 }}>
        <a href="/proxy-api/digest/preview" target="_blank" rel="noopener"
           style={{ fontSize: 13, color: "var(--muted)" }}>
          {t.sub_preview}
        </a>
      </p>
    </section>
  );
}
