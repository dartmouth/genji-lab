"""
OIDC Configuration management endpoints.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import models
from routers.auth import get_current_user
from schemas.oidc_config import OIDCConfigUpdate, OIDCConfigResponse
from services.oidc_config_service import oidc_config_service

router = APIRouter(prefix="/api/v1")


@router.get("/oidc-config", response_model=OIDCConfigResponse)
async def get_oidc_config(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Get the current OIDC configuration.
    Returns default values if no configuration exists.
    """
    return oidc_config_service.get(db)


@router.put("/oidc-config", response_model=OIDCConfigResponse)
async def update_oidc_config(
    config_update: OIDCConfigUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Create or update OIDC configuration.
    Only one configuration can exist at a time.
    """
    return oidc_config_service.create_or_update(db, config_update, current_user)


@router.get("/oidc-config/public", response_model=dict)
async def get_public_oidc_config(db: Session = Depends(get_db)):
    """
    Get public OIDC configuration (no authentication required).
    Returns only enabled status and button label.
    """
    return oidc_config_service.get_public(db)
