// 纯 SVG 四维雷达图（无依赖、无 hooks，可在服务端组件里直接用）。
// 四轴顺序固定：增长(上) / 活跃(右) / 健康(下) / 热度(左)，每维 0–100。

export interface RadarSeries {
  label: string;
  color: string;
  values: number[]; // 长度 4，对应四轴
}

const SIZE = 260;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 92;
const RINGS = [0.25, 0.5, 0.75, 1];

// 轴角度：上、右、下、左
const ANGLES = [-90, 0, 90, 180].map((d) => (d * Math.PI) / 180);

function pt(frac: number, axis: number): [number, number] {
  const a = ANGLES[axis];
  return [CX + R * frac * Math.cos(a), CY + R * frac * Math.sin(a)];
}

function polygon(values: number[]): string {
  return values
    .map((v, i) => {
      const [x, y] = pt(Math.max(0, Math.min(100, v)) / 100, i);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export default function RadarChart({
  axes,
  series,
  size = SIZE,
}: {
  axes: [string, string, string, string];
  series: RadarSeries[];
  size?: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={axes.join(" / ")}
      >
        {/* 网格环 */}
        {RINGS.map((ring) => (
          <polygon
            key={ring}
            points={polygon([ring * 100, ring * 100, ring * 100, ring * 100])}
            fill="none"
            stroke="var(--border)"
            strokeWidth={1}
          />
        ))}
        {/* 轴线 */}
        {ANGLES.map((_, i) => {
          const [x, y] = pt(1, i);
          return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="var(--border)" strokeWidth={1} />;
        })}
        {/* 数据多边形 */}
        {series.map((s) => (
          <polygon
            key={s.label}
            points={polygon(s.values)}
            fill={s.color}
            fillOpacity={series.length > 1 ? 0.18 : 0.28}
            stroke={s.color}
            strokeWidth={2}
          />
        ))}
        {/* 轴标签 */}
        {axes.map((label, i) => {
          const [x, y] = pt(1.16, i);
          const anchor = i === 1 ? "start" : i === 3 ? "end" : "middle";
          return (
            <text
              key={label}
              x={x}
              y={y + (i === 0 ? -2 : i === 2 ? 10 : 4)}
              textAnchor={anchor}
              fontSize={12}
              fill="var(--muted)"
            >
              {label}
            </text>
          );
        })}
      </svg>

      {series.length > 1 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
          {series.map((s) => (
            <span key={s.label} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted)" }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color, display: "inline-block" }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// 对比页多项目调色板
export const RADAR_COLORS = ["#4f8cff", "#3fb950", "#f0883e", "#bc8cff"];
