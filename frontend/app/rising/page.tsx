import type { Metadata } from "next";
import { api, PER_PAGE } from "@/lib/api";
import { getDict } from "@/lib/i18n-server";
import RankingList from "@/components/RankingList";
import Pagination from "@/components/Pagination";

// 读 cookie（i18n）+ 动态数据，直接动态渲染
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { getLocale } = await import("@/lib/i18n-server");
  const en = (await getLocale()) === "en";
  return en
    ? {
        title: "Rising stars — hottest new projects of the last 90 days",
        description: "The fastest-growing open-source projects created in the last 90 days — spot tomorrow's stars first.",
      }
    : {
        title: "本季新星 — 近 90 天最火的新项目",
        description: "近 90 天创建、star 增长最快的开源新项目，第一时间发现明日之星。",
      };
}

export default async function RisingPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const t = await getDict();
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const { items, total } = await api.risingPaged({
    limit: PER_PAGE,
    offset: (page - 1) * PER_PAGE,
  });
  return (
    <>
      <h1 className="page-title">{t.rising_h}</h1>
      <p className="page-sub">{t.rising_sub}</p>
      <RankingList projects={items} metric="growth_score" startRank={(page - 1) * PER_PAGE} />
      <Pagination total={total} page={page} basePath="/rising" />
    </>
  );
}
