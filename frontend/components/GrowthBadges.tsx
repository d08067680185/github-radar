import type { SnapshotPoint } from "@/lib/types";

/** 从历史快照计算指定天数窗口内的 star 增长（绝对值 + 百分比） */
function growthOver(history: SnapshotPoint[], days: number): { abs: number; pct: number } | null {
  if (history.length < 2) return null;
  const latest = history[history.length - 1];
  const cutoff = new Date(latest.date).getTime() - days * 86400_000;
  // 找 cutoff 之前最近的一条快照
  let baseline: SnapshotPoint | null = null;
  for (const p of history) {
    if (new Date(p.date).getTime() <= cutoff) baseline = p;
  }
  if (!baseline) return null;
  const abs = latest.stars - baseline.stars;
  const pct = baseline.stars > 0 ? (abs / baseline.stars) * 100 : 0;
  return { abs, pct };
}

export default async function GrowthBadges({ history }: { history: SnapshotPoint[] }) {
  const { getLocale } = await import("@/lib/i18n-server");
  const en = (await getLocale()) === "en";
  const windows = [
    { days: 7, label: en ? "7d" : "近 7 日" },
    { days: 30, label: en ? "30d" : "近 30 日" },
  ];
  const badges = windows.map((w) => ({ ...w, g: growthOver(history, w.days) })).filter(
    (b) => b.g !== null
  );

  if (badges.length === 0) {
    return (
      <p className="page-sub" style={{ marginTop: 4 }}>
        {en
          ? "Growth data is accumulating — one snapshot daily; percentages appear after ~7 days."
          : "增长数据积累中 —— 系统每日记录一次，攒够 7 天后这里会显示增长百分比。"}
      </p>
    );
  }

  return (
    <div className="growth-badges">
      {badges.map((b) => {
        const g = b.g!;
        const up = g.abs > 0;
        return (
          <div className="gbadge" key={b.days}>
            <span className="p">{b.label}</span>
            <span className={`v ${up ? "up" : "flat"}`}>
              {up ? "↑" : ""}{g.pct >= 0 ? "+" : ""}{g.pct.toFixed(1)}%
            </span>
            <span className="p">({g.abs >= 0 ? "+" : ""}{g.abs.toLocaleString()} ⭐)</span>
          </div>
        );
      })}
    </div>
  );
}
