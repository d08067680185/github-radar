import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { api, PER_PAGE } from "@/lib/api";
import { getDict } from "@/lib/i18n-server";
import RankingList from "@/components/RankingList";
import Pagination from "@/components/Pagination";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ topic: string }>;
}): Promise<Metadata> {
  const { topic } = await params;
  const tp = decodeURIComponent(topic);
  return {
    title: `#${tp} — 优秀开源项目`,
    description: `带 “${tp}” topic 标签的优秀开源项目榜单，按综合评分排序，每日更新。`,
    alternates: { canonical: `/topic/${topic}` },
  };
}

export default async function TopicPage({
  params,
  searchParams,
}: {
  params: Promise<{ topic: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { topic } = await params;
  const tp = decodeURIComponent(topic);
  const t = await getDict();
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const { items, total } = await api.topicPaged(tp, {
    limit: PER_PAGE,
    offset: (page - 1) * PER_PAGE,
  });
  if (total === 0) notFound();
  return (
    <>
      <a href="/topics" style={{ fontSize: 13, color: "var(--muted)" }}>← {t.nav_topics}</a>
      <h1 className="page-title">{t.topic_h(tp)}</h1>
      <p className="page-sub">{t.topic_sub(tp)}</p>
      <RankingList projects={items} metric="score" startRank={(page - 1) * PER_PAGE} />
      <Pagination total={total} page={page} basePath={`/topic/${topic}`} />
    </>
  );
}
