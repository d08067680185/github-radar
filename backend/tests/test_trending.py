"""Trending 页 HTML 解析单测（纯函数，无网络）。"""
from app.collector.trending import parse_trending_html

SAMPLE = """
<article class="Box-row">
  <h2 class="h3 lh-condensed">
    <a href="/vercel/next.js" data-view-component="true">next.js</a>
  </h2>
</article>
<article class="Box-row">
  <h2 class="h3 lh-condensed">
    <a href="/anthropics/claude-code" data-view-component="true">claude-code</a>
  </h2>
</article>
<article class="Box-row">
  <h2 class="h3 lh-condensed">
    <a href="/vercel/next.js">dup</a>
  </h2>
</article>
"""


def test_parse_extracts_full_names_in_order():
    names = parse_trending_html(SAMPLE)
    assert names == ["vercel/next.js", "anthropics/claude-code"]


def test_parse_dedupes():
    names = parse_trending_html(SAMPLE + SAMPLE)
    assert len(names) == 2


def test_parse_empty_html():
    assert parse_trending_html("<html><body>nothing</body></html>") == []


def test_parse_ignores_non_h2_links():
    html = '<a href="/sponsors/foo">x</a><div href="/a/b"></div>'
    assert parse_trending_html(html) == []
