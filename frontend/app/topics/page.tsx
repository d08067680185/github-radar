import type { Metadata } from "next";
import { api } from "@/lib/api";
import { getDict } from "@/lib/i18n-server";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const { getLocale } = await import("@/lib/i18n-server");
  const en = (await getLocale()) === "en";
  return en
    ? {
        title: "Browse open-source projects by topic",
        description: "Discover great open-source projects by GitHub topic — a finer-grained entry point than domains.",
        alternates: { canonical: "/topics" },
      }
    : {
        title: "按 Topic 浏览开源项目",
        description: "按 GitHub topic 标签发现优秀开源项目 —— 比领域分类更细的兴趣入口。",
        alternates: { canonical: "/topics" },
      };
}

// 字号随项目数缩放，做成 topic 云
function sizeFor(count: number, max: number): number {
  const min = 13, top = 28;
  if (max <= 0) return min;
  return Math.round(min + (top - min) * Math.sqrt(count / max));
}

export default async function TopicsPage() {
  const t = await getDict();
  const topics = await api.topics(80).catch(() => []);
  const max = topics.reduce((m, x) => Math.max(m, x.count), 0);

  return (
    <>
      <h1 className="page-title">{t.topics_h}</h1>
      <p className="page-sub">{t.topics_sub}</p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "baseline", margin: "20px 0" }}>
        {topics.map((tp) => (
          <a
            key={tp.slug}
            href={`/topic/${encodeURIComponent(tp.slug)}`}
            style={{
              fontSize: sizeFor(tp.count, max),
              color: "var(--text)",
              textDecoration: "none",
              padding: "2px 10px",
              borderRadius: 999,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              lineHeight: 1.8,
            }}
            title={`${tp.count}`}
          >
            #{tp.name}
            <span style={{ fontSize: 11, color: "var(--faint)", marginLeft: 5 }}>{tp.count}</span>
          </a>
        ))}
      </div>
    </>
  );
}
