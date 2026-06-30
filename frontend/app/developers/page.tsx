import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const en = (await getLocale()) === "en";
  return en
    ? {
        title: "Developer API — GitHub Radar",
        description: "Integrate GitHub Radar scores and rankings into your tools via our REST API.",
      }
    : {
        title: "开发者 API — GitHub Radar",
        description: "通过 REST API 将 GitHub Radar 评分和榜单集成到你的工具中。",
      };
}

export default async function DevelopersPage() {
  const en = (await getLocale()) === "en";

  if (en) {
    return (
      <article style={{ maxWidth: 760, margin: "0 auto", paddingBottom: 40 }}>
        <h1 className="page-title">🔌 Developer API</h1>
        <p className="page-sub">Access GitHub Radar rankings, scores, and search programmatically. Create an API key in your <a href="/en/account" className="link">account</a>, then include it as a Bearer token.</p>

        <h2 style={{ fontSize: 18, marginTop: 28 }}>Authentication</h2>
        <CodeBlock>{`Authorization: Bearer ghradar_YOUR_KEY`}</CodeBlock>
        <p className="page-sub" style={{ fontSize: 14 }}>API keys can be generated and revoked in your account page. Keep them secret — they have the same access as your account.</p>

        <h2 style={{ fontSize: 18, marginTop: 28 }}>Base URL</h2>
        <CodeBlock>{`https://radar.mxzshs.com/api`}</CodeBlock>

        <h2 style={{ fontSize: 18, marginTop: 28 }}>Endpoints</h2>

        <EndpointDoc method="GET" path="/rankings/top" desc="Top projects by composite score">
          {`curl "https://radar.mxzshs.com/api/rankings/top?limit=10&language=Python" \\
  -H "Authorization: Bearer ghradar_YOUR_KEY"`}
        </EndpointDoc>

        <EndpointDoc method="GET" path="/rankings/trending" desc="Projects ranked by recent growth">
          {`curl "https://radar.mxzshs.com/api/rankings/trending?limit=10"`}
        </EndpointDoc>

        <EndpointDoc method="GET" path="/search" desc="Search with filters">
          {`curl "https://radar.mxzshs.com/api/search?q=vector+database&sort=score&limit=20"`}
        </EndpointDoc>

        <EndpointDoc method="GET" path="/projects/{owner}/{name}" desc="Full project detail with scores">
          {`curl "https://radar.mxzshs.com/api/projects/facebook/react"`}
        </EndpointDoc>

        <h2 style={{ fontSize: 18, marginTop: 28 }}>Python Example</h2>
        <CodeBlock>{`import requests

headers = {"Authorization": "Bearer ghradar_YOUR_KEY"}
resp = requests.get(
    "https://radar.mxzshs.com/api/rankings/top",
    params={"limit": 20, "language": "Python"},
    headers=headers,
)
for p in resp.json():
    print(p["full_name"], p["score"])
`}</CodeBlock>

        <h2 style={{ fontSize: 18, marginTop: 28 }}>Interactive Docs</h2>
        <p className="page-sub">Full OpenAPI spec available at <a href="/proxy-api/docs" target="_blank" className="link">/api/docs</a> (Swagger UI).</p>
      </article>
    );
  }

  return (
    <article style={{ maxWidth: 760, margin: "0 auto", paddingBottom: 40 }}>
      <h1 className="page-title">🔌 开发者 API</h1>
      <p className="page-sub">通过 REST API 获取 GitHub Radar 评分和榜单，集成到你的工具、脚本或应用中。在<a href="/account" className="link">账户页</a>生成 API Key，然后以 Bearer token 方式携带。</p>

      <h2 style={{ fontSize: 18, marginTop: 28 }}>鉴权</h2>
      <CodeBlock>{`Authorization: Bearer ghradar_YOUR_KEY`}</CodeBlock>
      <p className="page-sub" style={{ fontSize: 14 }}>API Key 在账户页生成和吊销，拥有与账号相同的只读权限，请妥善保管。</p>

      <h2 style={{ fontSize: 18, marginTop: 28 }}>Base URL</h2>
      <CodeBlock>{`https://radar.mxzshs.com/api`}</CodeBlock>

      <h2 style={{ fontSize: 18, marginTop: 28 }}>常用端点</h2>

      <EndpointDoc method="GET" path="/rankings/top" desc="综合评分榜单">
        {`curl "https://radar.mxzshs.com/api/rankings/top?limit=10&language=Python" \\
  -H "Authorization: Bearer ghradar_YOUR_KEY"`}
      </EndpointDoc>

      <EndpointDoc method="GET" path="/rankings/trending" desc="按近期增长排序">
        {`curl "https://radar.mxzshs.com/api/rankings/trending?limit=10"`}
      </EndpointDoc>

      <EndpointDoc method="GET" path="/search" desc="多条件搜索">
        {`curl "https://radar.mxzshs.com/api/search?q=向量数据库&sort=score&limit=20"`}
      </EndpointDoc>

      <EndpointDoc method="GET" path="/projects/{owner}/{name}" desc="项目详情（含四维评分）">
        {`curl "https://radar.mxzshs.com/api/projects/facebook/react"`}
      </EndpointDoc>

      <h2 style={{ fontSize: 18, marginTop: 28 }}>Python 示例</h2>
      <CodeBlock>{`import requests

headers = {"Authorization": "Bearer ghradar_YOUR_KEY"}
resp = requests.get(
    "https://radar.mxzshs.com/api/rankings/top",
    params={"limit": 20, "language": "Python"},
    headers=headers,
)
for p in resp.json():
    print(p["full_name"], p["score"])
`}</CodeBlock>

      <h2 style={{ fontSize: 18, marginTop: 28 }}>交互式文档</h2>
      <p className="page-sub">完整 OpenAPI 文档（Swagger UI）：<a href="/proxy-api/docs" target="_blank" className="link">/api/docs</a></p>
    </article>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: "var(--radius)", padding: "14px 16px",
      fontSize: 13, overflowX: "auto", lineHeight: 1.7,
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    }}><code>{children}</code></pre>
  );
}

function EndpointDoc({ method, path, desc, children }: {
  method: string; path: string; desc: string; children: string;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, margin: "14px 0 6px" }}>
        <span style={{ background: "var(--accent)", color: "#04121f", fontWeight: 700,
          fontSize: 11, padding: "2px 7px", borderRadius: 4 }}>{method}</span>
        <code style={{ fontSize: 14, fontWeight: 600 }}>{path}</code>
        <span style={{ fontSize: 13, color: "var(--muted)" }}>{desc}</span>
      </div>
      <CodeBlock>{children}</CodeBlock>
    </div>
  );
}
