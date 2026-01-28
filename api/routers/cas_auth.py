"""
CAS (Central Authentication Service) authentication endpoints.
Uses shared utilities from auth_utils for consistency with basic auth.
"""

from sqlalchemy.orm import Session

from fastapi import APIRouter, Request, Depends

from database import get_db
from schemas.auth import TicketValidation, UserResponse

from services.cas_auth_service import cas_auth_service

router = APIRouter(prefix="/api/v1", tags=["authentication"])


# ==================== CAS Authentication Endpoint ====================
@router.post("/validate-cas-ticket", response_model=UserResponse)
async def validate_cas_ticket(
    data: TicketValidation, request: Request, db: Session = Depends(get_db)
):
    return await cas_auth_service.validate_cas_ticket(db=db, data=data, request=request)
