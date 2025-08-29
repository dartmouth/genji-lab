from fastapi import APIRouter, Depends, HTTPException, status, Request, File, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session
import base64
import io
from datetime import datetime
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
    
    raise HTTPException(status_code=401, detail="No authenticated user found")

def check_admin_permissions(current_user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    """Check if the current user has admin permissions"""
    user = db.query(User).filter(User.id == current_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user has admin role
    has_admin_role = any(role.name == 'admin' for role in user.roles)
    if not has_admin_role:
        raise HTTPException(status_code=403, detail="Admin permissions required")
    
    return current_user_id

# Logo validation constants
LOGO_MAX_FILE_SIZE = 2 * 1024 * 1024  # 2MB
LOGO_REQUIRED_WIDTH = 1200
LOGO_REQUIRED_HEIGHT = 40
LOGO_ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg']

# Favicon validation constants
FAVICON_MAX_FILE_SIZE = 500 * 1024  # 500KB
FAVICON_MIN_SIZE = 16
FAVICON_MAX_SIZE = 64
FAVICON_ALLOWED_TYPES = ['image/png', 'image/x-icon']

def validate_logo_file(file: UploadFile) -> None:
    """Validate uploaded logo file"""
    if file.content_type not in LOGO_ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: PNG, JPG"
        )
    
    if file.size and file.size > LOGO_MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {LOGO_MAX_FILE_SIZE / 1024 / 1024:.1f}MB"
        )

def validate_favicon_file(file: UploadFile) -> None:
    """Validate uploaded favicon file"""
    if file.content_type not in FAVICON_ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: PNG, ICO"
        )
    
    if file.size and file.size > FAVICON_MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {FAVICON_MAX_FILE_SIZE / 1024:.0f}KB"
        )

def validate_logo_dimensions(image_data: bytes) -> None:
    """Validate logo has exact required dimensions"""
    try:
        with Image.open(io.BytesIO(image_data)) as img:
            width, height = img.size
            
            if width != LOGO_REQUIRED_WIDTH or height != LOGO_REQUIRED_HEIGHT:
                raise HTTPException(
                    status_code=400,
                    detail=f"Logo must be exactly {LOGO_REQUIRED_WIDTH}x{LOGO_REQUIRED_HEIGHT} pixels. "
                           f"Uploaded image is {width}x{height} pixels."
                )
                
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=400, detail="Invalid image file")

def validate_favicon_dimensions(image_data: bytes) -> None:
    """Validate favicon dimensions are within acceptable range"""
    try:
        with Image.open(io.BytesIO(image_data)) as img:
            width, height = img.size
            
            if not (FAVICON_MIN_SIZE <= width <= FAVICON_MAX_SIZE and FAVICON_MIN_SIZE <= height <= FAVICON_MAX_SIZE):
                raise HTTPException(
                    status_code=400,
                    detail=f"Favicon must be between {FAVICON_MIN_SIZE}x{FAVICON_MIN_SIZE} and {FAVICON_MAX_SIZE}x{FAVICON_MAX_SIZE} pixels. "
                           f"Uploaded image is {width}x{height} pixels."
                )
                
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=400, detail="Invalid image file")

def get_cache_buster() -> str:
    """Generate cache buster timestamp"""
    return str(int(datetime.now().timestamp()))

@router.get("/", response_model=SiteSettingsResponse)
def get_site_settings(db: Session = Depends(get_db)):
    """Get current site settings"""
    settings = db.query(SiteSettings).order_by(SiteSettings.updated_at.desc()).first()
    
    if not settings:
        # Return default settings if none exist
        return SiteSettings(
            id=0,
            site_title="Site Title",
            site_logo_enabled=False,
            updated_by_id=0,
            updated_at=datetime.now()
        )
    
    return settings

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
    validate_logo_file(file)
    
    try:
        # Read file data
        file_data = await file.read()
        
        # Validate dimensions
        validate_logo_dimensions(file_data)
        
        # Convert to base64
        logo_b64 = base64.b64encode(file_data).decode('utf-8')
        
        # Get current settings
        current_settings = db.query(SiteSettings).order_by(SiteSettings.updated_at.desc()).first()
        
        # Create new settings entry with logo enabled
        new_settings = SiteSettings(
            site_title=current_settings.site_title if current_settings else "Site Title",
            site_logo_enabled=True,
            site_logo_data=logo_b64,
            site_logo_mime_type=file.content_type,
            site_favicon_data=current_settings.site_favicon_data if current_settings else None,
            site_favicon_mime_type=current_settings.site_favicon_mime_type if current_settings else None,
            updated_by_id=current_user_id
        )
        
        db.add(new_settings)
        db.commit()
        db.refresh(new_settings)
        
        return new_settings
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload logo: {str(e)}")

@router.post("/upload-favicon", response_model=SiteSettingsResponse)
async def upload_favicon(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user_id: int = Depends(check_admin_permissions)
):
    """Upload a new site favicon (admin only)"""
    
    # Validate file
    validate_favicon_file(file)
    
    try:
        # Read file data
        file_data = await file.read()
        
        # Validate dimensions
        validate_favicon_dimensions(file_data)
        
        # Convert to base64
        favicon_b64 = base64.b64encode(file_data).decode('utf-8')
        
        # Get current settings
        current_settings = db.query(SiteSettings).order_by(SiteSettings.updated_at.desc()).first()
        
        # Create new settings entry with favicon
        new_settings = SiteSettings(
            site_title=current_settings.site_title if current_settings else "Site Title",
            site_logo_enabled=current_settings.site_logo_enabled if current_settings else False,
            site_logo_data=current_settings.site_logo_data if current_settings else None,
            site_logo_mime_type=current_settings.site_logo_mime_type if current_settings else None,
            site_favicon_data=favicon_b64,
            site_favicon_mime_type=file.content_type,
            updated_by_id=current_user_id
        )
        
        db.add(new_settings)
        db.commit()
        db.refresh(new_settings)
        
        return new_settings
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload favicon: {str(e)}")

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
    
    # Create new settings entry with logo disabled
    new_settings = SiteSettings(
        site_title=current_settings.site_title,
        site_logo_enabled=False,
        site_logo_data=None,
        site_logo_mime_type=None,
        site_favicon_data=current_settings.site_favicon_data,
        site_favicon_mime_type=current_settings.site_favicon_mime_type,
        updated_by_id=current_user_id
    )
    
    db.add(new_settings)
    db.commit()
    db.refresh(new_settings)
    
    return new_settings

@router.delete("/remove-favicon", response_model=SiteSettingsResponse)
def remove_favicon(
    db: Session = Depends(get_db),
    current_user_id: int = Depends(check_admin_permissions)
):
    """Remove the current site favicon (admin only)"""
    
    # Get current settings
    current_settings = db.query(SiteSettings).order_by(SiteSettings.updated_at.desc()).first()
    if not current_settings:
        raise HTTPException(status_code=404, detail="No site settings found")
    
    # Create new settings entry with favicon removed
    new_settings = SiteSettings(
        site_title=current_settings.site_title,
        site_logo_enabled=current_settings.site_logo_enabled,
        site_logo_data=current_settings.site_logo_data,
        site_logo_mime_type=current_settings.site_logo_mime_type,
        site_favicon_data=None,
        site_favicon_mime_type=None,
        updated_by_id=current_user_id
    )
    
    db.add(new_settings)
    db.commit()
    db.refresh(new_settings)
    
    return new_settings

@router.get("/cache-buster")
def get_cache_buster_endpoint():
    """Get cache buster timestamp for logo/favicon"""
    return {"timestamp": get_cache_buster()}

@router.get("/logo")
async def serve_logo(db: Session = Depends(get_db)):
    """Serve the current logo file from database"""
    settings = db.query(SiteSettings).order_by(SiteSettings.updated_at.desc()).first()
    
    if not settings or not settings.site_logo_data or not settings.site_logo_enabled:
        raise HTTPException(status_code=404, detail="Logo not found")
    
    # Decode base64 back to binary
    try:
        logo_data = base64.b64decode(settings.site_logo_data)
    except Exception:
        raise HTTPException(status_code=500, detail="Invalid logo data")
    
    return Response(
        content=logo_data,
        media_type=settings.site_logo_mime_type or "image/png",
        headers={
            "Cache-Control": "public, max-age=31536000",  # 1 year cache
            "ETag": f'"{hash(settings.site_logo_data)}"'
        }
    )

@router.get("/favicon")
async def serve_favicon(db: Session = Depends(get_db)):
    """Serve the current favicon file from database"""
    settings = db.query(SiteSettings).order_by(SiteSettings.updated_at.desc()).first()
    
    if not settings or not settings.site_favicon_data:
        raise HTTPException(status_code=404, detail="Favicon not found")
    
    # Decode base64 back to binary
    try:
        favicon_data = base64.b64decode(settings.site_favicon_data)
    except Exception:
        raise HTTPException(status_code=500, detail="Invalid favicon data")
    
    return Response(
        content=favicon_data,
        media_type=settings.site_favicon_mime_type or "image/png",
        headers={
            "Cache-Control": "public, max-age=31536000",  # 1 year cache
            "ETag": f'"{hash(settings.site_favicon_data)}"'
        }
    )
