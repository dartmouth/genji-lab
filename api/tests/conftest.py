# tests/conftest.py

"""
Pytest harness for the API.

- Sets OIDC/test env vars BEFORE importing application modules.
- Uses an in-memory SQLite database with an attached "app" schema and
  JSONB columns mapped to generic JSON (models are Postgres-native).
- Builds a minimal FastAPI app with the routers under test and
  overrides the get_db dependency.
- Provides mocked Entra endpoints (discovery/token/JWKS) via respx.
"""

import base64
import os
import sys
import tempfile
from datetime import datetime, timedelta, timezone

# Ensure the api/ directory is importable regardless of pytest rootdir.
API_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if API_ROOT not in sys.path:
    sys.path.insert(0, API_ROOT)

TEST_ISSUER = "https://login.example-test.com/9a1f0b2c-tenant/v2.0"
TEST_DISCOVERY_URL = f"{TEST_ISSUER}/.well-known/openid-configuration"
TEST_AUTH_ENDPOINT = f"{TEST_ISSUER}/oauth2/v2.0/authorize"
TEST_TOKEN_ENDPOINT = f"{TEST_ISSUER}/oauth2/v2.0/token"
TEST_JWKS_URI = f"{TEST_ISSUER}/discovery/v2.0/keys"
TEST_CLIENT_ID = "test-oidc-client-id"
TEST_CLIENT_SECRET = "test-oidc-client-secret"

# Configure environment before any application import.
os.environ["SQLALCHEMY_DATABASE_URL"] = (
    f"sqlite:///{tempfile.mkdtemp(prefix='genji-api-tests-')}/unused.db"
)
os.environ["SESSION_SECRET_KEY"] = "test-session-secret"
os.environ["OIDC_ENABLED"] = "true"
os.environ["OIDC_CLIENT_ID"] = TEST_CLIENT_ID
os.environ["OIDC_CLIENT_SECRET"] = TEST_CLIENT_SECRET
os.environ["OIDC_DISCOVERY_URL"] = TEST_DISCOVERY_URL
os.environ["OIDC_REDIRECT_URI"] = "http://testserver/api/v1/oauth2/callback"
os.environ["OIDC_SCOPES"] = "openid profile email"
os.environ["OIDC_POST_LOGIN_REDIRECT"] = "/"
os.environ["OIDC_POST_ERROR_REDIRECT"] = "/login"
os.environ["OIDC_BUTTON_LABEL"] = "Sign in with Test"

from fastapi import FastAPI  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import JSON, create_engine, event  # noqa: E402
from sqlalchemy.dialects.postgresql import JSONB  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402
from starlette.middleware.sessions import SessionMiddleware  # noqa: E402

from database import get_db  # noqa: E402
from models import models  # noqa: E402
from routers import oidc_auth, oidc_config  # noqa: E402

# Map Postgres JSONB columns to generic JSON so the models work on SQLite.
for _table in models.Base.metadata.tables.values():
    for _column in _table.columns:
        if isinstance(_column.type, JSONB):
            _column.type = JSON()

_engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)


@event.listens_for(_engine, "connect")
def _attach_app_schema(dbapi_connection, connection_record):
    # Models use schema "app"; attach an in-memory database under that name.
    dbapi_connection.execute("ATTACH DATABASE ':memory:' AS app")


models.Base.metadata.create_all(bind=_engine)

_TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)


def _seed_roles():
    db = _TestSessionLocal()
    try:
        if not db.query(models.Role).filter(models.Role.name == "general_user").first():
            db.add(models.Role(name="general_user", description="Default role"))
            db.commit()
    finally:
        db.close()


_seed_roles()


def override_get_db():
    db = _TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


def _set_oidc_db_enabled(enabled: bool, button_label: str = "Sign in with Test"):
    """Create or update the single OIDC configuration row for tests."""
    db = _TestSessionLocal()
    try:
        config = db.query(models.OIDCConfiguration).first()
        if config:
            config.enabled = enabled
            config.button_label = button_label
        else:
            config = models.OIDCConfiguration(
                enabled=enabled, button_label=button_label
            )
            db.add(config)
        db.commit()
    finally:
        db.close()


app = FastAPI()
app.add_middleware(SessionMiddleware, secret_key="test-session-secret")
app.include_router(oidc_auth.router)
app.include_router(oidc_config.router)
app.dependency_overrides[get_db] = override_get_db


# ==================== JWT / JWKS helpers ====================


def _b64url_uint(value: int) -> str:
    raw = value.to_bytes((value.bit_length() + 7) // 8, "big")
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def generate_test_rsa_key():
    from cryptography.hazmat.primitives.asymmetric import rsa

    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


def public_jwk(private_key) -> dict:
    numbers = private_key.public_key().public_numbers()
    return {
        "kty": "RSA",
        "use": "sig",
        "alg": "RS256",
        "kid": "test-oidc-key",
        "n": _b64url_uint(numbers.n),
        "e": _b64url_uint(numbers.e),
    }


def make_id_token(private_key, claims: dict) -> str:
    from jose import jwt as jose_jwt

    header = {"alg": "RS256", "kid": "test-oidc-key", "typ": "JWT"}
    now = datetime.now(timezone.utc)
    payload = {
        "iss": TEST_ISSUER,
        "aud": TEST_CLIENT_ID,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=10)).timestamp()),
    }
    payload.update(claims)
    return jose_jwt.encode(payload, private_key, algorithm="RS256", headers=header)


# ==================== Entra HTTP mocks ====================


def mock_entra(respx_mock, claims: dict, private_key):
    """Register discovery, token, and JWKS mocks for a fake Entra tenant.

    The token endpoint builds the id_token on the fly so its nonce matches
    the one Authlib generated during the authorize redirect.
    """
    from httpx import Response

    respx_mock.get(TEST_DISCOVERY_URL).respond(
        json={
            "issuer": TEST_ISSUER,
            "authorization_endpoint": TEST_AUTH_ENDPOINT,
            "token_endpoint": TEST_TOKEN_ENDPOINT,
            "jwks_uri": TEST_JWKS_URI,
            "response_types_supported": ["code"],
            "subject_types_supported": ["public"],
            "id_token_signing_alg_values_supported": ["RS256"],
        }
    )

    def _token_handler(request):
        token_claims = dict(claims)
        if _current_nonce["value"]:
            token_claims["nonce"] = _current_nonce["value"]
        return Response(
            200,
            json={
                "access_token": "test-access-token",
                "token_type": "Bearer",
                "expires_in": 3600,
                "scope": "openid profile email",
                "id_token": make_id_token(private_key, token_claims),
            },
        )

    respx_mock.post(TEST_TOKEN_ENDPOINT).mock(side_effect=_token_handler)
    return respx_mock


# Nonce generated by Authlib during /oauth2/login, replayed in the id_token.
_current_nonce = {"value": None}


def jwks_route(respx_mock, private_key):
    return respx_mock.get(TEST_JWKS_URI).respond(
        json={"keys": [public_jwk(private_key)]}
    )


def make_claims(**overrides) -> dict:
    claims = {
        "sub": "aaaaaaaa-0000-0000-0000-000000000001",
        "netid": "d12345z",
        "email": "test.user@dartmouth.edu",
        "mail": "test.user@dartmouth.edu",
        "given_name": "Test",
        "family_name": "User",
        "name": "Test User",
        "memberof": ["grp-all", "grp-genji-users"],
    }
    claims.update(overrides)
    return claims


# ==================== Fixtures ====================


import pytest  # noqa: E402


@pytest.fixture(autouse=True)
def _clean_database():
    """Isolate tests: wipe rows between tests, reseed roles, and drop
    Authlib's cached JWKS (tests sign with a fresh RSA key each time)."""
    from oauth_client import oauth

    oauth.entra.server_metadata.pop("jwks", None)
    # Default to the OIDC DB toggle being on so env∧DB evaluates to env-only
    # behavior for the existing auth tests. Matrix tests flip this explicitly.
    _set_oidc_db_enabled(True)
    yield
    db = _TestSessionLocal()
    try:
        for table in reversed(models.Base.metadata.sorted_tables):
            db.execute(table.delete())
        db.commit()
        db.add(models.Role(name="general_user", description="Default role"))
        db.commit()
    finally:
        db.close()
    _current_nonce["value"] = None


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def set_oidc_db_enabled():
    """Return a helper to flip the OIDC DB toggle within a test."""
    return _set_oidc_db_enabled


_AUTHED_EMAIL = "config.admin@dartmouth.edu"


def _ensure_authed_user(db):
    """Get or create the config-admin test user in the given session."""
    user = db.query(models.User).filter(models.User.email == _AUTHED_EMAIL).first()
    if user is None:
        user = models.User(
            first_name="Config",
            last_name="Admin",
            username="config.admin",
            email=_AUTHED_EMAIL,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


class _AuthedUser:
    """Lightweight stand-in for the current user used by config endpoints.

    The config service only reads ``id`` and ``is_active``. Serving a stable
    in-memory object sidesteps SQLite StaticPool cross-session visibility
    quirks so tests can toggle ``is_active`` deterministically.
    """

    def __init__(self, user_id, is_active=True):
        self.id = user_id
        self.is_active = is_active


@pytest.fixture
def authed_user(_clean_database):
    """Override get_current_user with a seeded active admin user.

    Returns an _AuthedUser whose ``is_active`` the test can flip; the override
    yields that same object so the change is observed by the endpoint.
    """
    from routers.auth import get_current_user

    db = _TestSessionLocal()
    try:
        user_id = _ensure_authed_user(db).id
    finally:
        db.close()

    current = _AuthedUser(user_id=user_id, is_active=True)

    def _override():
        yield current

    app.dependency_overrides[get_current_user] = _override
    try:
        yield current
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def db_session():
    db = _TestSessionLocal()
    try:
        yield db
    finally:
        db.rollback()
        db.close()


@pytest.fixture
def rsa_key():
    return generate_test_rsa_key()


@pytest.fixture
def entra(respx_mock, rsa_key):
    """Full Entra mock wired to a fresh per-test user claim set."""
    claims = make_claims()
    mock_entra(respx_mock, claims, rsa_key)
    jwks_route(respx_mock, rsa_key)
    return {"claims": claims}


def perform_login(client) -> str:
    """Drive the authorize leg and return the state for the callback."""
    response = client.get("/api/v1/oauth2/login", follow_redirects=False)
    assert response.status_code == 302, response.text
    authorize_url = response.headers["location"]
    assert authorize_url.startswith(TEST_AUTH_ENDPOINT)
    from urllib.parse import parse_qs, urlparse

    query = parse_qs(urlparse(authorize_url).query)
    _current_nonce["value"] = query.get("nonce", [None])[0]
    return query["state"][0]


def perform_callback(client, state: str, code: str = "test-auth-code"):
    return client.get(
        "/api/v1/oauth2/callback",
        params={"code": code, "state": state},
        follow_redirects=False,
    )


@pytest.fixture
def login_and_callback(client):
    """Bound helpers sharing this module's state; avoids double-import issues."""

    def _login():
        return perform_login(client)

    def _callback(state, code="test-auth-code"):
        return perform_callback(client, state, code)

    return _login, _callback
