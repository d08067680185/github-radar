"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  forceSimulation, forceManyBody, forceCollide, forceX, forceY,
  type Simulation,
} from "d3-force";
import type { MapNode } from "@/lib/types";
import { useLocale } from "@/lib/i18n-client";
import { catName, catColor, CAT_ORDER } from "@/lib/i18n";

type SizeMetric = "stars" | "score" | "growth";

interface SimNode extends MapNode {
  x: number; y: number; vx: number; vy: number;
  fx?: number | null; fy?: number | null;
  r: number; cat: string;
}

const MIN_R = 3.5, MAX_R = 30;
const MIN_SCALE = 0.5, MAX_SCALE = 7;

export default function BubbleGalaxy({ nodes }: { nodes: MapNode[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<Simulation<SimNode, undefined> | null>(null);
  const dataRef = useRef<SimNode[]>([]);
  const hoverRef = useRef<number>(-1);
  const selRef = useRef<string | null>(null);
  const dragRef = useRef<{ i: number; moved: boolean; x: number; y: number } | null>(null);
  const panRef = useRef<{ x: number; y: number } | null>(null);
  const sizeRef = useRef<{ w: number; h: number }>({ w: 800, h: 560 });
  const themeRef = useRef({ text: "#e7e9ee", border: "#2a2f3a", bg: "#0f1115" });
  // 视图变换：screen = world * scale + (tx,ty)
  const viewRef = useRef({ scale: 1, tx: 0, ty: 0 });
  // 多指（pinch）追踪
  const ptrsRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<{ dist: number; cx: number; cy: number } | null>(null);
  const metricRef = useRef<SizeMetric>("stars");
  const labelIdxRef = useRef<number[]>([]);
  const pulseRef = useRef<number>(-1);     // 搜索定位高亮的节点
  const animRef = useRef<number | null>(null);
  const router = useRouter();
  const { t, locale } = useLocale();

  const [tip, setTip] = useState<{ n: SimNode; x: number; y: number } | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [metric, setMetric] = useState<SizeMetric>("stars");
  const [query, setQuery] = useState("");

  const cats = useMemo(() => {
    const present = new Set(nodes.map((n) => n.category || "_"));
    return CAT_ORDER.filter((c) => present.has(c)).concat(present.has("_") ? ["_"] : []);
  }, [nodes]);

  const metricVal = (n: MapNode, m: SizeMetric) =>
    m === "stars" ? n.stars : m === "score" ? n.score : n.growth_score;

  // 当前度量下的半径函数
  const radiusFns = useMemo(() => {
    const fn: Record<SizeMetric, (n: MapNode) => number> = {} as never;
    (["stars", "score", "growth"] as SizeMetric[]).forEach((m) => {
      const max = Math.max(1, ...nodes.map((n) => metricVal(n, m)));
      const sqMax = Math.sqrt(max);
      fn[m] = (n) =>
        Math.max(MIN_R, Math.min(MAX_R, (Math.sqrt(Math.max(0, metricVal(n, m))) / sqMax) * MAX_R));
    });
    return fn;
  }, [nodes]);

  function readTheme() {
    const cs = getComputedStyle(document.documentElement);
    const get = (v: string, d: string) => cs.getPropertyValue(v).trim() || d;
    themeRef.current = {
      text: get("--text", "#e7e9ee"),
      border: get("--border", "#2a2f3a"),
      bg: get("--surface", get("--bg", "#0f1115")),
    };
  }

  function clusterCenter(cat: string) {
    const { w, h } = sizeRef.current;
    const i = Math.max(0, cats.indexOf(cat));
    const n = Math.max(1, cats.length);
    const ang = (i / n) * Math.PI * 2 - Math.PI / 2;
    const rad = Math.min(w, h) * (cats.length > 1 ? 0.33 : 0);
    return { cx: w / 2 + Math.cos(ang) * rad, cy: h / 2 + Math.sin(ang) * rad };
  }

  // 重新计算「常驻标签」节点：当前度量下最大的 N 个
  function recomputeLabels() {
    const data = dataRef.current;
    const idx = data.map((_, i) => i).sort((a, b) => data[b].r - data[a].r).slice(0, 14);
    labelIdxRef.current = idx;
  }

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { w, h } = sizeRef.current;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const { text, border, bg } = themeRef.current;
    const s = selRef.current;
    const hoverIdx = hoverRef.current;
    const { scale, tx, ty } = viewRef.current;
    const data = dataRef.current;

    // 气泡（离屏剔除）
    for (let k = 0; k < data.length; k++) {
      const d = data[k];
      const sx = d.x * scale + tx, sy = d.y * scale + ty, sr = d.r * scale;
      if (sx + sr < 0 || sx - sr > w || sy + sr < 0 || sy - sr > h) continue;
      const dim = s && d.cat !== s;
      ctx.globalAlpha = dim ? 0.1 : 0.85;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fillStyle = catColor(d.category);
      ctx.fill();
    }

    // 常驻标签（大气泡，跳过被领域筛选 dim 掉的）
    ctx.globalAlpha = 1;
    ctx.font = "600 11px system-ui, sans-serif";
    ctx.textBaseline = "middle";
    for (const k of labelIdxRef.current) {
      const d = data[k];
      if (s && d.cat !== s) continue;
      const sx = d.x * scale + tx, sy = d.y * scale + ty, sr = d.r * scale;
      if (sx < -40 || sx > w + 40 || sy < -20 || sy > h + 20) continue;
      const name = d.full_name.split("/")[1] || d.full_name;
      const tw = ctx.measureText(name).width;
      ctx.fillStyle = text;
      ctx.globalAlpha = 0.85;
      ctx.fillText(name, sx - tw / 2, sy + sr + 9);
    }
    ctx.globalAlpha = 1;

    // 搜索定位脉冲环
    if (pulseRef.current >= 0 && pulseRef.current < data.length) {
      const d = data[pulseRef.current];
      const sx = d.x * scale + tx, sy = d.y * scale + ty, sr = d.r * scale;
      const pulse = 6 + 4 * Math.sin(Date.now() / 180);
      ctx.beginPath();
      ctx.arc(sx, sy, sr + pulse, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#4f8cff";
      ctx.stroke();
    }

    // 悬停高亮：描边 + 标签气泡
    if (hoverIdx >= 0 && hoverIdx < data.length) {
      const d = data[hoverIdx];
      const sx = d.x * scale + tx, sy = d.y * scale + ty, sr = d.r * scale;
      ctx.beginPath();
      ctx.arc(sx, sy, sr + 2.5, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = text;
      ctx.stroke();
      ctx.font = "600 12px system-ui, sans-serif";
      ctx.textBaseline = "alphabetic";
      const label = d.full_name;
      const tw = ctx.measureText(label).width;
      const lx = Math.min(Math.max(sx - tw / 2, 4), w - tw - 8);
      const ly = sy - sr - 10;
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = bg;
      ctx.fillRect(lx - 4, ly - 12, tw + 8, 18);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = border;
      ctx.lineWidth = 1;
      ctx.strokeRect(lx - 4, ly - 12, tw + 8, 18);
      ctx.fillStyle = text;
      ctx.fillText(label, lx, ly + 1);
    }
    ctx.globalAlpha = 1;
  }

  // 屏幕坐标 → 命中的节点下标
  function pointAt(px: number, py: number): number {
    const data = dataRef.current;
    const { scale, tx, ty } = viewRef.current;
    let best = -1, bestD = Infinity;
    for (let k = 0; k < data.length; k++) {
      const d = data[k];
      const sx = d.x * scale + tx, sy = d.y * scale + ty, sr = d.r * scale + 1;
      const dist = (sx - px) ** 2 + (sy - py) ** 2;
      if (dist < sr * sr && dist < bestD) { bestD = dist; best = k; }
    }
    return best;
  }

  // 缩放（围绕屏幕点 px,py）
  function zoomAt(px: number, py: number, factor: number) {
    const v = viewRef.current;
    const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, v.scale * factor));
    const wx = (px - v.tx) / v.scale, wy = (py - v.ty) / v.scale;
    v.scale = next;
    v.tx = px - wx * next;
    v.ty = py - wy * next;
    draw();
  }

  // 平滑把某节点移到画面中心并放大
  function locate(i: number) {
    const d = dataRef.current[i];
    if (!d) return;
    pulseRef.current = i;
    const { w, h } = sizeRef.current;
    const target = { scale: Math.max(2, viewRef.current.scale), tx: 0, ty: 0 };
    target.tx = w / 2 - d.x * target.scale;
    target.ty = h / 2 - d.y * target.scale;
    const start = { ...viewRef.current };
    const t0 = performance.now();
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / 420);
      const e = 1 - (1 - k) ** 3; // easeOutCubic
      viewRef.current = {
        scale: start.scale + (target.scale - start.scale) * e,
        tx: start.tx + (target.tx - start.tx) * e,
        ty: start.ty + (target.ty - start.ty) * e,
      };
      draw();
      if (k < 1) animRef.current = requestAnimationFrame(step);
      else { animRef.current = null; pulseTimer(); }
    };
    animRef.current = requestAnimationFrame(step);
  }

  // 脉冲动画持续 ~1.6s
  function pulseTimer() {
    const t0 = Date.now();
    const tick = () => {
      draw();
      if (Date.now() - t0 < 1600) requestAnimationFrame(tick);
      else { pulseRef.current = -1; draw(); }
    };
    requestAnimationFrame(tick);
  }

  // 初始化模拟
  useEffect(() => {
    const canvas = canvasRef.current, wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    readTheme();

    const resize = () => {
      const w = wrap.clientWidth || 800;
      const h = Math.max(440, Math.min(700, Math.round(w * 0.64)));
      sizeRef.current = { w, h };
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
    };
    resize();

    const rfn = radiusFns[metricRef.current];
    const data: SimNode[] = nodes.map((n) => {
      const c = clusterCenter(n.category || "_");
      return {
        ...n, cat: n.category || "_", r: rfn(n),
        x: c.cx + (Math.random() - 0.5) * 60, y: c.cy + (Math.random() - 0.5) * 60,
        vx: 0, vy: 0,
      };
    });
    dataRef.current = data;
    recomputeLabels();

    const sim = forceSimulation<SimNode>(data)
      .force("charge", forceManyBody<SimNode>().strength(-6))
      .force("collide", forceCollide<SimNode>().radius((d) => d.r + 1.5).strength(0.9))
      .force("x", forceX<SimNode>((d) => clusterCenter(d.cat).cx).strength(0.07))
      .force("y", forceY<SimNode>((d) => clusterCenter(d.cat).cy).strength(0.07))
      .alpha(1).alphaDecay(0.022);
    sim.on("tick", draw);
    simRef.current = sim;
    setReady(true);

    const ro = new ResizeObserver(() => {
      resize();
      sim.force("x", forceX<SimNode>((d) => clusterCenter(d.cat).cx).strength(0.07));
      sim.force("y", forceY<SimNode>((d) => clusterCenter(d.cat).cy).strength(0.07));
      sim.alpha(0.4).restart();
    });
    ro.observe(wrap);

    const mo = new MutationObserver(() => { readTheme(); draw(); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    // 滚轮缩放（非被动，preventDefault 阻止页面滚动）
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      zoomAt(e.clientX - rect.left, e.clientY - rect.top, e.deltaY < 0 ? 1.12 : 1 / 1.12);
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });

    return () => { sim.stop(); ro.disconnect(); mo.disconnect(); canvas.removeEventListener("wheel", onWheel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes]);

  // 切换大小度量：重算半径 + collide，轻量重启
  useEffect(() => {
    metricRef.current = metric;
    const sim = simRef.current;
    const data = dataRef.current;
    if (!sim || !data.length) return;
    const rfn = radiusFns[metric];
    for (const d of data) d.r = rfn(d);
    recomputeLabels();
    sim.force("collide", forceCollide<SimNode>().radius((d) => d.r + 1.5).strength(0.9));
    sim.alpha(0.5).restart();
  }, [metric, radiusFns]);

  // 指针交互（含 pinch）
  function onMove(e: React.PointerEvent) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    if (ptrsRef.current.has(e.pointerId)) ptrsRef.current.set(e.pointerId, { x: px, y: py });

    // 双指缩放
    if (ptrsRef.current.size === 2) {
      const [a, b] = Array.from(ptrsRef.current.values());
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      const prev = pinchRef.current;
      if (prev) {
        zoomAt(cx, cy, dist / prev.dist);
        const v = viewRef.current; v.tx += cx - prev.cx; v.ty += cy - prev.cy; draw();
      }
      pinchRef.current = { dist, cx, cy };
      return;
    }

    const drag = dragRef.current;
    if (drag) {
      const v = viewRef.current;
      const d = dataRef.current[drag.i];
      d.fx = (px - v.tx) / v.scale; d.fy = (py - v.ty) / v.scale;
      if (Math.abs(px - drag.x) > 4 || Math.abs(py - drag.y) > 4) drag.moved = true;
      simRef.current?.alphaTarget(0.15).restart();
      return;
    }
    const pan = panRef.current;
    if (pan) {
      const v = viewRef.current; v.tx += px - pan.x; v.ty += py - pan.y;
      panRef.current = { x: px, y: py }; draw(); return;
    }

    const i = pointAt(px, py);
    if (i !== hoverRef.current) {
      hoverRef.current = i;
      canvasRef.current!.style.cursor = i >= 0 ? "pointer" : "grab";
      setTip(i >= 0 ? { n: dataRef.current[i], x: px, y: py } : null);
      draw();
    } else if (i >= 0) {
      setTip({ n: dataRef.current[i], x: px, y: py });
    }
  }
  function onDown(e: React.PointerEvent) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    ptrsRef.current.set(e.pointerId, { x: px, y: py });
    canvasRef.current!.setPointerCapture(e.pointerId);
    if (ptrsRef.current.size === 2) { pinchRef.current = null; dragRef.current = null; panRef.current = null; return; }
    const i = pointAt(px, py);
    if (i >= 0) {
      dragRef.current = { i, moved: false, x: px, y: py };
    } else {
      panRef.current = { x: px, y: py };
      canvasRef.current!.style.cursor = "grabbing";
    }
  }
  function onUp(e: React.PointerEvent) {
    ptrsRef.current.delete(e.pointerId);
    if (ptrsRef.current.size < 2) pinchRef.current = null;
    const drag = dragRef.current;
    if (drag) {
      const d = dataRef.current[drag.i];
      d.fx = null; d.fy = null;
      simRef.current?.alphaTarget(0);
      if (!drag.moved) router.push(`/repo/${d.full_name}`);
      dragRef.current = null;
    }
    panRef.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = "grab";
    try { canvasRef.current!.releasePointerCapture(e.pointerId); } catch {}
  }
  function onLeave() {
    if (dragRef.current || panRef.current) return;
    hoverRef.current = -1; setTip(null); draw();
  }

  function toggleCat(c: string) {
    const next = sel === c ? null : c;
    setSel(next); selRef.current = next; draw();
  }

  function resetView() {
    viewRef.current = { scale: 1, tx: 0, ty: 0 };
    draw();
  }

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    nodes.forEach((n) => { const c = n.category || "_"; m[c] = (m[c] || 0) + 1; });
    return m;
  }, [nodes]);

  // 搜索匹配（取前 6）
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out: { i: number; full: string }[] = [];
    for (let i = 0; i < nodes.length && out.length < 6; i++) {
      if (nodes[i].full_name.toLowerCase().includes(q)) out.push({ i, full: nodes[i].full_name });
    }
    return out;
  }, [query, nodes]);

  return (
    <div className="galaxy">
      {/* 控制条：搜索 + 大小度量 + 复位 */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 10 }}>
        <div style={{ position: "relative", flex: "1 1 220px", maxWidth: 320 }}>
          <input
            className="search-input"
            style={{ margin: 0, width: "100%" }}
            placeholder={t.map_search_ph}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && matches[0]) { locate(matches[0].i); setQuery(""); } }}
          />
          {matches.length > 0 && (
            <ul style={{
              position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 20,
              listStyle: "none", margin: 0, padding: 4, background: "var(--surface)",
              border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,.25)",
            }}>
              {matches.map((m) => (
                <li
                  key={m.full}
                  onMouseDown={(e) => { e.preventDefault(); locate(m.i); setQuery(""); }}
                  style={{ padding: "7px 10px", borderRadius: 6, cursor: "pointer", fontSize: 13, color: "var(--text)" }}
                >
                  {m.full}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div style={{ display: "inline-flex", gap: 4, alignItems: "center", fontSize: 13, color: "var(--muted)" }}>
          {t.map_size_by}
          {(["stars", "score", "growth"] as SizeMetric[]).map((m) => (
            <button key={m} className={`galaxy-chip ${metric === m ? "on" : ""}`} onClick={() => setMetric(m)}>
              {m === "stars" ? t.map_size_stars : m === "score" ? t.map_size_score : t.map_size_growth}
            </button>
          ))}
        </div>
        <button className="galaxy-chip" onClick={resetView}>⟲ {t.map_reset}</button>
      </div>

      <div className="galaxy-canvas" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={t.map_h}
          style={{ touchAction: "none", cursor: "grab" }}
          onPointerMove={onMove}
          onPointerDown={onDown}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onPointerLeave={onLeave}
        />
        {!ready && <div className="galaxy-loading">{t.map_loading}</div>}
        {tip && (
          <div
            className="galaxy-tip"
            style={{ left: Math.min(tip.x + 14, sizeRef.current.w - 220), top: tip.y + 14 }}
          >
            <strong>{tip.n.full_name}</strong>
            <span className="galaxy-tip-cat" style={{ color: catColor(tip.n.category) }}>
              ● {catName(tip.n.category, locale, tip.n.category)}
            </span>
            <div className="galaxy-tip-meta">
              ★ {tip.n.stars.toLocaleString()} · {t.score} {Math.round(tip.n.score)}
            </div>
          </div>
        )}
      </div>

      <p className="galaxy-hint">{t.map_hint}</p>
      <div className="galaxy-legend">
        {cats.map((c) => (
          <button
            key={c}
            className={`galaxy-chip ${sel && sel !== c ? "dim" : ""} ${sel === c ? "on" : ""}`}
            onClick={() => toggleCat(c)}
          >
            <i style={{ background: catColor(c === "_" ? null : c) }} />
            {c === "_" ? "—" : catName(c, locale)} <b>{counts[c]}</b>
          </button>
        ))}
      </div>
    </div>
  );
}
