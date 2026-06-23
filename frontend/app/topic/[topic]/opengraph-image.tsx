import { api } from "@/lib/api";
import { listOgImage, OG_SIZE, OG_ALT, OG_CONTENT_TYPE } from "@/lib/og";

export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Og({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params;
  const tp = decodeURIComponent(topic);
  let items: { full_name: string }[] = [];
  try {
    items = (await api.topicPaged(tp, { limit: 5 })).items;
  } catch {
    /* fallback */
  }
  return listOgImage({
    label: "Topic",
    title: `#${tp}`,
    subtitle: "该 topic 下的优秀开源项目",
    chips: items.map((p) => p.full_name),
  });
}
