# services/user_service.py

from typing import List, Optional, Dict, Any
from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select

from models.models import User as UserModel, Role as RoleModel
from services.base_service import BaseService


class UserService(BaseService[UserModel]):
    """Service for user CRUD operations."""
    
    def __init__(self):
        super().__init__(UserModel)
    
    # ==================== Helper Methods ====================
    
    def _get_user_query(self, db: Session):
        """Get base query with roles eagerly loaded."""
        return select(UserModel).options(joinedload(UserModel.roles))
    
    def _get_user_or_404(self, db: Session, user_id: int) -> UserModel:
        """
        Get a user by ID or raise 404.
        
        Raises HTTPException 404 if not found.
        """
        query = self._get_user_query(db).filter(UserModel.id == user_id)
        result = db.execute(query)
        user = result.scalars().unique().first()
        
        if user is None:
            raise HTTPException(status_code=404, detail="User not found")
        
        return user
    
    def _apply_name_filters(
        self,
        query,
        first_name: Optional[str],
        last_name: Optional[str],
        name_search: Optional[str]
    ):
        """Apply name-based filters to a query."""
        if first_name:
            query = query.filter(UserModel.first_name.ilike(f"%{first_name}%"))
        
        if last_name:
            query = query.filter(UserModel.last_name.ilike(f"%{last_name}%"))
        
        if name_search:
            search_terms = name_search.strip().split()
            for term in search_terms:
                term_filter = f"%{term}%"
                query = query.filter(
                    (UserModel.first_name.ilike(term_filter)) |
                    (UserModel.last_name.ilike(term_filter))
                )
        
        return query
    
    def _update_user_roles(
        self,
        db: Session,
        user: UserModel,
        role_ids: List[int]
    ) -> None:
        """Update user's roles from a list of role IDs."""
        roles_query = select(RoleModel).filter(RoleModel.id.in_(role_ids))
        roles_result = db.execute(roles_query)
        roles = roles_result.scalars().all()
        user.roles = roles
    
    # ==================== CRUD Operations ====================
    
    def create(
        self,
        db: Session,
        user_data: Dict[str, Any]
    ) -> UserModel:
        """Create a new user."""
        db_user = UserModel(**user_data)
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user
    
    def get_by_id(
        self,
        db: Session,
        user_id: int
    ) -> UserModel:
        """
        Get a specific user by ID with roles.
        
        Raises HTTPException 404 if not found.
        """
        return self._get_user_or_404(db, user_id)
    
    def list(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        name_search: Optional[str] = None
    ) -> List[UserModel]:
        """Get users with optional filtering and pagination."""
        query = self._get_user_query(db)
        
        # Apply name filters
        query = self._apply_name_filters(query, first_name, last_name, name_search)
        
        # Apply pagination
        query = query.offset(skip).limit(limit)
        
        result = db.execute(query)
        return result.scalars().unique().all()
    
    def update(
        self,
        db: Session,
        user_id: int,
        user_data: Dict[str, Any]
    ) -> UserModel:
        """
        Update a user (full update).
        
        Raises HTTPException 404 if not found.
        """
        db_user = self._get_user_or_404(db, user_id)
        
        for key, value in user_data.items():
            if hasattr(db_user, key):
                setattr(db_user, key, value)
        
        db.commit()
        db.refresh(db_user)
        return db_user
    
    def partial_update(
        self,
        db: Session,
        user_id: int,
        user_data: Dict[str, Any]
    ) -> UserModel:
        """
        Partially update a user (handles roles separately).
        
        Raises HTTPException 404 if not found.
        """
        db_user = self._get_user_or_404(db, user_id)
        
        # Handle roles separately if provided
        if 'roles' in user_data:
            role_ids = user_data.pop('roles')
            self._update_user_roles(db, db_user, role_ids)
        
        # Update other provided fields
        for key, value in user_data.items():
            if hasattr(db_user, key):
                setattr(db_user, key, value)
        
        db.commit()
        db.refresh(db_user)
        return db_user
    
    def delete(
        self,
        db: Session,
        user_id: int
    ) -> None:
        """
        Delete a user.
        
        Raises HTTPException 404 if not found.
        """
        query = select(UserModel).filter(UserModel.id == user_id)
        result = db.execute(query)
        db_user = result.scalar_one_or_none()
        
        if db_user is None:
            raise HTTPException(status_code=404, detail="User not found")
        
        db.delete(db_user)
        db.commit()


# Singleton instance for easy importing
user_service = UserService()