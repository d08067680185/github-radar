"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Suggestion {
  full_name: string;
  stars: number;
  language: string | null;
  category: string | null;
}

function fmt(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export default function SearchAutocomplete({
  name = "q",
  defaultValue = "",
  placeholder,
  className = "search-input",
  autoFocus,
  ariaLabel,
}: {
  name?: string;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  ariaLabel?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1); // 键盘高亮索引，-1=未选
  const boxRef = useRef<HTMLDivElement>(null);
  const seq = useRef(0); // 丢弃乱序响应

  // 防抖取建议
  useEffect(() => {
    const q = value.trim();
    if (q.length < 1) {
      setItems([]);
      setOpen(false);
      return;
    }
    const myseq = ++seq.current;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/proxy-api/search/suggest?q=${encodeURIComponent(q)}`);
        if (!res.ok) return;
        const data: Suggestion[] = await res.json();
        if (myseq !== seq.current) return; // 已有更新的请求
        setItems(data);
        setOpen(data.length > 0);
        setActive(-1);
      } catch {
        /* 忽略 */
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [value]);

  // 点击外部关闭
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const go = (s: Suggestion) => {
    setOpen(false);
    router.push(`/repo/${s.full_name}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
    } else if (e.key === "Enter") {
      if (active >= 0) {
        e.preventDefault(); // 选中某项 → 进详情；否则放行表单提交到 /search
        go(items[active]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={boxRef} style={{ position: "relative", flex: 1 }}>
      <input
        type="text"
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => items.length > 0 && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={className}
        autoFocus={autoFocus}
        autoComplete="off"
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={open}
        role="combobox"
        style={{ width: "100%" }}
      />
      {open && items.length > 0 && (
        <ul
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            zIndex: 50,
            margin: 0,
            padding: 6,
            listStyle: "none",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
            maxHeight: 360,
            overflowY: "auto",
          }}
        >
          {items.map((s, i) => (
            <li
              key={s.full_name}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                go(s);
              }}
              onMouseEnter={() => setActive(i)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                borderRadius: 8,
                cursor: "pointer",
                background: i === active ? "var(--surface-2)" : "transparent",
              }}
            >
              <span style={{ fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {s.full_name}
              </span>
              <span style={{ flex: 1 }} />
              {s.language && <span style={{ fontSize: 12, color: "var(--muted)" }}>{s.language}</span>}
              <span style={{ fontSize: 12, color: "var(--faint)", whiteSpace: "nowrap" }}>⭐ {fmt(s.stars)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
