# tests/test_oidc_auth.py

"""
OIDC (Entra ID) authentication tests with mocked provider endpoints.
"""

from urllib.parse import parse_qs, urlparse

from models import models

from tests.conftest import make_claims, make_id_token, jwks_route, mock_entra


def _count_users(db, email):
    return db.query(models.User).filter(models.User.email == email).count()


# ==================== config/public ====================


def test_public_config_reports_enabled(client):
    response = client.get("/api/v1/oauth2/config/public")
    assert response.status_code == 200
    data = response.json()
    assert data == {"enabled": True, "button_label": "Sign in with Test"}
    # Never leak secrets
    assert "test-oidc-client-secret" not in response.text
    assert "client_id" not in data
    assert "client_secret" not in data


def test_public_config_reports_disabled(client, monkeypatch):
    monkeypatch.setenv("OIDC_ENABLED", "false")
    response = client.get("/api/v1/oauth2/config/public")
    assert response.status_code == 200
    assert response.json() == {"enabled": False, "button_label": "Sign in with Test"}


def test_public_config_disabled_when_db_toggle_off(
    client, set_oidc_db_enabled
):
    # env on (conftest default) but DB toggle off -> disabled
    set_oidc_db_enabled(False)
    response = client.get("/api/v1/oauth2/config/public")
    assert response.status_code == 200
    assert response.json() == {"enabled": False, "button_label": "Sign in with Test"}


def test_public_config_button_label_from_db(client, set_oidc_db_enabled):
    set_oidc_db_enabled(True, button_label="Custom DB Label")
    response = client.get("/api/v1/oauth2/config/public")
    assert response.status_code == 200
    data = response.json()
    assert data["enabled"] is True
    assert data["button_label"] == "Custom DB Label"


# ==================== login initiation ====================


def test_login_redirects_to_entra(client, entra):
    response = client.get("/api/v1/oauth2/login", follow_redirects=False)
    assert response.status_code == 302
    authorize_url = response.headers["location"]
    assert authorize_url.startswith("https://login.example-test.com")
    query = parse_qs(urlparse(authorize_url).query)
    assert query["response_type"] == ["code"]
    assert query["client_id"]
    assert query["state"]
    assert query["nonce"]
    assert "openid" in query["scope"][0]


def test_login_disabled_returns_404(client, monkeypatch):
    monkeypatch.setenv("OIDC_ENABLED", "false")
    response = client.get("/api/v1/oauth2/login", follow_redirects=False)
    assert response.status_code == 404


def test_login_db_toggle_off_returns_404(client, set_oidc_db_enabled):
    # env on but DB toggle off -> 404 (env AND DB required)
    set_oidc_db_enabled(False)
    response = client.get("/api/v1/oauth2/login", follow_redirects=False)
    assert response.status_code == 404


# ==================== callback: happy paths ====================


def test_callback_creates_new_user_and_session(
    client, db_session, entra, login_and_callback
):
    login, callback = login_and_callback
    state = login()
    response = callback(state)

    assert response.status_code == 302
    assert response.headers["location"] == "/"

    claims = entra["claims"]
    user = (
        db_session.query(models.User)
        .filter(models.User.email == claims["mail"])
        .one()
    )
    assert user.username == claims["netid"]
    assert user.first_name == claims["given_name"]
    assert user.last_name == claims["family_name"]
    assert user.is_active is True
    assert user.user_metadata["auth_method"] == "oidc"
    assert user.user_metadata["oidc_data"]["sub"] == claims["sub"]
    assert user.user_metadata["oidc_data"]["netid"] == claims["netid"]
    assert user.user_metadata["oidc_data"]["memberof"] == claims["memberof"]
    assert "last_login" in user.user_metadata
    assert [role.name for role in user.roles] == ["general_user"]


def test_callback_matches_existing_user_by_email(
    client, db_session, entra, login_and_callback
):
    login, callback = login_and_callback
    claims = entra["claims"]
    existing = models.User(
        first_name="Old",
        last_name="Name",
        username="existing.netid",
        email=claims["mail"],
        is_active=True,
        user_metadata={"email": claims["mail"], "auth_method": "cas"},
    )
    db_session.add(existing)
    db_session.commit()

    state = login()
    response = callback(state)

    assert response.status_code == 302
    assert response.headers["location"] == "/"
    assert _count_users(db_session, claims["mail"]) == 1

    db_session.expire_all()
    user = (
        db_session.query(models.User)
        .filter(models.User.email == claims["mail"])
        .one()
    )
    assert user.username == "existing.netid"
    assert user.user_metadata["auth_method"] == "oidc"
    assert user.user_metadata["oidc_data"]["netid"] == claims["netid"]
    assert "last_login" in user.user_metadata
    assert [role.name for role in user.roles] == ["general_user"]


# ==================== callback: failure paths ====================


def test_callback_state_mismatch(client, entra, login_and_callback):
    login, callback = login_and_callback
    login()
    response = callback(state="forged-state-value")

    assert response.status_code == 302
    assert response.headers["location"] == "/login?error=auth_failed"


def test_callback_provider_access_denied(client, respx_mock):
    response = client.get(
        "/api/v1/oauth2/callback",
        params={"error": "access_denied", "error_description": "user cancelled"},
        follow_redirects=False,
    )
    assert response.status_code == 302
    assert response.headers["location"] == "/login?error=access_denied"


def test_callback_missing_mail_claim(
    client, db_session, respx_mock, rsa_key, login_and_callback
):
    login, callback = login_and_callback
    claims = make_claims(mail="", email="")
    mock_entra(respx_mock, claims, rsa_key)
    jwks_route(respx_mock, rsa_key)

    state = login()
    response = callback(state)

    assert response.status_code == 302
    assert response.headers["location"] == "/login?error=auth_failed"
    assert db_session.query(models.User).count() == 0


def test_callback_inactive_user(client, db_session, entra, login_and_callback):
    login, callback = login_and_callback
    claims = entra["claims"]
    db_session.add(
        models.User(
            first_name="Disabled",
            last_name="User",
            username="disabled.netid",
            email=claims["mail"],
            is_active=False,
            user_metadata={"email": claims["mail"]},
        )
    )
    db_session.commit()

    state = login()
    response = callback(state)

    assert response.status_code == 302
    assert response.headers["location"] == "/login?error=account_inactive"


def test_callback_disabled(client, monkeypatch):
    monkeypatch.setenv("OIDC_ENABLED", "false")
    response = client.get(
        "/api/v1/oauth2/callback",
        params={"code": "x", "state": "y"},
        follow_redirects=False,
    )
    assert response.status_code == 302
    assert response.headers["location"] == "/login?error=auth_failed"


# ==================== service unit behavior ====================


def test_get_or_create_user_unique_username_collision(db_session):
    from services.oidc_auth_service import oidc_auth_service

    db_session.add(
        models.User(
            first_name="Existing",
            last_name="Person",
            username="d99999x",
            email="other.person@dartmouth.edu",
            is_active=True,
        )
    )
    db_session.commit()

    user = oidc_auth_service.get_or_create_user_from_oidc(
        db_session, make_claims(netid="d99999x")
    )
    # Same netid but different email -> new user with suffixed username
    assert user.username == "d99999x2"
    assert user.email == "test.user@dartmouth.edu"
    assert [role.name for role in user.roles] == ["general_user"]
