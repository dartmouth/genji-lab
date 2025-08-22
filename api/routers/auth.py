from fastapi import APIRouter, HTTPException, Depends, status, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select
from datetime import datetime, timedelta
from typing import List, Optional

from database import get_db
from models import models
from schemas.auth import (
    UserRegister, UserLogin, UserResponse,
    PasswordChange, PasswordReset
)
from passlib.context import CryptContext
from dotenv import load_dotenv
import os

load_dotenv()

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Session settings
SESSION_EXPIRE_WEEKS = int(os.getenv("SESSION_EXPIRE_WEEKS", "1"))  # 1 week default


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hashed password."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt."""
    return pwd_context.hash(password)


def create_session(request: Request, user_id: int, username: str) -> None:
    """Create a user session."""
    session_data = {
        "user_id": user_id,
        "username": username,
        "created_at": datetime.now().isoformat(),
        "expires_at": (datetime.now() + timedelta(weeks=SESSION_EXPIRE_WEEKS)).isoformat()
    }
    request.session["user"] = session_data


def get_session_user(request: Request) -> Optional[dict]:
    """Get user data from session."""
    session_data = request.session.get("user")
    if not session_data:
        return None
    
    # Check if session has expired
    expires_at = datetime.fromisoformat(session_data["expires_at"])
    if datetime.now() > expires_at:
        return None
    
    return session_data


def clear_session(request: Request) -> None:
    """Clear user session."""
    request.session.pop("user", None)

router = APIRouter(
    prefix="/api/v1/auth",
    tags=["authentication"]
)


def get_user_roles(user: models.User) -> List[str]:
    """Get list of role names for a user."""
    return [role.name for role in user.roles]


def assign_default_role_to_user(db_session: Session, user: models.User, role_name: str = "general_user"):
    """Assign a default role to a user if they don't already have it."""
    # Check if user already has this role
    existing_role = db_session.query(models.Role).filter(
        models.Role.name == role_name,
        models.Role.users.contains(user)
    ).first()
    
    if not existing_role:
        # Get the role
        role = db_session.query(models.Role).filter(models.Role.name == role_name).first()
        if role:
            # Assign role to user
            user.roles.append(role)
            db_session.commit()


def get_current_user(
    request: Request,
    db: Session = Depends(get_db)
) -> models.User:
    """Get the current authenticated user from session."""
    session_data = get_session_user(request)
    
    if session_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    user_id = session_data.get("user_id")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session data"
        )
    
    # Load user with roles
    query = select(models.User).options(joinedload(models.User.roles)).filter(
        models.User.id == int(user_id)
    )
    result = db.execute(query)
    user = result.scalars().unique().first()
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive"
        )
    
    return user


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user_data: UserRegister, request: Request, db: Session = Depends(get_db)):
    """Register a new user with username/password authentication."""
    
    # Check if user already exists by email or username
    existing_user = db.query(models.User).filter(
        (models.User.email == user_data.email) | 
        (models.User.username == user_data.username)
    ).first()
    
    if existing_user:
        if existing_user.email == user_data.email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
    
    # Create new user
    new_user = models.User(
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        email=user_data.email,
        username=user_data.username,
        is_active=True,
        user_metadata={
            'created_at': datetime.now().isoformat(),
            'auth_method': 'password'
        }
    )
    
    db.add(new_user)
    db.flush()  # Get the user ID without committing
    
    # Create password record
    hashed_password = get_password_hash(user_data.password)
    user_password = models.UserPassword(
        user_id=new_user.id,
        hashed_password=hashed_password
    )
    
    db.add(user_password)
    db.commit()
    
    # Assign default role
    assign_default_role_to_user(db, new_user)
    
    # Reload user with roles
    query = select(models.User).options(joinedload(models.User.roles)).filter(
        models.User.id == new_user.id
    )
    result = db.execute(query)
    user_with_roles = result.scalars().unique().first()
    
    # Create session
    create_session(request, user_with_roles.id, user_with_roles.username)
    
    # Calculate TTL
    ttl = (datetime.now() + timedelta(weeks=SESSION_EXPIRE_WEEKS)).isoformat()
    
    return UserResponse(
        id=user_with_roles.id,
        first_name=user_with_roles.first_name,
        last_name=user_with_roles.last_name,
        email=user_with_roles.email,
        username=user_with_roles.username,
        is_active=user_with_roles.is_active,
        roles=get_user_roles(user_with_roles),
        user_metadata=user_with_roles.user_metadata,
        ttl=ttl
    )


@router.post("/login", response_model=UserResponse)
async def login_user(login_data: UserLogin, request: Request, db: Session = Depends(get_db)):
    """Login with username and password."""
    
    # Find user by username
    query = select(models.User).options(
        joinedload(models.User.roles),
        joinedload(models.User.password_auth)
    ).filter(models.User.username == login_data.username)
    
    result = db.execute(query)
    user = result.scalars().unique().first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive"
        )
    
    # Check if user has password authentication set up
    if not user.password_auth:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Password authentication not available for this user"
        )
    
    # Verify password
    if not verify_password(login_data.password, user.password_auth.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    # Update last login in metadata
    if user.user_metadata:
        user.user_metadata['last_login'] = datetime.now().isoformat()
    else:
        user.user_metadata = {'last_login': datetime.now().isoformat()}
    
    db.commit()
    
    # Create session
    create_session(request, user.id, user.username)
    
    # Calculate TTL
    ttl = (datetime.now() + timedelta(weeks=SESSION_EXPIRE_WEEKS)).isoformat()
    
    return UserResponse(
        id=user.id,
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
        username=user.username,
        is_active=user.is_active,
        roles=get_user_roles(user),
        user_metadata=user.user_metadata,
        ttl=ttl
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(request: Request, current_user: models.User = Depends(get_current_user)):
    """Get current user information."""
    # Calculate TTL (use same as session expiry for consistency)
    ttl = (datetime.now() + timedelta(weeks=SESSION_EXPIRE_WEEKS)).isoformat()
    
    return UserResponse(
        id=current_user.id,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        email=current_user.email,
        username=current_user.username,
        is_active=current_user.is_active,
        roles=get_user_roles(current_user),
        user_metadata=current_user.user_metadata,
        ttl=ttl
    )


@router.post("/change-password")
async def change_password(
    password_data: PasswordChange,
    request: Request,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change user password."""
    
    # Check if user has password authentication
    if not current_user.password_auth:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password authentication not available for this user"
        )
    
    # Verify current password
    if not verify_password(password_data.current_password, current_user.password_auth.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Update password
    current_user.password_auth.hashed_password = get_password_hash(password_data.new_password)
    current_user.password_auth.updated_at = datetime.now()
    
    db.commit()
    
    return {"message": "Password changed successfully"}


@router.post("/logout")
async def logout(request: Request):
    """Logout user by clearing session."""
    clear_session(request)
    return {"message": "Logged out successfully"}