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
