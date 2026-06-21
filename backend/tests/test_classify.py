"""领域分类器测试。"""
from app.scorer.classify import classify, all_categories, category_name


def test_topic_match_ai():
    assert classify(["llm", "inference"], "C++", "An LLM runtime") == "ai-ml"


def test_topic_priority_over_description():
    # topics 命中优先于描述
    assert classify(["react", "ui"], "JavaScript", "a backend api") == "web-frontend"


def test_description_fallback():
    # 无 topics 时用描述关键词
    assert classify([], "Go", "a kubernetes operator") == "devops"


def test_learning_category():
    # awesome 列表 / 教程 / 路线图 归「学习资源」
    assert classify(["awesome", "go"], "Markdown", "A curated list") == "learning"
    assert classify(["roadmap", "react"], "TypeScript", None) == "learning"
    assert classify([], None, "Master programming by recreating tutorials") == "learning"


def test_learning_priority_over_tech():
    # awesome-go 这类列表应归学习而非后端（learning 规则在前）
    assert classify(["awesome", "golang"], "Go", "Curated Go frameworks") == "learning"


def test_language_fallback():
    # topics/描述都没命中 → 语言强信号
    assert classify([], "Solidity", None) == "blockchain"


def test_summary_fallback():
    # 无 topics、描述含糊，但 AI 英文简介含领域关键词 → 据简介归类
    assert classify([], "Go", "a tool", summary="A self-hosted Kubernetes dashboard") == "devops"


def test_summary_lower_priority_than_description():
    # 描述已命中就不看简介（简介只是兜底）
    assert classify([], "Python", "a pytorch library",
                    summary="a web frontend toolkit") == "ai-ml"


def test_no_match_returns_none():
    assert classify([], "Brainfuck", "something totally unrelated zzz") is None


def test_all_categories_shape():
    cats = all_categories()
    assert len(cats) == 12
    assert all("slug" in c and "name" in c for c in cats)


def test_category_name_lookup():
    assert category_name("ai-ml") == "AI / 机器学习"
    assert category_name(None) is None
    assert category_name("nonexistent") is None
