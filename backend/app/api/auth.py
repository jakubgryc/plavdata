"""
Authentication API endpoints.
"""

import logging
import re
from datetime import timedelta
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.api.limiter import limiter
from app.auth import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    authenticate_user,
    create_access_token,
    get_current_user,
    get_password_hash,
    verify_password,
)
from app.db import get_db
from app.models import User
from app.services.email import generate_password, send_email

logger = logging.getLogger(__name__)

router = APIRouter(tags=["auth"])


class LoginRequest(BaseModel):
    # Accepts either a username or an email address.
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    username: str
    role: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    role: str
    is_active: bool

    class Config:
        from_attributes = True


class RegisterRequest(BaseModel):
    email: str
    username: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/auth/login", response_model=LoginResponse)
async def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate user and return JWT token.
    """
    user = authenticate_user(db, login_data.username, login_data.password)
    if not user:
        # Check if the account exists but is pending approval (inactive),
        # and the submitted password is correct — only then reveal the pending state.
        pending_user = (
            db.query(User)
            .filter(
                or_(
                    User.username == login_data.username,
                    User.email == login_data.username,
                ),
                User.is_active == False,
            )
            .first()
        )
        if pending_user and verify_password(
            login_data.password, pending_user.hashed_password
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Účet čeká na schválení administrátorem.",
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        username=user.username,
        role=user.role,
    )


@router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: Annotated[User, Depends(get_current_user)]):
    """
    Get current authenticated user info.
    """
    return current_user


@router.post("/auth/register", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/hour")
async def register(
    data: RegisterRequest, request: Request, db: Session = Depends(get_db)
):
    """
    Register a new user account. Sends password via email if successful.
    """
    # Validate username
    if not re.match(r"^[a-zA-Z0-9._-]{3,32}$", data.username):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uživatelské jméno musí mít 3–32 znaků (písmena, číslice, tečka, podtržítko, pomlčka).",
        )

    # Validate email
    parts = data.email.split("@")
    if len(parts) != 2 or not parts[0] or not parts[1]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Zadej platný e-mail.",
        )

    # Check if username is taken (case-insensitive exact match; avoid ilike wildcards)
    existing_username = (
        db.query(User)
        .filter(func.lower(User.username) == data.username.lower())
        .first()
    )
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Uživatelské jméno je obsazené.",
        )

    # Check if email already exists (case-insensitive) - anti-enumeration
    existing_email = (
        db.query(User).filter(func.lower(User.email) == data.email.lower()).first()
    )
    if existing_email:
        return {"message": "Pokud je adresa volná, poslali jsme ti heslo na e-mail."}

    # Generate password and create user
    password = generate_password()
    new_user = User(
        username=data.username,
        email=data.email,
        hashed_password=get_password_hash(password),
        role="coach",
        is_active=False,
    )
    db.add(new_user)
    db.commit()

    # Send email with credentials
    subject = "Registrace v plavdata — tvoje heslo"
    body = (
        f"Ahoj {data.username},\n\n"
        f"tvé přihlašovací údaje:\n"
        f"Uživatelské jméno: {data.username}\n"
        f"Heslo: {password}\n\n"
        f"Účet musí nejprve schválit administrátor.\n"
    )

    try:
        await run_in_threadpool(send_email, data.email, subject, body)
    except Exception:
        logger.exception("Failed to send registration email")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Odeslání e-mailu se nezdařilo, kontaktuj administrátora.",
        )

    return {"message": "Pokud je adresa volná, poslali jsme ti heslo na e-mail."}


@router.post("/auth/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    data: ChangePasswordRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Change password for the current authenticated user.
    """
    # Verify current password
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Současné heslo není správné.",
        )

    # Validate new password length
    if len(data.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Heslo musí mít alespoň 8 znaků.",
        )

    # Update password
    current_user.hashed_password = get_password_hash(data.new_password)
    db.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)
