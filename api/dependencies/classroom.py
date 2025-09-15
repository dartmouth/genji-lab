from typing import Optional
from fastapi import HTTPException, Query, Depends, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from database import get_db
from models.models import User, Group


def get_current_user_sync(
    request: Request,
    db: Session = Depends(get_db)
) -> User:
    """Get the current authenticated user from session (sync version)."""
    from routers.auth import get_session_user
    
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
    user = db.query(User).options(joinedload(User.roles)).filter(
        User.id == int(user_id)
    ).first()
    
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


def get_classroom_context(
    classroom_id: Optional[int] = Query(None, description="ID of the classroom context"),
    current_user: User = Depends(get_current_user_sync),
    db: Session = Depends(get_db)
) -> Optional[int]:
    """
    Get and validate classroom context for the current user.
    
    Args:
        classroom_id: Optional classroom ID from query parameter
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        classroom_id if valid and user is a member, None for global context
        
    Raises:
        HTTPException: If classroom_id is invalid or user lacks access
    """
    if classroom_id is None:
        # Global context - no classroom filtering
        return None
    
    # Validate classroom exists and user is a member
    classroom = db.query(Group).options(
        joinedload(Group.members)
    ).filter(Group.id == classroom_id).first()
    
    if not classroom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Classroom not found"
        )
    
    # Check if current user is a member of this classroom
    user_is_member = any(member.id == current_user.id for member in classroom.members)
    
    if not user_is_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You are not a member of this classroom"
        )
    
    return classroom_id


def get_user_classrooms(
    current_user: User = Depends(get_current_user_sync),
    db: Session = Depends(get_db)
) -> list[Group]:
    """
    Get all classrooms the current user is a member of.
    
    Args:
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        List of Group objects representing classrooms
    """
    user_with_groups = db.query(User).options(
        joinedload(User.groups)
    ).filter(User.id == current_user.id).first()
    
    return user_with_groups.groups if user_with_groups else []