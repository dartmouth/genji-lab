from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, text
from datetime import datetime
from pydantic import BaseModel

from database import get_db
from models.models import Group, User, group_members
from dependencies.classroom import get_current_user_sync

router = APIRouter(
    prefix="/api/v1/groups",
    tags=["groups"],
    responses={404: {"description": "Group not found"}},
)

# Pydantic schemas
class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None

class GroupResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    created_at: datetime
    created_by_id: int
    member_count: int
    
    class Config:
        from_attributes = True

class GroupMember(BaseModel):
    id: int
    username: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    
    class Config:
        from_attributes = True

class GroupWithMembers(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    created_at: datetime
    created_by_id: int
    members: List[GroupMember]
    
    class Config:
        from_attributes = True


@router.post("/", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
def create_group(
    group: GroupCreate,
    current_user: User = Depends(get_current_user_sync),
    db: Session = Depends(get_db)
):
    """Create a new group/classroom."""
    
    # Check if group name already exists
    existing_group = db.query(Group).filter(Group.name == group.name).first()
    if existing_group:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Group name already exists"
        )
    
    # Create new group
    db_group = Group(
        name=group.name,
        description=group.description,
        created_at=datetime.now(),
        created_by_id=current_user.id
    )
    
    db.add(db_group)
    db.commit()
    db.refresh(db_group)
    
    # Automatically add creator as a member
    db.execute(
        group_members.insert().values(
            group_id=db_group.id,
            user_id=current_user.id,
            joined_at=datetime.now()
        )
    )
    db.commit()
    
    return GroupResponse(
        id=db_group.id,
        name=db_group.name,
        description=db_group.description,
        created_at=db_group.created_at,
        created_by_id=db_group.created_by_id,
        member_count=1
    )


@router.get("/", response_model=List[GroupResponse], status_code=status.HTTP_200_OK)
def list_groups(
    current_user: User = Depends(get_current_user_sync),
    db: Session = Depends(get_db)
):
    """List all groups with member counts."""
    
    groups = db.query(Group).options(joinedload(Group.members)).all()
    
    return [
        GroupResponse(
            id=group.id,
            name=group.name,
            description=group.description,
            created_at=group.created_at,
            created_by_id=group.created_by_id,
            member_count=len(group.members)
        )
        for group in groups
    ]


@router.get("/{group_id}", response_model=GroupWithMembers, status_code=status.HTTP_200_OK)
def get_group(
    group_id: int,
    current_user: User = Depends(get_current_user_sync),
    db: Session = Depends(get_db)
):
    """Get a specific group with its members."""
    
    group = db.query(Group).options(joinedload(Group.members)).filter(Group.id == group_id).first()
    
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    return GroupWithMembers(
        id=group.id,
        name=group.name,
        description=group.description,
        created_at=group.created_at,
        created_by_id=group.created_by_id,
        members=[
            GroupMember(
                id=member.id,
                username=member.username,
                first_name=member.first_name,
                last_name=member.last_name
            )
            for member in group.members
        ]
    )


@router.post("/{group_id}/members/{user_id}", status_code=status.HTTP_201_CREATED)
def add_user_to_group(
    group_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user_sync),
    db: Session = Depends(get_db)
):
    """Add a user to a group."""
    
    # Check if group exists
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user is already a member
    existing_membership = db.execute(
        select(group_members).where(
            (group_members.c.group_id == group_id) & 
            (group_members.c.user_id == user_id)
        )
    ).first()
    
    if existing_membership:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this group"
        )
    
    # Add user to group
    db.execute(
        group_members.insert().values(
            group_id=group_id,
            user_id=user_id,
            joined_at=datetime.now()
        )
    )
    db.commit()
    
    return {"message": f"User {user.username} added to group {group.name}"}


@router.delete("/{group_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_user_from_group(
    group_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user_sync),
    db: Session = Depends(get_db)
):
    """Remove a user from a group."""
    
    # Check if group exists
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user is a member
    existing_membership = db.execute(
        select(group_members).where(
            (group_members.c.group_id == group_id) & 
            (group_members.c.user_id == user_id)
        )
    ).first()
    
    if not existing_membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User is not a member of this group"
        )
    
    # Remove user from group
    db.execute(
        group_members.delete().where(
            (group_members.c.group_id == group_id) & 
            (group_members.c.user_id == user_id)
        )
    )
    db.commit()
    
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/my-groups", response_model=List[GroupResponse], status_code=status.HTTP_200_OK)
def get_my_groups(
    current_user: User = Depends(get_current_user_sync),
    db: Session = Depends(get_db)
):
    """Get groups the current user is a member of."""
    
    user_with_groups = db.query(User).options(
        joinedload(User.groups)
    ).filter(User.id == current_user.id).first()
    
    if not user_with_groups:
        return []
    
    return [
        GroupResponse(
            id=group.id,
            name=group.name,
            description=group.description,
            created_at=group.created_at,
            created_by_id=group.created_by_id,
            member_count=len(group.members) if hasattr(group, 'members') else 0
        )
        for group in user_with_groups.groups
    ]


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_group(
    group_id: int,
    current_user: User = Depends(get_current_user_sync),
    db: Session = Depends(get_db)
):
    """Delete a group (only creator can delete)."""
    
    group = db.query(Group).filter(Group.id == group_id).first()
    
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Only creator can delete the group
    if group.created_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the group creator can delete this group"
        )
    
    # Remove all memberships first
    db.execute(
        group_members.delete().where(group_members.c.group_id == group_id)
    )
    
    # Delete the group
    db.delete(group)
    db.commit()
    
    return Response(status_code=status.HTTP_204_NO_CONTENT)