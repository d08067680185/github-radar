import { PER_PAGE } from "@/lib/api";
import { getLocale } from "@/lib/i18n-server";
import { getDictFor } from "@/lib/i18n";

/** 服务端渲染的翻页控件：基于 ?page= 查询参数 */
export default async function Pagination({
  total,
  page,
  basePath,
  query = {},
}: {
  total: number;
  page: number;
  basePath: string;
  query?: Record<string, string>;
}) {
  const locale = await getLocale();
  const t = getDictFor(locale);
  const totalText = locale === "en"
    ? `${total.toLocaleString()} items · ${Math.max(1, Math.ceil(total / PER_PAGE))} pages`
    : `共 ${total.toLocaleString()} 个 · ${Math.max(1, Math.ceil(total / PER_PAGE))} 页`;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  if (totalPages <= 1) return null;

  const href = (p: number) => {
    const sp = new URLSearchParams(query);
    if (p > 1) sp.set("page", String(p));
    else sp.delete("page");
    const s = sp.toString();
    return s ? `${basePath}?${s}` : basePath;
  };

  // 生成页码窗口：首页、当前±2、末页，中间省略
  const nums: (number | "…")[] = [];
  const push = (n: number) => { if (!nums.includes(n)) nums.push(n); };
  push(1);
  if (page - 2 > 2) nums.push("…");
  for (let p = Math.max(2, page - 2); p <= Math.min(totalPages - 1, page + 2); p++) push(p);
  if (page + 2 < totalPages - 1) nums.push("…");
  if (totalPages > 1) push(totalPages);

  return (
    <nav className="pager" aria-label="pagination">
      {page > 1 ? (
        <a className="pager-btn" href={href(page - 1)}>{t.prev}</a>
      ) : (
        <span className="pager-btn disabled">{t.prev}</span>
      )}

      <span className="pager-nums">
        {nums.map((n, i) =>
          n === "…" ? (
            <span key={`g${i}`} className="pager-gap">…</span>
          ) : (
            <a
              key={n}
              href={href(n)}
              className={`pager-num ${n === page ? "active" : ""}`}
              aria-current={n === page ? "page" : undefined}
            >
              {n}
            </a>
          )
        )}
      </span>

      {page < totalPages ? (
        <a className="pager-btn" href={href(page + 1)}>{t.next}</a>
      ) : (
        <span className="pager-btn disabled">{t.next}</span>
      )}

      <span className="pager-total">{totalText}</span>
    </nav>
  );
}
