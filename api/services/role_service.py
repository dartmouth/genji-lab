# services/role_service.py

from typing import List
from fastapi import HTTPException
from sqlalchemy.orm import Session

from models.models import Role as RoleModel
from services.base_service import BaseService


class RoleService(BaseService[RoleModel]):
    """Service for role-related operations."""
    
    def __init__(self):
        super().__init__(RoleModel)
    
    # ==================== Query Operations ====================
    
    def list(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100
    ) -> List[RoleModel]:
        """
        Get all roles sorted alphabetically by name with pagination.
        """
        query = (
            self.get_base_query(db)
            .order_by(RoleModel.name)
            .offset(skip)
            .limit(limit)
        )
        
        return query.all()
    
    def get_by_id(
        self,
        db: Session,
        role_id: int
    ) -> RoleModel:
        """
        Get a specific role by ID.
        
        Raises HTTPException 404 if not found.
        """
        role = (
            self.get_base_query(db)
            .filter(RoleModel.id == role_id)
            .first()
        )
        
        if role is None:
            raise HTTPException(status_code=404, detail="Role not found")
        
        return role


# Singleton instance for easy importing
role_service = RoleService()