from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from database import get_db
from models.models import Role as RoleModel
from schemas.roles import Role

router = APIRouter(
    prefix="/api/v1/roles",
    tags=["roles"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=List[Role])
async def read_roles(
    skip: int = 0, 
    limit: int = 100, 
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve all roles sorted alphabetically by name
    """
    query = select(RoleModel).order_by(RoleModel.name).offset(skip).limit(limit)
    
    result = db.execute(query)
    roles = result.scalars().all()
    return roles

@router.get("/{role_id}", response_model=Role)
async def read_role(role_id: int, db: AsyncSession = Depends(get_db)):
    """
    Get a specific role by ID
    """
    query = select(RoleModel).filter(RoleModel.id == role_id)
    result = db.execute(query)
    role = result.scalar_one_or_none()
    if role is None:
        raise HTTPException(status_code=404, detail="Role not found")
    return role
