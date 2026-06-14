"""注册 / 登录接口。"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User
from app.schemas import RegisterIn, LoginIn, TokenOut
from app.auth import hash_password, verify_password, create_token
from app.ratelimit import rate_limit

router = APIRouter(prefix="/api/auth", tags=["auth"])

# 防暴力破解 / 滥用注册：每 IP 每分钟限次
_register_rl = rate_limit("register", limit=5, window_sec=60)
_login_rl = rate_limit("login", limit=10, window_sec=60)


@router.post("/register", response_model=TokenOut, status_code=201,
             dependencies=[Depends(_register_rl)])
def register(body: RegisterIn, db: Session = Depends(get_db)):
    if len(body.password) < 6:
        raise HTTPException(400, "密码至少 6 位")
    exists = db.execute(select(User).where(User.email == body.email)).scalar_one_or_none()
    if exists:
        raise HTTPException(409, "该邮箱已注册")
    user = User(email=body.email, password_hash=hash_password(body.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return TokenOut(access_token=create_token(user.id), email=user.email)


@router.post("/login", response_model=TokenOut, dependencies=[Depends(_login_rl)])
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.execute(select(User).where(User.email == body.email)).scalar_one_or_none()
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "邮箱或密码错误")
    return TokenOut(access_token=create_token(user.id), email=user.email)


# ---- 找回密码（重置 token = 短期 JWT，secret 掺入当前密码哈希 → 改密后旧链接自动失效）----
import jwt as _jwt
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel, EmailStr

from app.config import settings
from app.mailer import send_reset_email

_forgot_rl = rate_limit("forgot", limit=3, window_sec=60)
_RESET_TTL_MIN = 60


class ForgotIn(BaseModel):
    email: EmailStr


class ResetIn(BaseModel):
    token: str
    password: str


def _reset_secret(user: User) -> str:
    return settings.jwt_secret + user.password_hash


@router.post("/forgot", dependencies=[Depends(_forgot_rl)])
def forgot_password(body: ForgotIn, db: Session = Depends(get_db)):
    """发送重置邮件。无论邮箱是否存在都返回相同响应（防枚举）。"""
    user = db.execute(select(User).where(User.email == body.email)).scalar_one_or_none()
    if user is not None:
        token = _jwt.encode(
            {"sub": str(user.id), "purpose": "reset",
             "exp": datetime.now(timezone.utc) + timedelta(minutes=_RESET_TTL_MIN)},
            _reset_secret(user), algorithm="HS256",
        )
        link = f"{settings.site_url}/account/reset?token={token}"
        sent = send_reset_email(user.email, link)
        if not sent:
            # SMTP 未配置：明确告知（而非静默装成功）
            raise HTTPException(503, "邮件服务未配置，请联系管理员重置")
    return {"ok": True, "message": "如果该邮箱已注册，重置链接已发送（1 小时内有效）"}


@router.post("/reset", response_model=TokenOut)
def reset_password(body: ResetIn, db: Session = Depends(get_db)):
    if len(body.password) < 6:
        raise HTTPException(400, "密码至少 6 位")
    # 先不验签解出 user_id，再用该用户的当前密码哈希做 secret 验签
    try:
        unverified = _jwt.decode(body.token, options={"verify_signature": False})
        user_id = int(unverified["sub"])
    except Exception:
        raise HTTPException(400, "重置链接无效")
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(400, "重置链接无效")
    try:
        payload = _jwt.decode(body.token, _reset_secret(user), algorithms=["HS256"])
        if payload.get("purpose") != "reset":
            raise ValueError
    except Exception:
        raise HTTPException(400, "重置链接无效或已过期")
    user.password_hash = hash_password(body.password)
    db.commit()
    return TokenOut(access_token=create_token(user.id), email=user.email)
