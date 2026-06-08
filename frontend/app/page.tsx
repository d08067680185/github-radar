import { api, PER_PAGE } from "@/lib/api";
import { getDict } from "@/lib/i18n-server";
import RankingList from "@/components/RankingList";
import Hero from "@/components/Hero";
import Pagination from "@/components/Pagination";

export const revalidate = 3600;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const t = await getDict();
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const { items, total } = await api.topPaged({
    limit: PER_PAGE,
    offset: (page - 1) * PER_PAGE,
  });
  return (
    <>
      {page === 1 && <Hero />}
      <div className="section-head">
        <h2 className="page-title">{t.home_h}</h2>
      </div>
      <p className="page-sub">{t.home_sub}</p>
      <RankingList projects={items} metric="score" startRank={(page - 1) * PER_PAGE} />
      <Pagination total={total} page={page} basePath="/" />
    </>
  );
}
