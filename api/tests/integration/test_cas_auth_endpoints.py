# tests/integration/test_cas_auth_endpoints.py
import pytest
import sys
import os
from unittest.mock import Mock, patch, AsyncMock
from fastapi.testclient import TestClient

# Add tests directory to path for conftest imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Mock database before importing app
with patch('database.engine'), patch('models.models.Base.metadata.create_all'):
    from main import app
    from database import get_db


@pytest.fixture
def sample_cas_success_xml():
    """Sample successful CAS authentication response."""
    return """<?xml version="1.0" encoding="UTF-8"?>
<cas:serviceResponse xmlns:cas="http://www.yale.edu/tp/cas">
    <cas:authenticationSuccess>
        <cas:user>testuser</cas:user>
        <cas:attributes>
            <cas:netid>testuser</cas:netid>
            <cas:email>test@dartmouth.edu</cas:email>
            <cas:givenName>Test</cas:givenName>
            <cas:sn>User</cas:sn>
        </cas:attributes>
    </cas:authenticationSuccess>
</cas:serviceResponse>"""


@pytest.fixture
def sample_cas_failure_xml():
    """Sample failed CAS authentication response."""
    return """<?xml version="1.0" encoding="UTF-8"?>
<cas:serviceResponse xmlns:cas="http://www.yale.edu/tp/cas">
    <cas:authenticationFailure code="INVALID_TICKET">
        Ticket ST-invalid not recognized
    </cas:authenticationFailure>
</cas:serviceResponse>"""


@pytest.fixture
def client(db_session):
    """Create test client with mocked dependencies."""
    from main import app
    from database import get_db
    
    # Override get_db dependency before creating client
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    
    client = TestClient(app)
    yield client
    
    # Clean up overrides
    app.dependency_overrides.clear()


# ==================== POST /api/v1/validate-cas-ticket Tests ====================


class TestValidateCASTicketEndpoint:
    """Test POST /api/v1/validate-cas-ticket endpoint."""

    @patch('services.cas_auth_service.assign_default_role_to_user')
    @patch('services.cas_auth_service.load_user_with_relations')
    @patch('services.cas_auth_service.CASAuthService._find_existing_user')
    @patch('services.cas_auth_service.create_session')
    @patch('httpx.AsyncClient')
    def test_validate_cas_ticket_success(
        self, mock_httpx, mock_create_session, mock_find_user, mock_load_user, 
        mock_assign_role, client, test_user, cas_config, 
        sample_cas_success_xml, db_session, monkeypatch
    ):
        """Should validate ticket and return user data."""
        TestUser = type(test_user)
        CASConfig = type(cas_config)
        
        # Mock _find_existing_user to return test_user
        mock_find_user.return_value = test_user
        mock_load_user.return_value = test_user
        
        # Patch models in CAS service
        import services.cas_auth_service as cas_module
        import routers.auth_utils as auth_utils_module
        monkeypatch.setattr(cas_module.models, 'User', TestUser)
        monkeypatch.setattr(cas_module.models, 'CASConfiguration', CASConfig)
        monkeypatch.setattr(auth_utils_module.models, 'User', TestUser)
        
        # Setup database
        db_session.add(cas_config)
        test_user.user_metadata = {}
        db_session.add(test_user)
        db_session.commit()
        
        # Mock httpx response
        mock_response = Mock()
        mock_response.text = sample_cas_success_xml
        mock_response.raise_for_status = Mock()
        
        mock_client_instance = AsyncMock()
        mock_client_instance.__aenter__.return_value.get.return_value = mock_response
        mock_httpx.return_value = mock_client_instance
        
        # Make request
        response = client.post(
            "/api/v1/validate-cas-ticket",
            json={"ticket": "ST-12345", "service": "http://example.com"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == test_user.username
        assert data["email"] == test_user.email
        assert "session_id" in data or "id" in data
        
        # Verify session was created
        mock_create_session.assert_called_once()

    def test_validate_cas_ticket_cas_disabled(
        self, client, cas_config, db_session, monkeypatch
    ):
        """Should return 400 when CAS is disabled."""
        CASConfig = type(cas_config)
        
        # Patch models in CAS service
        import services.cas_auth_service as cas_module
        monkeypatch.setattr(cas_module.models, 'CASConfiguration', CASConfig)
        
        # Disable CAS
        cas_config.enabled = False
        db_session.add(cas_config)
        db_session.commit()
        
        # Make request
        response = client.post(
            "/api/v1/validate-cas-ticket",
            json={"ticket": "ST-12345", "service": "http://example.com"}
        )
        
        assert response.status_code == 400
        assert "not enabled" in response.json()["detail"]

    def test_validate_cas_ticket_missing_ticket(
        self, client, cas_config, db_session, monkeypatch
    ):
        """Should return 400 when ticket is missing."""
        CASConfig = type(cas_config)
        
        # Patch models in CAS service
        import services.cas_auth_service as cas_module
        monkeypatch.setattr(cas_module.models, 'CASConfiguration', CASConfig)
        
        db_session.add(cas_config)
        db_session.commit()
        
        # Make request with empty ticket
        response = client.post(
            "/api/v1/validate-cas-ticket",
            json={"ticket": "", "service": "http://example.com"}
        )
        
        assert response.status_code == 400
        assert "Missing CAS ticket" in response.json()["detail"]

    @patch('httpx.AsyncClient')
    def test_validate_cas_ticket_auth_failed(
        self, mock_httpx, client, cas_config, sample_cas_failure_xml, 
        db_session, monkeypatch
    ):
        """Should return 401 when CAS authentication fails."""
        CASConfig = type(cas_config)
        
        # Patch models in CAS service
        import services.cas_auth_service as cas_module
        monkeypatch.setattr(cas_module.models, 'CASConfiguration', CASConfig)
        
        db_session.add(cas_config)
        db_session.commit()
        
        # Mock httpx response with failure
        mock_response = Mock()
        mock_response.text = sample_cas_failure_xml
        mock_response.raise_for_status = Mock()
        
        mock_client_instance = AsyncMock()
        mock_client_instance.__aenter__.return_value.get.return_value = mock_response
        mock_httpx.return_value = mock_client_instance
        
        # Make request
        response = client.post(
            "/api/v1/validate-cas-ticket",
            json={"ticket": "ST-invalid", "service": "http://example.com"}
        )
        
        assert response.status_code == 401
        assert "authentication failed" in response.json()["detail"]

    @patch('httpx.AsyncClient')
    def test_validate_cas_ticket_server_error(
        self, mock_httpx, client, cas_config, db_session, monkeypatch
    ):
        """Should return 500 when CAS server returns error."""
        CASConfig = type(cas_config)
        
        # Patch models in CAS service
        import services.cas_auth_service as cas_module
        monkeypatch.setattr(cas_module.models, 'CASConfiguration', CASConfig)
        
        db_session.add(cas_config)
        db_session.commit()
        
        # Mock httpx response with server error
        import httpx
        mock_response = Mock()
        mock_response.status_code = 500
        
        def raise_status_error():
            raise httpx.HTTPStatusError("Server error", request=Mock(), response=mock_response)
        
        mock_response.raise_for_status = raise_status_error
        
        mock_client_instance = AsyncMock()
        mock_client_instance.__aenter__.return_value.get.return_value = mock_response
        mock_httpx.return_value = mock_client_instance
        
        # Make request
        response = client.post(
            "/api/v1/validate-cas-ticket",
            json={"ticket": "ST-12345", "service": "http://example.com"}
        )
        
        assert response.status_code == 500
        assert "CAS server returned error" in response.json()["detail"]

    def test_validate_cas_ticket_no_config(
        self, client, db_session, monkeypatch
    ):
        """Should return 400 when CAS configuration not found."""
        # Patch models in CAS service but don't add config
        import services.cas_auth_service as cas_module
        import sys
        import os
        # Add parent directory to import conftest
        sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        from conftest import CASConfigurationModel
        monkeypatch.setattr(cas_module.models, 'CASConfiguration', CASConfigurationModel)
        
        # Make request
        response = client.post(
            "/api/v1/validate-cas-ticket",
            json={"ticket": "ST-12345", "service": "http://example.com"}
        )
        
        assert response.status_code == 400
        # When config is missing, returns "not enabled" message
        assert "not enabled" in response.json()["detail"].lower() or "not configured" in response.json()["detail"].lower()
