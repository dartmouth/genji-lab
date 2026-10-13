# routers/oidc_auth.py

"""
OIDC (Microsoft Entra ID) authentication endpoints.

Server-side Authorization Code flow:
- GET /api/v1/oauth2/login    -> 302 to Entra authorize endpoint
- GET /api/v1/oauth2/callback -> exchanges code, creates session, 302 to SPA
- GET /api/v1/oauth2/config/public -> discovery for the SPA

Logout reuses POST /api/v1/auth/logout (local session clear only).
"""

import logging
import os

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from database import get_db
from oauth_client import oauth
from routers.auth_utils import create_session
from services.oidc_auth_service import (
    OIDCAuthError,
    OIDCInactiveUserError,
    oidc_auth_service,
)

load_dotenv()

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["authentication"])

# Error codes the SPA may receive as ?error= on the post-error redirect path.
_ALLOWED_PROVIDER_ERRORS = {"access_denied", "consent_required", "interaction_required"}


def _post_login_redirect() -> str:
    return os.getenv("OIDC_POST_LOGIN_REDIRECT", "/")


def _post_error_redirect() -> str:
    return os.getenv("OIDC_POST_ERROR_REDIRECT", "/login")


def _error_redirect(error_code: str) -> RedirectResponse:
    path = _post_error_redirect()
    separator = "&" if "?" in path else "?"
    return RedirectResponse(f"{path}{separator}error={error_code}", status_code=302)


# ==================== OIDC Endpoints ====================


@router.get("/oauth2/config/public", response_model=dict)
async def get_public_oidc_config(db: Session = Depends(get_db)):
    """
    Public OIDC configuration for the SPA (no authentication required).
    Never exposes client_id, client_secret, or discovery URL.
    """
    return oidc_auth_service.public_config(db)


@router.get("/oauth2/login")
async def oidc_login(request: Request, db: Session = Depends(get_db)):
    """Redirect the browser to the Entra authorize endpoint."""
    if not oidc_auth_service.is_enabled(db):
        raise HTTPException(
            status_code=404, detail="OIDC authentication is not enabled"
        )

    redirect_uri = os.getenv("OIDC_REDIRECT_URI", "")
    if not redirect_uri:
        logger.error("OIDC_REDIRECT_URI is not configured")
        raise HTTPException(status_code=500, detail="OIDC is misconfigured")

    return await oauth.entra.authorize_redirect(request, redirect_uri)


@router.get("/oauth2/callback")
async def oidc_callback(request: Request, db: Session = Depends(get_db)):
    """Handle the Entra redirect: validate, exchange code, create session."""
    if not oidc_auth_service.is_enabled(db):
        return _error_redirect("auth_failed")

    provider_error = request.query_params.get("error")
    if provider_error:
        code = (
            provider_error
            if provider_error in _ALLOWED_PROVIDER_ERRORS
            else "auth_failed"
        )
        logger.warning(
            "OIDC provider returned error: %s (%s)",
            provider_error,
            request.query_params.get("error_description", ""),
        )
        return _error_redirect(code)

    try:
        token = await oauth.entra.authorize_access_token(request)
        claims = token.get("userinfo") or {}
        if not claims:
            raise OIDCAuthError("No claims returned in OIDC token")

        user = oidc_auth_service.get_or_create_user_from_oidc(db, claims)
    except OIDCInactiveUserError as e:
        logger.warning("OIDC login rejected: %s", e)
        return _error_redirect("account_inactive")
    except OIDCAuthError as e:
        logger.warning("OIDC login failed: %s", e)
        return _error_redirect("auth_failed")
    except Exception as e:
        logger.exception("Unexpected OIDC callback failure: %s", e)
        return _error_redirect("auth_failed")

    create_session(request, user.id, user.username)
    return RedirectResponse(_post_login_redirect(), status_code=302)
