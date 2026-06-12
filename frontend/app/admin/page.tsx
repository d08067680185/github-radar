"use client";

/* 运维看板：输入 ADMIN_TOKEN 后查看采集日志 / 数据质量 / 健康状态，可手动触发流水线。
   token 存 localStorage，仅本机浏览器；请求经 /proxy-admin 同域代理。 */
import { useCallback, useEffect, useState } from "react";

interface LogRow {
  id: number; task: string; status: string;
  repos: number | null; detail: string | null; at: string | null;
}
interface Quality {
  total_projects: number;
  score_distribution: Record<string, number>;
  by_category: Record<string, number>;
  top_languages: Record<string, number>;
  stale_projects: number;
  archived: number;
  last_runs: Record<string, { at: string; status: string } | null>;
}
interface Status {
  ok: boolean; db: boolean; redis: boolean;
  last_score_at: string | null; data_stale: boolean;
}

const TOKEN_KEY = "ghradar_admin_token";

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [input, setInput] = useState("");
  const [logs, setLogs] = useState<LogRow[] | null>(null);
  const [quality, setQuality] = useState<Quality | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [err, setErr] = useState("");
  const [pipelineMsg, setPipelineMsg] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (saved) setToken(saved);
  }, []);

  const load = useCallback(async (tk: string) => {
    setErr("");
    const headers = { "X-Admin-Token": tk };
    try {
      const [lr, qr, sr] = await Promise.all([
        fetch("/proxy-admin/logs?limit=50", { headers }),
        fetch("/proxy-admin/quality", { headers }),
        fetch("/proxy-status"),
      ]);
      if (lr.status === 401 || lr.status === 403) {
        setErr("Token 无效");
        localStorage.removeItem(TOKEN_KEY);
        setToken("");
        return;
      }
      setLogs(await lr.json());
      setQuality(await qr.json());
      setStatus(await sr.json());
    } catch {
      setErr("加载失败，请重试");
    }
  }, []);

  useEffect(() => {
    if (token) load(token);
  }, [token, load]);

  const submitToken = (e: React.FormEvent) => {
    e.preventDefault();
    const tk = input.trim();
    if (!tk) return;
    localStorage.setItem(TOKEN_KEY, tk);
    setToken(tk);
  };

  const runPipeline = async () => {
    if (!confirm("确定手动触发采集流水线？（约几分钟，消耗 GitHub 配额）")) return;
    setPipelineMsg("触发中…");
    const res = await fetch("/proxy-admin/run-pipeline", {
      method: "POST",
      headers: { "X-Admin-Token": token },
    });
    setPipelineMsg(res.ok ? "✅ 已在后台运行，稍后刷新日志查看" : `❌ 失败 ${res.status}`);
  };

  if (!token) {
    return (
      <div style={{ maxWidth: 420, margin: "60px auto" }}>
        <h1 className="page-title">🔐 运维看板</h1>
        <form onSubmit={submitToken} style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入 ADMIN_TOKEN"
            style={{ flex: 1, padding: "10px 12px" }}
          />
          <button type="submit" className="btn">进入</button>
        </form>
        {err && <p style={{ color: "var(--danger, #ef4444)", marginTop: 8 }}>{err}</p>}
      </div>
    );
  }

  return (
    <>
      <h1 className="page-title">📊 运维看板</h1>
      <p className="page-sub">
        采集日志 · 数据质量 · 服务健康
        <button className="btn" style={{ marginLeft: 12 }} onClick={() => load(token)}>刷新</button>
        <button className="btn" style={{ marginLeft: 8 }} onClick={runPipeline}>手动跑流水线</button>
        <button
          className="btn" style={{ marginLeft: 8 }}
          onClick={() => { localStorage.removeItem(TOKEN_KEY); setToken(""); }}
        >退出</button>
        {pipelineMsg && <span style={{ marginLeft: 12 }}>{pipelineMsg}</span>}
      </p>
      {err && <p style={{ color: "var(--danger, #ef4444)" }}>{err}</p>}

      {status && (
        <section style={{ display: "flex", gap: 16, flexWrap: "wrap", margin: "16px 0" }}>
          <StatCard label="服务" value={status.ok ? "✅ 正常" : "❌ 异常"} />
          <StatCard label="数据库" value={status.db ? "✅" : "❌"} />
          <StatCard label="Redis" value={status.redis ? "✅" : "❌"} />
          <StatCard label="数据新鲜" value={status.data_stale ? "⚠️ 过期" : "✅"} />
          <StatCard label="最近评分" value={status.last_score_at?.slice(0, 16).replace("T", " ") || "—"} />
        </section>
      )}

      {quality && (
        <>
          <section style={{ display: "flex", gap: 16, flexWrap: "wrap", margin: "16px 0" }}>
            <StatCard label="收录项目" value={String(quality.total_projects)} />
            <StatCard label="僵尸(>30天)" value={String(quality.stale_projects)} />
            <StatCard label="已归档" value={String(quality.archived)} />
            {Object.entries(quality.score_distribution).map(([k, v]) => (
              <StatCard key={k} label={`评分 ${k}`} value={String(v)} />
            ))}
          </section>
          <section style={{ margin: "16px 0" }}>
            <h2 style={{ fontSize: 16, margin: "12px 0 6px" }}>各任务最近运行</h2>
            <table className="admin-table" style={{ width: "100%", fontSize: 13 }}>
              <tbody>
                {Object.entries(quality.last_runs).map(([task, run]) => (
                  <tr key={task}>
                    <td style={{ padding: 4 }}>{task}</td>
                    <td style={{ padding: 4 }}>{run ? run.status : "—"}</td>
                    <td style={{ padding: 4 }}>{run?.at?.slice(0, 19).replace("T", " ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}

      {logs && (
        <section style={{ margin: "16px 0" }}>
          <h2 style={{ fontSize: 16, margin: "12px 0 6px" }}>采集日志（最近 50 条）</h2>
          <div style={{ overflowX: "auto" }}>
            <table className="admin-table" style={{ width: "100%", fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: 4 }}>时间</th>
                  <th style={{ textAlign: "left", padding: 4 }}>任务</th>
                  <th style={{ textAlign: "left", padding: 4 }}>状态</th>
                  <th style={{ textAlign: "left", padding: 4 }}>数量</th>
                  <th style={{ textAlign: "left", padding: 4 }}>详情</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} style={{ borderTop: "1px solid var(--border, #333)" }}>
                    <td style={{ padding: 4, whiteSpace: "nowrap" }}>{l.at?.slice(0, 19).replace("T", " ")}</td>
                    <td style={{ padding: 4 }}>{l.task}</td>
                    <td style={{ padding: 4 }}>{l.status === "ok" ? "✅" : "❌"}</td>
                    <td style={{ padding: 4 }}>{l.repos ?? ""}</td>
                    <td style={{ padding: 4, maxWidth: 480, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={l.detail || ""}>{l.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      padding: "10px 16px", borderRadius: 8,
      background: "var(--card-bg, rgba(128,128,128,.08))",
      border: "1px solid var(--border, rgba(128,128,128,.2))",
      minWidth: 110,
    }}>
      <div style={{ fontSize: 12, opacity: .7 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600 }}>{value}</div>
    </div>
  );
}
