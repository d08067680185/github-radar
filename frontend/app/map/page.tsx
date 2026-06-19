import type { Metadata } from "next";
import { Suspense } from "react";
import { api } from "@/lib/api";
import { getDict } from "@/lib/i18n-server";
import BubbleGalaxy from "@/components/BubbleGalaxy";

// 动态渲染：避免构建期/部署时后端不可达把空数据烤进静态页（与分类/语言页一致）。
// 数据侧后端有 Redis 缓存撑性能。
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDict();
  return { title: `${t.map_h.replace(/^\S+\s/, "")} · GitHub Radar`, description: t.map_sub };
}

export default async function MapPage() {
  const t = await getDict();
  const [nodes, timeline] = await Promise.all([
    api.mapNodes(700).catch(() => []),
    api.mapTimeline(300, 30).catch(() => ({ dates: [], nodes: [] })),
  ]);
  return (
    <>
      <h1 className="page-title">{t.map_h}</h1>
      <p className="page-sub">{t.map_sub}</p>
      {nodes.length === 0 ? (
        <p className="page-sub" style={{ marginTop: 32 }}>{t.map_empty}</p>
      ) : (
        <Suspense>
          <BubbleGalaxy nodes={nodes} timeline={timeline} />
        </Suspense>
      )}
    </>
  );
}
