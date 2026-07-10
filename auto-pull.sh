#!/bin/bash
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

REPO_DIR="/Users/xiaofengdai/Documents/claude/github-radar"
LOG_FILE="$REPO_DIR/auto-pull.log"

cd "$REPO_DIR"

if ! git fetch origin main >> "$LOG_FILE" 2>&1; then
    "$HOME/bin/kids-alert.sh" radar-fetch "radar git fetch 失败（认证或网络断链）" "$(tail -3 \"$LOG_FILE\")"
    exit 1
fi

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
    exit 0
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 检测到新提交，开始更新..." >> "$LOG_FILE"

if ! git pull --ff-only origin main >> "$LOG_FILE" 2>&1; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️ git pull 失败（可能有未提交改动或分叉），跳过本次同步" >> "$LOG_FILE"
    osascript -e 'display notification "radar git pull 失败，请检查工作树" with title "自动同步告警" sound name "Basso"' 2>/dev/null || true
    "$HOME/bin/kids-alert.sh" radar-pull "radar git pull 失败（工作树脏或分叉）" "$(tail -3 \"$LOG_FILE\")"
    exit 1
fi

CHANGED=$(git diff --name-only "$LOCAL" "$REMOTE" 2>/dev/null || git diff --name-only HEAD~1 HEAD)

if echo "$CHANGED" | grep -q "^backend/"; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 重建 backend..." >> "$LOG_FILE"
    docker compose -f docker-compose.prod.yml --env-file .env.prod build backend >> "$LOG_FILE" 2>&1
    docker compose -f docker-compose.prod.yml --env-file .env.prod up -d backend >> "$LOG_FILE" 2>&1
fi

if echo "$CHANGED" | grep -q "^frontend/"; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 重建 frontend..." >> "$LOG_FILE"
    docker compose -f docker-compose.prod.yml --env-file .env.prod build frontend >> "$LOG_FILE" 2>&1
    docker compose -f docker-compose.prod.yml --env-file .env.prod up -d frontend >> "$LOG_FILE" 2>&1
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 更新完成 ($LOCAL -> $REMOTE)" >> "$LOG_FILE"
