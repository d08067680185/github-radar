# 部署指南（与 kids.mxzshs.com 同机共存）

服务器已有 nginx + Docker（跑着 kids.mxzshs.com）。本项目**不抢 80/443、不映射 5432/6379**，
只把前端暴露到 `127.0.0.1:8090`，由宿主机已有的 nginx 反代 + TLS。

## 1. 拉代码
```bash
cd ~/apps   # 或任意目录
git clone https://github.com/d08067680185/github-radar.git
cd github-radar
```

## 2. 配置密钥
```bash
cp .env.prod.example .env.prod
nano .env.prod
```
必填：
- `POSTGRES_PASSWORD`（强密码）
- `SITE_URL`（如 `https://radar.mxzshs.com`）
- `GITHUB_TOKENS`（采集用，逗号分隔可多个）
- `JWT_SECRET` / `ADMIN_TOKEN`：各跑一次 `openssl rand -hex 32` 填进去
- `WEB_PORT=8090`（如与现有服务冲突可改）
- 可选：`ANTHROPIC_API_KEY`（AI 中文简介）、`SMTP_*`（邮件）

## 3. 起服务
```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```
- backend 容器启动时自动跑 `alembic upgrade head` 建表
- backend 已设 `ENABLE_SCHEDULER=true` → 每天 UTC 02:00 自动采集+评分+快照
- 验证：`curl http://127.0.0.1:8090` 应返回 HTML；`docker compose -f docker-compose.prod.yml ps` 全 healthy

## 4. 首次灌数据（不等明天的定时任务）
```bash
docker compose -f docker-compose.prod.yml exec backend python cli.py pipeline
```
（约几分钟，需 GITHUB_TOKENS 有效）

## 5. 宿主机 nginx 反代 + TLS
```bash
# 把 deploy/radar.nginx.conf 里的 <RADAR_DOMAIN> 改成你的子域名，放进 nginx
sudo cp deploy/radar.nginx.conf /etc/nginx/conf.d/radar.conf
sudo sed -i 's/<RADAR_DOMAIN>/radar.mxzshs.com/g' /etc/nginx/conf.d/radar.conf
sudo nginx -t && sudo systemctl reload nginx
# 签发证书（需先把子域名 DNS A 记录指到本机）
sudo certbot --nginx -d radar.mxzshs.com
```

## 日常运维
```bash
# 看日志
docker compose -f docker-compose.prod.yml logs -f backend
# 手动跑流水线 / 单步
docker compose -f docker-compose.prod.yml exec backend python cli.py pipeline
docker compose -f docker-compose.prod.yml exec backend python cli.py summarize   # AI 简介（需 key 有余额）
# 数据库备份（建议加 cron）
PG_CONTAINER=$(docker compose -f docker-compose.prod.yml ps -q postgres) ./scripts/backup_db.sh ~/backups/ghradar
# 探活 / 数据新鲜度（uptime 监控可轮询）
curl http://127.0.0.1:8090/   # 前端
docker compose -f docker-compose.prod.yml exec backend curl -s localhost:8077/status
# 更新部署
git pull && docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

## 端口一览（均不与 kids 冲突）
| 服务 | 端口 | 暴露 |
|------|------|------|
| frontend | 8090（可配 WEB_PORT） | 仅 127.0.0.1，由宿主 nginx 反代 |
| backend | 8077 | 仅 compose 内网 |
| postgres / redis | 5432 / 6379 | 仅 compose 内网，不映射宿主 |
