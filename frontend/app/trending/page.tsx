import type { Metadata } from "next";
import { api, PER_PAGE } from "@/lib/api";
import { getDict } from "@/lib/i18n-server";
import RankingList from "@/components/RankingList";
import MoversList from "@/components/MoversList";
import Pagination from "@/components/Pagination";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const { getLocale } = await import("@/lib/i18n-server");
  const en = (await getLocale()) === "en";
  return en
    ? {
        title: "Trending — open-source projects on the rise",
        description: "Ranked by recent star-growth trend with today/week/month windows — discover rapidly rising open-source projects.",
      }
    : {
        title: "Trending 榜 — 正在火的开源项目",
        description: "按近期 star 增长趋势排序，支持今日/本周/本月时间窗，发现正在快速崛起的开源项目。",
      };
}

const WINDOWS = [
  { key: "all", days: 0 },
  { key: "1", days: 1 },
  { key: "7", days: 7 },
  { key: "30", days: 30 },
] as const;

export default async function TrendingPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; w?: string }>;
}) {
  const t = await getDict();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const w = WINDOWS.find((x) => x.key === sp.w)?.key ?? "all";
  const offset = (page - 1) * PER_PAGE;

  const tabs: { key: string; label: string }[] = [
    { key: "all", label: t.tw_all },
    { key: "1", label: t.tw_day },
    { key: "7", label: t.tw_week },
    { key: "30", label: t.tw_month },
  ];

  const TabBar = (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "4px 0 18px" }}>
      {tabs.map((tab) => (
        <a
          key={tab.key}
          href={tab.key === "all" ? "/trending" : `/trending?w=${tab.key}`}
          className={`chip${w === tab.key ? " active" : ""}`}
        >
          {tab.label}
        </a>
      ))}
    </div>
  );

  if (w === "all") {
    const { items, total } = await api.trendingPaged({ limit: PER_PAGE, offset });
    return (
      <>
        <h1 className="page-title">{t.trending_h}</h1>
        <p className="page-sub">{t.trending_sub}</p>
        {TabBar}
        <RankingList projects={items} metric="growth_score" startRank={offset} />
        <Pagination total={total} page={page} basePath="/trending" />
      </>
    );
  }

  const days = Number(w);
  const { items, total } = await api.moversPaged({ days, limit: PER_PAGE, offset });
  return (
    <>
      <h1 className="page-title">{t.trending_h}</h1>
      <p className="page-sub">{t.tw_sub(days)}</p>
      {TabBar}
      {/* moversPaged 返回 Project[]，但实际含 star_gain 等字段；转成 Mover[] 给 MoversList */}
      <MoversList movers={items as unknown as import("@/lib/types").Mover[]} startRank={offset} />
      <Pagination total={total} page={page} basePath="/trending" query={{ w }} />
    </>
  );
}
