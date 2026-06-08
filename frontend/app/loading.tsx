export default function Loading() {
  return (
    <div style={{ marginTop: 40 }}>
      <div className="skeleton sk-title" />
      <div className="skeleton sk-sub" />
      <div className="list" style={{ marginTop: 20 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div className="card" key={i} style={{ opacity: 1 - i * 0.09 }}>
            <div className="skeleton sk-rank" />
            <div style={{ flex: 1 }}>
              <div className="skeleton sk-line" style={{ width: "40%" }} />
              <div className="skeleton sk-line" style={{ width: "75%", marginTop: 8 }} />
            </div>
            <div className="skeleton sk-score" />
          </div>
        ))}
      </div>
    </div>
  );
}
