"""
Shared authentication utilities for both basic auth and CAS auth.
This module provides common functions used by both authentication methods
to ensure consistency in user handling, session management, and responses.
"""

from fastapi import Request, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import os
from dotenv import load_dotenv

from models import models

# Note: Password hashing functions will use the pwd_context from auth.py
# to avoid duplicate imports. Import them from auth.py when needed.

load_dotenv()

# Session settings - single source of truth
SESSION_EXPIRE_WEEKS = int(os.getenv("SESSION_EXPIRE_WEEKS", "1"))


# ==================== Session Management ====================


def create_session(request: Request, user_id: int, username: str) -> None:
    """
    Create a user session with consistent expiration across all auth methods.

    Args:
        request: FastAPI request object
        user_id: User's database ID
        username: User's username (or netid for CAS users)
    """
    session_data = {
        "user_id": user_id,
        "username": username,
        "created_at": datetime.now().isoformat(),
        "expires_at": (
            datetime.now() + timedelta(weeks=SESSION_EXPIRE_WEEKS)
        ).isoformat(),
    }
    request.session["user"] = session_data


def get_session_user(request: Request) -> Optional[Dict[str, Any]]:
    """
    Get user data from session.

    Args:
        request: FastAPI request object

    Returns:
        Session data dict if valid, None if expired or missing
    """
    session_data = request.session.get("user")
    if not session_data:
        return None

    # Check if session has expired
    expires_at = datetime.fromisoformat(session_data["expires_at"])
    if datetime.now() > expires_at:
        # Clear expired session
        clear_session(request)
        return None

    return session_data


def clear_session(request: Request) -> None:
    """Clear user session."""
    request.session.pop("user", None)


def calculate_session_ttl() -> str:
    """
    Calculate session TTL (time to live) as ISO format timestamp.

    Returns:
        ISO format timestamp for when the session expires
    """
    return (datetime.now() + timedelta(weeks=SESSION_EXPIRE_WEEKS)).isoformat()


# ==================== User Data Helpers ====================


def get_user_roles(user: models.User) -> List[str]:
    """
    Get list of role names for a user.

    Args:
        user: User object with roles already loaded

    Returns:
        List of role names
    """
    return [role.name for role in user.roles]


def get_user_groups(user: models.User) -> List[Dict[str, Any]]:
    """
    Get list of group information for a user.

    Args:
        user: User object with groups already loaded

    Returns:
        List of dicts with group name and id
    """
    return [{"name": group.name, "id": group.id} for group in user.groups]


def assign_default_role_to_user(
    db_session: Session, user: models.User, role_name: str = "general_user"
) -> None:
    """
    Assign a default role to a user if they don't already have it.

    Args:
        db_session: SQLAlchemy database session
        user: User object
        role_name: Name of the role to assign (default: "general_user")
    """
    # Check if user already has this role
    existing_role = (
        db_session.query(models.Role)
        .filter(models.Role.name == role_name, models.Role.users.contains(user))
        .first()
    )

    if not existing_role:
        # Get the role
        role = (
            db_session.query(models.Role).filter(models.Role.name == role_name).first()
        )

        if role:
            # Assign role to user
            user.roles.append(role)
            db_session.commit()


def load_user_with_relations(
    db_session: Session, user_id: int
) -> Optional[models.User]:
    """
    Load a user with all necessary relations (roles, groups) pre-loaded.
    This ensures consistent user objects across all auth methods.

    Args:
        db_session: SQLAlchemy database session
        user_id: User's database ID

    Returns:
        User object with relations loaded, or None if not found
    """
    query = (
        select(models.User)
        .options(joinedload(models.User.roles), joinedload(models.User.groups))
        .filter(models.User.id == user_id)
    )
    result = db_session.execute(query)
    return result.scalars().unique().first()


# ==================== Current User Dependency ====================


def get_current_user(request: Request, db: Session) -> models.User:
    """
    Get the current authenticated user from session.
    This is a dependency function that can be used with FastAPI's Depends().

    Args:
        request: FastAPI request object
        db: Database session

    Returns:
        User object with relations loaded

    Raises:
        HTTPException: If not authenticated or user not found
    """
    session_data = get_session_user(request)

    if session_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
        )

    user_id = session_data.get("user_id")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session data"
        )

    # Load user with roles
    user = load_user_with_relations(db, int(user_id))

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User account is inactive"
        )

    return user


# ==================== User Creation/Update ====================


def update_user_last_login(user: models.User, db_session: Session) -> None:
    """
    Update user's last login timestamp in metadata.

    Args:
        user: User object to update
        db_session: SQLAlchemy database session
    """
    if user.user_metadata:
        user.user_metadata["last_login"] = datetime.now().isoformat()
    else:
        user.user_metadata = {"last_login": datetime.now().isoformat()}

    db_session.commit()
