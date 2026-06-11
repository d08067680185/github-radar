"""GitHub GraphQL 客户端：token 轮换 + 限流处理 + 重试。

只用 GraphQL，一次请求拿全字段，比 REST 省额度。
"""
import itertools
import logging
import time

import httpx
from tenacity import (
    retry, stop_after_attempt, wait_exponential, retry_if_exception_type,
)

from app.config import settings

logger = logging.getLogger(__name__)

GRAPHQL_URL = "https://api.github.com/graphql"


class RateLimitError(Exception):
    pass


class QuotaExhaustedError(Exception):
    """主额度耗尽，不可重试，应立即停止本次采集。"""
    pass


class GitHubClient:
    def __init__(self, tokens: list[str] | None = None):
        self.tokens = tokens or settings.token_list
        if not self.tokens:
            raise RuntimeError(
                "未配置 GITHUB_TOKENS，GraphQL 必须认证。请在 .env 中设置。"
            )
        self._token_cycle = itertools.cycle(self.tokens)
        self._client = httpx.Client(timeout=30.0)
        self.quota_remaining: int | None = None
        self.quota_reset_at: str | None = None

    def _next_token(self) -> str:
        return next(self._token_cycle)

    @retry(
        retry=retry_if_exception_type((httpx.TransportError, RateLimitError)),
        stop=stop_after_attempt(4),
        wait=wait_exponential(multiplier=2, min=2, max=30),
        reraise=True,
    )
    def _post(self, query: str, variables: dict) -> dict:
        token = self._next_token()
        resp = self._client.post(
            GRAPHQL_URL,
            json={"query": query, "variables": variables},
            headers={"Authorization": f"Bearer {token}"},
        )
        # 主额度耗尽：remaining=0 且 403 → 快速失败，不空转重试一小时
        if resp.status_code == 403 and resp.headers.get("x-ratelimit-remaining") == "0":
            reset = resp.headers.get("x-ratelimit-reset")
            raise QuotaExhaustedError(f"GitHub 主额度耗尽，重置时间(epoch)={reset}")
        # 二级限流 → 等 retry-after 后由 tenacity 轮换重试
        if resp.status_code in (403, 429):
            reset = resp.headers.get("x-ratelimit-reset")
            logger.warning("命中限流(token=...%s)，重置时间=%s", token[-4:], reset)
            wait = int(resp.headers.get("retry-after", "5"))
            time.sleep(min(wait, 30))
            raise RateLimitError(f"rate limited: {resp.status_code}")
        # 5xx（如 502/503/504 网关超时）走重试，不直接崩
        if resp.status_code >= 500:
            logger.warning("GitHub 服务端错误 %s，重试中", resp.status_code)
            time.sleep(3)
            raise RateLimitError(f"server error: {resp.status_code}")
        resp.raise_for_status()
        data = resp.json()
        if "errors" in data:
            # RATE_LIMITED 错误也走重试
            for err in data["errors"]:
                if err.get("type") == "RATE_LIMITED":
                    time.sleep(5)
                    raise RateLimitError(str(data["errors"]))
            raise RuntimeError(f"GraphQL errors: {data['errors']}")
        return data["data"]

    # ---- 发现：搜索 star 数 >= min_stars 的仓库，按 star 降序 ----
    SEARCH_QUERY = """
    query($q: String!, $first: Int!, $after: String) {
      rateLimit { remaining resetAt }
      search(query: $q, type: REPOSITORY, first: $first, after: $after) {
        repositoryCount
        pageInfo { hasNextPage endCursor }
        nodes {
          ... on Repository {
            databaseId
            nameWithOwner
            owner { login }
            name
            description
            homepageUrl
            primaryLanguage { name }
            repositoryTopics(first: 15) { nodes { topic { name } } }
            licenseInfo { spdxId }
            stargazerCount
            forkCount
            watchers { totalCount }
            issues(states: OPEN) { totalCount }
            isArchived
            createdAt
            pushedAt
            releases(first: 1, orderBy: {field: CREATED_AT, direction: DESC}) {
              nodes { publishedAt }
            }
          }
        }
      }
    }
    """

    # 计数查询：拿某查询的命中总数 + 当前 star 最大值（轻量，first:1）
    COUNT_QUERY = """
    query($q: String!) {
      rateLimit { remaining resetAt }
      search(query: $q, type: REPOSITORY, first: 1) {
        repositoryCount
        nodes { ... on Repository { stargazerCount } }
      }
    }
    """

    # GitHub Search API 单查询硬上限
    SEARCH_HARD_CAP = 1000

    def _fetch_query(self, q: str, max_repos: int) -> list[dict]:
        """对单条查询翻页抓取，最多 max_repos（自动受 1000 硬上限约束）。"""
        results: list[dict] = []
        after = None
        cap = min(max_repos, self.SEARCH_HARD_CAP)
        while len(results) < cap:
            page_size = min(50, cap - len(results))
            data = self._post(self.SEARCH_QUERY, {"q": q, "first": page_size, "after": after})
            self._track_quota(data.get("rateLimit"))
            search = data["search"]
            for node in search["nodes"]:
                if node:
                    results.append(self._normalize(node))
            if not search["pageInfo"]["hasNextPage"]:
                break
            after = search["pageInfo"]["endCursor"]
        return results

    def _search_count(self, q: str) -> tuple[int, int]:
        """返回 (命中总数, 该查询内最大 star 数)。"""
        data = self._post(self.COUNT_QUERY, {"q": q})
        self._track_quota(data.get("rateLimit"))
        search = data["search"]
        nodes = search.get("nodes") or []
        max_star = nodes[0]["stargazerCount"] if nodes else 0
        return search["repositoryCount"], max_star

    def _track_quota(self, rate_limit: dict | None):
        if rate_limit:
            self.quota_remaining = rate_limit.get("remaining")
            self.quota_reset_at = rate_limit.get("resetAt")
            if self.quota_remaining is not None and self.quota_remaining < 50:
                logger.warning("GraphQL 配额偏低：剩余 %s，重置于 %s",
                               self.quota_remaining, self.quota_reset_at)

    def search_repos(self, min_stars: int, max_repos: int) -> list[dict]:
        """按 star 降序发现仓库（单查询，受 1000 上限约束）。保留给连通性测试用。"""
        return self._fetch_query(f"stars:>={min_stars} sort:stars-desc", max_repos)

    def search_repos_sharded(
        self, min_stars: int, max_total: int,
        extra_q: str = "", star_max: int | None = None,
    ) -> list[dict]:
        """自适应 star 区间二分分片抓取，绕过单查询 1000 上限。

        每个区间命中 > 1000 就从中间劈成两半递归，直到 ≤ 1000 再翻页抓取。
        按 github_id 去重。
        - extra_q: 额外查询条件（如 "created:>=2025-06-07" / "pushed:>=..."）
        - star_max: star 上界（如只要中小项目可设 15000）
        """
        clause = f" {extra_q}" if extra_q else ""

        # 1. 先拿整体区间的 star 上界
        base_q = f"stars:>={min_stars}{clause}"
        total, max_star = self._search_count(base_q)
        if total == 0:
            return []
        top = min(max_star, star_max) if star_max else max_star
        logger.info("分片发现：%s 命中约 %d 个，star 区间上界 %d", base_q, total, top)

        results: dict[int, dict] = {}
        # 用栈做区间二分：(lo, hi) 闭区间
        stack: list[tuple[int, int]] = [(min_stars, top)]
        while stack and len(results) < max_total:
            lo, hi = stack.pop()
            if lo > hi:
                continue
            q = f"stars:{lo}..{hi}{clause} sort:stars-desc"
            count, _ = self._search_count(q)
            if count == 0:
                continue
            if count <= self.SEARCH_HARD_CAP or lo == hi:
                # 可直接抓完（lo==hi 时即便 >1000 也只能抓前 1000）
                for repo in self._fetch_query(q, self.SEARCH_HARD_CAP):
                    results[repo["github_id"]] = repo
                if lo == hi and count > self.SEARCH_HARD_CAP:
                    logger.warning("star=%d 单值命中 %d > 1000，仅抓前 1000", lo, count)
            else:
                mid = (lo + hi) // 2
                stack.append((lo, mid))
                stack.append((mid + 1, hi))
        logger.info("分片发现完成：去重后 %d 个（剩余配额 %s）",
                    len(results), self.quota_remaining)
        return list(results.values())[:max_total]

    # 单仓库字段片段（与 SEARCH_QUERY nodes 保持一致）
    REPO_FIELDS = """
        databaseId
        nameWithOwner
        owner { login }
        name
        description
        homepageUrl
        primaryLanguage { name }
        repositoryTopics(first: 15) { nodes { topic { name } } }
        licenseInfo { spdxId }
        stargazerCount
        forkCount
        watchers { totalCount }
        issues(states: OPEN) { totalCount }
        isArchived
        createdAt
        pushedAt
        releases(first: 1, orderBy: {field: CREATED_AT, direction: DESC}) {
          nodes { publishedAt }
        }
    """

    def fetch_repos_by_names(self, full_names: list[str], batch: int = 25) -> list[dict]:
        """按 owner/name 批量取仓库详情（GraphQL 别名，每批一次请求）。

        Trending 抓取等场景用：已知名单 → 取全字段。不存在/无权限的仓库静默跳过。
        """
        results: list[dict] = []
        for i in range(0, len(full_names), batch):
            chunk = full_names[i:i + batch]
            parts = []
            for j, fn in enumerate(chunk):
                try:
                    owner, name = fn.split("/", 1)
                except ValueError:
                    continue
                # GraphQL 字符串转义（仓库名不会含引号，防御性处理）
                owner = owner.replace('"', '')
                name = name.replace('"', '')
                parts.append(
                    f'r{j}: repository(owner: "{owner}", name: "{name}") '
                    f'{{ {self.REPO_FIELDS} }}'
                )
            if not parts:
                continue
            query = "query { rateLimit { remaining resetAt } " + " ".join(parts) + " }"
            try:
                data = self._post(query, {})
            except RuntimeError as e:
                # 个别仓库 NOT_FOUND 时 GraphQL 报 errors 但 data 仍可用；
                # _post 已抛错则整批跳过（best-effort）
                logger.warning("批量取仓库失败（跳过本批）: %s", str(e)[:200])
                continue
            self._track_quota(data.get("rateLimit"))
            for key, node in data.items():
                if key == "rateLimit" or not node:
                    continue
                results.append(self._normalize(node))
        return results

    @staticmethod
    def _normalize(node: dict) -> dict:
        topics = [
            t["topic"]["name"]
            for t in node.get("repositoryTopics", {}).get("nodes", [])
        ]
        releases = node.get("releases", {}).get("nodes", [])
        last_release = releases[0]["publishedAt"] if releases else None
        return {
            "github_id": node["databaseId"],
            "full_name": node["nameWithOwner"],
            "owner": node["owner"]["login"],
            "name": node["name"],
            "description": node.get("description"),
            "homepage": node.get("homepageUrl") or None,
            "language": (node.get("primaryLanguage") or {}).get("name"),
            "topics": topics,
            "license": (node.get("licenseInfo") or {}).get("spdxId"),
            "stars": node["stargazerCount"],
            "forks": node["forkCount"],
            "watchers": node.get("watchers", {}).get("totalCount", 0),
            "open_issues": node.get("issues", {}).get("totalCount", 0),
            "is_archived": node.get("isArchived", False),
            "created_at": node.get("createdAt"),
            "pushed_at": node.get("pushedAt"),
            "last_release_at": last_release,
        }

    def close(self):
        self._client.close()
