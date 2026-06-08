#!/usr/bin/env bash
set -e

# 等待数据库就绪后跑迁移
echo "运行数据库迁移 (alembic upgrade head)..."
alembic upgrade head || echo "⚠️ 迁移失败（首次可忽略，将由 create_all 兜底）"

exec "$@"
