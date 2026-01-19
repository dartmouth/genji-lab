# services/group_service.py

from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select

from models.models import Group, User, group_members
from services.base_service import BaseService

# Configuration: Join link expires X weeks after classroom start date
JOIN_LINK_EXPIRATION_WEEKS = 2


class GroupService(BaseService[Group]):
    """Service for group/classroom CRUD operations."""
    
    def __init__(self):
        super().__init__(Group)
    
    # ==================== Helper Methods ====================
    
    def _check_group_exists(self, db: Session, group_id: int) -> Group:
        """
        Get a group by ID or raise 404.
        
        Raises HTTPException 404 if not found.
        """
        group = db.query(Group).filter(Group.id == group_id).first()
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")
        return group
    
    def _check_user_exists(self, db: Session, user_id: int) -> User:
        """
        Get a user by ID or raise 404.
        
        Raises HTTPException 404 if not found.
        """
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    
    def _get_membership(self, db: Session, group_id: int, user_id: int):
        """Check if a user is a member of a group."""
        return db.execute(
            select(group_members).where(
                (group_members.c.group_id == group_id) & 
                (group_members.c.user_id == user_id)
            )
        ).first()
    
    def _is_privileged_user(self, user: User) -> bool:
        """Check if user has admin or instructor role."""
        user_roles = [role.name for role in user.roles] if user.roles else []
        return 'admin' in user_roles or 'instructor' in user_roles
    
    def _build_group_response(self, group: Group, member_count: int) -> Dict[str, Any]:
        """Build a group response dictionary."""
        return {
            "id": group.id,
            "name": group.name,
            "description": group.description,
            "created_at": group.created_at,
            "created_by_id": group.created_by_id,
            "member_count": member_count,
            "start_date": group.start_date,
            "end_date": group.end_date
        }
    
    def _build_member_response(self, member_data) -> Dict[str, Any]:
        """Build a member response dictionary."""
        return {
            "id": member_data.id,
            "username": member_data.username,
            "first_name": member_data.first_name,
            "last_name": member_data.last_name,
            "email": member_data.email,
            "joined_at": member_data.joined_at
        }
    
    # ==================== CRUD Operations ====================
    
    def create(
        self,
        db: Session,
        name: str,
        description: Optional[str],
        start_date: date,
        end_date: date,
        user: User
    ) -> Dict[str, Any]:
        """
        Create a new group/classroom.
        
        Raises HTTPException 400 if group name already exists.
        """
        # Check if group name already exists
        existing_group = db.query(Group).filter(Group.name == name).first()
        if existing_group:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Group name already exists"
            )
        
        # Create new group
        db_group = Group(
            name=name,
            description=description,
            created_at=datetime.now(),
            created_by_id=user.id,
            start_date=start_date,
            end_date=end_date
        )
        
        db.add(db_group)
        db.commit()
        db.refresh(db_group)
        
        # Automatically add creator as a member
        db.execute(
            group_members.insert().values(
                group_id=db_group.id,
                user_id=user.id,
                joined_at=datetime.now()
            )
        )
        db.commit()
        
        return self._build_group_response(db_group, member_count=1)
    
    def get_by_id(
        self,
        db: Session,
        group_id: int
    ) -> Dict[str, Any]:
        """
        Get a specific group with its members.
        
        Raises HTTPException 404 if not found.
        """
        group = self._check_group_exists(db, group_id)
        
        # Get members with joined_at from the association table
        members_query = db.query(
            User.id, User.username, User.first_name, User.last_name, User.email,
            group_members.c.joined_at
        ).join(
            group_members, User.id == group_members.c.user_id
        ).filter(
            group_members.c.group_id == group_id
        ).all()
        
        return {
            "id": group.id,
            "name": group.name,
            "description": group.description,
            "created_at": group.created_at,
            "created_by_id": group.created_by_id,
            "members": [self._build_member_response(m) for m in members_query],
            "start_date": group.start_date,
            "end_date": group.end_date
        }
    
    def get_public(
        self,
        db: Session,
        group_id: int
    ) -> Dict[str, Any]:
        """
        Get basic group information without authentication for join links.
        
        Raises HTTPException 404 if not found.
        """
        group = self._check_group_exists(db, group_id)
        
        # Count members
        member_count = db.query(group_members).filter(
            group_members.c.group_id == group_id
        ).count()
        
        return self._build_group_response(group, member_count)
    
    def list(
        self,
        db: Session
    ) -> List[Dict[str, Any]]:
        """List all groups with member counts."""
        groups = db.query(Group).options(joinedload(Group.members)).all()
        
        return [
            self._build_group_response(group, len(group.members))
            for group in groups
        ]
    
    def delete(
        self,
        db: Session,
        group_id: int,
        user: User
    ) -> None:
        """
        Delete a group (only creator can delete).
        
        Raises HTTPException 404 if not found.
        Raises HTTPException 403 if user is not the creator.
        """
        group = self._check_group_exists(db, group_id)
        
        # Only creator can delete the group
        if group.created_by_id != user.id:
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
    
    # ==================== Member Operations ====================
    
    def add_member(
        self,
        db: Session,
        group_id: int,
        user_id: int,
        current_user: User
    ) -> Dict[str, str]:
        """
        Add a user to a group.
        
        Raises HTTPException 404 if group or user not found.
        Raises HTTPException 400 if user is already a member.
        Raises HTTPException 403 if class has ended or join period expired.
        """
        group = self._check_group_exists(db, group_id)
        user = self._check_user_exists(db, user_id)
        
        # Check if user is already a member
        if self._get_membership(db, group_id, user_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is already a member of this group"
            )
        
        # Check if class has ended (enforce for everyone, including admins)
        if group.end_date is not None:
            today = date.today()
            if today > group.end_date:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cannot add students to a classroom that has already ended."
                )
        
        # Check if join period is still active (only for non-admin/instructor users)
        if not self._is_privileged_user(current_user) and group.start_date is not None:
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
    
    def remove_member(
        self,
        db: Session,
        group_id: int,
        user_id: int
    ) -> None:
        """
        Remove a user from a group.
        
        Raises HTTPException 404 if group, user, or membership not found.
        """
        self._check_group_exists(db, group_id)
        self._check_user_exists(db, user_id)
        
        # Check if user is a member
        if not self._get_membership(db, group_id, user_id):
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
    
    # ==================== Instructor Operations ====================
    
    def get_instructor(
        self,
        db: Session,
        group_id: int
    ) -> Dict[str, str]:
        """
        Get instructor information for a group.
        
        Raises HTTPException 404 if group or instructor not found.
        """
        group = self._check_group_exists(db, group_id)
        
        # Get the creator (instructor) information
        instructor = db.query(User).filter(User.id == group.created_by_id).first()
        
        if not instructor:
            raise HTTPException(status_code=404, detail="Instructor not found")
        
        # Build instructor name
        name_parts = []
        if instructor.first_name:
            name_parts.append(str(instructor.first_name))
        if instructor.last_name:
            name_parts.append(str(instructor.last_name))
        
        instructor_name = " ".join(name_parts) if name_parts else str(instructor.username)
        instructor_email = str(instructor.email) if instructor.email else f"{instructor.username}@dartmouth.edu"
        
        return {
            "name": instructor_name,
            "email": instructor_email
        }


# Singleton instance for easy importing
group_service = GroupService()