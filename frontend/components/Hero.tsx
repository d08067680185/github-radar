import { api } from "@/lib/api";
import { getDict } from "@/lib/i18n-server";

function fmt(n: number): string {
  if (n >= 1000) return `${Math.floor(n / 1000)}k+`;
  return String(n);
}

export default async function Hero() {
  const t = await getDict();
  let stats = { projects: 0, languages: 0, categories: 0, max_stars: 0 };
  try {
    stats = await api.stats();
  } catch {
    /* 接口异常时 Hero 仍渲染 */
  }

  return (
    <section className="hero">
      <h1>
        {t.hero_title_1}<br />
        <span className="grad">{t.hero_title_2}</span>
      </h1>
      <p>{t.hero_desc}</p>

      <form method="GET" action="/search" className="hero-search" role="search">
        <input type="text" name="q" placeholder={t.hero_search_ph} aria-label={t.nav_search} />
        <button type="submit">{t.searchBtn}</button>
      </form>

      <div className="hero-stats">
        <div className="stat">
          <div className="n">{stats.projects.toLocaleString()}</div>
          <div className="l">{t.stat_projects}</div>
        </div>
        <div className="stat">
          <div className="n">{stats.languages}</div>
          <div className="l">{t.stat_languages}</div>
        </div>
        <div className="stat">
          <div className="n">{stats.categories}</div>
          <div className="l">{t.stat_categories}</div>
        </div>
        <div className="stat">
          <div className="n">{fmt(stats.max_stars)}</div>
          <div className="l">{t.stat_maxstars}</div>
        </div>
      </div>
    </section>
  );
}
