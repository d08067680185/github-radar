import type { Metadata } from "next";
import { api, PER_PAGE } from "@/lib/api";
import RankingList from "@/components/RankingList";
import Pagination from "@/components/Pagination";

export const revalidate = 3600;

// 预生成所有语言子榜（SSG）
export async function generateStaticParams() {
  try {
    const langs = await api.languages();
    return langs.map((language) => ({ language }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ language: string }>;
}): Promise<Metadata> {
  const { language } = await params;
  const lang = decodeURIComponent(language);
  return {
    title: `${lang} 优秀开源项目榜`,
    description: `综合评分排序的 ${lang} 优秀开源项目榜单，每日更新。`,
  };
}

export default async function LanguagePage({
  params,
  searchParams,
}: {
  params: Promise<{ language: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { language } = await params;
  const lang = decodeURIComponent(language);
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const { getLocale } = await import("@/lib/i18n-server");
  const en = (await getLocale()) === "en";
  const { items, total } = await api.topPaged({
    language: lang,
    limit: PER_PAGE,
    offset: (page - 1) * PER_PAGE,
  });
  return (
    <>
      <h1 className="page-title">{en ? `Top ${lang} projects` : `${lang} 优秀开源项目`}</h1>
      <p className="page-sub">{en ? `${lang} projects ranked by composite score.` : `按综合评分排序的 ${lang} 项目。`}</p>
      <RankingList projects={items} metric="score" startRank={(page - 1) * PER_PAGE} />
      <Pagination total={total} page={page} basePath={`/lang/${encodeURIComponent(lang)}`} />
    </>
  );
}
