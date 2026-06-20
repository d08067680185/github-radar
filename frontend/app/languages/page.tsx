import type { Metadata } from "next";
import { api } from "@/lib/api";
import { getDict } from "@/lib/i18n-server";
import RankingList from "@/components/RankingList";

export const revalidate = 3600;
export async function generateMetadata(): Promise<Metadata> {
  const { getLocale } = await import("@/lib/i18n-server");
  const en = (await getLocale()) === "en";
  return en
    ? {
        title: "Browse open-source projects by language",
        description: "Browse top open-source projects by programming language: JavaScript, Python, Rust, Go, C++ and more, with per-language counts.",
      }
    : {
        title: "按语言浏览开源项目",
        description: "按编程语言浏览优秀开源项目榜单：JavaScript、Python、Rust、Go、C++ 等，含各语言项目数。",
      };
}

const PREVIEW_COUNT = 10; // 前 N 个热门语言展示项目预览

export default async function LanguagesPage() {
  const t = await getDict();
  const langs = await api.languageStats(); // 已按数量降序

  const top = langs.slice(0, PREVIEW_COUNT);
  const previews = await Promise.all(
    top.map(async (l) => ({
      lang: l,
      items: await api.top({ language: l.slug, limit: 5 }),
    }))
  );

  return (
    <>
      <h1 className="page-title">{t.langs_h}</h1>
      <p className="page-sub">{langs.length} · {t.nav_languages}</p>

      {/* 全部语言 + 数量 */}
      <div className="filters">
        {langs.map((l) => (
          <a key={l.slug} className="chip" href={`/lang/${encodeURIComponent(l.slug)}`}>
            {l.name} <span style={{ color: "var(--faint)" }}>· {l.count}</span>
          </a>
        ))}
      </div>

      {/* 热门语言预览 */}
      {previews.map(({ lang, items }) => (
        <section className="cat-section" key={lang.slug}>
          <div className="head">
            <h3>{lang.name}</h3>
            <span className="cnt">{lang.count}</span>
            <a href={`/lang/${encodeURIComponent(lang.slug)}`}>{t.viewAll}</a>
          </div>
          <RankingList projects={items} metric="score" />
        </section>
      ))}
    </>
  );
}
