# ---- 依赖层 ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ---- 构建层 ----
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# 构建期需要后端可达以做 SSG 取数
ARG API_BASE=http://backend:8077
ARG SITE_URL=http://localhost
ENV API_BASE=$API_BASE SITE_URL=$SITE_URL NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- 运行层（standalone 精简产物）----
FROM node:22-alpine AS runner
WORKDIR /app
# HOSTNAME=0.0.0.0 是 Next standalone 在 Docker 里必须的，否则只监听 localhost 容器外访问不到
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
