"""抓取 GitHub Trending 官方页（无 API，解析 HTML）。

官方 Trending 的算法对"正在火"的捕捉比 Search API 更敏锐，
作为 discover 的第四路候选池（best-effort：页面结构变化/网络失败不崩流水线）。
"""
import logging
import re

import httpx

logger = logging.getLogger(__name__)

TRENDING_URL = "https://github.com/trending"

# 每个条目形如 <h2 class="h3 lh-condensed"> ... <a href="/owner/repo" ...
_REPO_RE = re.compile(
    r'<h2 class="h3 lh-condensed">.*?href="/([^/"]+/[^/"]+)"', re.S
)


def parse_trending_html(html: str) -> list[str]:
    """从 Trending 页 HTML 解析 full_name 列表（纯函数，便于测试）。"""
    names = _REPO_RE.findall(html)
    # 去重保序
    seen: set[str] = set()
    out: list[str] = []
    for n in names:
        if n not in seen:
            seen.add(n)
            out.append(n)
    return out


def fetch_trending_names(
    periods: tuple[str, ...] = ("daily", "weekly"),
    languages: tuple[str, ...] = ("",),  # "" = 全语言总榜
    timeout: float = 20.0,
) -> list[str]:
    """抓多个 Trending 页面，返回去重后的 full_name 列表。失败的页面跳过。"""
    seen: set[str] = set()
    out: list[str] = []
    with httpx.Client(
        timeout=timeout,
        headers={"User-Agent": "github-radar/1.0"},
        follow_redirects=True,
    ) as client:
        for lang in languages:
            for period in periods:
                url = f"{TRENDING_URL}/{lang}".rstrip("/") + f"?since={period}"
                try:
                    resp = client.get(url)
                    resp.raise_for_status()
                except Exception as e:
                    logger.warning("Trending 页抓取失败 %s: %s", url, e)
                    continue
                for name in parse_trending_html(resp.text):
                    if name not in seen:
                        seen.add(name)
                        out.append(name)
    logger.info("Trending 页解析出 %d 个仓库", len(out))
    return out
