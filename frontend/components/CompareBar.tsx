"use client";

import { useCompare } from "@/lib/compare";

export default function CompareBar() {
  const { items, remove, clear, ready } = useCompare();
  if (!ready || items.length === 0) return null;

  const href = `/compare?repos=${encodeURIComponent(items.join(","))}`;

  return (
    <div className="cmp-bar" role="region" aria-label="对比栏">
      <span className="cmp-bar-label">对比清单 ({items.length})</span>
      <div className="cmp-bar-chips">
        {items.map((f) => (
          <span className="cmp-chip" key={f}>
            {f}
            <button onClick={() => remove(f)} aria-label={`移除 ${f}`}>×</button>
          </span>
        ))}
      </div>
      <button className="cmp-clear" onClick={clear}>清空</button>
      <a
        className={`cmp-go ${items.length < 2 ? "disabled" : ""}`}
        href={items.length < 2 ? undefined : href}
        aria-disabled={items.length < 2}
      >
        开始对比 →
      </a>
    </div>
  );
}
