"use client";

import { useCompare, MAX_COMPARE } from "@/lib/compare";
import { useLocale } from "@/lib/i18n-client";

export default function CompareButton({ fullName }: { fullName: string }) {
  const { has, toggle, full, ready } = useCompare();
  const { t } = useLocale();
  // 始终渲染（SSR 与首屏一致），就绪前按未选中处理，避免水合不匹配
  const selected = ready && has(fullName);
  const disabled = ready && full && !selected;

  return (
    <button
      className={`cmp-btn ${selected ? "active" : ""}`}
      onClick={(e) => { e.preventDefault(); if (!disabled) toggle(fullName); }}
      disabled={disabled}
      aria-pressed={selected}
      title={disabled ? `max ${MAX_COMPARE}` : t.cmp}
    >
      {selected ? t.cmped : t.cmp}
    </button>
  );
}
