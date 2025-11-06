"""
CAS Configuration management endpoints.
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel, Field, validator
import re

from database import get_db
from models import models
from routers.auth import get_current_user

router = APIRouter(prefix="/api/v1")


# ==================== Pydantic Schemas ====================

class AttributeMapping(BaseModel):
    username: str = Field(..., min_length=1)
    email: str = Field(..., min_length=1)
    first_name: str = Field(..., min_length=1)
    last_name: str = Field(..., min_length=1)
    full_name: Optional[str] = "name"


class CASConfigUpdate(BaseModel):
    enabled: bool
    server_url: Optional[str] = None
    validation_endpoint: str = "/serviceValidate"
    protocol_version: str = "2.0"
    xml_namespace: str = "http://www.yale.edu/tp/cas"
    attribute_mapping: Optional[AttributeMapping] = None
    username_patterns: list[str] = [
        '<cas:attribute name="{attr}" value="([^"]+)"',
        '<cas:{attr}>([^<]+)</cas:{attr}>',
        '<cas:user>([^<]+)</cas:user>'
    ]
    metadata_attributes: list[str] = ["uid", "netid", "did", "affil"]
    email_domain: Optional[str] = None
    email_format: str = "from_cas"
    display_name: str = "CAS Login"

    @validator('server_url')
    def validate_server_url(cls, v, values):
        if values.get('enabled') and not v:
            raise ValueError('Server URL is required when CAS is enabled')
        if v and not (v.startswith('http://') or v.startswith('https://')):
            raise ValueError('Server URL must start with http:// or https://')
        return v

    @validator('attribute_mapping')
    def validate_attribute_mapping(cls, v, values):
        if values.get('enabled') and not v:
            raise ValueError('Attribute mapping is required when CAS is enabled')
        return v

    @validator('protocol_version')
    def validate_protocol_version(cls, v):
        if v not in ['2.0', '3.0']:
            raise ValueError('Protocol version must be either "2.0" or "3.0"')
        return v

    @validator('email_format')
    def validate_email_format(cls, v):
        if v not in ['from_cas', 'construct']:
            raise ValueError('Email format must be either "from_cas" or "construct"')
        return v

    @validator('email_domain')
    def validate_email_domain(cls, v, values):
        if values.get('email_format') == 'construct' and not v:
            raise ValueError('Email domain is required when email format is "construct"')
        return v

    @validator('username_patterns')
    def validate_username_patterns(cls, v):
        if not v or len(v) == 0:
            raise ValueError('At least one username pattern is required')
        for pattern in v:
            if '{attr}' not in pattern:
                raise ValueError(f'Pattern must contain {{attr}} placeholder: {pattern}')
        return v


class CASConfigResponse(BaseModel):
    id: Optional[int]
    enabled: bool
    server_url: Optional[str]
    validation_endpoint: str
    protocol_version: str
    xml_namespace: str
    attribute_mapping: dict
    username_patterns: list[str]
    metadata_attributes: list[str]
    email_domain: Optional[str]
    email_format: str
    display_name: str
    updated_at: Optional[str]
    updated_by_id: Optional[int]

    class Config:
        from_attributes = True


# ==================== Endpoints ====================

@router.get("/cas-config", response_model=CASConfigResponse)
async def get_cas_config(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Get the current CAS configuration.
    Returns default values if no configuration exists.
    """
    cas_config = db.query(models.CASConfiguration).first()
    
    if not cas_config:
        # Return default configuration
        return CASConfigResponse(
            id=None,
            enabled=False,
            server_url=None,
            validation_endpoint="/serviceValidate",
            protocol_version="2.0",
            xml_namespace="http://www.yale.edu/tp/cas",
            attribute_mapping={
                "username": "netid",
                "email": "email",
                "first_name": "givenName",
                "last_name": "sn",
                "full_name": "name"
            },
            username_patterns=[
                '<cas:attribute name="{attr}" value="([^"]+)"',
                '<cas:{attr}>([^<]+)</cas:{attr}>',
                '<cas:user>([^<]+)</cas:user>'
            ],
            metadata_attributes=["uid", "netid", "did", "affil"],
            email_domain=None,
            email_format="from_cas",
            display_name="CAS Login",
            updated_at=None,
            updated_by_id=None
        )
    
    return CASConfigResponse(
        id=cas_config.id,
        enabled=cas_config.enabled,
        server_url=cas_config.server_url,
        validation_endpoint=cas_config.validation_endpoint,
        protocol_version=cas_config.protocol_version,
        xml_namespace=cas_config.xml_namespace,
        attribute_mapping=cas_config.attribute_mapping,
        username_patterns=cas_config.username_patterns,
        metadata_attributes=cas_config.metadata_attributes,
        email_domain=cas_config.email_domain,
        email_format=cas_config.email_format,
        display_name=cas_config.display_name,
        updated_at=cas_config.updated_at.isoformat() if cas_config.updated_at else None,
        updated_by_id=cas_config.updated_by_id
    )


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
    # Check if user has permission (you may want to add role-based checks here)
    if not current_user.is_active:
        raise HTTPException(status_code=403, detail="User is not active")
    
    cas_config = db.query(models.CASConfiguration).first()
    
    # Convert attribute mapping to dict
    attribute_mapping_dict = config_update.attribute_mapping.dict() if config_update.attribute_mapping else {
        "username": "netid",
        "email": "email",
        "first_name": "givenName",
        "last_name": "sn",
        "full_name": "name"
    }
    
    if cas_config:
        # Update existing configuration
        cas_config.enabled = config_update.enabled
        cas_config.server_url = config_update.server_url
        cas_config.validation_endpoint = config_update.validation_endpoint
        cas_config.protocol_version = config_update.protocol_version
        cas_config.xml_namespace = config_update.xml_namespace
        cas_config.attribute_mapping = attribute_mapping_dict
        cas_config.username_patterns = config_update.username_patterns
        cas_config.metadata_attributes = config_update.metadata_attributes
        cas_config.email_domain = config_update.email_domain
        cas_config.email_format = config_update.email_format
        cas_config.display_name = config_update.display_name
        cas_config.updated_by_id = current_user.id
    else:
        # Create new configuration
        cas_config = models.CASConfiguration(
            enabled=config_update.enabled,
            server_url=config_update.server_url,
            validation_endpoint=config_update.validation_endpoint,
            protocol_version=config_update.protocol_version,
            xml_namespace=config_update.xml_namespace,
            attribute_mapping=attribute_mapping_dict,
            username_patterns=config_update.username_patterns,
            metadata_attributes=config_update.metadata_attributes,
            email_domain=config_update.email_domain,
            email_format=config_update.email_format,
            display_name=config_update.display_name,
            updated_by_id=current_user.id
        )
        db.add(cas_config)
    
    db.commit()
    db.refresh(cas_config)
    
    return CASConfigResponse(
        id=cas_config.id,
        enabled=cas_config.enabled,
        server_url=cas_config.server_url,
        validation_endpoint=cas_config.validation_endpoint,
        protocol_version=cas_config.protocol_version,
        xml_namespace=cas_config.xml_namespace,
        attribute_mapping=cas_config.attribute_mapping,
        username_patterns=cas_config.username_patterns,
        metadata_attributes=cas_config.metadata_attributes,
        email_domain=cas_config.email_domain,
        email_format=cas_config.email_format,
        display_name=cas_config.display_name,
        updated_at=cas_config.updated_at.isoformat() if cas_config.updated_at else None,
        updated_by_id=cas_config.updated_by_id
    )