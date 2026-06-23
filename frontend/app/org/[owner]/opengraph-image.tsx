import { api } from "@/lib/api";
import { listOgImage, OG_SIZE, OG_ALT, OG_CONTENT_TYPE } from "@/lib/og";

export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Og({ params }: { params: Promise<{ owner: string }> }) {
  const { owner } = await params;
  let org = null;
  try {
    org = await api.org(owner);
  } catch {
    /* fallback */
  }
  if (!org) {
    return listOgImage({ label: "组织 / 作者", title: owner, subtitle: "GitHub Radar", chips: [] });
  }
  return listOgImage({
    label: "组织 / 作者",
    title: owner,
    subtitle: `${org.project_count} 个上榜项目 · ⭐ ${org.total_stars.toLocaleString()}`,
    chips: org.projects.map((p) => p.full_name),
  });
}
