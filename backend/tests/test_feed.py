"""RSS 源测试：中英双语频道与条目。"""


def test_feed_new_default_chinese(client, make_project):
    make_project(full_name="acme/tool", readme_summary="中文简介",
                 readme_summary_en="English summary")
    body = client.get("/feed/new.xml").text
    assert "新发现的优质开源项目" in body
    assert "<language>zh-cn</language>" in body
    assert "中文简介" in body


def test_feed_new_english(client, make_project):
    make_project(full_name="acme/tool", readme_summary="中文简介",
                 readme_summary_en="English summary")
    body = client.get("/feed/new.xml?lang=en").text
    assert "Newly discovered great open-source projects" in body
    assert "<language>en</language>" in body
    assert "English summary" in body
    assert "score" in body  # 条目标题用英文 "score" 而非 "评分"


def test_feed_digest_english_channel(client, make_project):
    # 无存档时也应返回合法英文频道（条目可为空）
    body = client.get("/feed/digest.xml?lang=en").text
    assert "GitHub Radar — Weekly Picks" in body
    assert "<language>en</language>" in body
