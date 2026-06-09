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

interface SimNode extends MapNode {
  x: number; y: number; vx: number; vy: number;
  fx?: number | null; fy?: number | null;
  r: number; cat: string;
}

const MIN_R = 3.5, MAX_R = 30;

export default function BubbleGalaxy({ nodes }: { nodes: MapNode[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<Simulation<SimNode, undefined> | null>(null);
  const dataRef = useRef<SimNode[]>([]);
  const hoverRef = useRef<number>(-1);
  const selRef = useRef<string | null>(null);
  const dragRef = useRef<{ i: number; moved: boolean; x: number; y: number } | null>(null);
  const sizeRef = useRef<{ w: number; h: number }>({ w: 800, h: 560 });
  const themeRef = useRef({ text: "#e7e9ee", border: "#2a2f3a", bg: "#0f1115" });
  const router = useRouter();
  const { t, locale } = useLocale();

  const [tip, setTip] = useState<{ n: SimNode; x: number; y: number } | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // 出现的领域（按固定顺序），用于聚团角度 + 图例
  const cats = useMemo(() => {
    const present = new Set(nodes.map((n) => n.category || "_"));
    return CAT_ORDER.filter((c) => present.has(c)).concat(present.has("_") ? ["_"] : []);
  }, [nodes]);

  const radiusOf = useMemo(() => {
    const max = Math.max(1, ...nodes.map((n) => n.stars));
    const sqMax = Math.sqrt(max);
    return (stars: number) =>
      Math.max(MIN_R, Math.min(MAX_R, (Math.sqrt(Math.max(0, stars)) / sqMax) * MAX_R));
  }, [nodes]);

  function readTheme() {
    const cs = getComputedStyle(document.documentElement);
    const get = (v: string, d: string) => cs.getPropertyValue(v).trim() || d;
    themeRef.current = {
      text: get("--text", "#e7e9ee"),
      border: get("--border", "#2a2f3a"),
      bg: get("--card", get("--bg", "#0f1115")),
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

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { w, h } = sizeRef.current;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const { text, border } = themeRef.current;
    const s = selRef.current;
    const hoverIdx = hoverRef.current;
    const data = dataRef.current;

    for (let k = 0; k < data.length; k++) {
      const d = data[k];
      const dim = s && d.cat !== s;
      ctx.globalAlpha = dim ? 0.12 : 0.85;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = catColor(d.category);
      ctx.fill();
    }
    // 悬停高亮：描边 + 标签
    if (hoverIdx >= 0 && hoverIdx < data.length) {
      const d = data[hoverIdx];
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r + 2.5, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = text;
      ctx.stroke();
      ctx.font = "600 12px system-ui, sans-serif";
      const label = d.full_name;
      const tw = ctx.measureText(label).width;
      const lx = Math.min(Math.max(d.x - tw / 2, 4), w - tw - 8);
      const ly = d.y - d.r - 10;
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = themeRef.current.bg;
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

  function pointAt(px: number, py: number): number {
    const data = dataRef.current;
    let best = -1, bestD = Infinity;
    for (let k = 0; k < data.length; k++) {
      const d = data[k];
      const dist = (d.x - px) ** 2 + (d.y - py) ** 2;
      if (dist < d.r * d.r && dist < bestD) { bestD = dist; best = k; }
    }
    return best;
  }

  // 初始化模拟 + 监听尺寸/主题
  useEffect(() => {
    const canvas = canvasRef.current, wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    readTheme();

    const resize = () => {
      const w = wrap.clientWidth || 800;
      const h = Math.max(420, Math.min(680, Math.round(w * 0.62)));
      sizeRef.current = { w, h };
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
    };
    resize();

    const data: SimNode[] = nodes.map((n) => {
      const c = clusterCenter(n.category || "_");
      return {
        ...n, cat: n.category || "_", r: radiusOf(n.stars),
        x: c.cx + (Math.random() - 0.5) * 60, y: c.cy + (Math.random() - 0.5) * 60,
        vx: 0, vy: 0,
      };
    });
    dataRef.current = data;

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
      sim.alpha(0.5).restart();
    });
    ro.observe(wrap);

    const mo = new MutationObserver(() => { readTheme(); draw(); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    return () => { sim.stop(); ro.disconnect(); mo.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes]);

  // 指针交互
  function onMove(e: React.PointerEvent) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    const drag = dragRef.current;
    if (drag) {
      const d = dataRef.current[drag.i];
      d.fx = px; d.fy = py;
      if (Math.abs(px - drag.x) > 4 || Math.abs(py - drag.y) > 4) drag.moved = true;
      simRef.current?.alphaTarget(0.15).restart();
      return;
    }
    const i = pointAt(px, py);
    if (i !== hoverRef.current) {
      hoverRef.current = i;
      canvasRef.current!.style.cursor = i >= 0 ? "pointer" : "default";
      setTip(i >= 0 ? { n: dataRef.current[i], x: px, y: py } : null);
      draw();
    } else if (i >= 0) {
      setTip({ n: dataRef.current[i], x: px, y: py });
    }
  }
  function onDown(e: React.PointerEvent) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    const i = pointAt(px, py);
    if (i >= 0) {
      dragRef.current = { i, moved: false, x: px, y: py };
      canvasRef.current!.setPointerCapture(e.pointerId);
    }
  }
  function onUp(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (drag) {
      const d = dataRef.current[drag.i];
      d.fx = null; d.fy = null;
      simRef.current?.alphaTarget(0);
      if (!drag.moved) router.push(`/repo/${d.full_name}`);
      dragRef.current = null;
      try { canvasRef.current!.releasePointerCapture(e.pointerId); } catch {}
    }
  }
  function onLeave() {
    if (dragRef.current) return;
    hoverRef.current = -1; setTip(null); draw();
  }

  function toggleCat(c: string) {
    const next = sel === c ? null : c;
    setSel(next); selRef.current = next; draw();
  }

  // 图例数量
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    nodes.forEach((n) => { const c = n.category || "_"; m[c] = (m[c] || 0) + 1; });
    return m;
  }, [nodes]);

  return (
    <div className="galaxy">
      <div className="galaxy-canvas" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={t.map_h}
          onPointerMove={onMove}
          onPointerDown={onDown}
          onPointerUp={onUp}
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
