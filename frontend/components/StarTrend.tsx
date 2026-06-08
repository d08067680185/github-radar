import type { SnapshotPoint } from "@/lib/types";
import { getLocale } from "@/lib/i18n-server";

// 纯服务端渲染的 SVG 折线图：无客户端 JS，SEO 友好，零依赖。
export default async function StarTrend({ points }: { points: SnapshotPoint[] }) {
  if (points.length < 2) {
    const en = (await getLocale()) === "en";
    return (
      <p className="page-sub">
        {en
          ? "Trend data is accumulating — one star snapshot daily; the curve appears after a few days."
          : "趋势数据积累中 —— 系统每日记录一次 star 数，多跑几天后这里会出现增长曲线。"}
      </p>
    );
  }

  const W = 720, H = 220, PAD = 36;
  const stars = points.map((p) => p.stars);
  const min = Math.min(...stars);
  const max = Math.max(...stars);
  const range = max - min || 1;

  const x = (i: number) => PAD + (i / (points.length - 1)) * (W - PAD * 2);
  const y = (s: number) => H - PAD - ((s - min) / range) * (H - PAD * 2);

  const line = points.map((p, i) => `${x(i)},${y(p.stars)}`).join(" ");
  const area = `${PAD},${H - PAD} ${line} ${W - PAD},${H - PAD}`;

  const first = points[0];
  const last = points[points.length - 1];
  const gained = last.stars - first.stars;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img"
           aria-label={`star 历史趋势，从 ${first.stars} 到 ${last.stars}`}>
        <polygon points={area} fill="#1f6feb22" />
        <polyline points={line} fill="none" stroke="#58a6ff" strokeWidth="2" />
        {points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.stars)} r="2.5" fill="#58a6ff" />
        ))}
        <text x={PAD} y={20} fill="#8b949e" fontSize="12">{max.toLocaleString()} ⭐</text>
        <text x={PAD} y={H - 8} fill="#8b949e" fontSize="12">{first.date}</text>
        <text x={W - PAD} y={H - 8} fill="#8b949e" fontSize="12" textAnchor="end">{last.date}</text>
      </svg>
      <p className="page-sub" style={{ marginTop: 8 }}>
        区间内 {gained >= 0 ? "+" : ""}{gained.toLocaleString()} stars
      </p>
    </div>
  );
}
