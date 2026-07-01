import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import { getDict, getLocale } from "@/lib/i18n-server";
import { projectSummary } from "@/lib/format";
import { localeHref } from "@/lib/locale-link";
import JsonLd from "@/components/JsonLd";
import { collectionLd } from "@/lib/jsonld";
import ShareButton from "@/components/ShareButton";
import type { PublicList, PublicListItem } from "@/lib/types";

export const dynamic = "force-dynamic";

async function load(slug: string): Promise<PublicList | null> {
  return api.publicList(slug).catch(() => null);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const list = await load(slug);
  // 列表不存在/未公开：渲染 not-found UI（状态码在 force-dynamic 流式下为 200），
  // 用 noindex 确保这类 soft-404 不被搜索引擎索引。
  if (!list) return { title: "List not found", robots: { index: false } };
  const en = (await getLocale()) === "en";
  const desc = en
    ? `A curated collection of ${list.count} open-source projects on GitHub Radar.`
    : `GitHub Radar 上一份精选的开源项目收藏集，共 ${list.count} 个项目。`;
  return {
    title: list.title,
    description: desc,
    alternates: { canonical: `/list/${slug}` },
    openGraph: { title: list.title, description: desc, type: "website" },
    twitter: { card: "summary_large_image", title: list.title, description: desc },
  };
}

// 按 tags 分组：一个项目有多个标签则出现在每个分区；无标签归「未分组」。
function groupByTag(items: PublicListItem[], ungrouped: string): [string, PublicListItem[]][] {
  const map = new Map<string, PublicListItem[]>();
  for (const it of items) {
    const keys = it.tags.length ? it.tags : [ungrouped];
    for (const k of keys) {
      const arr = map.get(k) || [];
      arr.push(it);
      map.set(k, arr);
    }
  }
  // 分区名排序，「未分组」永远放最后
  return [...map.entries()].sort((a, b) => {
    if (a[0] === ungrouped) return 1;
    if (b[0] === ungrouped) return -1;
    return a[0].localeCompare(b[0]);
  });
}

export default async function PublicListPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const list = await load(slug);
  if (!list) notFound();
  const t = await getDict();
  const locale = await getLocale();
  const groups = groupByTag(list.items, t.list_ungrouped);
  const SITE = process.env.SITE_URL || "https://radar.mxzshs.com";
  const ld = collectionLd(list.title, list.items.map((it) => it.project), {
    name: list.title,
    baseUrl: SITE,
    url: `${SITE}/list/${slug}`,
  });

  return (
    <>
      <JsonLd data={ld} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <h1 className="page-title">📚 {list.title}</h1>
        <div style={{ marginTop: 6 }}>
          <ShareButton
            title={list.title}
            text={
              locale === "en"
                ? `${list.title} — a curated collection of ${list.count} open-source projects on GitHub Radar`
                : `${list.title} — GitHub Radar 上的精选开源项目收藏集，共 ${list.count} 个项目`
            }
          />
        </div>
      </div>
      <p className="page-sub">{t.list_count(list.count)}</p>

      {list.count === 0 ? (
        <p className="page-sub" style={{ marginTop: 24 }}>{t.list_empty}</p>
      ) : (
        groups.map(([tag, items]) => (
          <section key={tag} style={{ marginTop: 24 }}>
            <h2 style={{ fontSize: 18, borderBottom: "1px solid var(--border)", paddingBottom: 6 }}>
              {tag} <span style={{ color: "var(--muted)", fontSize: 13, fontWeight: 400 }}>· {items.length}</span>
            </h2>
            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              {items.map((it) => (
                <div key={`${tag}-${it.project.full_name}`} style={{
                  padding: "10px 14px", borderRadius: 8,
                  border: "1px solid var(--border)", background: "var(--surface)",
                }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                    <a href={`/repo/${it.project.full_name}`} style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>
                      {it.project.full_name}
                    </a>
                    <span style={{ color: "var(--muted)", fontSize: 13 }}>⭐ {it.project.stars.toLocaleString()}</span>
                    {it.project.language && <span style={{ color: "var(--muted)", fontSize: 13 }}>{it.project.language}</span>}
                    <span style={{ color: "var(--green)", fontSize: 13 }}>{it.project.score}</span>
                  </div>
                  {it.note ? (
                    <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--text)" }}>💬 {it.note}</p>
                  ) : (
                    <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--muted)" }}>{projectSummary(it.project, locale)}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))
      )}

      <p className="page-sub" style={{ marginTop: 32, fontSize: 13 }}>
        <a href={localeHref("/", locale)}>{t.list_footer}</a>
      </p>
    </>
  );
}
