# tests/integration/test_cas_config_endpoints.py
import pytest
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient

# Mock database before importing app
with patch('database.engine'), patch('models.models.Base.metadata.create_all'):
    from main import app
    from database import get_db
    from routers.auth import get_current_user


@pytest.fixture
def client():
    """Create test client."""
    app.dependency_overrides.clear()
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# ==================== GET /api/v1/cas-config Tests ====================


class TestGetCASConfigEndpoint:
    """Test GET /api/v1/cas-config endpoint."""

    @patch('services.cas_config_service.cas_config_service.get')
    def test_get_cas_config_requires_auth(self, mock_get, client):
        """Should require authentication."""
        response = client.get("/api/v1/cas-config")
        
        # Should return 401 or 403 without auth
        assert response.status_code in [401, 403]
        mock_get.assert_not_called()

    @patch('services.cas_config_service.cas_config_service.get')
    def test_get_cas_config_success(self, mock_get, client, test_user, db_session):
        """Should return config when authenticated."""
        TestUser = type(test_user)
        
        # Override get_current_user
        def override_get_current_user():
            return test_user
        
        # Override get_db
        def override_get_db():
            yield db_session
        
        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_db] = override_get_db
        
        # Mock service response
        mock_get.return_value = {
            "id": 1,
            "enabled": True,
            "server_url": "https://login.example.edu/cas",
            "validation_endpoint": "/serviceValidate",
            "protocol_version": "2.0",
            "xml_namespace": "http://www.yale.edu/tp/cas",
            "attribute_mapping": {"username": "netid"},
            "username_patterns": ["pattern1"],
            "metadata_attributes": ["uid"],
            "email_domain": None,
            "email_format": "from_cas",
            "display_name": "CAS Login",
            "updated_at": None,
            "updated_by_id": None
        }
        
        response = client.get("/api/v1/cas-config")
        
        assert response.status_code == 200
        data = response.json()
        assert data["enabled"] is True
        assert data["server_url"] == "https://login.example.edu/cas"
        mock_get.assert_called_once()

    @patch('services.cas_config_service.cas_config_service.get')
    def test_get_cas_config_returns_defaults(self, mock_get, client, test_user, db_session):
        """Should return default config when none exists."""
        # Override dependencies
        def override_get_current_user():
            return test_user
        
        def override_get_db():
            yield db_session
        
        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_db] = override_get_db
        
        # Mock service to return defaults
        mock_get.return_value = {
            "id": None,
            "enabled": False,
            "server_url": None,
            "validation_endpoint": "/serviceValidate",
            "protocol_version": "2.0",
            "xml_namespace": "http://www.yale.edu/tp/cas",
            "attribute_mapping": {"username": "netid"},
            "username_patterns": ["pattern1"],
            "metadata_attributes": ["uid"],
            "email_domain": None,
            "email_format": "from_cas",
            "display_name": "CAS Login",
            "updated_at": None,
            "updated_by_id": None
        }
        
        response = client.get("/api/v1/cas-config")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] is None
        assert data["enabled"] is False


# ==================== PUT /api/v1/cas-config Tests ====================


class TestUpdateCASConfigEndpoint:
    """Test PUT /api/v1/cas-config endpoint."""

    @patch('services.cas_config_service.cas_config_service.create_or_update')
    def test_update_cas_config_requires_auth(self, mock_update, client):
        """Should require authentication."""
        response = client.put(
            "/api/v1/cas-config",
            json={"enabled": False}
        )
        
        assert response.status_code in [401, 403]
        mock_update.assert_not_called()

    @patch('services.cas_config_service.cas_config_service.create_or_update')
    def test_update_cas_config_success(self, mock_update, client, test_user, db_session):
        """Should update config when authenticated."""
        # Override dependencies
        def override_get_current_user():
            return test_user
        
        def override_get_db():
            yield db_session
        
        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_db] = override_get_db
        
        # Mock service response
        mock_update.return_value = {
            "id": 1,
            "enabled": True,
            "server_url": "https://login.example.edu/cas",
            "validation_endpoint": "/serviceValidate",
            "protocol_version": "2.0",
            "xml_namespace": "http://www.yale.edu/tp/cas",
            "attribute_mapping": {"username": "netid"},
            "username_patterns": ["pattern1"],
            "metadata_attributes": ["uid"],
            "email_domain": None,
            "email_format": "from_cas",
            "display_name": "CAS Login",
            "updated_at": "2026-01-29T10:00:00",
            "updated_by_id": test_user.id
        }
        
        response = client.put(
            "/api/v1/cas-config",
            json={
                "enabled": True,
                "server_url": "https://login.example.edu/cas",
                "attribute_mapping": {
                    "username": "netid",
                    "email": "email",
                    "first_name": "givenName",
                    "last_name": "sn"
                }
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["enabled"] is True
        assert data["updated_by_id"] == test_user.id
        mock_update.assert_called_once()

    @patch('services.cas_config_service.cas_config_service.create_or_update')
    def test_update_cas_config_validation_error(self, mock_update, client, test_user, db_session):
        """Should return 422 for invalid data."""
        # Override dependencies
        def override_get_current_user():
            return test_user
        
        def override_get_db():
            yield db_session
        
        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_db] = override_get_db
        
        # Send invalid data (enabled without server_url)
        response = client.put(
            "/api/v1/cas-config",
            json={
                "enabled": True,
                "server_url": None,
                "attribute_mapping": {
                    "username": "netid",
                    "email": "email",
                    "first_name": "givenName",
                    "last_name": "sn"
                }
            }
        )
        
        assert response.status_code == 422
        mock_update.assert_not_called()


# ==================== GET /api/v1/cas-config/public Tests ====================


class TestGetPublicCASConfigEndpoint:
    """Test GET /api/v1/cas-config/public endpoint."""

    @patch('services.cas_config_service.cas_config_service.get_public')
    def test_get_public_cas_config_no_auth(self, mock_get_public, client, db_session):
        """Should work without authentication."""
        # Override get_db only
        def override_get_db():
            yield db_session
        
        app.dependency_overrides[get_db] = override_get_db
        
        # Mock service response
        mock_get_public.return_value = {
            "enabled": True,
            "display_name": "CAS Login"
        }
        
        response = client.get("/api/v1/cas-config/public")
        
        assert response.status_code == 200
        data = response.json()
        assert "enabled" in data
        assert "display_name" in data
        assert "server_url" not in data  # Should not expose sensitive data
        mock_get_public.assert_called_once()

    @patch('services.cas_config_service.cas_config_service.get_public')
    def test_get_public_cas_config_returns_defaults(self, mock_get_public, client, db_session):
        """Should return defaults when no config exists."""
        # Override get_db only
        def override_get_db():
            yield db_session
        
        app.dependency_overrides[get_db] = override_get_db
        
        # Mock service to return defaults
        mock_get_public.return_value = {
            "enabled": False,
            "display_name": "CAS Login"
        }
        
        response = client.get("/api/v1/cas-config/public")
        
        assert response.status_code == 200
        data = response.json()
        assert data["enabled"] is False
        assert data["display_name"] == "CAS Login"
        assert len(data) == 2  # Only public fields
