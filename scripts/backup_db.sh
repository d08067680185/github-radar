#!/usr/bin/env bash
# GitHub Radar 数据库备份
# 备份 PostgreSQL（含不可再生的 project_snapshots 历史），压缩 + 时间戳 + 保留策略。
#
# 用法:  ./scripts/backup_db.sh [备份目录]
# 定时:  crontab 加 -> 0 4 * * * /path/to/scripts/backup_db.sh /path/to/backups >> /var/log/ghradar-backup.log 2>&1
set -euo pipefail

# ---- 配置（可用环境变量覆盖）----
CONTAINER="${PG_CONTAINER:-gh-radar-postgres}"
DB_NAME="${POSTGRES_DB:-github_radar}"
DB_USER="${POSTGRES_USER:-radar}"
BACKUP_DIR="${1:-${BACKUP_DIR:-./backups}}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"   # 保留最近 N 天

mkdir -p "$BACKUP_DIR"
TS="$(date +%Y%m%d_%H%M%S)"
OUT="$BACKUP_DIR/ghradar_${DB_NAME}_${TS}.sql.gz"

echo "[$(date)] 开始备份 $DB_NAME ..."

# 优先用容器内 pg_dump；若无 docker 则尝试本机 pg_dump
if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  docker exec "$CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --clean --if-exists \
    | gzip > "$OUT"
else
  pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --clean --if-exists | gzip > "$OUT"
fi

SIZE="$(du -h "$OUT" | cut -f1)"
echo "[$(date)] 备份完成: $OUT ($SIZE)"

# ---- 校验：备份文件非空 ----
if [ ! -s "$OUT" ]; then
  echo "[$(date)] ❌ 备份文件为空，删除并退出" >&2
  rm -f "$OUT"
  exit 1
fi

# ---- 保留策略：删除超过 N 天的旧备份 ----
find "$BACKUP_DIR" -name "ghradar_*.sql.gz" -type f -mtime +"$RETENTION_DAYS" -delete
echo "[$(date)] 已清理 ${RETENTION_DAYS} 天前的旧备份。当前备份数: $(ls -1 "$BACKUP_DIR"/ghradar_*.sql.gz 2>/dev/null | wc -l | tr -d ' ')"

# 恢复示例（注释）:
#   gunzip -c backup.sql.gz | docker exec -i gh-radar-postgres psql -U radar -d github_radar
