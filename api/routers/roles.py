from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from schemas.roles import Role
from services.role_service import role_service

router = APIRouter(
    prefix="/api/v1/roles",
    tags=["roles"],
    responses={404: {"description": "Not found"}},
)


@router.get("/", response_model=List[Role])
def read_roles(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Retrieve all roles sorted alphabetically by name."""
    return role_service.list(db, skip=skip, limit=limit)


@router.get("/{role_id}", response_model=Role)
def read_role(
    role_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific role by ID."""
    return role_service.get_by_id(db, role_id)