"""GitHub GraphQL 节点标准化测试（纯函数）。"""
from app.collector.github_client import GitHubClient

_NODE = {
    "databaseId": 123,
    "nameWithOwner": "owner/repo",
    "owner": {"login": "owner"},
    "name": "repo",
    "description": "a test repo",
    "homepageUrl": "https://example.com",
    "primaryLanguage": {"name": "Python"},
    "repositoryTopics": {"nodes": [{"topic": {"name": "ai"}}, {"topic": {"name": "llm"}}]},
    "licenseInfo": {"spdxId": "MIT"},
    "stargazerCount": 5000,
    "forkCount": 300,
    "watchers": {"totalCount": 100},
    "issues": {"totalCount": 12},
    "isArchived": False,
    "createdAt": "2020-01-01T00:00:00Z",
    "pushedAt": "2024-06-01T00:00:00Z",
    "releases": {"nodes": [{"publishedAt": "2024-05-01T00:00:00Z"}]},
}


def test_normalize_maps_core_fields():
    r = GitHubClient._normalize(_NODE)
    assert r["github_id"] == 123
    assert r["full_name"] == "owner/repo"
    assert r["language"] == "Python"
    assert r["stars"] == 5000
    assert r["topics"] == ["ai", "llm"]
    assert r["license"] == "MIT"


def test_normalize_handles_nulls():
    node = dict(_NODE, primaryLanguage=None, licenseInfo=None, homepageUrl="",
                repositoryTopics={"nodes": []}, releases={"nodes": []})
    r = GitHubClient._normalize(node)
    assert r["language"] is None
    assert r["license"] is None
    assert r["homepage"] is None
    assert r["topics"] == []
    assert r["last_release_at"] is None
