# services/cas_config_service.py

from typing import Optional, Dict, Any
from fastapi import HTTPException
from sqlalchemy.orm import Session

from models.models import CASConfiguration, User
from schemas.cas_config import CASConfigUpdate
from services.base_service import BaseService


class CASConfigService(BaseService[CASConfiguration]):
    """Service for CAS configuration CRUD operations."""
    
    def __init__(self):
        super().__init__(CASConfiguration)
    
    # ==================== Default Values ====================
    
    def _get_default_attribute_mapping(self) -> Dict[str, str]:
        """Return default attribute mapping for CAS configuration."""
        return {
            "username": "netid",
            "email": "email",
            "first_name": "givenName",
            "last_name": "sn",
            "full_name": "name"
        }
    
    def _get_default_username_patterns(self) -> list:
        """Return default username patterns for CAS configuration."""
        return [
            '<cas:attribute name="{attr}" value="([^"]+)"',
            '<cas:{attr}>([^<]+)</cas:{attr}>',
            '<cas:user>([^<]+)</cas:user>'
        ]
    
    def _get_default_config(self) -> Dict[str, Any]:
        """Return default configuration when none exists."""
        return {
            "id": None,
            "enabled": False,
            "server_url": None,
            "validation_endpoint": "/serviceValidate",
            "protocol_version": "2.0",
            "xml_namespace": "http://www.yale.edu/tp/cas",
            "attribute_mapping": self._get_default_attribute_mapping(),
            "username_patterns": self._get_default_username_patterns(),
            "metadata_attributes": ["uid", "netid", "did", "affil"],
            "email_domain": None,
            "email_format": "from_cas",
            "display_name": "CAS Login",
            "updated_at": None,
            "updated_by_id": None
        }
    
    # ==================== Helper Methods ====================
    
    def _build_response_dict(self, cas_config: CASConfiguration) -> Dict[str, Any]:
        """Build a response dictionary from a CASConfiguration model."""
        return {
            "id": cas_config.id,
            "enabled": cas_config.enabled,
            "server_url": cas_config.server_url,
            "validation_endpoint": cas_config.validation_endpoint,
            "protocol_version": cas_config.protocol_version,
            "xml_namespace": cas_config.xml_namespace,
            "attribute_mapping": cas_config.attribute_mapping,
            "username_patterns": cas_config.username_patterns,
            "metadata_attributes": cas_config.metadata_attributes,
            "email_domain": cas_config.email_domain,
            "email_format": cas_config.email_format,
            "display_name": cas_config.display_name,
            "updated_at": cas_config.updated_at.isoformat() if cas_config.updated_at else None,
            "updated_by_id": cas_config.updated_by_id
        }
    
    # ==================== CRUD Operations ====================
    
    def get(self, db: Session) -> Dict[str, Any]:
        """
        Get the current CAS configuration.
        
        Returns default values if no configuration exists.
        """
        cas_config = db.query(CASConfiguration).first()
        
        if not cas_config:
            return self._get_default_config()
        
        return self._build_response_dict(cas_config)
    
    def get_public(self, db: Session) -> Dict[str, Any]:
        """
        Get public CAS configuration.
        
        Returns only enabled status and display name.
        """
        cas_config = db.query(CASConfiguration).first()
        
        if not cas_config:
            return {
                "enabled": False,
                "display_name": "CAS Login"
            }
        
        return {
            "enabled": cas_config.enabled,
            "display_name": cas_config.display_name
        }
    
    def create_or_update(
        self,
        db: Session,
        config_update: CASConfigUpdate,
        user: User
    ) -> Dict[str, Any]:
        """
        Create or update CAS configuration.
        
        Only one configuration can exist at a time.
        Raises HTTPException 403 if user is not active.
        """
        if not user.is_active:
            raise HTTPException(status_code=403, detail="User is not active")
        
        cas_config = db.query(CASConfiguration).first()
        
        # Convert attribute mapping to dict
        attribute_mapping_dict = (
            config_update.attribute_mapping.model_dump() 
            if config_update.attribute_mapping 
            else self._get_default_attribute_mapping()
        )
        
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
            cas_config.updated_by_id = user.id
        else:
            # Create new configuration
            cas_config = CASConfiguration(
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
                updated_by_id=user.id
            )
            db.add(cas_config)
        
        db.commit()
        db.refresh(cas_config)
        
        return self._build_response_dict(cas_config)


# Singleton instance for easy importing
cas_config_service = CASConfigService()