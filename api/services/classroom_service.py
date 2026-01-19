# services/classroom_service.py

from typing import List, Optional
from sqlalchemy.orm import Session

from models.models import User, Group
from services.base_service import BaseService


class ClassroomService(BaseService[Group]):
    """Service for classroom operations."""
    
    def __init__(self):
        super().__init__(Group)
    
    def get_user_classrooms(
        self,
        db: Session,
        user: User
    ) -> List[Group]:
        """
        Get all classrooms the user is a member of.
        
        Returns a list of Group objects representing classrooms.
        """
        return (
            db.query(Group)
            .filter(Group.members.contains(user))
            .all()
        )
    
    def get_classroom_by_id(
        self,
        db: Session,
        classroom_id: int
    ) -> Optional[Group]:
        """
        Get a specific classroom by ID.
        
        Returns None if not found.
        """
        return (
            db.query(Group)
            .filter(Group.id == classroom_id)
            .first()
        )
    
    def get_classroom_member_ids(
        self,
        db: Session,
        classroom_id: int
    ) -> List[int]:
        """
        Get the IDs of all members in a classroom.
        
        Returns an empty list if classroom not found.
        """
        classroom = self.get_classroom_by_id(db, classroom_id)
        
        if not classroom:
            return []
        
        return [member.id for member in classroom.members]
    
    def is_user_member(
        self,
        db: Session,
        user: User,
        classroom_id: int
    ) -> bool:
        """Check if a user is a member of a specific classroom."""
        classroom = self.get_classroom_by_id(db, classroom_id)
        
        if not classroom:
            return False
        
        return user in classroom.members


# Singleton instance for easy importing
classroom_service = ClassroomService()