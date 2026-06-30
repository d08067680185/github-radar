const SITE = "https://radar.mxzshs.com";

const queryEl = document.getElementById("query");
const btn = document.getElementById("searchBtn");
const resultsEl = document.getElementById("results");

function renderResults(items) {
  if (!items.length) {
    resultsEl.innerHTML = '<div class="empty">无结果</div>';
    return;
  }
  resultsEl.innerHTML = items.map((p) => `
    <div class="item">
      <div style="flex:1;min-width:0">
        <a href="${SITE}/repo/${p.full_name}" target="_blank">${p.full_name}</a>
        <div class="meta">
          ${p.language ? `<span>${p.language}</span> · ` : ""}
          ⭐ ${(p.stars || 0).toLocaleString()}
        </div>
      </div>
      <div class="score">${Math.round(p.score || 0)}</div>
    </div>
  `).join("");
}

async function search(q) {
  if (!q.trim()) return;
  resultsEl.innerHTML = '<div class="empty">搜索中…</div>';
  try {
    // Try suggest first for instant results, fall back to search
    const res = await fetch(
      `${SITE}/api/search/suggest?q=${encodeURIComponent(q.trim())}&limit=8`
    );
    if (!res.ok) throw new Error("API error");
    const items = await res.json();
    renderResults(items);
  } catch {
    resultsEl.innerHTML = '<div class="empty">加载失败，请检查网络</div>';
  }
}

btn.addEventListener("click", () => search(queryEl.value));
queryEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") search(queryEl.value);
});

// Auto-search if on a GitHub page: show the current repo's score
chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
  const url = tabs[0]?.url || "";
  const m = url.match(/github\.com\/([^/]+)\/([^/?#]+)/);
  if (!m) return;
  const [, owner, name] = m;
  try {
    const res = await fetch(`${SITE}/api/projects/${owner}/${name}`);
    if (!res.ok) return;
    const p = await res.json();
    renderResults([p]);
    queryEl.placeholder = `${owner}/${name}`;
  } catch { /* silent */ }
});
