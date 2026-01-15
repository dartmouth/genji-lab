from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from database import get_db
from schemas.users import User, UserCreate, UserUpdate
from services.user_service import user_service

router = APIRouter(
    prefix="/api/v1/users",
    tags=["users"],
    responses={404: {"description": "Not found"}},
)


@router.post("/", response_model=User, status_code=status.HTTP_201_CREATED)
def create_user(
    user: UserCreate,
    db: Session = Depends(get_db)
):
    """Create a new user."""
    return user_service.create(db, user.dict(exclude_unset=True))


@router.get("/", response_model=List[User])
def read_users(
    skip: int = 0,
    limit: int = 100,
    first_name: Optional[str] = None,
    last_name: Optional[str] = None,
    name_search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Retrieve users with optional filtering (includes roles via joinedload)."""
    return user_service.list(
        db=db,
        skip=skip,
        limit=limit,
        first_name=first_name,
        last_name=last_name,
        name_search=name_search
    )


@router.get("/{user_id}", response_model=User)
def read_user(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific user by ID (includes roles via joinedload)."""
    return user_service.get_by_id(db, user_id)


@router.put("/{user_id}", response_model=User)
def update_user(
    user_id: int,
    user: UserUpdate,
    db: Session = Depends(get_db)
):
    """Update a user (includes roles in response)."""
    return user_service.update(db, user_id, user.dict(exclude_unset=True))


@router.patch("/{user_id}", response_model=User)
def partial_update_user(
    user_id: int,
    user_data: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """Partially update a user (includes roles in response)."""
    return user_service.partial_update(db, user_id, user_data)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Delete a user."""
    user_service.delete(db, user_id)
    return None