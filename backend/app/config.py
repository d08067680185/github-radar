from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://radar:radar@localhost:5432/github_radar"
    redis_url: str = "redis://localhost:6379/0"

    # 逗号分隔的多 token，做轮换
    github_tokens: str = ""

    discover_min_stars: int = 500
    discover_max_repos: int = 300

    # 多维度发现：除头部按 star 外，再补两路候选池
    # 新秀：近 N 天创建、已有 star 的项目（成长快）。星数门槛独立于 head，
    # 比 discover_min_stars 低很多——刚起步的好项目不该被 500 星门槛挡在库外。
    discover_rising_max: int = 800
    discover_rising_days: int = 365
    discover_rising_min_stars: int = 200
    # 活跃中小：star 在 [min, active_star_max]、近 N 天有 push 的项目。同理独立降门槛。
    discover_active_max: int = 800
    discover_active_days: int = 30
    discover_active_star_max: int = 15000
    discover_active_min_stars: int = 150
    # 僵尸清理：超过 N 天未被任何发现命中则删除
    discover_stale_days: int = 30

    # 是否在服务启动时开启每日自动流水线（本地调试可关，生产开）
    enable_scheduler: bool = False

    # 站点对外地址（重置密码邮件里的链接等）
    site_url: str = "http://localhost:3000"

    # JWT 认证
    jwt_secret: str = "change-me-in-production"
    jwt_expire_days: int = 30

    # 管理端点令牌（/admin/*）。留空则管理端点被禁用（安全默认）
    admin_token: str = ""

    # CORS 允许来源（逗号分隔）。生产填正式域名
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    # 可选：Sentry 错误监控（留空则不启用）
    sentry_dsn: str = ""

    # AI 摘要 / 邮件
    anthropic_api_key: str = ""
    summarize_model: str = "claude-haiku-4-5"   # 最便宜，一句话摘要够用
    summarize_max_per_run: int = 2500           # 单次最多生成多少条
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""

    @property
    def token_list(self) -> list[str]:
        return [t.strip() for t in self.github_tokens.split(",") if t.strip()]


settings = Settings()
