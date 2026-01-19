# routers/auth.py

"""
Basic username/password authentication endpoints.
Uses shared utilities from auth_utils for consistency with CAS auth.
"""

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from database import get_db
from models import models
from schemas.auth import (
    UserRegister,
    UserLogin,
    UserResponse,
    PasswordChange,
)
from services.auth_service import auth_service
from routers.auth_utils import get_current_user as get_current_user_from_utils


def get_current_user(request: Request, db: Session = Depends(get_db)) -> models.User:
    """Wrapper for the get_current_user utility to work with FastAPI Depends."""
    return get_current_user_from_utils(request, db)


router = APIRouter(prefix="/api/v1/auth", tags=["authentication"])


@router.post(
    "/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED
)
async def register_user(
    user_data: UserRegister, request: Request, db: Session = Depends(get_db)
):
    """Register a new user with username/password authentication."""
    result = auth_service.register(db, user_data, request)
    return UserResponse(**result)


@router.post("/login", response_model=UserResponse)
async def login_user(
    login_data: UserLogin, request: Request, db: Session = Depends(get_db)
):
    """Login with username and password."""
    result = auth_service.login(db, login_data, request)
    return UserResponse(**result)


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    request: Request, current_user: models.User = Depends(get_current_user)
):
    """Get current user information."""
    result = auth_service.get_current_user_info(current_user)
    return UserResponse(**result)


@router.post("/change-password")
async def change_password(
    password_data: PasswordChange,
    request: Request,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Change user password."""
    return auth_service.change_password(db, password_data, current_user)


@router.post("/logout")
async def logout(request: Request):
    """Logout user by clearing session."""
    return auth_service.logout(request)