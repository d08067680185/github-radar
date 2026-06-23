import { api } from "@/lib/api";
import { listOgImage, OG_SIZE, OG_ALT, OG_CONTENT_TYPE } from "@/lib/og";

export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Og({ params }: { params: Promise<{ language: string }> }) {
  const { language } = await params;
  const lang = decodeURIComponent(language);
  let items: { full_name: string }[] = [];
  try {
    items = await api.top({ language: lang, limit: 5 });
  } catch {
    /* fallback */
  }
  return listOgImage({
    label: "编程语言",
    title: lang,
    subtitle: `综合评分最高的 ${lang} 开源项目`,
    chips: items.map((p) => p.full_name),
  });
}
