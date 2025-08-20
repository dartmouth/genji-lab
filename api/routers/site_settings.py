from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List
import json
import base64
from datetime import datetime

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

@router.get("/", response_model=SiteSettingsResponse)
def get_site_settings(db: Session = Depends(get_db)):
    """Get current site settings"""
    # Get the most recent site settings entry
    site_settings = db.query(SiteSettings).order_by(SiteSettings.updated_at.desc()).first()
    
    if not site_settings:
        # Return default settings if none exist
        # Find any user to use as the default
        any_user = db.query(User).first()
        user_id = any_user.id if any_user else 1
        
        default_settings = SiteSettings(
            site_title="Site Title",
            site_logo_url="/favicon.png",
            updated_by_id=user_id,
        )
        return default_settings
    
    return site_settings

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
        site_logo_url=settings_update.site_logo_url or "/favicon.png",
        updated_by_id=current_user_id
    )
    
    db.add(new_settings)
    db.commit()
    db.refresh(new_settings)
    
    return new_settings
