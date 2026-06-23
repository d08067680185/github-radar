import { api, PER_PAGE } from "@/lib/api";
import { getDict } from "@/lib/i18n-server";
import RankingList from "@/components/RankingList";
import JsonLd from "@/components/JsonLd";
import { itemListLd } from "@/lib/jsonld";
import Hero from "@/components/Hero";
import Movers from "@/components/Movers";
import SubscribeBox from "@/components/SubscribeBox";
import Pagination from "@/components/Pagination";
import SortSelect from "@/components/SortSelect";

export const revalidate = 3600;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; sort?: string }>;
}) {
  const t = await getDict();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const sort = sp.sort || "score";
  // 榜单 + 「上升最快」并行取，减少串行延迟。movers best-effort（无多日快照时为空，组件自隐藏）
  const [{ items, total }, movers] = await Promise.all([
    api.topPaged({ sort, limit: PER_PAGE, offset: (page - 1) * PER_PAGE }),
    page === 1 ? api.movers(7, 6).catch(() => []) : Promise.resolve([]),
  ]);
  const SITE = process.env.SITE_URL || "https://radar.mxzshs.com";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "GitHub Radar",
    url: SITE,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE}/search?q={query}` },
      "query-input": "required name=query",
    },
  };
  return (
    <>
      {page === 1 && <JsonLd data={jsonLd} />}
      {page === 1 && (
        <JsonLd data={itemListLd(items, { name: t.home_h, baseUrl: SITE })} />
      )}
      {page === 1 && <Hero />}
      {page === 1 && <Movers movers={movers} />}
      <div className="section-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h2 className="page-title">{t.home_h}</h2>
        <SortSelect current={sort} />
      </div>
      <p className="page-sub">{t.home_sub}</p>
      <RankingList projects={items} metric="score" startRank={(page - 1) * PER_PAGE} />
      <Pagination total={total} page={page} basePath="/" query={sort !== "score" ? { sort } : {}} />
      {page === 1 && <SubscribeBox />}
    </>
  );
}
