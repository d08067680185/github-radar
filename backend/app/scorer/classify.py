"""领域分类器：根据 topics / 语言 / 描述关键词把项目归类。

规则优先级：topics 命中 > 语言强信号 > 描述关键词。命中第一个即返回。
分类是开放集，后续可扩展 CATEGORY_RULES。
"""
import re

# (category, slug, 关键词集合)。关键词在 topics 或描述（小写）中命中即归类。
CATEGORY_RULES: list[tuple[str, str, set[str]]] = [
    ("AI / 机器学习", "ai-ml", {
        "ai", "machine-learning", "deep-learning", "llm", "gpt", "nlp",
        "neural-network", "transformer", "diffusion", "agent", "rag",
        "tensorflow", "pytorch", "inference", "embedding", "chatbot",
    }),
    ("Web 前端", "web-frontend", {
        "frontend", "react", "vue", "angular", "svelte", "css", "ui",
        "component", "tailwind", "nextjs", "web-components", "design-system",
    }),
    ("后端 / 框架", "backend", {
        "backend", "framework", "api", "rest", "graphql", "web-framework",
        "http", "server", "microservices", "grpc", "fastapi", "django",
    }),
    ("数据库 / 存储", "database", {
        "database", "sql", "nosql", "postgresql", "mysql", "redis", "mongodb",
        "orm", "storage", "vector-database", "key-value", "time-series",
    }),
    ("DevOps / 基础设施", "devops", {
        "devops", "kubernetes", "docker", "ci", "cd", "infrastructure",
        "terraform", "monitoring", "observability", "deployment", "cloud",
    }),
    ("数据 / 大数据", "data", {
        "data", "data-science", "data-engineering", "etl", "analytics",
        "spark", "kafka", "pandas", "data-pipeline", "bigdata",
    }),
    ("移动开发", "mobile", {
        "android", "ios", "flutter", "react-native", "mobile", "swift",
        "kotlin", "swiftui", "jetpack-compose",
    }),
    ("安全", "security", {
        "security", "cryptography", "pentesting", "vulnerability", "infosec",
        "encryption", "authentication", "oauth", "firewall",
    }),
    ("开发工具", "devtools", {
        "cli", "developer-tools", "editor", "ide", "terminal", "productivity",
        "vscode", "neovim", "git", "build-tool", "linter", "formatter",
    }),
    ("游戏 / 图形", "game-graphics", {
        "game", "gamedev", "game-engine", "graphics", "rendering", "opengl",
        "vulkan", "3d", "shader", "godot",
    }),
    ("区块链 / Web3", "blockchain", {
        "blockchain", "ethereum", "web3", "crypto", "smart-contracts",
        "solidity", "defi", "bitcoin",
    }),
]

# 语言强信号兜底（topics/描述都没命中时）
_LANG_FALLBACK = {
    "Solidity": "blockchain",
    "Cuda": "ai-ml",
    "GLSL": "game-graphics",
}

_SLUG_TO_NAME = {slug: name for name, slug, _ in CATEGORY_RULES}
_NORMALIZE = re.compile(r"[^a-z0-9]+")


def _tokenize(text: str) -> set[str]:
    return set(t for t in _NORMALIZE.split(text.lower()) if t)


def classify(topics: list[str], language: str | None, description: str | None) -> str | None:
    """返回 category slug，无法判定返回 None。"""
    topic_set = {t.lower() for t in (topics or [])}
    desc_tokens = _tokenize(description or "")

    for name, slug, keywords in CATEGORY_RULES:
        # topics 直接命中（权重最高）
        if topic_set & keywords:
            return slug
        # 描述关键词命中
        if desc_tokens & keywords:
            return slug

    if language and language in _LANG_FALLBACK:
        return _LANG_FALLBACK[language]
    return None


def category_name(slug: str | None) -> str | None:
    return _SLUG_TO_NAME.get(slug) if slug else None


def all_categories() -> list[dict]:
    return [{"slug": slug, "name": name} for name, slug, _ in CATEGORY_RULES]
