from typing import List, Optional
from datetime import date, datetime
from fastapi import APIRouter, Depends, status, Response
from sqlalchemy.orm import Session
from pydantic import BaseModel, validator, ConfigDict

from database import get_db
from models.models import User
from dependencies.classroom import get_current_user_sync
from services.group_service import group_service

router = APIRouter(
    prefix="/api/v1/groups",
    tags=["groups"],
    responses={404: {"description": "Group not found"}},
)


# ==================== Pydantic Schemas ====================

class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None
    start_date: date
    end_date: date
    
    @validator('end_date')
    def validate_end_date_after_start_date(cls, v, values):
        if 'start_date' in values and v <= values['start_date']:
            raise ValueError('end_date must be after start_date')
        return v


class GroupResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    created_at: datetime
    created_by_id: int
    member_count: int
    start_date: date
    end_date: date
    
    model_config = ConfigDict(from_attributes=True)


class GroupMember(BaseModel):
    id: int
    username: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    joined_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class GroupWithMembers(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    created_at: datetime
    created_by_id: int
    members: List[GroupMember]
    start_date: date
    end_date: date
    
    model_config = ConfigDict(from_attributes=True)


class InstructorInfo(BaseModel):
    name: str
    email: str
    
    model_config = ConfigDict(from_attributes=True)


# ==================== Routes ====================

@router.get("/", response_model=List[GroupResponse], status_code=status.HTTP_200_OK)
def list_groups(
    current_user: User = Depends(get_current_user_sync),
    db: Session = Depends(get_db)
):
    """List all groups with member counts."""
    return group_service.list(db)


@router.post("/", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
def create_group(
    group: GroupCreate,
    current_user: User = Depends(get_current_user_sync),
    db: Session = Depends(get_db)
):
    """Create a new group/classroom."""
    return group_service.create(
        db=db,
        name=group.name,
        description=group.description,
        start_date=group.start_date,
        end_date=group.end_date,
        user=current_user
    )


@router.get("/{group_id}/public", response_model=GroupResponse, status_code=status.HTTP_200_OK)
def get_group_public(
    group_id: int,
    db: Session = Depends(get_db)
):
    """Get basic group information without authentication for join links."""
    return group_service.get_public(db, group_id)


@router.get("/{group_id}/instructor", response_model=InstructorInfo, status_code=status.HTTP_200_OK)
def get_group_instructor(
    group_id: int,
    db: Session = Depends(get_db)
):
    """Get instructor information for a group."""
    return group_service.get_instructor(db, group_id)


@router.get("/{group_id}", response_model=GroupWithMembers, status_code=status.HTTP_200_OK)
def get_group(
    group_id: int,
    current_user: User = Depends(get_current_user_sync),
    db: Session = Depends(get_db)
):
    """Get a specific group with its members."""
    return group_service.get_by_id(db, group_id)


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_group(
    group_id: int,
    current_user: User = Depends(get_current_user_sync),
    db: Session = Depends(get_db)
):
    """Delete a group (only creator can delete)."""
    group_service.delete(db, group_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{group_id}/members/{user_id}", status_code=status.HTTP_201_CREATED)
def add_user_to_group(
    group_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user_sync),
    db: Session = Depends(get_db)
):
    """Add a user to a group."""
    return group_service.add_member(db, group_id, user_id, current_user)


@router.delete("/{group_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_user_from_group(
    group_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user_sync),
    db: Session = Depends(get_db)
):
    """Remove a user from a group."""
    group_service.remove_member(db, group_id, user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)