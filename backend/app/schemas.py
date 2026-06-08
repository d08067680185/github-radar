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
    pushed_at: datetime | None


class ProjectDetailOut(ProjectOut):
    contributors: int
    watchers: int
    created_at: datetime | None
    last_release_at: datetime | None
    category_name: str | None = None


class SnapshotPoint(BaseModel):
    date: date
    stars: int
    forks: int


class CategoryOut(BaseModel):
    slug: str
    name: str
    count: int = 0


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


class FavoriteIn(BaseModel):
    full_name: str  # owner/repo
