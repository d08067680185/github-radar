#!/usr/bin/env bash
# GitHub Radar Postgres 每日备份（cron 包装器）
# 实际备份逻辑在仓库脚本 scripts/backup_db.sh；这里只固定生产容器名和备份目录。
# crontab: 0 4 * * * /bin/bash /Users/xiaofengdai/bin/radar-db-backup.sh
set -euo pipefail

REPO=/Users/xiaofengdai/Documents/claude/github-radar
export PG_CONTAINER=github-radar-postgres-1
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"   # cron 环境里找到 docker

mkdir -p "$REPO/backups"
exec /bin/bash "$REPO/scripts/backup_db.sh" "$REPO/backups" \
  >> "$REPO/backups/backup.log" 2>&1
