import { api } from "@/lib/api";
import { listOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const alt = "GitHub Radar 收藏集";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Og({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let list = null;
  try {
    list = await api.publicList(slug);
  } catch {
    /* fallback */
  }
  if (!list) {
    return listOgImage({ label: "精选收藏集", title: "📚 GitHub Radar 收藏集", subtitle: "0 个精选开源项目", chips: [] });
  }
  return listOgImage({
    label: "精选收藏集",
    title: `📚 ${list.title}`,
    subtitle: `${list.count} 个精选开源项目`,
    chips: list.items.map((it) => it.project.full_name),
  });
}
