from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete

from database import get_db
from models.models import User as UserModel
from schemas.users import User, UserCreate, UserUpdate

router = APIRouter(
    prefix="/api/v1/users",
    tags=["users"],
    responses={404: {"description": "Not found"}},
)

@router.post("/", response_model=User, status_code=status.HTTP_201_CREATED)
def create_user(user: UserCreate, db: AsyncSession = Depends(get_db)):
    """
    Create a new user
    """
    db_user = UserModel(**user.dict(exclude_unset=True))
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.get("/", response_model=List[User])
def read_users(
    skip: int = 0, 
    limit: int = 100, 
    first_name: Optional[str] = None,
    last_name: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve users with optional filtering
    """
    query = select(UserModel)
    
    # Apply filters if provided
    if first_name:
        query = query.filter(UserModel.first_name.ilike(f"%{first_name}%"))
    if last_name:
        query = query.filter(UserModel.last_name.ilike(f"%{last_name}%"))
    
    # Apply pagination
    query = query.offset(skip).limit(limit)
    
    result = db.execute(query)
    users = result.scalars().all()
    return users

@router.get("/{user_id}", response_model=User)
def read_user(user_id: int, db: AsyncSession = Depends(get_db)):
    """
    Get a specific user by ID
    """
    user = db.execute(select(UserModel).filter(UserModel.id == user_id)).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/{user_id}", response_model=User)
def update_user(user_id: int, user: UserUpdate, db: AsyncSession = Depends(get_db)):
    """
    Update a user
    """
    db_user = db.execute(select(UserModel).filter(UserModel.id == user_id)).scalar_one_or_none()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update user attributes
    update_data = user.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_user, key, value)
    
    db.commit()
    db.refresh(db_user)
    return db_user

@router.patch("/{user_id}", response_model=User)
def partial_update_user(
    user_id: int, 
    user_data: Dict[str, Any], 
    db: AsyncSession = Depends(get_db)
):
    """
    Partially update a user
    """
    db_user = db.execute(select(UserModel).filter(UserModel.id == user_id)).scalar_one_or_none()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update only provided fields
    for key, value in user_data.items():
        if hasattr(db_user, key):
            setattr(db_user, key, value)
    
    db.commit()
    db.refresh(db_user)
    return db_user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: AsyncSession = Depends(get_db)):
    """
    Delete a user
    """
    db_user = db.execute(select(UserModel).filter(UserModel.id == user_id)).scalar_one_or_none()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(db_user)
    db.commit()
    return None