"use client";

import { useState } from "react";
import { useLocale } from "@/lib/i18n-client";

export default function ShareButton({
  fullName,
  score,
}: {
  fullName: string;
  score: number;
}) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const title = `${fullName} — GitHub Radar 综合评分 ${score}`;
    const text = `${fullName} 在 GitHub Radar 的综合评分是 ${score}/100`;

    // 优先用系统原生分享（移动端 / 支持的浏览器）
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        /* 用户取消或失败，回退到复制 */
      }
    }
    // 回退：复制链接到剪贴板
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* 剪贴板不可用则静默 */
    }
  };

  return (
    <button className={`cmp-btn ${copied ? "active" : ""}`} onClick={share}
            aria-label="share">
      {copied ? t.shared : t.share}
    </button>
  );
}
