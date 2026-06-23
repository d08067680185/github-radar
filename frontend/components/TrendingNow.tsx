import { api } from "@/lib/api";
import { getDict } from "@/lib/i18n-server";

// 首页「本周热门」：来自访客真实行为的热门搜索 + 最多人看的项目（隐私友好聚合）。
// async server 组件，自取数、数据为空时整体自隐藏（冷启动友好）。
export default async function TrendingNow() {
  const t = await getDict();
  const [searches, repos] = await Promise.all([
    api.topSearches(7, 8).catch(() => []),
    api.topRepos(7, 6).catch(() => []),
  ]);
  if (searches.length === 0 && repos.length === 0) return null;

  return (
    <section style={{ marginBottom: 32 }}>
      <div className="section-head">
        <h2 className="page-title">{t.hot_h}</h2>
      </div>
      <p className="page-sub">{t.hot_sub}</p>

      {searches.length > 0 && (
        <div style={{ margin: "4px 0 16px" }}>
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>{t.hot_searches}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {searches.map((s) => (
              <a key={s.query} className="chip" href={`/search?q=${encodeURIComponent(s.query)}`}>
                {s.query}
                <span style={{ color: "var(--faint)", marginLeft: 6, fontSize: 12 }}>{s.count}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {repos.length > 0 && (
        <div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>{t.hot_repos}</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            {repos.map((p, i) => (
              <a
                key={p.full_name}
                href={`/repo/${p.full_name}`}
                style={{
                  background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: 12, padding: "12px 14px", textDecoration: "none", display: "block",
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ color: "var(--faint)", fontSize: 13 }}>#{i + 1}</span>
                  <span style={{ fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.full_name}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "var(--faint)", marginTop: 6 }}>
                  {p.language && <>{p.language} · </>}⭐ {p.stars.toLocaleString()} · {p.score}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
