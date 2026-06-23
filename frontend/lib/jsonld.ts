// schema.org 结构化数据助手：让列表型页面对搜索引擎产出富结果（ItemList / CollectionPage）。
// 每个项目作为 ListItem（带 GitHub 仓库的 SoftwareSourceCode item），位置即榜单排名。

interface NamedProject {
  full_name: string;
  description?: string | null;
  language?: string | null;
}

function listItems(projects: NamedProject[], baseUrl: string, startRank = 0) {
  return projects.map((p, i) => ({
    "@type": "ListItem",
    position: startRank + i + 1,
    url: `${baseUrl}/repo/${p.full_name}`,
    item: {
      "@type": "SoftwareSourceCode",
      name: p.full_name,
      codeRepository: `https://github.com/${p.full_name}`,
      ...(p.description ? { description: p.description } : {}),
      ...(p.language ? { programmingLanguage: p.language } : {}),
    },
  }));
}

/** 榜单/分类/语言/Topic 页：ItemList 排名列表。 */
export function itemListLd(
  projects: NamedProject[],
  opts: { name: string; baseUrl: string; startRank?: number },
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: opts.name,
    numberOfItems: projects.length,
    itemListElement: listItems(projects, opts.baseUrl, opts.startRank),
  };
}

/** 公开收藏集页：CollectionPage 内嵌 ItemList。 */
export function collectionLd(
  title: string,
  projects: NamedProject[],
  opts: { name: string; baseUrl: string; url: string },
) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    url: opts.url,
    mainEntity: {
      "@type": "ItemList",
      name: opts.name,
      numberOfItems: projects.length,
      itemListElement: listItems(projects, opts.baseUrl),
    },
  };
}
