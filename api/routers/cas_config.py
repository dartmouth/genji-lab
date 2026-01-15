"""
CAS Configuration management endpoints.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import models
from routers.auth import get_current_user
from schemas.cas_config import CASConfigUpdate, CASConfigResponse
from services.cas_config_service import cas_config_service

router = APIRouter(prefix="/api/v1")


@router.get("/cas-config", response_model=CASConfigResponse)
async def get_cas_config(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Get the current CAS configuration.
    Returns default values if no configuration exists.
    """
    return cas_config_service.get(db)


@router.put("/cas-config", response_model=CASConfigResponse)
async def update_cas_config(
    config_update: CASConfigUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Create or update CAS configuration.
    Only one configuration can exist at a time.
    """
    return cas_config_service.create_or_update(db, config_update, current_user)


@router.get("/cas-config/public", response_model=dict)
async def get_public_cas_config(db: Session = Depends(get_db)):
    """
    Get public CAS configuration (no authentication required).
    Returns only enabled status and display name.
    """
    return cas_config_service.get_public(db)