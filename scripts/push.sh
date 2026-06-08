#!/usr/bin/env bash
# 一键提交并推送到 GitHub。
# 用法:  ./scripts/push.sh ["提交说明"]
#   不填说明则用时间戳。带「密钥安全闸」：检测到真实 token/key 会中止。
set -euo pipefail
cd "$(dirname "$0")/.."

git add -A

# 安全闸：扫描暂存内容里是否混入真实密钥（占位符 ghp_xxx 不会误判）
if git diff --cached | grep -qiE 'ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{30,}|sk-ant-[A-Za-z0-9_-]{30,}'; then
  echo "⛔ 暂存内容里疑似含真实密钥，已中止推送。"
  echo "   请确认没有把 .env / .env.prod 等加进来（它们应被 .gitignore 忽略）。"
  git reset -q
  exit 1
fi

if git diff --cached --quiet; then
  echo "（没有改动可提交）"
  exit 0
fi

MSG="${1:-update $(date '+%Y-%m-%d %H:%M')}"
git commit -q -m "$MSG

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
git push
echo "✅ 已推送到 GitHub：$MSG"
