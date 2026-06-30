"""开发者 API Key 管理：生成 / 列表 / 吊销（均需登录）。"""
import hashlib
import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import APIKey, User
from app.auth import get_current_user

router = APIRouter(prefix="/api/me/api-keys", tags=["developer"])

KEY_PREFIX_BYTES = "ghradar_"


def _hash_key(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


class APIKeyCreate(BaseModel):
    name: str


class APIKeyOut(BaseModel):
    id: int
    key_prefix: str
    name: str
    is_active: bool
    created_at: datetime
    last_used_at: datetime | None = None

    model_config = {"from_attributes": True}


@router.get("", response_model=list[APIKeyOut])
def list_keys(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """列出该用户的所有 API key（不含 hash，含前缀/名称/最近使用时间）。"""
    rows = db.execute(
        select(APIKey)
        .where(APIKey.user_id == user.id, APIKey.is_active.is_(True))
        .order_by(APIKey.created_at.desc())
    ).scalars().all()
    return rows


@router.post("", status_code=201)
def create_key(
    body: APIKeyCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """生成新 API key。明文 key 只在此响应中返回一次，请妥善保存。"""
    name = body.name.strip()[:80]
    if not name:
        raise HTTPException(422, "name 不能为空")

    # 限制每用户最多 10 个活跃 key
    count = db.execute(
        select(APIKey).where(APIKey.user_id == user.id, APIKey.is_active.is_(True))
    ).scalars().all()
    if len(count) >= 10:
        raise HTTPException(400, "最多创建 10 个 API Key")

    raw = KEY_PREFIX_BYTES + secrets.token_urlsafe(32)
    prefix = raw[:16]
    key = APIKey(
        user_id=user.id,
        key_hash=_hash_key(raw),
        key_prefix=prefix,
        name=name,
    )
    db.add(key)
    db.commit()
    db.refresh(key)
    return {"id": key.id, "key": raw, "prefix": prefix, "name": name}


@router.delete("/{key_id}", status_code=204)
def revoke_key(
    key_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """吊销 API key。"""
    key = db.execute(
        select(APIKey).where(APIKey.id == key_id, APIKey.user_id == user.id)
    ).scalar_one_or_none()
    if key is None:
        raise HTTPException(404, "Key 不存在")
    key.is_active = False
    key.revoked_at = datetime.now(timezone.utc)
    db.commit()
