import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { api, PER_PAGE } from "@/lib/api";
import { getDict, getLocale } from "@/lib/i18n-server";
import { localeHref } from "@/lib/locale-link";
import RankingList from "@/components/RankingList";
import JsonLd from "@/components/JsonLd";
import { itemListLd } from "@/lib/jsonld";
import Pagination from "@/components/Pagination";
import SortSelect from "@/components/SortSelect";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ topic: string }>;
}): Promise<Metadata> {
  const { topic } = await params;
  const tp = decodeURIComponent(topic);
  const { getLocale } = await import("@/lib/i18n-server");
  const en = (await getLocale()) === "en";
  return {
    title: en ? `#${tp} — top open-source projects` : `#${tp} — 优秀开源项目`,
    description: en
      ? `Top open-source projects tagged “${tp}”, ranked by composite score, updated daily.`
      : `带 “${tp}” topic 标签的优秀开源项目榜单，按综合评分排序，每日更新。`,
    alternates: { canonical: `/topic/${topic}` },
  };
}

export default async function TopicPage({
  params,
  searchParams,
}: {
  params: Promise<{ topic: string }>;
  searchParams: Promise<{ page?: string; sort?: string }>;
}) {
  const { topic } = await params;
  const tp = decodeURIComponent(topic);
  const locale = await getLocale();
  const t = await getDict();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const sort = sp.sort || "score";
  const { items, total } = await api.topicPaged(tp, {
    sort,
    limit: PER_PAGE,
    offset: (page - 1) * PER_PAGE,
  });
  if (total === 0) notFound();
  const SITE = process.env.SITE_URL || "https://radar.mxzshs.com";
  return (
    <>
      <JsonLd data={itemListLd(items, { name: `#${tp}`, baseUrl: SITE, startRank: (page - 1) * PER_PAGE })} />
      <a href={localeHref("/topics", locale)} style={{ fontSize: 13, color: "var(--muted)" }}>← {t.nav_topics}</a>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 className="page-title">{t.topic_h(tp)}</h1>
        <SortSelect current={sort} />
      </div>
      <p className="page-sub">{t.topic_sub(tp)}</p>
      <RankingList projects={items} metric="score" startRank={(page - 1) * PER_PAGE} />
      <Pagination total={total} page={page} basePath={`/topic/${topic}`} query={sort !== "score" ? { sort } : {}} />
    </>
  );
}
