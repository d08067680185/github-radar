import { api } from "@/lib/api";
import { listOgImage, OG_SIZE, OG_ALT, OG_CONTENT_TYPE } from "@/lib/og";

export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Og({ params }: { params: Promise<{ week: string }> }) {
  const { week } = await params;
  let d = null;
  try {
    d = await api.digestArchiveDetail(week);
  } catch {
    /* fallback */
  }
  if (!d) {
    return listOgImage({ label: "每周精选", title: "GitHub Radar 周报", subtitle: "", chips: [] });
  }
  return listOgImage({
    label: "每周精选",
    title: `📅 ${week}`,
    subtitle: `${d.item_count} 个本周上升最快的项目`,
    chips: d.items.map((it) => it.full_name),
  });
}
