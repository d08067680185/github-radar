import type { Metadata } from "next";
import { api } from "@/lib/api";
import { getDict } from "@/lib/i18n-server";
import SubscribeBox from "@/components/SubscribeBox";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const { getLocale } = await import("@/lib/i18n-server");
  const en = (await getLocale()) === "en";
  const alternates = {
    canonical: "/digest",
    types: { "application/rss+xml": en ? "/feed/digest.xml?lang=en" : "/feed/digest.xml" },
  };
  return en
    ? {
        title: "Weekly picks — archive",
        description: "GitHub Radar's weekly pick of the fastest-rising open-source projects of the past 7 days, archived for browsing anytime.",
        alternates,
      }
    : {
        title: "每周精选周报 — 历史存档",
        description: "GitHub Radar 每周精选过去 7 天上升最快的开源项目，历史存档随时回看。",
        alternates,
      };
}

export default async function DigestListPage() {
  const { getLocale } = await import("@/lib/i18n-server");
  const en = (await getLocale()) === "en";
  const t = await getDict();
  const issues = await api.digestArchive().catch(() => []);
  const rssHref = en ? "/feed/digest.xml?lang=en" : "/feed/digest.xml";

  return (
    <>
      <h1 className="page-title">{t.digest_h}</h1>
      <p className="page-sub">
        {t.digest_sub}{" "}
        <a href={rssHref} style={{ fontSize: 13, whiteSpace: "nowrap" }}>{t.rss}</a>
      </p>

      {issues.length === 0 ? (
        <p className="page-sub" style={{ marginTop: 24 }}>{t.digest_empty}</p>
      ) : (
        <div style={{ display: "grid", gap: 12, margin: "20px 0" }}>
          {issues.map((it) => (
            <a
              key={it.week_date}
              href={`/digest/${it.week_date}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "16px 18px",
                textDecoration: "none",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, color: "var(--text)", fontSize: 16 }}>
                  📰 {it.week_date}
                </div>
                <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
                  {t.digest_items(it.item_count)}
                </div>
              </div>
              <span style={{ color: "var(--accent)", fontSize: 14, whiteSpace: "nowrap" }}>
                {t.digest_view}
              </span>
            </a>
          ))}
        </div>
      )}

      <SubscribeBox />
    </>
  );
}
