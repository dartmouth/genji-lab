# services/site_settings_service.py

import base64
import io
from typing import Optional, Dict, Any
from datetime import datetime
from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from PIL import Image
from typing import List
from models.models import SiteSettings, User
from services.base_service import BaseService


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


class SiteSettingsService(BaseService[SiteSettings]):
    """Service for site settings operations."""
    
    def __init__(self):
        super().__init__(SiteSettings)
    
    # ==================== Helper Methods ====================
    
    def _get_current_settings(self, db: Session) -> Optional[SiteSettings]:
        """Get the most recent site settings."""
        return (
            db.query(SiteSettings)
            .order_by(SiteSettings.updated_at.desc())
            .first()
        )
    
    def _get_current_settings_or_404(self, db: Session) -> SiteSettings:
        """
        Get current settings or raise 404.
        
        Raises HTTPException 404 if no settings found.
        """
        settings = self._get_current_settings(db)
        if not settings:
            raise HTTPException(status_code=404, detail="No site settings found")
        return settings
    
    def _check_admin_permission(self, db: Session, user_id: int) -> User:
        """
        Verify user exists and has admin role.
        
        Raises HTTPException 404 if user not found.
        Raises HTTPException 403 if user is not an admin.
        """
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        has_admin_role = any(role.name == 'admin' for role in user.roles)
        if not has_admin_role:
            raise HTTPException(status_code=403, detail="Admin permissions required")
        
        return user
    
    def _validate_logo_file(self, file: UploadFile) -> None:
        """
        Validate uploaded logo file type and size.
        
        Raises HTTPException 400 for invalid files.
        """
        if file.content_type not in LOGO_ALLOWED_TYPES:
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Allowed types: PNG, JPG"
            )
        
        if file.size and file.size > LOGO_MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size: {LOGO_MAX_FILE_SIZE / 1024 / 1024:.1f}MB"
            )
    
    def _validate_logo_dimensions(self, image_data: bytes) -> None:
        """
        Validate logo has exact required dimensions.
        
        Raises HTTPException 400 for invalid dimensions.
        """
        try:
            with Image.open(io.BytesIO(image_data)) as img:
                width, height = img.size
                
                if width != LOGO_REQUIRED_WIDTH or height != LOGO_REQUIRED_HEIGHT:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Logo must be exactly {LOGO_REQUIRED_WIDTH}x{LOGO_REQUIRED_HEIGHT} pixels. "
                               f"Uploaded image is {width}x{height} pixels."
                    )
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid image file")
    
    def _validate_favicon_file(self, file: UploadFile) -> None:
        """
        Validate uploaded favicon file type and size.
        
        Raises HTTPException 400 for invalid files.
        """
        if file.content_type not in FAVICON_ALLOWED_TYPES:
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Allowed types: PNG, ICO"
            )
        
        if file.size and file.size > FAVICON_MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size: {FAVICON_MAX_FILE_SIZE / 1024:.0f}KB"
            )
    
    def _validate_favicon_dimensions(self, image_data: bytes) -> None:
        """
        Validate favicon dimensions are within acceptable range.
        
        Raises HTTPException 400 for invalid dimensions.
        """
        try:
            with Image.open(io.BytesIO(image_data)) as img:
                width, height = img.size
                
                if not (FAVICON_MIN_SIZE <= width <= FAVICON_MAX_SIZE and 
                        FAVICON_MIN_SIZE <= height <= FAVICON_MAX_SIZE):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Favicon must be between {FAVICON_MIN_SIZE}x{FAVICON_MIN_SIZE} and "
                               f"{FAVICON_MAX_SIZE}x{FAVICON_MAX_SIZE} pixels. "
                               f"Uploaded image is {width}x{height} pixels."
                    )
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid image file")
    
    def _create_settings_entry(
        self,
        db: Session,
        user_id: int,
        site_title: str,
        site_logo_enabled: bool = False,
        site_logo_data: Optional[str] = None,
        site_logo_mime_type: Optional[str] = None,
        site_favicon_data: Optional[str] = None,
        site_favicon_mime_type: Optional[str] = None
    ) -> SiteSettings:
        """Create and persist a new settings entry."""
        new_settings = SiteSettings(
            site_title=site_title,
            site_logo_enabled=site_logo_enabled,
            site_logo_data=site_logo_data,
            site_logo_mime_type=site_logo_mime_type,
            site_favicon_data=site_favicon_data,
            site_favicon_mime_type=site_favicon_mime_type,
            updated_by_id=user_id
        )
        
        db.add(new_settings)
        db.commit()
        db.refresh(new_settings)
        
        return new_settings
    def get_metadata_schema(self, db: Session) -> List[Dict[str, Any]]:
        """
        Get the collection metadata schema from site settings.
        
        Returns an empty list if no schema is configured.
        Raises HTTPException 404 if site settings not found.
        """
        from models.models import SiteSettings
        
        site_settings = self._get_current_settings_or_404(db)
        if not site_settings:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Site settings not found"
            )
        
        return site_settings.collection_metadata_schema or []
    # ==================== Query Operations ====================
    def update_metadata_schema(
        self, 
        db: Session, 
        schema: List[Dict[str, Any]],
        user_id: int
    ) -> List[Dict[str, Any]]:
        """
        Update the collection metadata schema in site settings.
        
        Schema format:
        [
            {
                "key": "synopsis",
                "label": "Synopsis",
                "required": true
            },
            ...
        ]
        
        Raises HTTPException 404 if site settings or user not found.
        Raises HTTPException 400 if schema validation fails.
        """
        from models.models import SiteSettings
        
        # Verify user exists
        self._verify_user_exists(db, user_id)
        
        # Validate schema structure
        self._validate_metadata_schema(schema)
        
        # Get or create site settings
        site_settings = db.execute(
            select(SiteSettings).limit(1)
        ).scalar_one_or_none()
        
        if not site_settings:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Site settings not found"
            )
        
        site_settings.collection_metadata_schema = schema
        site_settings.updated_by_id = user_id
        site_settings.updated_at = datetime.now()
        
        db.commit()
        db.refresh(site_settings)
        
        return site_settings.collection_metadata_schema

    def add_metadata_field(
        self,
        db: Session,
        field: Dict[str, Any],
        user_id: int
    ) -> List[Dict[str, Any]]:
        """
        Add a new field to the collection metadata schema.
        
        Raises HTTPException 400 if field with same key already exists.
        """
        current_schema = self.get_metadata_schema(db)
        
        # Check for duplicate key
        if any(f.get('key') == field.get('key') for f in current_schema):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Metadata field with key '{field.get('key')}' already exists"
            )
        
        current_schema.append(field)
        return self.update_metadata_schema(db, current_schema, user_id)

    def update_metadata_field(
        self,
        db: Session,
        field_key: str,
        updated_field: Dict[str, Any],
        user_id: int
    ) -> List[Dict[str, Any]]:
        """
        Update a specific field in the collection metadata schema.
        
        Raises HTTPException 404 if field not found.
        """
        current_schema = self.get_metadata_schema(db)
        
        # Find and update the field
        field_found = False
        for i, field in enumerate(current_schema):
            if field.get('key') == field_key:
                current_schema[i] = updated_field
                field_found = True
                break
        
        if not field_found:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Metadata field with key '{field_key}' not found"
            )
        
        return self.update_metadata_schema(db, current_schema, user_id)

    def delete_metadata_field(
        self,
        db: Session,
        field_key: str,
        user_id: int
    ) -> List[Dict[str, Any]]:
        """
        Delete a field from the collection metadata schema.
        
        Raises HTTPException 404 if field not found.
        """
        current_schema = self.get_metadata_schema(db)
        
        # Filter out the field
        new_schema = [f for f in current_schema if f.get('key') != field_key]
        
        if len(new_schema) == len(current_schema):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Metadata field with key '{field_key}' not found"
            )
        
        return self.update_metadata_schema(db, new_schema, user_id)

    def get_settings(self, db: Session) -> SiteSettings:
        """Get current site settings or return defaults."""
        settings = self._get_current_settings(db)
        
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
    
    def get_cache_buster(self) -> str:
        """Generate cache buster timestamp."""
        return str(int(datetime.now().timestamp()))
    
    def get_logo(self, db: Session) -> Dict[str, Any]:
        """
        Get logo data for serving.
        
        Raises HTTPException 404 if logo not found or disabled.
        Raises HTTPException 500 if logo data is invalid.
        """
        settings = self._get_current_settings(db)
        
        if not settings or not settings.site_logo_data or not settings.site_logo_enabled:
            raise HTTPException(status_code=404, detail="Logo not found")
        
        try:
            logo_data = base64.b64decode(settings.site_logo_data)
        except Exception:
            raise HTTPException(status_code=500, detail="Invalid logo data")
        
        return {
            "data": logo_data,
            "mime_type": settings.site_logo_mime_type or "image/png",
            "etag": f'"{hash(settings.site_logo_data)}"'
        }
    
    def get_favicon(self, db: Session) -> Dict[str, Any]:
        """
        Get favicon data for serving.
        
        Raises HTTPException 404 if favicon not found.
        Raises HTTPException 500 if favicon data is invalid.
        """
        settings = self._get_current_settings(db)
        
        if not settings or not settings.site_favicon_data:
            raise HTTPException(status_code=404, detail="Favicon not found")
        
        try:
            favicon_data = base64.b64decode(settings.site_favicon_data)
        except Exception:
            raise HTTPException(status_code=500, detail="Invalid favicon data")
        
        return {
            "data": favicon_data,
            "mime_type": settings.site_favicon_mime_type or "image/png",
            "etag": f'"{hash(settings.site_favicon_data)}"'
        }
    
    # ==================== Update Operations ====================
    
    def update_settings(
        self,
        db: Session,
        user_id: int,
        site_title: str,
        site_logo_enabled: bool
    ) -> SiteSettings:
        """
        Update site settings (creates new entry for history).
        
        Raises HTTPException 404 if user not found.
        Raises HTTPException 403 if user is not an admin.
        """
        self._check_admin_permission(db, user_id)
        
        return self._create_settings_entry(
            db=db,
            user_id=user_id,
            site_title=site_title,
            site_logo_enabled=site_logo_enabled
        )
    
    async def upload_logo(
        self,
        db: Session,
        user_id: int,
        file: UploadFile
    ) -> SiteSettings:
        """
        Upload a new site logo.
        
        Raises HTTPException 400 for invalid files.
        Raises HTTPException 403 if user is not an admin.
        Raises HTTPException 500 for upload failures.
        """
        self._check_admin_permission(db, user_id)
        self._validate_logo_file(file)
        
        try:
            file_data = await file.read()
            self._validate_logo_dimensions(file_data)
            
            logo_b64 = base64.b64encode(file_data).decode('utf-8')
            current_settings = self._get_current_settings(db)
            
            return self._create_settings_entry(
                db=db,
                user_id=user_id,
                site_title=current_settings.site_title if current_settings else "Site Title",
                site_logo_enabled=True,
                site_logo_data=logo_b64,
                site_logo_mime_type=file.content_type,
                site_favicon_data=current_settings.site_favicon_data if current_settings else None,
                site_favicon_mime_type=current_settings.site_favicon_mime_type if current_settings else None
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to upload logo: {str(e)}")
    
    async def upload_favicon(
        self,
        db: Session,
        user_id: int,
        file: UploadFile
    ) -> SiteSettings:
        """
        Upload a new site favicon.
        
        Raises HTTPException 400 for invalid files.
        Raises HTTPException 403 if user is not an admin.
        Raises HTTPException 500 for upload failures.
        """
        self._check_admin_permission(db, user_id)
        self._validate_favicon_file(file)
        
        try:
            file_data = await file.read()
            self._validate_favicon_dimensions(file_data)
            
            favicon_b64 = base64.b64encode(file_data).decode('utf-8')
            current_settings = self._get_current_settings(db)
            
            return self._create_settings_entry(
                db=db,
                user_id=user_id,
                site_title=current_settings.site_title if current_settings else "Site Title",
                site_logo_enabled=current_settings.site_logo_enabled if current_settings else False,
                site_logo_data=current_settings.site_logo_data if current_settings else None,
                site_logo_mime_type=current_settings.site_logo_mime_type if current_settings else None,
                site_favicon_data=favicon_b64,
                site_favicon_mime_type=file.content_type
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to upload favicon: {str(e)}")
    
    # ==================== Delete Operations ====================
    
    def remove_logo(self, db: Session, user_id: int) -> SiteSettings:
        """
        Remove the current site logo.
        
        Raises HTTPException 403 if user is not an admin.
        Raises HTTPException 404 if no settings found.
        """
        self._check_admin_permission(db, user_id)
        current_settings = self._get_current_settings_or_404(db)
        
        return self._create_settings_entry(
            db=db,
            user_id=user_id,
            site_title=current_settings.site_title,
            site_logo_enabled=False,
            site_logo_data=None,
            site_logo_mime_type=None,
            site_favicon_data=current_settings.site_favicon_data,
            site_favicon_mime_type=current_settings.site_favicon_mime_type
        )
    
    def remove_favicon(self, db: Session, user_id: int) -> SiteSettings:
        """
        Remove the current site favicon.
        
        Raises HTTPException 403 if user is not an admin.
        Raises HTTPException 404 if no settings found.
        """
        self._check_admin_permission(db, user_id)
        current_settings = self._get_current_settings_or_404(db)
        
        return self._create_settings_entry(
            db=db,
            user_id=user_id,
            site_title=current_settings.site_title,
            site_logo_enabled=current_settings.site_logo_enabled,
            site_logo_data=current_settings.site_logo_data,
            site_logo_mime_type=current_settings.site_logo_mime_type,
            site_favicon_data=None,
            site_favicon_mime_type=None
        )


# Singleton instance for easy importing
site_settings_service = SiteSettingsService()