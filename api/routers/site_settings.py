from fastapi import APIRouter, Depends, HTTPException, status, Request, File, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
import json
import base64
import os
import shutil
from datetime import datetime
from pathlib import Path
from PIL import Image

from database import get_db
from models.models import SiteSettings, User
from schemas.site_settings import SiteSettingsResponse, SiteSettingsUpdate

router = APIRouter(
    prefix="/api/v1/site-settings",
    tags=["site-settings"]
)

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
    
    raise HTTPException(
        status_code=401, 
        detail="No authenticated user found. Please ensure you are logged in."
    )

def check_admin_permissions(current_user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    """Check if the current user has admin permissions"""
    user = db.query(User).filter(User.id == current_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user has admin role
    is_admin = any(role.name == 'admin' for role in user.roles)
    if not is_admin:
        raise HTTPException(
            status_code=403, 
            detail="Admin privileges required to modify site settings"
        )
    
    return current_user_id

# File upload constants
UPLOADS_DIR = Path("/app/uploads")
LOGO_FILE_PATH = UPLOADS_DIR / "logo.png"
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg"}
MAX_FILE_SIZE = 2 * 1024 * 1024  # 2MB
REQUIRED_WIDTH = 1200  # Full header width at common screen sizes
REQUIRED_HEIGHT = 40   # Header height minus padding (2.5rem ≈ 40px)

# Ensure uploads directory exists
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

def validate_image_file(file: UploadFile) -> None:
    """Validate uploaded image file"""
    # Check file extension
    file_ext = Path(file.filename or "").suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Check file size
    if file.size and file.size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE / 1024 / 1024:.1f}MB"
        )

def validate_image_dimensions(file_path: Path) -> None:
    """Validate image has exact required dimensions"""
    try:
        with Image.open(file_path) as img:
            width, height = img.size
            
            if width != REQUIRED_WIDTH or height != REQUIRED_HEIGHT:
                raise HTTPException(
                    status_code=400,
                    detail=f"Image must be exactly {REQUIRED_WIDTH}x{REQUIRED_HEIGHT} pixels. "
                           f"Uploaded image is {width}x{height} pixels."
                )
                
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=400, detail="Invalid image file")

def delete_current_logo() -> None:
    """Delete the current logo file if it exists"""
    if LOGO_FILE_PATH.exists():
        LOGO_FILE_PATH.unlink()

def get_logo_cache_buster() -> str:
    """Generate cache buster timestamp"""
    return str(int(datetime.now().timestamp()))

@router.get("/", response_model=SiteSettingsResponse)
def get_site_settings(db: Session = Depends(get_db)):
    """Get current site settings"""
    try:
        # Get the most recent site settings entry
        site_settings = db.query(SiteSettings).order_by(SiteSettings.updated_at.desc()).first()
        
        if not site_settings:
            # Create and save default settings if none exist
            # Find any user to use as the default
            any_user = db.query(User).first()
            user_id = any_user.id if any_user else 1
            
            default_settings = SiteSettings(
                site_title="Site Title",
                site_logo_enabled=False,
                updated_by_id=user_id,
            )
            
            db.add(default_settings)
            db.commit()
            db.refresh(default_settings)
            return default_settings
        
        return site_settings
        
    except Exception as e:
        # If there's a database schema issue, return a minimal response
        raise HTTPException(
            status_code=500, 
            detail=f"Database schema error. Please run migrations: {str(e)}"
        )

@router.put("/", response_model=SiteSettingsResponse)
def update_site_settings(
    settings_update: SiteSettingsUpdate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(check_admin_permissions)
):
    """Update site settings (admin only)"""
    
    # Create new settings entry (we keep history)
    new_settings = SiteSettings(
        site_title=settings_update.site_title,
        site_logo_enabled=settings_update.site_logo_enabled,
        updated_by_id=current_user_id
    )
    
    db.add(new_settings)
    db.commit()
    db.refresh(new_settings)
    
    return new_settings

@router.post("/upload-logo", response_model=SiteSettingsResponse)
async def upload_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user_id: int = Depends(check_admin_permissions)
):
    """Upload a new site logo (admin only)"""
    
    # Validate file
    validate_image_file(file)
    
    try:
        # Delete current logo if it exists
        delete_current_logo()
        
        # Save file as logo.png
        with open(LOGO_FILE_PATH, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Validate and resize image if needed
        validate_image_dimensions(LOGO_FILE_PATH)
        
        # Get current settings
        current_settings = db.query(SiteSettings).order_by(SiteSettings.updated_at.desc()).first()
        
        # Create new settings entry with logo enabled
        new_settings = SiteSettings(
            site_title=current_settings.site_title if current_settings else "Site Title",
            site_logo_enabled=True,
            updated_by_id=current_user_id
        )
        
        db.add(new_settings)
        db.commit()
        db.refresh(new_settings)
        
        return new_settings
        
    except HTTPException:
        # If validation failed, delete the uploaded file
        if LOGO_FILE_PATH.exists():
            LOGO_FILE_PATH.unlink()
        raise
    except Exception as e:
        # Clean up uploaded file on error
        if LOGO_FILE_PATH.exists():
            LOGO_FILE_PATH.unlink()
        raise HTTPException(status_code=500, detail=f"Failed to upload logo: {str(e)}")

@router.delete("/remove-logo", response_model=SiteSettingsResponse)
def remove_logo(
    db: Session = Depends(get_db),
    current_user_id: int = Depends(check_admin_permissions)
):
    """Remove the current site logo (admin only)"""
    
    # Get current settings
    current_settings = db.query(SiteSettings).order_by(SiteSettings.updated_at.desc()).first()
    if not current_settings:
        raise HTTPException(status_code=404, detail="No site settings found")
    
    # Delete logo file
    delete_current_logo()
    
    # Create new settings entry with logo disabled
    new_settings = SiteSettings(
        site_title=current_settings.site_title,
        site_logo_enabled=False,
        updated_by_id=current_user_id
    )
    
    db.add(new_settings)
    db.commit()
    db.refresh(new_settings)
    
    return new_settings

@router.get("/cache-buster")
def get_cache_buster():
    """Get cache buster timestamp for logo"""
    return {"timestamp": get_logo_cache_buster()}

@router.get("/logo")
async def serve_logo():
    """Serve the current logo file"""
    if not LOGO_FILE_PATH.exists():
        raise HTTPException(status_code=404, detail="Logo file not found")
    
    return FileResponse(
        path=str(LOGO_FILE_PATH),
        media_type="image/png",
        filename="logo.png"
    )
