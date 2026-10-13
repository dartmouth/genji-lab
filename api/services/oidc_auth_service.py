# services/oidc_auth_service.py

"""
OIDC (Microsoft Entra ID) authentication service.

Mirrors the CAS auth service singleton pattern. All configuration comes
from environment variables; no secrets are persisted to the database.
"""

import logging
import os
from datetime import datetime
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from models import models
from services.base_service import BaseService
from services.oidc_config_service import oidc_config_service
from routers.auth_utils import (
    assign_default_role_to_user,
    load_user_with_relations,
)

load_dotenv()

logger = logging.getLogger(__name__)


class OIDCAuthError(Exception):
    """Base error for OIDC authentication failures."""

    error_code = "auth_failed"


class OIDCMissingEmailError(OIDCAuthError):
    """ID token is missing the email (mail) claim."""

    error_code = "auth_failed"


class OIDCInactiveUserError(OIDCAuthError):
    """Matched user account is inactive."""

    error_code = "account_inactive"


def _env_flag(name: str, default: str = "false") -> bool:
    return os.getenv(name, default).strip().lower() in ("1", "true", "yes", "on")


class OIDCAuthService(BaseService[models.User]):
    """Service for OIDC (Entra ID) authentication operations."""

    def __init__(self):
        super().__init__(models.User)

    # ==================== Configuration ====================

    def is_enabled(self, db: Session) -> bool:
        """OIDC is active only when the env gate AND the DB toggle are on.

        The env flag (OIDC_ENABLED) ensures credentials are configured on the
        server; the DB toggle lets an admin opt in. Both are required.
        """
        return _env_flag("OIDC_ENABLED") and oidc_config_service.db_enabled(db)

    def public_config(self, db: Session) -> Dict[str, Any]:
        """Public OIDC config for the SPA.

        enabled reflects env AND DB. The button label is authoritative from the
        DB config (falling back to its default when no row exists).
        """
        return {
            "enabled": self.is_enabled(db),
            "button_label": oidc_config_service.get_public(db)["button_label"],
        }

    # ==================== Helpers ====================

    @staticmethod
    def _normalize_memberof(value: Any) -> List[str]:
        if isinstance(value, str):
            return [value] if value else []
        if isinstance(value, (list, tuple)):
            return [str(v) for v in value if v]
        return []

    def _find_existing_user(self, db: Session, email: str) -> Optional[models.User]:
        query = (
            select(models.User)
            .options(
                joinedload(models.User.roles),
                joinedload(models.User.groups),
            )
            .filter(models.User.email == email)
        )
        return db.execute(query).scalars().unique().first()

    def _unique_username(self, db: Session, base: str) -> str:
        username = base
        suffix = 1
        while (
            db.query(models.User.id)
            .filter(models.User.username == username)
            .first()
            is not None
        ):
            suffix += 1
            username = f"{base}{suffix}"
        return username

    def _build_oidc_data(self, claims: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "sub": claims.get("sub") or "",
            "netid": claims.get("netid") or claims.get("preferred_username") or "",
            "memberof": self._normalize_memberof(claims.get("memberof")),
            "name": claims.get("name") or "",
            "raw": dict(claims),
        }

    def _update_existing_user(
        self,
        db: Session,
        user: models.User,
        email: str,
        oidc_data: Dict[str, Any],
    ) -> models.User:
        metadata = dict(user.user_metadata or {})
        metadata.update(
            {
                "last_login": datetime.now().isoformat(),
                "email": email,
                "oidc_data": oidc_data,
                "auth_method": "oidc",
            }
        )
        user.user_metadata = metadata
        db.commit()

        assign_default_role_to_user(db, user)
        return load_user_with_relations(db, user.id)

    def _create_new_user(
        self,
        db: Session,
        email: str,
        first_name: str,
        last_name: str,
        oidc_data: Dict[str, Any],
    ) -> models.User:
        base_username = oidc_data.get("netid") or email.split("@")[0]
        username = self._unique_username(db, base_username)

        new_user = models.User(
            first_name=first_name,
            last_name=last_name,
            username=username,
            email=email,
            is_active=True,
            user_metadata={
                "email": email,
                "oidc_data": oidc_data,
                "created_at": datetime.now().isoformat(),
                "last_login": datetime.now().isoformat(),
                "auth_method": "oidc",
            },
        )
        db.add(new_user)
        db.commit()

        assign_default_role_to_user(db, new_user)
        return load_user_with_relations(db, new_user.id)

    # ==================== User Management ====================

    def get_or_create_user_from_oidc(
        self,
        db: Session,
        claims: Dict[str, Any],
    ) -> models.User:
        """
        Process OIDC claims and either retrieve an existing user (matched by
        email) or create a new one. Ensures the default 'general_user' role.

        Raises OIDCMissingEmailError if the email claim is absent.
        Raises OIDCInactiveUserError if the matched user is inactive.
        """
        email = (claims.get("mail") or claims.get("email") or "").strip().lower()
        if not email:
            raise OIDCMissingEmailError("OIDC response missing email claim")

        first_name = (claims.get("given_name") or "").strip()
        last_name = (claims.get("family_name") or "").strip()
        oidc_data = self._build_oidc_data(claims)

        existing_user = self._find_existing_user(db, email)

        if existing_user:
            if existing_user.is_active is False:
                raise OIDCInactiveUserError(
                    f"Matched user {existing_user.id} is inactive"
                )
            return self._update_existing_user(db, existing_user, email, oidc_data)

        return self._create_new_user(db, email, first_name, last_name, oidc_data)


oidc_auth_service = OIDCAuthService()
