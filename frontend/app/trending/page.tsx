import type { Metadata } from "next";
import { api, PER_PAGE } from "@/lib/api";
import { getDict } from "@/lib/i18n-server";
import RankingList from "@/components/RankingList";
import Pagination from "@/components/Pagination";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Trending 榜 — 正在火的开源项目",
  description: "按近期 star 增长趋势排序，发现正在快速崛起的开源项目。",
};

export default async function TrendingPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const t = await getDict();
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const { items, total } = await api.trendingPaged({
    limit: PER_PAGE,
    offset: (page - 1) * PER_PAGE,
  });
  return (
    <>
      <h1 className="page-title">{t.trending_h}</h1>
      <p className="page-sub">{t.trending_sub}</p>
      <RankingList projects={items} metric="growth_score" startRank={(page - 1) * PER_PAGE} />
      <Pagination total={total} page={page} basePath="/trending" />
    </>
  );
}
