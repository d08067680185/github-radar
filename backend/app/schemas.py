from datetime import datetime, date
from pydantic import BaseModel, ConfigDict


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    full_name: str
    owner: str
    name: str
    description: str | None
    homepage: str | None
    language: str | None
    topics: list[str]
    license: str | None
    stars: int
    forks: int
    open_issues: int
    score: float
    growth_score: float
    activity_score: float
    health_score: float
    heat_score: float
    category: str | None
    readme_summary: str | None = None
    readme_summary_en: str | None = None
    pushed_at: datetime | None


class ProjectDetailOut(ProjectOut):
    contributors: int
    watchers: int
    created_at: datetime | None
    last_release_at: datetime | None
    category_name: str | None = None


class TopSearchOut(BaseModel):
    """热门搜索词聚合项。"""
    query: str
    count: int


class StandingOut(BaseModel):
    """项目在其所属领域内的相对定位（排名/百分位 + 领域 Top）。"""
    category: str | None = None
    category_name: str | None = None
    rank: int = 0
    total: int = 0
    percentile: float = 0  # 超过该领域百分之多少的项目
    top: list[ProjectOut] = []


class SnapshotPoint(BaseModel):
    date: date
    stars: int
    forks: int


class CategoryOut(BaseModel):
    slug: str
    name: str
    count: int = 0


class SuggestOut(BaseModel):
    """搜索自动补全的精简条目（payload 极小）。"""
    model_config = ConfigDict(from_attributes=True)

    full_name: str
    stars: int
    language: str | None
    category: str | None


class MoverOut(ProjectOut):
    """近期 star 涨得最快的项目（首页「上升最快」用）= 项目 + star 增量。"""
    star_gain: int
    gain_pct: float
    window_days: int


class OrgOut(BaseModel):
    """组织/作者维度聚合（/org/{owner} 页用）。"""
    owner: str
    project_count: int
    total_stars: int
    avg_score: float
    top_category: str | None = None          # 出现最多的领域 slug
    top_category_name: str | None = None
    categories: list[CategoryOut] = []        # 领域分布（slug=name 形式，count=项目数）
    languages: list[CategoryOut] = []         # 语言分布
    projects: list[ProjectOut] = []           # 该 owner 的项目，按 score 降序


class MapNodeOut(BaseModel):
    """气泡星系地图的精简节点（payload 比 ProjectOut 小很多）。"""
    model_config = ConfigDict(from_attributes=True)

    full_name: str
    stars: int
    score: float
    growth_score: float
    activity_score: float
    health_score: float
    heat_score: float
    category: str | None
    language: str | None


class MapTimelineOut(BaseModel):
    """星图时间轴：每节点近 N 天每日 star 序列（对齐 dates）。"""
    dates: list[str]
    nodes: list[dict]


# ---- 认证 / 用户 ----
from pydantic import EmailStr


class RegisterIn(BaseModel):
    email: EmailStr
    password: str  # 明文，服务端哈希


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    email: str


class DigestArchiveListOut(BaseModel):
    """周报存档列表项（不含 items，列表页用）。"""
    model_config = ConfigDict(from_attributes=True)

    week_date: date
    title: str
    item_count: int


class DigestArchiveDetailOut(DigestArchiveListOut):
    """周报存档详情（含结构化条目）。"""
    items: list[dict] = []


class SubscribeIn(BaseModel):
    email: EmailStr
    locale: str = "zh"


class UnsubscribeIn(BaseModel):
    token: str


class FavoriteIn(BaseModel):
    full_name: str  # owner/repo
    tags: list[str] = []
    note: str | None = None


class FavoritePatch(BaseModel):
    """更新收藏的标签/备注（任一为 None 表示不改）。"""
    tags: list[str] | None = None
    note: str | None = None


class FavoriteOut(BaseModel):
    """收藏项 = 项目快照 + 用户私有的标签/备注/收藏时间。"""
    model_config = ConfigDict(from_attributes=True)

    project: ProjectOut
    tags: list[str] = []
    note: str | None = None
    created_at: datetime


class ShareSettingsIn(BaseModel):
    """更新公开分享设置：listed 控制是否对外可见，title 可选。"""
    listed: bool
    title: str | None = None


class ShareSettingsOut(BaseModel):
    """当前用户的公开分享设置（slug 一经生成即稳定）。"""
    listed: bool = False
    slug: str | None = None
    title: str | None = None
    count: int = 0  # 收藏数，提示用户列表非空


class PublicListItem(BaseModel):
    """公开列表条目（只读，含点评，不含收藏时间等私有元信息）。"""
    project: ProjectOut
    tags: list[str] = []
    note: str | None = None


class PublicListOut(BaseModel):
    """公开收藏集页：标题 + 分组前的条目（前端按 tags 分区渲染）。"""
    title: str
    count: int
    items: list[PublicListItem] = []
