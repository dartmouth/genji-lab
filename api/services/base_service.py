# services/base_service.py

from typing import TypeVar, Generic, Optional, Type
from sqlalchemy.orm import Session, Query

ModelType = TypeVar("ModelType")


class BaseService(Generic[ModelType]):
    """
    Base service class providing common patterns for all services.
    
    Provides:
    - Classroom filtering logic
    - Common query building utilities
    """
    
    def __init__(self, model: Type[ModelType]):
        self.model = model
    
    def apply_classroom_filter(
        self, 
        query: Query, 
        classroom_id: Optional[int],
        classroom_id_field: str = "classroom_id"
    ) -> Query:
        """
        Apply classroom filtering to a query.
        
        When classroom_id is provided, filter to that classroom.
        When classroom_id is None, filter to records with no classroom (global).
        """
        field = getattr(self.model, classroom_id_field)
        
        if classroom_id is not None:
            return query.filter(field == classroom_id)
        else:
            return query.filter(field.is_(None))
    
    def get_base_query(self, db: Session) -> Query:
        """Get a base query for the model."""
        return db.query(self.model)