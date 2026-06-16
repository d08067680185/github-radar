"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/lib/i18n-client";

interface Suggestion {
  full_name: string;
  stars: number;
  language: string | null;
}

interface Row {
  kind: "project" | "page";
  label: string;
  href: string;
  meta?: string;
}

export default function CommandPalette() {
  const router = useRouter();
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [projects, setProjects] = useState<Suggestion[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const seq = useRef(0);

  const pages: Row[] = [
    { kind: "page", label: t.nav_top, href: "/" },
    { kind: "page", label: t.nav_trending, href: "/trending" },
    { kind: "page", label: t.nav_rising, href: "/rising" },
    { kind: "page", label: t.nav_categories, href: "/categories" },
    { kind: "page", label: t.nav_languages, href: "/languages" },
    { kind: "page", label: t.nav_topics, href: "/topics" },
    { kind: "page", label: t.nav_map, href: "/map" },
    { kind: "page", label: t.nav_insights, href: "/insights" },
    { kind: "page", label: t.nav_picks, href: "/picks" },
    { kind: "page", label: t.nav_digest, href: "/digest" },
    { kind: "page", label: t.nav_account, href: "/account" },
    { kind: "page", label: t.nav_about, href: "/about" },
  ];

  // 全局快捷键：⌘K / Ctrl+K 开关；自定义事件也能开
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-command-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-command-palette", onOpen);
    };
  }, []);

  // 打开时聚焦并重置
  useEffect(() => {
    if (open) {
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    } else {
      setQ("");
      setProjects([]);
    }
  }, [open]);

  // 防抖搜项目
  useEffect(() => {
    const term = q.trim();
    if (term.length < 1) {
      setProjects([]);
      return;
    }
    const myseq = ++seq.current;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/proxy-api/search/suggest?q=${encodeURIComponent(term)}&limit=7`);
        if (!res.ok) return;
        const data: Suggestion[] = await res.json();
        if (myseq !== seq.current) return;
        setProjects(data);
        setActive(0);
      } catch {
        /* ignore */
      }
    }, 160);
    return () => clearTimeout(timer);
  }, [q]);

  // 组合行：先项目，后匹配的页面
  const term = q.trim().toLowerCase();
  const pageRows = term
    ? pages.filter((p) => p.label.toLowerCase().includes(term))
    : pages;
  const projectRows: Row[] = projects.map((p) => ({
    kind: "project",
    label: p.full_name,
    href: `/repo/${p.full_name}`,
    meta: `${p.language ? p.language + " · " : ""}⭐ ${p.stars >= 1000 ? (p.stars / 1000).toFixed(1) + "k" : p.stars}`,
  }));
  const rows: Row[] = [...projectRows, ...pageRows];

  const navigate = useCallback(
    (row: Row) => {
      setOpen(false);
      router.push(row.href);
    },
    [router]
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (rows.length ? (a + 1) % rows.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (rows.length ? (a <= 0 ? rows.length - 1 : a - 1) : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (rows[active]) navigate(rows[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  if (!open) return null;

  return (
    <div
      onMouseDown={() => setOpen(false)}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "12vh",
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          width: "min(560px, 92vw)",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          overflow: "hidden",
        }}
      >
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t.cmdk_ph}
          aria-label={t.cmdk_ph}
          style={{
            width: "100%",
            padding: "16px 18px",
            fontSize: 16,
            border: "none",
            borderBottom: "1px solid var(--border)",
            background: "transparent",
            color: "var(--text)",
            outline: "none",
          }}
        />
        <ul role="listbox" style={{ listStyle: "none", margin: 0, padding: 6, maxHeight: "52vh", overflowY: "auto" }}>
          {rows.length === 0 && (
            <li style={{ padding: "14px 12px", color: "var(--muted)", fontSize: 14 }}>—</li>
          )}
          {projectRows.length > 0 && (
            <li style={{ padding: "6px 12px 2px", fontSize: 11, color: "var(--faint)", textTransform: "uppercase", letterSpacing: ".05em" }}>
              {t.cmdk_projects}
            </li>
          )}
          {rows.map((row, i) => {
            const isFirstPage = row.kind === "page" && (i === 0 || rows[i - 1].kind === "project");
            return (
              <div key={`${row.kind}:${row.href}`}>
                {isFirstPage && (
                  <li style={{ padding: "8px 12px 2px", fontSize: 11, color: "var(--faint)", textTransform: "uppercase", letterSpacing: ".05em" }}>
                    {t.cmdk_pages}
                  </li>
                )}
                <li
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    navigate(row);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 12px",
                    borderRadius: 8,
                    cursor: "pointer",
                    background: i === active ? "var(--surface-2)" : "transparent",
                  }}
                >
                  <span style={{ fontSize: 13 }}>{row.kind === "project" ? "📦" : "➜"}</span>
                  <span style={{ flex: 1, color: "var(--text)", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {row.label}
                  </span>
                  {row.meta && <span style={{ fontSize: 12, color: "var(--faint)", whiteSpace: "nowrap" }}>{row.meta}</span>}
                </li>
              </div>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
