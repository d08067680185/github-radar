"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ textAlign: "center", padding: "80px 20px" }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🛰️</div>
      <h1 className="page-title">数据暂时加载不出来</h1>
      <p className="page-sub">
        可能是后端服务在重启或网络波动。稍等片刻再试。
      </p>
      <button className="search-filters" onClick={reset}
              style={{ display: "inline-block" }}>
        <span style={{
          padding: "10px 24px", background: "var(--accent-grad)", color: "#04121f",
          borderRadius: 10, fontWeight: 700, cursor: "pointer", display: "inline-block",
        }}>
          重新加载
        </span>
      </button>
    </div>
  );
}
