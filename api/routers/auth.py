"""
Basic username/password authentication endpoints.
Uses shared utilities from auth_utils for consistency with CAS auth.
"""

from fastapi import APIRouter, HTTPException, Depends, status, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select
from datetime import datetime
from typing import Optional

from database import get_db
from models import models
from schemas.auth import (
    UserRegister,
    UserLogin,
    UserResponse,
    PasswordChange,
    PasswordReset,
)
from passlib.context import CryptContext  # type: ignore

# Import shared utilities
from routers.auth_utils import (
    create_session,
    get_session_user,
    clear_session,
    calculate_session_ttl,
    get_user_roles,
    get_user_groups,
    assign_default_role_to_user,
    load_user_with_relations,
    get_current_user as get_current_user_from_utils,
    update_user_last_login,
)

# Password hashing context (kept here since it's specific to basic auth)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hashed password."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt."""
    return pwd_context.hash(password)

def assign_admin_if_first_user(db: Session, user: models.User) -> bool:
    """
    Check if this is the first user in the system (no admins exist).
    If so, grant them the admin role.
    Returns True if admin was assigned, False otherwise.
    """
    # Check if any user with admin role exists
    admin_role = db.query(models.Role).filter(models.Role.name == "admin").first()
    
    if not admin_role:
        # Create admin role if it doesn't exist
        admin_role = models.Role(
            name="admin",
            description="System administrator with full privileges"
        )
        db.add(admin_role)
        db.flush()
    
    # Check if anyone already has the admin role
    existing_admin = (
        db.query(models.User)
        .join(models.user_roles)
        .join(models.Role)
        .filter(models.Role.name == "admin")
        .first()
    )
    
    if existing_admin is None:
        # No admin exists - make this user the admin
        if admin_role not in user.roles:
            user.roles.append(admin_role)
            db.commit()
            return True
    
    return False

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

    # Check if user already exists by email or username
    existing_user = (
        db.query(models.User)
        .filter(
            (models.User.email == user_data.email)
            | (models.User.username == user_data.username)
        )
        .first()
    )

    if existing_user:
        if existing_user.email == user_data.email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Username already taken"
            )

    # Create new user
    new_user = models.User(
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        email=user_data.email,
        username=user_data.username,
        is_active=True,
        user_metadata={
            "created_at": datetime.now().isoformat(),
            "auth_method": "password",
        },
    )

    db.add(new_user)
    db.flush()  # Get the user ID without committing

    # Create password record
    hashed_password = get_password_hash(user_data.password)
    user_password = models.UserPassword(
        user_id=new_user.id, hashed_password=hashed_password
    )

    db.add(user_password)
    db.commit()

    # Assign default role
    assign_default_role_to_user(db, new_user)
    assign_admin_if_first_user(db, new_user)
    
    # Reload user with roles and groups using shared utility
    user_with_relations = load_user_with_relations(db, new_user.id)

    # Create session using shared utility
    create_session(request, user_with_relations.id, user_with_relations.username)

    # Calculate TTL using shared utility
    ttl = calculate_session_ttl()

    return UserResponse(
        id=user_with_relations.id,
        first_name=user_with_relations.first_name,
        last_name=user_with_relations.last_name,
        email=user_with_relations.email,
        username=user_with_relations.username,
        is_active=user_with_relations.is_active,
        viewed_tutorial=user_with_relations.viewed_tutorial,
        roles=get_user_roles(user_with_relations),
        groups=get_user_groups(user_with_relations),
        user_metadata=user_with_relations.user_metadata,
        ttl=ttl,
    )


@router.post("/login", response_model=UserResponse)
async def login_user(
    login_data: UserLogin, request: Request, db: Session = Depends(get_db)
):
    """Login with username and password."""

    # Find user by username - load roles and groups
    query = (
        select(models.User)
        .options(
            joinedload(models.User.roles),
            joinedload(models.User.groups),
            joinedload(models.User.password_auth),
        )
        .filter(models.User.username == login_data.username)
    )

    result = db.execute(query)
    user = result.scalars().unique().first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User account is inactive"
        )

    # Check if user has password authentication set up
    if not user.password_auth:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Password authentication not available for this user",
        )

    # Verify password
    if not verify_password(login_data.password, user.password_auth.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    # Update last login using shared utility
    update_user_last_login(user, db)

    # Create session using shared utility
    create_session(request, user.id, user.username)

    # Calculate TTL using shared utility
    ttl = calculate_session_ttl()

    return UserResponse(
        id=user.id,
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
        username=user.username,
        is_active=user.is_active,
        viewed_tutorial=user.viewed_tutorial,
        roles=get_user_roles(user),
        groups=get_user_groups(user),
        user_metadata=user.user_metadata,
        ttl=ttl,
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    request: Request, current_user: models.User = Depends(get_current_user)
):
    """Get current user information."""
    # Calculate TTL using shared utility
    ttl = calculate_session_ttl()

    return UserResponse(
        id=current_user.id,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        email=current_user.email,
        username=current_user.username,
        is_active=current_user.is_active,
        viewed_tutorial=current_user.viewed_tutorial,
        roles=get_user_roles(current_user),
        groups=get_user_groups(current_user),
        user_metadata=current_user.user_metadata,
        ttl=ttl,
    )


@router.post("/change-password")
async def change_password(
    password_data: PasswordChange,
    request: Request,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Change user password."""

    # Check if user has password authentication
    if not current_user.password_auth:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password authentication not available for this user",
        )

    # Verify current password
    if not verify_password(
        password_data.current_password, current_user.password_auth.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    # Update password
    current_user.password_auth.hashed_password = get_password_hash(
        password_data.new_password
    )
    current_user.password_auth.updated_at = datetime.now()

    db.commit()

    return {"message": "Password changed successfully"}


@router.post("/logout")
async def logout(request: Request):
    """Logout user by clearing session."""
    clear_session(request)
    return {"message": "Logged out successfully"}
