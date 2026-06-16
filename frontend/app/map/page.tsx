import type { Metadata } from "next";
import { Suspense } from "react";
import { api } from "@/lib/api";
import { getDict } from "@/lib/i18n-server";
import BubbleGalaxy from "@/components/BubbleGalaxy";

export const revalidate = 3600;

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
      <Suspense>
        <BubbleGalaxy nodes={nodes} timeline={timeline} />
      </Suspense>
    </>
  );
}
