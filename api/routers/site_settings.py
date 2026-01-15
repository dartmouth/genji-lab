from fastapi import APIRouter, Depends, Request, File, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session

from database import get_db
from models.models import User
from schemas.site_settings import SiteSettingsResponse, SiteSettingsUpdate
from services.site_settings_service import site_settings_service

router = APIRouter(
    prefix="/api/v1/site-settings",
    tags=["site-settings"]
)


# ==================== Dependencies ====================

def get_current_user_id(request: Request, db: Session = Depends(get_db)) -> int:
    """
    Extract current user ID from the frontend authentication.
    """
    # First, try to get user ID from the X-User-ID header sent by frontend
    user_id_header = request.headers.get("X-User-ID")
    if user_id_header:
        try:
            user_id = int(user_id_header)
            # Verify this user exists in the database
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                return user_id
        except ValueError:
            pass
    
    # Fallback: get the first admin user from the database (for development)
    admin_user = db.query(User).join(User.roles).filter(
        User.roles.any(name='admin')
    ).first()
    
    if admin_user:
        return admin_user.id
    
    # Last resort: get any user
    any_user = db.query(User).first()
    if any_user:
        return any_user.id
    
    from fastapi import HTTPException
    raise HTTPException(status_code=401, detail="No authenticated user found")


# ==================== Routes ====================

@router.get("/", response_model=SiteSettingsResponse)
def get_site_settings(db: Session = Depends(get_db)):
    """Get current site settings."""
    return site_settings_service.get_settings(db)


@router.put("/", response_model=SiteSettingsResponse)
def update_site_settings(
    settings_update: SiteSettingsUpdate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Update site settings (admin only)."""
    return site_settings_service.update_settings(
        db=db,
        user_id=current_user_id,
        site_title=settings_update.site_title,
        site_logo_enabled=settings_update.site_logo_enabled
    )


@router.get("/cache-buster")
def get_cache_buster_endpoint():
    """Get cache buster timestamp for logo/favicon."""
    return {"timestamp": site_settings_service.get_cache_buster()}


@router.get("/logo")
def serve_logo(db: Session = Depends(get_db)):
    """Serve the current logo file from database."""
    logo_data = site_settings_service.get_logo(db)
    
    return Response(
        content=logo_data["data"],
        media_type=logo_data["mime_type"],
        headers={
            "Cache-Control": "public, max-age=31536000",
            "ETag": logo_data["etag"]
        }
    )


@router.get("/favicon")
def serve_favicon(db: Session = Depends(get_db)):
    """Serve the current favicon file from database."""
    favicon_data = site_settings_service.get_favicon(db)
    
    return Response(
        content=favicon_data["data"],
        media_type=favicon_data["mime_type"],
        headers={
            "Cache-Control": "public, max-age=31536000",
            "ETag": favicon_data["etag"]
        }
    )


@router.post("/upload-logo", response_model=SiteSettingsResponse)
async def upload_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Upload a new site logo (admin only)."""
    return await site_settings_service.upload_logo(db, current_user_id, file)


@router.post("/upload-favicon", response_model=SiteSettingsResponse)
async def upload_favicon(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Upload a new site favicon (admin only)."""
    return await site_settings_service.upload_favicon(db, current_user_id, file)


@router.delete("/remove-logo", response_model=SiteSettingsResponse)
def remove_logo(
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Remove the current site logo (admin only)."""
    return site_settings_service.remove_logo(db, current_user_id)


@router.delete("/remove-favicon", response_model=SiteSettingsResponse)
def remove_favicon(
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Remove the current site favicon (admin only)."""
    return site_settings_service.remove_favicon(db, current_user_id)