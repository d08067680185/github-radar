import type { Metadata } from "next";
import { api } from "@/lib/api";
import { getDict, getLocale } from "@/lib/i18n-server";
import { catName } from "@/lib/i18n";
import RankingList from "@/components/RankingList";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "按领域浏览开源项目",
  description: "按 AI、Web 前端、后端、数据库、DevOps 等领域浏览优秀开源项目榜单。",
};

export default async function CategoriesPage() {
  const t = await getDict();
  const locale = await getLocale();
  const cats = (await api.categories()).filter((c) => c.count > 0);

  // 并发拉每个领域的 Top 5 作为预览
  const sections = await Promise.all(
    cats.map(async (c) => ({
      cat: c,
      items: await api.top({ category: c.slug, limit: 5 }),
    }))
  );

  return (
    <>
      <h1 className="page-title">{t.cats_h}</h1>
      <p className="page-sub">{t.cats_sub}</p>

      {/* 快速跳转 */}
      <div className="filters">
        {cats.map((c) => (
          <a key={c.slug} className="chip" href={`#${c.slug}`}>
            {catName(c.slug, locale, c.name)} · {c.count}
          </a>
        ))}
      </div>

      {sections.map(({ cat, items }) => (
        <section className="cat-section" id={cat.slug} key={cat.slug}>
          <div className="head">
            <h3>{catName(cat.slug, locale, cat.name)}</h3>
            <span className="cnt">{cat.count}</span>
            <a href={`/category/${cat.slug}`}>{t.viewAll}</a>
          </div>
          <RankingList projects={items} metric="score" />
        </section>
      ))}
    </>
  );
}
