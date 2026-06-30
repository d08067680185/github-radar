"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  forceSimulation, forceManyBody, forceCollide, forceX, forceY,
  type Simulation,
} from "d3-force";
import type { MapNode, MapTimeline } from "@/lib/types";
import { useLocale } from "@/lib/i18n-client";
import { localeHref } from "@/lib/locale-link";
import { catName, catColor, langColor, CAT_ORDER, CAT_FALLBACK_COLOR } from "@/lib/i18n";

type SizeMetric = "stars" | "score" | "growth";
type GroupBy = "category" | "language";

interface SimNode extends MapNode {
  x: number; y: number; vx: number; vy: number;
  fx?: number | null; fy?: number | null;
  r: number; grp: string;
}

const MIN_R = 3.5, MAX_R = 30;
const MIN_SCALE = 0.5, MAX_SCALE = 7;
const TOP_LANGS = 14;

export default function BubbleGalaxy({
  nodes,
  timeline,
}: {
  nodes: MapNode[];
  timeline?: MapTimeline;
}) {
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
  const viewRef = useRef({ scale: 1, tx: 0, ty: 0 });
  const ptrsRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<{ dist: number; cx: number; cy: number } | null>(null);
  const groupRef = useRef<GroupBy>("category");
  const metricRef = useRef<SizeMetric>("stars");
  const frameRef = useRef<number>(-1);   // 时间轴帧；-1=实时
  const labelIdxRef = useRef<number[]>([]);
  const pulseRef = useRef<number>(-1);
  const animRef = useRef<number | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const urlParams = useSearchParams();
  const { t, locale } = useLocale();

  // URL 初始状态
  const init = useRef({
    group: (urlParams.get("g") === "language" ? "language" : "category") as GroupBy,
    metric: (["score", "growth"].includes(urlParams.get("m") || "")
      ? (urlParams.get("m") as SizeMetric) : "stars") as SizeMetric,
    sel: urlParams.get("f"),
    panel: urlParams.get("p"),
  });

  const [tip, setTip] = useState<{ n: SimNode; x: number; y: number } | null>(null);
  const [sel, setSel] = useState<string | null>(init.current.sel);
  const [ready, setReady] = useState(false);
  const [metric, setMetric] = useState<SizeMetric>(init.current.metric);
  const [groupBy, setGroupBy] = useState<GroupBy>(init.current.group);
  const [query, setQuery] = useState("");
  const [frame, setFrame] = useState<number>(-1);
  const [playing, setPlaying] = useState(false);
  const [panel, setPanel] = useState<SimNode | null>(null);

  const hasTimeline = !!timeline && timeline.dates.length >= 2;
  const seriesMap = useMemo(() => {
    const m = new Map<string, number[]>();
    timeline?.nodes.forEach((n) => m.set(n.full_name, n.series));
    return m;
  }, [timeline]);

  // 语言模式下进入聚团的「头部语言」集合
  const topLangs = useMemo(() => {
    const c: Record<string, number> = {};
    nodes.forEach((n) => { if (n.language) c[n.language] = (c[n.language] || 0) + 1; });
    return new Set(Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, TOP_LANGS).map((x) => x[0]));
  }, [nodes]);

  const groupKeyOf = useCallback((n: MapNode, g: GroupBy): string => {
    if (g === "category") return n.category || "_";
    return n.language && topLangs.has(n.language) ? n.language : "_";
  }, [topLangs]);

  const groupColor = useCallback((key: string, g: GroupBy): string => {
    if (key === "_") return CAT_FALLBACK_COLOR;
    return g === "category" ? catColor(key) : langColor(key);
  }, []);

  const groupLabel = useCallback((key: string, g: GroupBy): string => {
    if (key === "_") return t.map_other;
    return g === "category" ? catName(key, locale) : key;
  }, [t, locale]);

  // 当前分组维度下的有序分组列表（决定聚团角度 + 图例）
  const groups = useMemo(() => {
    const present = new Set(nodes.map((n) => groupKeyOf(n, groupBy)));
    if (groupBy === "category") {
      return CAT_ORDER.filter((c) => present.has(c)).concat(present.has("_") ? ["_"] : []);
    }
    const langs = Array.from(present).filter((l) => l !== "_").sort();
    return langs.concat(present.has("_") ? ["_"] : []);
  }, [nodes, groupBy, groupKeyOf]);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    nodes.forEach((n) => { const k = groupKeyOf(n, groupBy); m[k] = (m[k] || 0) + 1; });
    return m;
  }, [nodes, groupBy, groupKeyOf]);

  // 各度量的半径函数 + 专门的「star 比例」函数（时间轴用）
  const metricVal = (n: MapNode, m: SizeMetric) =>
    m === "stars" ? n.stars : m === "score" ? n.score : n.growth_score;
  const radiusFns = useMemo(() => {
    const fn: Record<SizeMetric, (n: MapNode) => number> = {} as never;
    (["stars", "score", "growth"] as SizeMetric[]).forEach((m) => {
      const max = Math.max(1, ...nodes.map((n) => metricVal(n, m)));
      const sqMax = Math.sqrt(max);
      fn[m] = (n) => Math.max(MIN_R, Math.min(MAX_R, (Math.sqrt(Math.max(0, metricVal(n, m))) / sqMax) * MAX_R));
    });
    return fn;
  }, [nodes]);
  const starRadius = useMemo(() => {
    let max = 1;
    nodes.forEach((n) => { max = Math.max(max, n.stars); });
    seriesMap.forEach((s) => s.forEach((v) => { max = Math.max(max, v); }));
    const sqMax = Math.sqrt(max);
    return (stars: number) => Math.max(MIN_R, Math.min(MAX_R, (Math.sqrt(Math.max(0, stars)) / sqMax) * MAX_R));
  }, [nodes, seriesMap]);

  // 某节点在当前状态（实时 or 时间帧）下的半径
  const radiusOf = useCallback((n: SimNode): number => {
    if (frameRef.current >= 0) {
      const s = seriesMap.get(n.full_name);
      if (s) return starRadius(s[frameRef.current] ?? n.stars);
      return starRadius(n.stars);
    }
    return radiusFns[metricRef.current](n);
  }, [radiusFns, starRadius, seriesMap]);

  function readTheme() {
    const cs = getComputedStyle(document.documentElement);
    const get = (v: string, d: string) => cs.getPropertyValue(v).trim() || d;
    themeRef.current = {
      text: get("--text", "#e7e9ee"), border: get("--border", "#2a2f3a"),
      bg: get("--surface", get("--bg", "#0f1115")),
    };
  }

  const clusterCenter = useCallback((key: string) => {
    const { w, h } = sizeRef.current;
    const i = Math.max(0, groups.indexOf(key));
    const n = Math.max(1, groups.length);
    const ang = (i / n) * Math.PI * 2 - Math.PI / 2;
    const rad = Math.min(w, h) * (groups.length > 1 ? 0.33 : 0);
    return { cx: w / 2 + Math.cos(ang) * rad, cy: h / 2 + Math.sin(ang) * rad };
  }, [groups]);

  function recomputeLabels() {
    const data = dataRef.current;
    labelIdxRef.current = data.map((_, i) => i).sort((a, b) => data[b].r - data[a].r).slice(0, 14);
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
    const g = groupRef.current;
    const hoverIdx = hoverRef.current;
    const { scale, tx, ty } = viewRef.current;
    const data = dataRef.current;

    for (let k = 0; k < data.length; k++) {
      const d = data[k];
      const sx = d.x * scale + tx, sy = d.y * scale + ty, sr = d.r * scale;
      if (sx + sr < 0 || sx - sr > w || sy + sr < 0 || sy - sr > h) continue;
      const dim = s && d.grp !== s;
      ctx.globalAlpha = dim ? 0.1 : 0.85;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fillStyle = groupColor(d.grp, g);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.font = "600 11px system-ui, sans-serif";
    ctx.textBaseline = "middle";
    for (const k of labelIdxRef.current) {
      const d = data[k];
      if (s && d.grp !== s) continue;
      const sx = d.x * scale + tx, sy = d.y * scale + ty, sr = d.r * scale;
      if (sx < -40 || sx > w + 40 || sy < -20 || sy > h + 20) continue;
      const name = d.full_name.split("/")[1] || d.full_name;
      const tw = ctx.measureText(name).width;
      ctx.fillStyle = text;
      ctx.globalAlpha = 0.85;
      ctx.fillText(name, sx - tw / 2, sy + sr + 9);
    }
    ctx.globalAlpha = 1;

    if (pulseRef.current >= 0 && pulseRef.current < data.length) {
      const d = data[pulseRef.current];
      const sx = d.x * scale + tx, sy = d.y * scale + ty, sr = d.r * scale;
      const pulse = 6 + 4 * Math.sin(Date.now() / 180);
      ctx.beginPath();
      ctx.arc(sx, sy, sr + pulse, 0, Math.PI * 2);
      ctx.lineWidth = 2; ctx.strokeStyle = "#4f8cff"; ctx.stroke();
    }

    if (hoverIdx >= 0 && hoverIdx < data.length) {
      const d = data[hoverIdx];
      const sx = d.x * scale + tx, sy = d.y * scale + ty, sr = d.r * scale;
      ctx.beginPath();
      ctx.arc(sx, sy, sr + 2.5, 0, Math.PI * 2);
      ctx.lineWidth = 2; ctx.strokeStyle = text; ctx.stroke();
      ctx.font = "600 12px system-ui, sans-serif";
      ctx.textBaseline = "alphabetic";
      const label = d.full_name;
      const tw = ctx.measureText(label).width;
      const lx = Math.min(Math.max(sx - tw / 2, 4), w - tw - 8);
      const ly = sy - sr - 10;
      ctx.globalAlpha = 0.92; ctx.fillStyle = bg;
      ctx.fillRect(lx - 4, ly - 12, tw + 8, 18);
      ctx.globalAlpha = 1; ctx.strokeStyle = border; ctx.lineWidth = 1;
      ctx.strokeRect(lx - 4, ly - 12, tw + 8, 18);
      ctx.fillStyle = text; ctx.fillText(label, lx, ly + 1);
    }
    ctx.globalAlpha = 1;
  }

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

  function zoomAt(px: number, py: number, factor: number) {
    const v = viewRef.current;
    const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, v.scale * factor));
    const wx = (px - v.tx) / v.scale, wy = (py - v.ty) / v.scale;
    v.scale = next; v.tx = px - wx * next; v.ty = py - wy * next;
    draw();
  }

  function pulseTimer() {
    const t0 = Date.now();
    const tick = () => {
      draw();
      if (Date.now() - t0 < 1600) requestAnimationFrame(tick);
      else { pulseRef.current = -1; draw(); }
    };
    requestAnimationFrame(tick);
  }

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
      const e = 1 - (1 - k) ** 3;
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
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      canvas.style.width = w + "px"; canvas.style.height = h + "px";
    };
    resize();

    const data: SimNode[] = nodes.map((n) => {
      const grp = groupKeyOf(n, groupRef.current);
      const c = clusterCenter(grp);
      return {
        ...n, grp, r: radiusOf({ ...n, grp } as SimNode),
        x: c.cx + (Math.random() - 0.5) * 60, y: c.cy + (Math.random() - 0.5) * 60, vx: 0, vy: 0,
      };
    });
    dataRef.current = data;
    recomputeLabels();

    const sim = forceSimulation<SimNode>(data)
      .force("charge", forceManyBody<SimNode>().strength(-6))
      .force("collide", forceCollide<SimNode>().radius((d) => d.r + 1.5).strength(0.9))
      .force("x", forceX<SimNode>((d) => clusterCenter(d.grp).cx).strength(0.07))
      .force("y", forceY<SimNode>((d) => clusterCenter(d.grp).cy).strength(0.07))
      .alpha(1).alphaDecay(0.022);
    sim.on("tick", draw);
    simRef.current = sim;
    setReady(true);

    // 从 URL 恢复选中项的侧栏
    if (init.current.panel) {
      const pn = data.find((d) => d.full_name === init.current.panel);
      if (pn) setPanel(pn);
      init.current.panel = null;
    }

    const ro = new ResizeObserver(() => {
      resize();
      sim.force("x", forceX<SimNode>((d) => clusterCenter(d.grp).cx).strength(0.07));
      sim.force("y", forceY<SimNode>((d) => clusterCenter(d.grp).cy).strength(0.07));
      sim.alpha(0.4).restart();
    });
    ro.observe(wrap);
    const mo = new MutationObserver(() => { readTheme(); draw(); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      zoomAt(e.clientX - rect.left, e.clientY - rect.top, e.deltaY < 0 ? 1.12 : 1 / 1.12);
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });

    return () => { sim.stop(); ro.disconnect(); mo.disconnect(); canvas.removeEventListener("wheel", onWheel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes]);

  // 分组维度变化：重算 grp + 聚团力 + 重启
  useEffect(() => {
    groupRef.current = groupBy;
    const sim = simRef.current, data = dataRef.current;
    if (!sim || !data.length) return;
    for (const d of data) d.grp = groupKeyOf(d, groupBy);
    sim.force("x", forceX<SimNode>((d) => clusterCenter(d.grp).cx).strength(0.07));
    sim.force("y", forceY<SimNode>((d) => clusterCenter(d.grp).cy).strength(0.07));
    sim.alpha(0.6).restart();
  }, [groupBy, groupKeyOf, clusterCenter]);

  // 大小度量 / 时间帧变化：重算半径 + collide
  useEffect(() => {
    metricRef.current = metric;
    frameRef.current = frame;
    const sim = simRef.current, data = dataRef.current;
    if (!sim || !data.length) return;
    for (const d of data) d.r = radiusOf(d);
    recomputeLabels();
    sim.force("collide", forceCollide<SimNode>().radius((d) => d.r + 1.5).strength(0.9));
    sim.alpha(0.4).restart();
  }, [metric, frame, radiusOf]);

  // 播放时间轴
  useEffect(() => {
    if (!playing || !hasTimeline) return;
    const last = timeline!.dates.length - 1;
    const id = setInterval(() => {
      setFrame((f) => {
        const cur = f < 0 ? 0 : f;
        if (cur >= last) { setPlaying(false); return -1; } // 播完回到实时
        return cur + 1;
      });
    }, 650);
    return () => clearInterval(id);
  }, [playing, hasTimeline, timeline]);

  // 写 URL（防抖，replace 不污染历史）
  useEffect(() => {
    const id = setTimeout(() => {
      const sp = new URLSearchParams();
      if (groupBy === "language") sp.set("g", "language");
      if (metric !== "stars") sp.set("m", metric);
      if (sel) sp.set("f", sel);
      if (panel) sp.set("p", panel.full_name);
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 350);
    return () => clearTimeout(id);
  }, [groupBy, metric, sel, panel, pathname, router]);

  // 指针交互
  function onMove(e: React.PointerEvent) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    if (ptrsRef.current.has(e.pointerId)) ptrsRef.current.set(e.pointerId, { x: px, y: py });
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
      const v = viewRef.current, d = dataRef.current[drag.i];
      d.fx = (px - v.tx) / v.scale; d.fy = (py - v.ty) / v.scale;
      if (Math.abs(px - drag.x) > 4 || Math.abs(py - drag.y) > 4) drag.moved = true;
      simRef.current?.alphaTarget(0.15).restart();
      return;
    }
    const pan = panRef.current;
    if (pan) { const v = viewRef.current; v.tx += px - pan.x; v.ty += py - pan.y; panRef.current = { x: px, y: py }; draw(); return; }
    const i = pointAt(px, py);
    if (i !== hoverRef.current) {
      hoverRef.current = i;
      canvasRef.current!.style.cursor = i >= 0 ? "pointer" : "grab";
      setTip(i >= 0 ? { n: dataRef.current[i], x: px, y: py } : null);
      draw();
    } else if (i >= 0) setTip({ n: dataRef.current[i], x: px, y: py });
  }
  function onDown(e: React.PointerEvent) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    ptrsRef.current.set(e.pointerId, { x: px, y: py });
    canvasRef.current!.setPointerCapture(e.pointerId);
    if (ptrsRef.current.size === 2) { pinchRef.current = null; dragRef.current = null; panRef.current = null; return; }
    const i = pointAt(px, py);
    if (i >= 0) dragRef.current = { i, moved: false, x: px, y: py };
    else { panRef.current = { x: px, y: py }; canvasRef.current!.style.cursor = "grabbing"; }
  }
  function onUp(e: React.PointerEvent) {
    ptrsRef.current.delete(e.pointerId);
    if (ptrsRef.current.size < 2) pinchRef.current = null;
    const drag = dragRef.current;
    if (drag) {
      const d = dataRef.current[drag.i];
      d.fx = null; d.fy = null;
      simRef.current?.alphaTarget(0);
      if (!drag.moved) setPanel(d);   // 点击 → 出侧栏（不跳走）
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
  function resetView() { viewRef.current = { scale: 1, tx: 0, ty: 0 }; draw(); }

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out: { i: number; full: string }[] = [];
    for (let i = 0; i < nodes.length && out.length < 6; i++)
      if (nodes[i].full_name.toLowerCase().includes(q)) out.push({ i, full: nodes[i].full_name });
    return out;
  }, [query, nodes]);

  const dims = panel ? [
    { k: t.growth, v: panel.growth_score }, { k: t.activity, v: panel.activity_score },
    { k: t.health, v: panel.health_score }, { k: t.heat, v: panel.heat_score },
  ] : [];

  return (
    <div className="galaxy">
      {/* 控制条 */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 10 }}>
        <div style={{ position: "relative", flex: "1 1 200px", maxWidth: 300 }}>
          <input className="search-input" style={{ margin: 0, width: "100%" }} placeholder={t.map_search_ph}
            value={query} onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && matches[0]) { locate(matches[0].i); setQuery(""); } }} />
          {matches.length > 0 && (
            <ul style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 20, listStyle: "none", margin: 0, padding: 4, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,.25)" }}>
              {matches.map((m) => (
                <li key={m.full} onMouseDown={(e) => { e.preventDefault(); locate(m.i); setQuery(""); }}
                  style={{ padding: "7px 10px", borderRadius: 6, cursor: "pointer", fontSize: 13, color: "var(--text)" }}>{m.full}</li>
              ))}
            </ul>
          )}
        </div>
        <div style={{ display: "inline-flex", gap: 4, alignItems: "center", fontSize: 13, color: "var(--muted)" }}>
          {t.map_group_by}
          <button className={`galaxy-chip ${groupBy === "category" ? "on" : ""}`} onClick={() => setGroupBy("category")}>{t.map_group_cat}</button>
          <button className={`galaxy-chip ${groupBy === "language" ? "on" : ""}`} onClick={() => setGroupBy("language")}>{t.map_group_lang}</button>
        </div>
        <div style={{ display: "inline-flex", gap: 4, alignItems: "center", fontSize: 13, color: "var(--muted)" }}>
          {t.map_size_by}
          {(["stars", "score", "growth"] as SizeMetric[]).map((m) => (
            <button key={m} className={`galaxy-chip ${metric === m && frame < 0 ? "on" : ""}`}
              onClick={() => { setFrame(-1); setMetric(m); }}>
              {m === "stars" ? t.map_size_stars : m === "score" ? t.map_size_score : t.map_size_growth}
            </button>
          ))}
        </div>
        <button className="galaxy-chip" onClick={resetView}>⟲ {t.map_reset}</button>
      </div>

      {/* 时间轴 */}
      {hasTimeline && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <button className="galaxy-chip" onClick={() => { if (frame < 0) setFrame(0); setPlaying((p) => !p); }}>
            {playing ? "⏸" : "▶"} {t.map_time}
          </button>
          <input type="range" min={0} max={timeline!.dates.length - 1}
            value={frame < 0 ? timeline!.dates.length - 1 : frame}
            onChange={(e) => { setPlaying(false); setFrame(Number(e.target.value)); }}
            style={{ flex: 1, accentColor: "var(--accent)" }} />
          <span style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap", minWidth: 76, textAlign: "right" }}>
            {frame < 0 ? t.map_now : timeline!.dates[frame]}
          </span>
        </div>
      )}

      <div className="galaxy-canvas" ref={wrapRef} style={{ position: "relative" }}>
        <canvas ref={canvasRef} role="img" aria-label={t.map_h}
          style={{ touchAction: "none", cursor: "grab" }}
          onPointerMove={onMove} onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={onUp} onPointerLeave={onLeave} />
        {!ready && <div className="galaxy-loading">{t.map_loading}</div>}
        {tip && !panel && (
          <div className="galaxy-tip" style={{ left: Math.min(tip.x + 14, sizeRef.current.w - 220), top: tip.y + 14 }}>
            <strong>{tip.n.full_name}</strong>
            <span className="galaxy-tip-cat" style={{ color: catColor(tip.n.category) }}>● {catName(tip.n.category, locale, tip.n.category)}</span>
            <div className="galaxy-tip-meta">★ {tip.n.stars.toLocaleString()} · {t.score} {Math.round(tip.n.score)}</div>
          </div>
        )}

        {/* 侧栏 */}
        {panel && (
          <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "min(300px, 82%)", background: "var(--surface)", borderLeft: "1px solid var(--border)", boxShadow: "-8px 0 24px rgba(0,0,0,.2)", padding: 18, overflowY: "auto", zIndex: 30 }}>
            <button onClick={() => setPanel(null)} aria-label="close"
              style={{ position: "absolute", top: 10, right: 12, background: "none", border: "none", color: "var(--muted)", fontSize: 20, cursor: "pointer" }}>×</button>
            <a className="repo-name" href={localeHref(`/repo/${panel.full_name}`, locale)} style={{ display: "block", marginRight: 20, wordBreak: "break-all" }}>{panel.full_name}</a>
            <div className="meta" style={{ margin: "8px 0" }}>
              {panel.language && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><i style={{ width: 9, height: 9, borderRadius: "50%", background: langColor(panel.language), display: "inline-block" }} />{panel.language}</span>}
              {panel.category && <a className="chip" href={localeHref(`/category/${panel.category}`, locale)}>{catName(panel.category, locale, panel.category)}</a>}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "10px 0" }}>
              <span style={{ fontSize: 30, fontWeight: 800, color: "var(--green)" }}>{Math.round(panel.score)}</span>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>/ 100 · ⭐ {panel.stars.toLocaleString()}</span>
            </div>
            <div style={{ display: "grid", gap: 7, margin: "12px 0" }}>
              {dims.map((d) => (
                <div key={d.k}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)" }}><span>{d.k}</span><span>{Math.round(d.v)}</span></div>
                  <div style={{ height: 6, borderRadius: 3, background: "var(--surface-2)", overflow: "hidden" }}>
                    <span style={{ display: "block", height: "100%", width: `${Math.min(100, d.v)}%`, background: "var(--accent)" }} />
                  </div>
                </div>
              ))}
            </div>
            <a className="chip active" href={localeHref(`/repo/${panel.full_name}`, locale)} style={{ display: "inline-block", marginTop: 6 }}>{t.map_detail}</a>
          </div>
        )}
      </div>

      <p className="galaxy-hint">{t.map_hint}</p>
      <div className="galaxy-legend">
        {groups.map((c) => (
          <button key={c} className={`galaxy-chip ${sel && sel !== c ? "dim" : ""} ${sel === c ? "on" : ""}`} onClick={() => toggleCat(c)}>
            <i style={{ background: groupColor(c, groupBy) }} />
            {groupLabel(c, groupBy)} <b>{counts[c]}</b>
          </button>
        ))}
      </div>
    </div>
  );
}
