import { api } from "@/lib/api";
import { catName } from "@/lib/i18n";
import { listOgImage, OG_SIZE, OG_ALT, OG_CONTENT_TYPE } from "@/lib/og";

export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Og({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let items: { full_name: string }[] = [];
  try {
    items = await api.top({ category: slug, limit: 5 });
  } catch {
    /* fallback */
  }
  return listOgImage({
    label: "技术领域",
    title: catName(slug, "zh", slug),
    subtitle: "该领域综合评分最高的开源项目",
    chips: items.map((p) => p.full_name),
  });
}
