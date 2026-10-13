# services/oidc_config_service.py

from typing import Dict, Any
from fastapi import HTTPException
from sqlalchemy.orm import Session

from models.models import OIDCConfiguration, User
from schemas.oidc_config import OIDCConfigUpdate
from services.base_service import BaseService


class OIDCConfigService(BaseService[OIDCConfiguration]):
    """Service for OIDC configuration CRUD operations.

    Only the admin-editable toggle and button label are persisted here. All
    OIDC secrets and connection settings remain in environment variables.
    """

    def __init__(self):
        super().__init__(OIDCConfiguration)

    # ==================== Default Values ====================

    def _get_default_config(self) -> Dict[str, Any]:
        """Return default configuration when none exists."""
        return {
            "id": None,
            "enabled": False,
            "button_label": "Sign in with Dartmouth",
            "updated_at": None,
            "updated_by_id": None,
        }

    # ==================== Helper Methods ====================

    def _build_response_dict(self, oidc_config: OIDCConfiguration) -> Dict[str, Any]:
        """Build a response dictionary from an OIDCConfiguration model."""
        return {
            "id": oidc_config.id,
            "enabled": oidc_config.enabled,
            "button_label": oidc_config.button_label,
            "updated_at": (
                oidc_config.updated_at.isoformat()
                if oidc_config.updated_at
                else None
            ),
            "updated_by_id": oidc_config.updated_by_id,
        }

    # ==================== CRUD Operations ====================

    def get(self, db: Session) -> Dict[str, Any]:
        """
        Get the current OIDC configuration.

        Returns default values if no configuration exists.
        """
        oidc_config = db.query(OIDCConfiguration).first()

        if not oidc_config:
            return self._get_default_config()

        return self._build_response_dict(oidc_config)

    def get_public(self, db: Session) -> Dict[str, Any]:
        """
        Get public OIDC configuration.

        Returns only enabled status and button label.
        """
        oidc_config = db.query(OIDCConfiguration).first()

        if not oidc_config:
            return {
                "enabled": False,
                "button_label": "Sign in with Dartmouth",
            }

        return {
            "enabled": oidc_config.enabled,
            "button_label": oidc_config.button_label,
        }

    def db_enabled(self, db: Session) -> bool:
        """Return the DB toggle state (False if no configuration exists)."""
        oidc_config = db.query(OIDCConfiguration).first()

        if not oidc_config:
            return False

        return bool(oidc_config.enabled)

    def create_or_update(
        self,
        db: Session,
        config_update: OIDCConfigUpdate,
        user: User,
    ) -> Dict[str, Any]:
        """
        Create or update OIDC configuration.

        Only one configuration can exist at a time.
        Raises HTTPException 403 if user is not active.
        """
        if not user.is_active:
            raise HTTPException(status_code=403, detail="User is not active")

        oidc_config = db.query(OIDCConfiguration).first()

        if oidc_config:
            # Update existing configuration
            oidc_config.enabled = config_update.enabled
            oidc_config.button_label = config_update.button_label
            oidc_config.updated_by_id = user.id
        else:
            # Create new configuration
            oidc_config = OIDCConfiguration(
                enabled=config_update.enabled,
                button_label=config_update.button_label,
                updated_by_id=user.id,
            )
            db.add(oidc_config)

        db.commit()
        db.refresh(oidc_config)

        return self._build_response_dict(oidc_config)


# Singleton instance for easy importing
oidc_config_service = OIDCConfigService()
