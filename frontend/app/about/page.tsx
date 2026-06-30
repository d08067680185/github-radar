import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n-server";
import { localeHref } from "@/lib/locale-link";

export const metadata: Metadata = {
  title: "About · Scoring",
  description:
    "How GitHub Radar computes its composite score: growth trend, maintenance activity, project health, and popularity.",
};

const DIMS_ZH = [
  { name: "增长趋势", weight: "30%", color: "var(--accent)", desc: "近 7 日 star 增长率。比绝对 star 数更能反映“正在变优秀”的项目。冷启动期(快照不足)暂记 0，权重按比例分摊给其余维度。" },
  { name: "维护活跃度", weight: "25%", color: "var(--accent-2)", desc: "基于最近一次 commit / release 距今天数做指数衰减——越久没更新得分越低。废弃项目会显著沉底。" },
  { name: "项目健康度", weight: "25%", color: "var(--green)", desc: "工程规范度：是否有 LICENSE、描述、topics、主页，是否已归档。文档与规范齐全的项目更可信。" },
  { name: "热度", weight: "20%", color: "var(--bronze)", desc: "对 star 数取对数(log)再归一化——避免超级项目永远霸榜，让有潜力的新秀也能冒头。" },
];
const DIMS_EN = [
  { name: "Growth trend", weight: "30%", color: "var(--accent)", desc: "7-day star growth rate. A better signal of “becoming great” than absolute stars. During cold start (insufficient snapshots) it's 0 and its weight is redistributed to the other dimensions." },
  { name: "Maintenance activity", weight: "25%", color: "var(--accent-2)", desc: "Exponential decay on days since last commit / release — the staler, the lower. Abandoned projects sink noticeably." },
  { name: "Project health", weight: "25%", color: "var(--green)", desc: "Engineering hygiene: LICENSE, description, topics, homepage, and whether archived. Well-documented projects rank higher." },
  { name: "Popularity", weight: "20%", color: "var(--bronze)", desc: "log10 of stars, normalized — so mega-projects don't dominate forever and promising newcomers can surface." },
];

export default async function AboutPage() {
  const en = (await getLocale()) === "en";
  const DIMS = en ? DIMS_EN : DIMS_ZH;
  const c = en
    ? {
        h1: "About GitHub Radar",
        intro: "GitHub Radar helps you discover truly great open-source projects. Unlike star-only lists, we rank by a composite score across four dimensions and accumulate daily history to capture growth.",
        formulaH: "Composite Score Formula",
        d1: "Growth", d2: "Activity", d3: "Health", d4: "Heat",
        norm: "Each dimension is normalized to 0–100, then weighted into a 0–100 composite.",
        dimsH: "The Four Dimensions",
        boardsH: "Two Boards",
        boards: <>
          <a href={localeHref("/", "en")}>Top Projects</a> ranks by composite score — for <b>consistently solid</b> projects;{" "}
          <a href={localeHref("/trending", "en")}>Trending</a> ranks by growth — for <b>rising stars</b>.
        </>,
        dataH: "Data Source & Updates",
        data: "Data comes from GitHub's official GraphQL API via adaptive sharded collection across star ranges. A daily snapshot (star/fork/issue) powers the growth trend — the longer the history, the more accurate.",
      }
    : {
        h1: "关于 GitHub Radar",
        intro: "GitHub Radar 帮你发现真正优秀的开源项目。不同于只看 star 数的榜单，我们用四个维度的综合评分来排序，并积累每日历史数据来捕捉增长趋势。",
        formulaH: "综合评分公式",
        d1: "增长趋势", d2: "维护活跃", d3: "项目健康", d4: "热度",
        norm: "每个维度先归一化到 0–100，加权得到 0–100 的综合分。",
        dimsH: "四个维度",
        boardsH: "双榜设计",
        boards: <>
          <a href={localeHref("/", "zh")}>综合优质榜</a> 按综合分排序，适合找<b>长期靠谱</b>的项目；
          <a href={localeHref("/trending", "zh")}>Trending 榜</a> 按增长趋势排序，适合抓<b>正在崛起</b>的新星。
        </>,
        dataH: "数据来源与更新",
        data: "数据来自 GitHub 官方 GraphQL API，通过自适应分片采集覆盖各 star 区间。系统每日记录一次快照(star/fork/issue)，用于计算增长趋势——历史数据越久，趋势越准。",
      };

  return (
    <article style={{ maxWidth: 760, margin: "0 auto", paddingBottom: 40 }}>
      <h1 className="page-title">{c.h1}</h1>
      <p className="page-sub" style={{ fontSize: 15, lineHeight: 1.8 }}>{c.intro}</p>

      <h2 style={{ fontSize: 19, marginTop: 28 }}>{c.formulaH}</h2>
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: "var(--radius)", padding: "16px 18px", fontSize: 14.5,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", lineHeight: 1.9,
      }}>
        score = <b style={{ color: "var(--accent)" }}>0.30</b> × {c.d1}
        + <b style={{ color: "var(--accent-2)" }}>0.25</b> × {c.d2}
        + <b style={{ color: "var(--green)" }}>0.25</b> × {c.d3}
        + <b style={{ color: "var(--bronze)" }}>0.20</b> × {c.d4}
      </div>
      <p className="page-sub" style={{ marginTop: 10 }}>{c.norm}</p>

      <h2 style={{ fontSize: 19, marginTop: 28 }}>{c.dimsH}</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
        {DIMS.map((d) => (
          <div key={d.name} style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: "var(--radius)", padding: "16px 18px",
          }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ fontWeight: 750, fontSize: 16 }}>{d.name}</span>
              <span style={{ color: d.color, fontWeight: 800 }}>{d.weight}</span>
            </div>
            <p style={{ color: "var(--muted)", fontSize: 14, margin: "6px 0 0", lineHeight: 1.7 }}>{d.desc}</p>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 19, marginTop: 28 }}>{c.boardsH}</h2>
      <p className="page-sub" style={{ lineHeight: 1.8 }}>{c.boards}</p>

      <h2 style={{ fontSize: 19, marginTop: 28 }}>{c.dataH}</h2>
      <p className="page-sub" style={{ lineHeight: 1.8 }}>{c.data}</p>
    </article>
  );
}
