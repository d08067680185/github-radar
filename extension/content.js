/* GitHub Radar content script — injects score badge into GitHub project pages */

const SITE = "https://radar.mxzshs.com";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function getRepoInfo() {
  const m = location.pathname.match(/^\/([^/]+)\/([^/]+?)(\/|$)/);
  if (!m) return null;
  const skip = ["settings", "orgs", "marketplace", "explore", "features", "about", "pricing", "login", "signup", "notifications", "pulls", "issues"];
  if (skip.includes(m[1])) return null;
  return { owner: m[1], name: m[2] };
}

function isProjectRootPage() {
  const path = location.pathname;
  const parts = path.split("/").filter(Boolean);
  // Must be exactly /owner/repo or /owner/repo/ — not a subpage
  return parts.length === 2;
}

function createBadge(data) {
  const score = Math.round(data.score);
  const color = score >= 80 ? "#3fb950" : score >= 60 ? "#58a6ff" : "#8b949e";
  const badge = document.createElement("div");
  badge.id = "ghradar-badge";
  badge.style.cssText = `
    display:flex;align-items:center;gap:8px;padding:8px 12px;margin-top:8px;
    background:#161b22;border:1px solid #30363d;border-radius:6px;font-size:12px;
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#e6edf3;
  `;
  badge.innerHTML = `
    <span style="font-size:14px">🛰️</span>
    <span style="color:#8b949e">Radar Score</span>
    <span style="font-size:18px;font-weight:700;color:${color}">${score}</span>
    <span style="color:#8b949e;font-size:11px">/ 100</span>
    <a href="${SITE}/repo/${data.full_name}"
       target="_blank"
       style="margin-left:auto;color:#58a6ff;font-size:11px;text-decoration:none;"
       title="View on GitHub Radar">详情 →</a>
  `;
  return badge;
}

async function fetchScore(owner, name) {
  const cacheKey = `ghradar:${owner}/${name}`;
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    const { data, ts } = JSON.parse(cached);
    if (Date.now() - ts < CACHE_TTL) return data;
  }
  try {
    const res = await fetch(`${SITE}/api/projects/${owner}/${name}`);
    if (!res.ok) return null;
    const data = await res.json();
    sessionStorage.setItem(cacheKey, JSON.stringify({ data, ts: Date.now() }));
    return data;
  } catch {
    return null;
  }
}

function inject(data) {
  if (document.getElementById("ghradar-badge")) return;
  // GitHub About box: try .BorderGrid-cell or the sidebar about section
  const about = document.querySelector(".BorderGrid-cell .f4.my-3")
    || document.querySelector('[data-target="repository-details-container"]')
    || document.querySelector(".repository-content .Layout-sidebar");
  if (!about) return;
  const badge = createBadge(data);
  about.insertAdjacentElement("afterbegin", badge);
}

async function run() {
  if (!isProjectRootPage()) return;
  const repo = getRepoInfo();
  if (!repo) return;
  const data = await fetchScore(repo.owner, repo.name);
  if (data) inject(data);
}

// Run on load and on navigation (GitHub uses Turbo navigation)
run();
document.addEventListener("turbo:load", run);
document.addEventListener("pjax:end", run);
