#!/usr/bin/env bash
# 部署后冒烟检查：打一遍关键接口/页面，校验「200 + 有数据 + 不空 + 不 500」。
# 任一关键项失败 → 非零退出。专治「线上挂了没人知道」的静默故障（如星图整页空白）。
#
# 用法:
#   ./scripts/smoke.sh                       # 默认查生产 https://radar.mxzshs.com
#   ./scripts/smoke.sh http://localhost:3000 # 查本地（需前端在跑）
#
# 依赖: curl, python3
set -uo pipefail

BASE="${1:-https://radar.mxzshs.com}"
BASE="${BASE%/}"
PROXY="$BASE/proxy-api"
TIMEOUT=20
PASS=0; FAIL=0
RED=$'\033[31m'; GREEN=$'\033[32m'; DIM=$'\033[2m'; RST=$'\033[0m'

ok()   { PASS=$((PASS+1)); printf "  ${GREEN}✓${RST} %s\n" "$1"; }
bad()  { FAIL=$((FAIL+1)); printf "  ${RED}✗ %s${RST}\n" "$1"; }

# http_code URL  ——  断言 HTTP 200
check_page() {
  local name="$1" url="$2"
  local code
  code=$(curl -s -m "$TIMEOUT" -o /dev/null -w "%{http_code}" "$url")
  if [ "$code" = "200" ]; then ok "$name (200)"; else bad "$name → HTTP $code  ${DIM}$url${RST}"; fi
}

# 断言 JSON 接口：200 且 python 表达式(对解析后的 d)为真
# check_json 名称 URL  python表达式(用变量 d)  说明
check_json() {
  local name="$1" url="$2" expr="$3" desc="${4:-}"
  local body code
  body=$(curl -s -m "$TIMEOUT" -w $'\n%{http_code}' "$url")
  code="${body##*$'\n'}"; body="${body%$'\n'*}"
  if [ "$code" != "200" ]; then bad "$name → HTTP $code  ${DIM}$url${RST}"; return; fi
  if printf '%s' "$body" | python3 -c "import sys,json
try:
    d=json.load(sys.stdin)
except Exception as e:
    print('JSON解析失败:',e); sys.exit(1)
sys.exit(0 if ($expr) else 2)" 2>/dev/null; then
    ok "$name ${DIM}$desc${RST}"
  else
    bad "$name 条件不满足: $desc  ${DIM}$url${RST}"
  fi
}

echo "🔍 冒烟检查: $BASE"
echo "— 数据接口 —"
check_json "rankings/top"   "$PROXY/rankings/top?limit=5"            "isinstance(d,list) and len(d)>=1" "≥1 项"
check_json "map 节点"       "$PROXY/map?limit=700"                   "isinstance(d,list) and len(d)>=100" "≥100 节点(防星图空白)"
check_json "map/timeline"   "$PROXY/map/timeline?limit=50&days=30"   "isinstance(d.get('nodes'),list) and len(d['nodes'])>=1" "有节点"
check_json "stats"          "$PROXY/stats"                           "d.get('projects',0)>0" "projects>0"
check_json "search/suggest" "$PROXY/search/suggest?q=react&limit=3"  "isinstance(d,list) and len(d)>=1" "react 有结果"
check_json "topics"         "$PROXY/topics?limit=5"                  "isinstance(d,list) and len(d)>=1" "≥1 topic"
check_json "categories"     "$PROXY/categories"                      "isinstance(d,list) and len(d)>=1" "≥1 领域"
check_json "languages"      "$PROXY/languages"                       "isinstance(d,list) and len(d)>=1" "≥1 语言"

echo "— 页面 —"
check_page "首页 /"          "$BASE/"
check_page "星图 /map"       "$BASE/map"
check_page "Trending"        "$BASE/trending"
check_page "搜索 /search"    "$BASE/search"
check_page "周报 /digest"    "$BASE/digest"
check_page "Topics /topics"  "$BASE/topics"
check_page "sitemap"         "$BASE/sitemap.xml"
check_page "RSS /feed/new"   "$BASE/feed/new.xml"

echo
if [ "$FAIL" -eq 0 ]; then
  printf "${GREEN}✅ 冒烟通过：%d 项全绿${RST}\n" "$PASS"
  exit 0
else
  printf "${RED}❌ 冒烟失败：%d 项挂了（%d 通过）${RST}\n" "$FAIL" "$PASS"
  exit 1
fi
