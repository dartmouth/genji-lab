from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, text
from datetime import datetime, date, timedelta
from pydantic import BaseModel, validator

from database import get_db
from models.models import Group, User, group_members
from dependencies.classroom import get_current_user_sync

router = APIRouter(
    prefix="/api/v1/groups",
    tags=["groups"],
    responses={404: {"description": "Group not found"}},
)

# Configuration: Join link expires X weeks after classroom start date
JOIN_LINK_EXPIRATION_WEEKS = 2

# Pydantic schemas
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
    
    class Config:
        from_attributes = True

class GroupMember(BaseModel):
    id: int
    username: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    joined_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class GroupWithMembers(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    created_at: datetime
    created_by_id: int
    members: List[GroupMember]
    start_date: date
    end_date: date
    
    class Config:
        from_attributes = True

class InstructorInfo(BaseModel):
    name: str
    email: str
    
    class Config:
        from_attributes = True


@router.get("/{group_id}/public", response_model=GroupResponse, status_code=status.HTTP_200_OK)
def get_group_public(
    group_id: int,
    db: Session = Depends(get_db)
):
    """Get basic group information without authentication for join links."""
    
    group = db.query(Group).filter(Group.id == group_id).first()
    
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Count members
    member_count = db.query(group_members).filter(group_members.c.group_id == group_id).count()
    
    return GroupResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        created_at=group.created_at,
        created_by_id=group.created_by_id,
        member_count=member_count,
        start_date=group.start_date,
        end_date=group.end_date
    )


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
        created_by_id=current_user.id,
        start_date=group.start_date,
        end_date=group.end_date
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
        member_count=1,
        start_date=db_group.start_date,
        end_date=db_group.end_date
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
            member_count=len(group.members),
            start_date=group.start_date,
            end_date=group.end_date
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
    
    # Get group basic info
    group = db.query(Group).filter(Group.id == group_id).first()
    
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Get members with joined_at from the association table
    members_query = db.query(
        User.id, User.username, User.first_name, User.last_name, User.email,
        group_members.c.joined_at
    ).join(
        group_members, User.id == group_members.c.user_id
    ).filter(
        group_members.c.group_id == group_id
    ).all()
    
    return GroupWithMembers(
        id=group.id,
        name=group.name,
        description=group.description,
        created_at=group.created_at,
        created_by_id=group.created_by_id,
        members=[
            GroupMember(
                id=member_data.id,
                username=member_data.username,
                first_name=member_data.first_name,
                last_name=member_data.last_name,
                email=member_data.email,
                joined_at=member_data.joined_at
            )
            for member_data in members_query
        ],
        start_date=group.start_date,
        end_date=group.end_date
    )


@router.get("/{group_id}/instructor", response_model=InstructorInfo, status_code=status.HTTP_200_OK)
def get_group_instructor(
    group_id: int,
    db: Session = Depends(get_db)
):
    """Get instructor information for a group."""
    
    # Get the group with the creator information
    group = db.query(Group).filter(Group.id == group_id).first()
    
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Get the creator (instructor) information
    instructor = db.query(User).filter(User.id == group.created_by_id).first()
    
    if not instructor:
        raise HTTPException(status_code=404, detail="Instructor not found")
    
    # Build instructor name (similar pattern to existing GroupMember handling)
    name_parts = []
    if instructor.first_name:
        name_parts.append(str(instructor.first_name))
    if instructor.last_name:
        name_parts.append(str(instructor.last_name))
    
    instructor_name = " ".join(name_parts) if name_parts else str(instructor.username)
    instructor_email = str(instructor.email) if instructor.email else f"{instructor.username}@dartmouth.edu"
    
    return InstructorInfo(
        name=instructor_name,
        email=instructor_email
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
    
    # Check if join period is still active
    if group.start_date is not None:
        today = date.today()
        join_expiration_date = group.start_date + timedelta(weeks=JOIN_LINK_EXPIRATION_WEEKS)
        if today > join_expiration_date:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Join period has expired. Join links expire {JOIN_LINK_EXPIRATION_WEEKS} weeks after the classroom start date."
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