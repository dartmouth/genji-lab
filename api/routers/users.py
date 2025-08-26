from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, update, delete
from sqlalchemy.orm import joinedload  # Add this import

from database import get_db
from models.models import User as UserModel, Role as RoleModel
from schemas.users import User, UserCreate, UserUpdate

router = APIRouter(
    prefix="/api/v1/users",
    tags=["users"],
    responses={404: {"description": "Not found"}},
)

@router.post("/", response_model=User, status_code=status.HTTP_201_CREATED)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
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
    name_search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Retrieve users with optional filtering (includes roles via joinedload)
    """
    query = select(UserModel).options(joinedload(UserModel.roles))  # Add joinedload here
    
    # Apply filters if provided
    if first_name:
        query = query.filter(UserModel.first_name.ilike(f"%{first_name}%"))
    if last_name:
        query = query.filter(UserModel.last_name.ilike(f"%{last_name}%"))
    
    # Apply name search filter (searches both first and last name)
    if name_search:
        search_terms = name_search.strip().split()
        for term in search_terms:
            term_filter = f"%{term}%"
            query = query.filter(
                (UserModel.first_name.ilike(term_filter)) | 
                (UserModel.last_name.ilike(term_filter))
            )
    # Apply pagination
    query = query.offset(skip).limit(limit)
    
    result = db.execute(query)
    users = result.scalars().unique().all() 
    return users

@router.get("/{user_id}", response_model=User)
def read_user(user_id: int, db: Session = Depends(get_db)):
    """
    Get a specific user by ID (includes roles via joinedload)
    """
    query = select(UserModel).options(joinedload(UserModel.roles)).filter(UserModel.id == user_id)  # Add joinedload here
    result = db.execute(query)
    user = result.scalars().unique().first() 
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/{user_id}", response_model=User)
def update_user(user_id: int, user: UserUpdate, db: Session = Depends(get_db)):
    """
    Update a user (includes roles in response)
    """
    # First get the user with roles
    query = select(UserModel).options(joinedload(UserModel.roles)).filter(UserModel.id == user_id)
    result = db.execute(query)
    db_user = result.scalars().unique().first() 
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
    db: Session = Depends(get_db)
):
    """
    Partially update a user (includes roles in response)
    """
    # First get the user with roles
    query = select(UserModel).options(joinedload(UserModel.roles)).filter(UserModel.id == user_id)
    result = db.execute(query)
    db_user = result.scalars().unique().first() 
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Handle roles separately if provided
    if 'roles' in user_data:
        role_ids = user_data.pop('roles')  # Remove from user_data to handle separately
        
        # Fetch the actual Role objects
        roles_query = select(RoleModel).filter(RoleModel.id.in_(role_ids))
        roles_result = db.execute(roles_query)
        roles = roles_result.scalars().all()
        
        # Update the user's roles
        db_user.roles = roles
    
    # Update other provided fields
    for key, value in user_data.items():
        if hasattr(db_user, key):
            setattr(db_user, key, value)
    
    db.commit()
    db.refresh(db_user)
    return db_user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: Session = Depends(get_db)):
    """
    Delete a user
    """
    result = db.execute(select(UserModel).filter(UserModel.id == user_id))
    db_user = result.scalar_one_or_none()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(db_user)
    db.commit()
    return None