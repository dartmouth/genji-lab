from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional

class SiteSettingsBase(BaseModel):
    site_title: str = Field(..., min_length=1, max_length=50, description="The site title")
    site_logo_enabled: bool = Field(False, description="Whether the site logo is enabled")

class SiteSettingsCreate(SiteSettingsBase):
    pass

class SiteSettingsUpdate(SiteSettingsBase):
    pass

class SiteSettingsResponse(SiteSettingsBase):
    id: int
    updated_by_id: int
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class CollectionMetadataFieldBase(BaseModel):
    key: str
    label: str
    required: bool = False
    type: str

class CollectionMetadataField(CollectionMetadataFieldBase):
    pass

class CollectionMetadataFieldCreate(CollectionMetadataFieldBase):
    pass


class CollectionMetadataFieldUpdate(CollectionMetadataFieldBase):
    pass