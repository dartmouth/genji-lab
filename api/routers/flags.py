from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from database import get_db
from models.models import User
from dependencies.classroom import get_classroom_context, get_current_user_sync
from services.flag_service import flag_service

router = APIRouter(
    prefix="/api/v1/flags",
    tags=["flags"],
)


@router.get("/count", response_model=Dict[str, int])
def get_flags_count(
    classroom_id: Optional[int] = Depends(get_classroom_context),
    current_user: User = Depends(get_current_user_sync),
    db: Session = Depends(get_db),
):
    """Get count of pending flags (admin only)."""
    count = flag_service.get_count(db, classroom_id, current_user)
    return {"count": count}


@router.get("", response_model=List[Dict[str, Any]])
def get_flags(
    classroom_id: Optional[int] = Depends(get_classroom_context),
    current_user: User = Depends(get_current_user_sync),
    db: Session = Depends(get_db),
):
    """
    Get all flags with enriched data (admin only).
    Returns flags with the flagged annotation data.
    """
    return flag_service.list(db, classroom_id, current_user)


@router.delete("/{flag_id}/unflag", status_code=status.HTTP_200_OK)
def unflag(
    flag_id: int,
    classroom_id: Optional[int] = Depends(get_classroom_context),
    current_user: User = Depends(get_current_user_sync),
    db: Session = Depends(get_db),
):
    """Delete flag annotation only (admin only)."""
    return flag_service.unflag(db, flag_id, current_user)


@router.delete("/{flag_id}/remove-comment", status_code=status.HTTP_200_OK)
def remove_comment(
    flag_id: int,
    classroom_id: Optional[int] = Depends(get_classroom_context),
    current_user: User = Depends(get_current_user_sync),
    db: Session = Depends(get_db),
):
    """Delete flag, flagged comment, and all other flags pointing to the same comment (admin only)."""
    return flag_service.remove_comment(db, flag_id, current_user)