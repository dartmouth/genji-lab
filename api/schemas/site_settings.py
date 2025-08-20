from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class SiteSettingsBase(BaseModel):
    site_title: str = Field(..., min_length=1, max_length=50, description="The site title")
    site_logo_url: Optional[str] = Field(None, max_length=255, description="URL to the site logo")

class SiteSettingsCreate(SiteSettingsBase):
    pass

class SiteSettingsUpdate(SiteSettingsBase):
    pass

class SiteSettingsResponse(SiteSettingsBase):
    id: int
    updated_by_id: int
    updated_at: datetime
    
    class Config:
        from_attributes = True
