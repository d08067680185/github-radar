"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/lib/i18n-client";

export default function CommandPaletteTrigger() {
  const { t } = useLocale();
  const [mac, setMac] = useState(true);

  useEffect(() => {
    setMac(/Mac|iPhone|iPad/.test(navigator.platform));
  }, []);

  return (
    <button
      type="button"
      aria-label={t.cmdk_hint}
      title={t.cmdk_hint}
      onClick={() => window.dispatchEvent(new Event("open-command-palette"))}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 9px",
        fontSize: 12,
        color: "var(--muted)",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        cursor: "pointer",
      }}
    >
      <span style={{ fontSize: 13 }}>🔍</span>
      <kbd style={{ fontFamily: "inherit", fontSize: 11 }}>{mac ? "⌘K" : "Ctrl K"}</kbd>
    </button>
  );
}
