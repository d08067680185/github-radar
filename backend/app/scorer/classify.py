"""领域分类器：根据 topics / 语言 / 描述关键词把项目归类。

规则优先级：topics 命中 > 语言强信号 > 描述关键词。命中第一个即返回。
分类是开放集，后续可扩展 CATEGORY_RULES。
"""
import re

# (category, slug, 关键词集合)。关键词在 topics 或描述（小写）中命中即归类。
# 顺序即优先级，命中第一个即返回。「学习资源」放最前：awesome-go 这类列表应归学习而非语言对应技术类。
CATEGORY_RULES: list[tuple[str, str, set[str]]] = [
    ("学习资源 / Awesome", "learning", {
        "awesome", "awesome-list", "awesome-lists", "tutorial", "tutorials",
        "book", "books", "ebook", "roadmap", "interview", "interview-questions",
        "leetcode", "coding-interview", "computer-science", "curriculum",
        "study-plan", "cheatsheet", "cheatsheets", "education", "educational",
        "course", "courses", "self-taught", "learning-resources",
        "free-programming-books", "algorithm", "algorithms",
    }),
    ("AI / 机器学习", "ai-ml", {
        "ai", "machine-learning", "deep-learning", "llm", "llms", "gpt", "nlp",
        "neural-network", "transformer", "diffusion", "agent", "agents", "rag",
        "tensorflow", "pytorch", "inference", "embedding", "chatbot",
        "langchain", "openai", "chatgpt", "generative-ai", "genai",
        "stable-diffusion", "computer-vision", "mlops", "fine-tuning",
        "prompt-engineering", "llamaindex", "huggingface",
    }),
    ("Web 前端", "web-frontend", {
        "frontend", "react", "vue", "angular", "svelte", "css", "ui",
        "component", "tailwind", "nextjs", "web-components", "design-system",
        "vite", "webpack", "spa", "pwa", "frontend-framework", "ui-components",
        "solidjs", "astro", "remix",
    }),
    ("后端 / 框架", "backend", {
        "backend", "framework", "api", "rest", "graphql", "web-framework",
        "http", "server", "microservices", "grpc", "fastapi", "django",
        "golang", "go", "nodejs", "spring", "spring-boot", "laravel", "rails",
        "flask", "express", "gin", "nestjs", "fiber", "dotnet", "aspnet",
    }),
    ("数据库 / 存储", "database", {
        "database", "sql", "nosql", "postgresql", "mysql", "redis", "mongodb",
        "orm", "storage", "vector-database", "key-value", "time-series",
        "sqlite", "clickhouse", "elasticsearch", "duckdb", "vector-search",
    }),
    ("DevOps / 基础设施", "devops", {
        "devops", "kubernetes", "docker", "ci", "cd", "infrastructure",
        "terraform", "monitoring", "observability", "deployment", "cloud",
        "self-hosted", "selfhosted", "nginx", "reverse-proxy", "networking",
        "vpn", "homelab", "raspberry-pi", "ansible", "helm", "prometheus",
        "grafana",
    }),
    ("数据 / 大数据", "data", {
        "data", "data-science", "data-engineering", "etl", "analytics",
        "spark", "kafka", "pandas", "data-pipeline", "bigdata",
    }),
    ("移动开发", "mobile", {
        "android", "ios", "flutter", "react-native", "mobile", "swift",
        "kotlin", "swiftui", "jetpack-compose", "android-app", "ios-app",
        "harmony", "compose-multiplatform",
    }),
    ("安全", "security", {
        "security", "cryptography", "pentesting", "vulnerability", "infosec",
        "encryption", "authentication", "oauth", "firewall",
        "malware", "exploit", "ctf", "reverse-engineering", "privacy",
    }),
    ("开发工具", "devtools", {
        "cli", "developer-tools", "editor", "ide", "terminal", "productivity",
        "vscode", "neovim", "git", "build-tool", "linter", "formatter",
        "bash", "shell", "dotfiles", "vim", "emacs", "zsh", "tmux",
        "command-line", "cli-app", "tui",
    }),
    ("游戏 / 图形", "game-graphics", {
        "game", "gamedev", "game-engine", "graphics", "rendering", "opengl",
        "vulkan", "3d", "shader", "godot", "unity", "unreal",
        "game-development", "pixel-art", "raylib",
    }),
    ("区块链 / Web3", "blockchain", {
        "blockchain", "ethereum", "web3", "crypto", "smart-contracts",
        "solidity", "defi", "bitcoin", "nft", "dao", "zk", "zero-knowledge",
        "wallet",
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


def classify(
    topics: list[str],
    language: str | None,
    description: str | None,
    summary: str | None = None,
) -> str | None:
    """返回 category slug，无法判定返回 None。

    信号优先级：topics / 描述（最强）> AI 英文简介（次强，关键词精准）> 语言强信号（兜底）。
    `summary` 传 AI 生成的英文简介（readme_summary_en）—— 对没有 topics、描述也含糊的项目最有效。
    """
    topic_set = {t.lower() for t in (topics or [])}
    desc_tokens = _tokenize(description or "")

    for name, slug, keywords in CATEGORY_RULES:
        # topics 直接命中（权重最高）
        if topic_set & keywords:
            return slug
        # 描述关键词命中
        if desc_tokens & keywords:
            return slug

    # AI 英文简介兜底（比语言兜底精准）：很多无 topics 的项目靠简介关键词归类
    summary_tokens = _tokenize(summary or "")
    if summary_tokens:
        for name, slug, keywords in CATEGORY_RULES:
            if summary_tokens & keywords:
                return slug

    if language and language in _LANG_FALLBACK:
        return _LANG_FALLBACK[language]
    return None


def category_name(slug: str | None) -> str | None:
    return _SLUG_TO_NAME.get(slug) if slug else None


def all_categories() -> list[dict]:
    return [{"slug": slug, "name": name} for name, slug, _ in CATEGORY_RULES]
