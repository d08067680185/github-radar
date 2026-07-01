"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/lib/i18n-client";

function buildLinks(url: string, title: string, text: string) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const tx = encodeURIComponent(text);
  return [
    { key: "x", label: "𝕏  X", href: `https://twitter.com/intent/tweet?url=${u}&text=${tx}` },
    { key: "weibo", label: "🔴  微博", href: `http://service.weibo.com/share/share.php?url=${u}&title=${tx}` },
    { key: "hn", label: "🟠  Hacker News", href: `https://news.ycombinator.com/submitlink?u=${u}&t=${t}` },
    { key: "reddit", label: "👽  Reddit", href: `https://www.reddit.com/submit?url=${u}&title=${t}` },
    { key: "telegram", label: "✈️  Telegram", href: `https://t.me/share/url?url=${u}&text=${tx}` },
  ];
}

/** 一键分享：桌面端弹出社交平台链接菜单，移动端/支持的浏览器优先走系统原生分享面板。 */
export default function ShareButton({ title, text }: { title: string; text?: string }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const url = typeof window !== "undefined" ? window.location.href : "";
  const shareText = text || title;
  const hasNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  const nativeShare = async () => {
    if (!hasNativeShare) return;
    try {
      await navigator.share({ title, text: shareText, url });
    } catch {
      /* 用户取消或失败，静默忽略 */
    } finally {
      setOpen(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* 剪贴板不可用则静默 */
    }
    setOpen(false);
  };

  const links = buildLinks(url, title, shareText);

  return (
    <div className="share-wrap" ref={wrapRef}>
      <button
        className={`cmp-btn ${copied ? "active" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="share"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {copied ? t.shared : t.share}
      </button>
      {open && (
        <div className="share-popover" role="menu">
          {hasNativeShare && (
            <button className="share-item" role="menuitem" onClick={nativeShare}>
              {t.share_more}
            </button>
          )}
          {links.map((l) => (
            <a
              key={l.key}
              className="share-item"
              role="menuitem"
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <button className="share-item" role="menuitem" onClick={copyLink}>
            🔗 {t.share_copy}
          </button>
        </div>
      )}
    </div>
  );
}
