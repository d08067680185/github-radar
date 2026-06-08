import type { Metadata } from "next";
import { api, PER_PAGE } from "@/lib/api";
import { getDict, getLocale } from "@/lib/i18n-server";
import { catName } from "@/lib/i18n";
import RankingList from "@/components/RankingList";
import Pagination from "@/components/Pagination";

export const metadata: Metadata = {
  title: "搜索开源项目",
  description: "按关键词、语言、领域、最低 star 数搜索优秀开源项目，支持多种排序。",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const t = await getDict();
  const locale = await getLocale();
  const SORTS = [
    { v: "score", label: t.sort_score },
    { v: "growth", label: t.sort_growth },
    { v: "stars", label: t.sort_stars },
    { v: "activity", label: t.sort_activity },
  ];
  const sp = await searchParams;
  const q = sp.q || "";
  const sort = (sp.sort as "score" | "growth" | "stars" | "activity") || "score";
  const language = sp.language || "";
  const category = sp.category || "";
  const minStars = sp.min_stars ? Number(sp.min_stars) : 0;
  const page = Math.max(1, Number(sp.page) || 1);

  const [langs, cats] = await Promise.all([api.languages(), api.categories()]);

  const hasQuery = q || language || category || minStars;
  const { items: results, total } = hasQuery
    ? await api.searchPaged({
        q, sort, language, category, min_stars: minStars,
        limit: PER_PAGE, offset: (page - 1) * PER_PAGE,
      })
    : { items: [], total: 0 };

  return (
    <>
      <h1 className="page-title">{t.search_h}</h1>
      <p className="page-sub">{t.search_sub}</p>

      <form method="GET" className="search-form">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder={t.search_ph}
          className="search-input"
          autoFocus
        />
        <div className="search-filters">
          <select name="language" defaultValue={language}>
            <option value="">{t.allLangs}</option>
            {langs.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <select name="category" defaultValue={category}>
            <option value="">{t.allCats}</option>
            {cats.map((c) => (
              <option key={c.slug} value={c.slug}>{catName(c.slug, locale, c.name)}</option>
            ))}
          </select>
          <select name="min_stars" defaultValue={String(minStars)}>
            <option value="0">{t.noStar}</option>
            <option value="1000">≥ 1k</option>
            <option value="10000">≥ 10k</option>
            <option value="50000">≥ 50k</option>
          </select>
          <select name="sort" defaultValue={sort}>
            {SORTS.map((s) => (
              <option key={s.v} value={s.v}>{t.sortBy}{s.label}</option>
            ))}
          </select>
          <button type="submit">{t.searchBtn}</button>
        </div>
      </form>

      {hasQuery ? (
        <>
          <p className="page-sub">{t.resultsFound(total)}</p>
          <RankingList
            projects={results}
            metric={sort === "growth" ? "growth_score" : "score"}
            startRank={(page - 1) * PER_PAGE}
          />
          <Pagination
            total={total}
            page={page}
            basePath="/search"
            query={{
              ...(q && { q }),
              ...(language && { language }),
              ...(category && { category }),
              ...(minStars && { min_stars: String(minStars) }),
              ...(sort !== "score" && { sort }),
            }}
          />
        </>
      ) : (
        <div>
          <p className="page-sub">{t.search_empty}</p>
          <div className="filters">
            {["llm", "react", "kubernetes", "rust", "vector database", "cli"].map((ex) => (
              <a key={ex} className="chip" href={`/search?q=${encodeURIComponent(ex)}`}>
                🔍 {ex}
              </a>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
