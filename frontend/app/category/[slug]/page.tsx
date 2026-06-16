import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { api, PER_PAGE } from "@/lib/api";
import RankingList from "@/components/RankingList";
import Pagination from "@/components/Pagination";
import SortSelect from "@/components/SortSelect";

// 动态渲染（仍为 SSR，SEO 不受影响）：避免构建期依赖 backend 在线做 SSG，
// 且页面读 cookie（i18n）与 ISR 静态化冲突会 500；后端榜单有 Redis 缓存撑性能
export const dynamic = "force-dynamic";

async function findCategory(slug: string) {
  const cats = await api.categories();
  return cats.find((c) => c.slug === slug) || null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cat = await findCategory(slug);
  if (!cat) return {};
  return {
    title: `${cat.name} 领域优秀开源项目`,
    description: `${cat.name} 领域综合评分排序的优秀开源项目榜单，每日更新。`,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; sort?: string }>;
}) {
  const { slug } = await params;
  const cat = await findCategory(slug);
  if (!cat) notFound();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const sort = sp.sort || "score";
  const { items, total } = await api.topPaged({
    category: slug,
    sort,
    limit: PER_PAGE,
    offset: (page - 1) * PER_PAGE,
  });
  const { getLocale } = await import("@/lib/i18n-server");
  const { catName } = await import("@/lib/i18n");
  const locale = await getLocale();
  const en = locale === "en";
  const name = catName(slug, locale, cat.name);
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 className="page-title">{name}</h1>
        <SortSelect current={sort} />
      </div>
      <p className="page-sub">{en ? `Top open-source projects in ${name} (${cat.count} indexed).` : `${name} 领域的优秀开源项目（共 ${cat.count} 个收录）。`}</p>
      <RankingList projects={items} metric="score" startRank={(page - 1) * PER_PAGE} />
      <Pagination total={total} page={page} basePath={`/category/${slug}`} query={sort !== "score" ? { sort } : {}} />
    </>
  );
}
