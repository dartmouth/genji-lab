# tests/test_oidc_config.py

"""
Tests for the admin-configurable OIDC config endpoints:
- GET  /api/v1/oidc-config          (authenticated)
- PUT  /api/v1/oidc-config          (authenticated)
- GET  /api/v1/oidc-config/public   (public)
"""

from models import models


# ==================== public ====================


def test_public_config_reflects_disabled_db_row(client, set_oidc_db_enabled):
    set_oidc_db_enabled(False, button_label="Sign in with Dartmouth")
    response = client.get("/api/v1/oidc-config/public")
    assert response.status_code == 200
    assert response.json() == {
        "enabled": False,
        "button_label": "Sign in with Dartmouth",
    }


def test_public_config_reflects_db_row(client, set_oidc_db_enabled):
    set_oidc_db_enabled(True, button_label="Round Trip Label")
    response = client.get("/api/v1/oidc-config/public")
    assert response.status_code == 200
    assert response.json() == {
        "enabled": True,
        "button_label": "Round Trip Label",
    }


# ==================== authenticated GET ====================


def test_get_config_reflects_db_row(client, authed_user, set_oidc_db_enabled):
    set_oidc_db_enabled(False, button_label="Admin View Label")
    response = client.get("/api/v1/oidc-config")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] is not None
    assert data["enabled"] is False
    assert data["button_label"] == "Admin View Label"


def test_get_config_requires_auth(client):
    response = client.get("/api/v1/oidc-config")
    assert response.status_code in (401, 403)


# ==================== authenticated PUT ====================


def test_put_config_creates_and_updates(client, authed_user):
    response = client.put(
        "/api/v1/oidc-config",
        json={"enabled": True, "button_label": "Sign in with Dartmouth"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["enabled"] is True
    assert data["button_label"] == "Sign in with Dartmouth"
    assert data["id"] is not None
    assert data["updated_by_id"] == authed_user.id

    # Update the same single row.
    response = client.put(
        "/api/v1/oidc-config",
        json={"enabled": False, "button_label": "Updated Label"},
    )
    assert response.status_code == 200
    data2 = response.json()
    assert data2["id"] == data["id"]
    assert data2["enabled"] is False
    assert data2["button_label"] == "Updated Label"


def test_put_config_round_trips_to_public(client, authed_user):
    client.put(
        "/api/v1/oidc-config",
        json={"enabled": True, "button_label": "Public Round Trip"},
    )
    response = client.get("/api/v1/oidc-config/public")
    assert response.status_code == 200
    assert response.json() == {
        "enabled": True,
        "button_label": "Public Round Trip",
    }


def test_put_config_rejects_empty_label(client, authed_user):
    response = client.put(
        "/api/v1/oidc-config",
        json={"enabled": True, "button_label": ""},
    )
    assert response.status_code == 422


def test_put_config_inactive_user_forbidden(client, authed_user):
    authed_user.is_active = False

    response = client.put(
        "/api/v1/oidc-config",
        json={"enabled": True, "button_label": "Should Fail"},
    )
    assert response.status_code == 403


def test_put_config_requires_auth(client):
    response = client.put(
        "/api/v1/oidc-config",
        json={"enabled": True, "button_label": "No Auth"},
    )
    assert response.status_code in (401, 403)
