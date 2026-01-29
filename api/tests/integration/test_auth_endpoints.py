# tests/integration/test_auth_endpoints.py
import pytest
from unittest.mock import Mock, patch, ANY
from fastapi.testclient import TestClient
from fastapi import status
from datetime import datetime

# Mock database before importing app
with patch('database.engine'), patch('models.models.Base.metadata.create_all'):
    from main import app
    from routers.auth import get_current_user
    from database import get_db
    from models import models


# ==================== Fixtures ====================


@pytest.fixture
def client():
    """Create test client."""
    # Clear any existing overrides first
    app.dependency_overrides.clear()
    with TestClient(app) as test_client:
        yield test_client
    # Clear overrides after test
    app.dependency_overrides.clear()


@pytest.fixture
def mock_db_session():
    """Create a mock database session."""
    return Mock()


@pytest.fixture
def sample_user_response():
    """Sample user response data."""
    return {
        "id": 1,
        "first_name": "Test",
        "last_name": "User",
        "email": "test@example.com",
        "username": "testuser",
        "is_active": True,
        "viewed_tutorial": False,
        "roles": ["user"],
        "groups": [],
        "user_metadata": {"created_at": "2026-01-28T10:00:00"},
        "ttl": "2026-02-04T10:00:00"
    }


# ==================== POST /api/v1/auth/register Tests ====================


class TestRegisterEndpoint:
    """Test user registration endpoint."""

    @patch("routers.auth.auth_service")
    @patch("routers.auth.get_db")
    def test_register_success(
        self,
        mock_get_db,
        mock_service,
        client,
        mock_db_session,
        sample_user_response
    ):
        """Should register new user successfully."""
        mock_get_db.return_value = mock_db_session
        mock_service.register.return_value = sample_user_response
        
        response = client.post(
            "/api/v1/auth/register",
            json={
                "first_name": "Test",
                "last_name": "User",
                "email": "test@example.com",
                "username": "testuser",
                "password": "SecurePass123"
            }
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["username"] == "testuser"
        assert data["email"] == "test@example.com"
        assert data["roles"] == ["user"]
        mock_service.register.assert_called_once()

    @patch("routers.auth.auth_service")
    @patch("routers.auth.get_db")
    def test_register_missing_required_field(
        self,
        mock_get_db,
        mock_service,
        client,
        mock_db_session
    ):
        """Should return 422 when required field is missing."""
        mock_get_db.return_value = mock_db_session
        
        response = client.post(
            "/api/v1/auth/register",
            json={
                "first_name": "Test",
                "last_name": "User",
                "email": "test@example.com",
                # Missing username and password
            }
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT
        mock_service.register.assert_not_called()

    @patch("routers.auth.auth_service")
    @patch("routers.auth.get_db")
    def test_register_invalid_email(
        self,
        mock_get_db,
        mock_service,
        client,
        mock_db_session
    ):
        """Should return 422 when email format is invalid."""
        mock_get_db.return_value = mock_db_session
        
        response = client.post(
            "/api/v1/auth/register",
            json={
                "first_name": "Test",
                "last_name": "User",
                "email": "not-an-email",
                "username": "testuser",
                "password": "SecurePass123"
            }
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT
        mock_service.register.assert_not_called()

    @patch("routers.auth.auth_service")
    @patch("routers.auth.get_db")
    def test_register_weak_password(
        self,
        mock_get_db,
        mock_service,
        client,
        mock_db_session
    ):
        """Should return 422 when password doesn't meet requirements."""
        mock_get_db.return_value = mock_db_session
        
        response = client.post(
            "/api/v1/auth/register",
            json={
                "first_name": "Test",
                "last_name": "User",
                "email": "test@example.com",
                "username": "testuser",
                "password": "weak"  # Too short, no uppercase, no digit
            }
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT
        mock_service.register.assert_not_called()

    @patch("routers.auth.auth_service")
    @patch("routers.auth.get_db")
    def test_register_invalid_username(
        self,
        mock_get_db,
        mock_service,
        client,
        mock_db_session
    ):
        """Should return 422 when username contains invalid characters."""
        mock_get_db.return_value = mock_db_session
        
        response = client.post(
            "/api/v1/auth/register",
            json={
                "first_name": "Test",
                "last_name": "User",
                "email": "test@example.com",
                "username": "test@user",  # @ not allowed
                "password": "SecurePass123"
            }
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT
        mock_service.register.assert_not_called()

    @patch("routers.auth.auth_service")
    @patch("routers.auth.get_db")
    def test_register_duplicate_email(
        self,
        mock_get_db,
        mock_service,
        client,
        mock_db_session
    ):
        """Should return 400 when email already exists."""
        from fastapi import HTTPException
        
        mock_get_db.return_value = mock_db_session
        mock_service.register.side_effect = HTTPException(
            status_code=400,
            detail="Email already registered"
        )
        
        response = client.post(
            "/api/v1/auth/register",
            json={
                "first_name": "Test",
                "last_name": "User",
                "email": "existing@example.com",
                "username": "testuser",
                "password": "SecurePass123"
            }
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Email already registered" in response.json()["detail"]


# ==================== POST /api/v1/auth/login Tests ====================


class TestLoginEndpoint:
    """Test user login endpoint."""

    @patch("routers.auth.auth_service")
    @patch("routers.auth.get_db")
    def test_login_success(
        self,
        mock_get_db,
        mock_service,
        client,
        mock_db_session,
        sample_user_response
    ):
        """Should login user with correct credentials."""
        mock_get_db.return_value = mock_db_session
        mock_service.login.return_value = sample_user_response
        
        response = client.post(
            "/api/v1/auth/login",
            json={
                "username": "testuser",
                "password": "TestPassword123"
            }
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["username"] == "testuser"
        assert data["id"] == 1
        mock_service.login.assert_called_once()

    @patch("routers.auth.auth_service")
    @patch("routers.auth.get_db")
    def test_login_invalid_credentials(
        self,
        mock_get_db,
        mock_service,
        client,
        mock_db_session
    ):
        """Should return 401 for invalid credentials."""
        from fastapi import HTTPException
        
        mock_get_db.return_value = mock_db_session
        mock_service.login.side_effect = HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )
        
        response = client.post(
            "/api/v1/auth/login",
            json={
                "username": "testuser",
                "password": "WrongPassword"
            }
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Invalid username or password" in response.json()["detail"]

    @patch("routers.auth.auth_service")
    @patch("routers.auth.get_db")
    def test_login_missing_credentials(
        self,
        mock_get_db,
        mock_service,
        client,
        mock_db_session
    ):
        """Should return 422 when credentials are missing."""
        mock_get_db.return_value = mock_db_session
        
        response = client.post(
            "/api/v1/auth/login",
            json={
                "username": "testuser"
                # Missing password
            }
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT
        mock_service.login.assert_not_called()

    @patch("routers.auth.auth_service")
    @patch("routers.auth.get_db")
    def test_login_inactive_user(
        self,
        mock_get_db,
        mock_service,
        client,
        mock_db_session
    ):
        """Should return 401 for inactive user."""
        from fastapi import HTTPException
        
        mock_get_db.return_value = mock_db_session
        mock_service.login.side_effect = HTTPException(
            status_code=401,
            detail="User account is inactive"
        )
        
        response = client.post(
            "/api/v1/auth/login",
            json={
                "username": "testuser",
                "password": "TestPassword123"
            }
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "User account is inactive" in response.json()["detail"]


# ==================== GET /api/v1/auth/me Tests ====================


class TestGetCurrentUserEndpoint:
    """Test get current user info endpoint."""

    @patch("routers.auth.auth_service")
    def test_get_me_success(
        self,
        mock_service,
        sample_user_response
    ):
        """Should return current user info when authenticated."""
        mock_user = Mock(spec=models.User)
        mock_user.id = 1
        mock_user.username = "testuser"
        mock_user.email = "test@example.com"
        mock_user.first_name = "Test"
        mock_user.last_name = "User"
        mock_user.is_active = True
        mock_user.viewed_tutorial = False
        mock_user.roles = []
        mock_user.groups = []
        mock_user.user_metadata = {}
        
        mock_service.get_current_user_info.return_value = sample_user_response
        
        # Override dependency before creating client
        app.dependency_overrides[get_current_user] = lambda: mock_user
        
        try:
            client = TestClient(app)
            response = client.get("/api/v1/auth/me")
            
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert data["username"] == "testuser"
            assert data["id"] == 1
            mock_service.get_current_user_info.assert_called_once_with(mock_user)
        finally:
            app.dependency_overrides.clear()

    def test_get_me_not_authenticated(
        self,
        client
    ):
        """Should return 401 when not authenticated."""
        # No dependency override - should fail authentication
        response = client.get("/api/v1/auth/me")
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ==================== POST /api/v1/auth/change-password Tests ====================


class TestChangePasswordEndpoint:
    """Test change password endpoint."""

    @patch("routers.auth.auth_service")
    def test_change_password_success(
        self,
        mock_service,
        mock_db_session
    ):
        """Should change password successfully."""
        mock_user = Mock(spec=models.User)
        mock_user.id = 1
        mock_user.username = "testuser"
        mock_user.email = "test@example.com"
        mock_user.first_name = "Test"
        mock_user.last_name = "User"
        mock_user.is_active = True
        
        mock_service.change_password.return_value = {"message": "Password changed successfully"}
        
        # Override dependencies before creating client
        app.dependency_overrides[get_current_user] = lambda: mock_user
        app.dependency_overrides[get_db] = lambda: mock_db_session
        
        try:
            client = TestClient(app)
            response = client.post(
                "/api/v1/auth/change-password",
                json={
                    "current_password": "OldPassword123",
                    "new_password": "NewPassword456"
                }
            )
            
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert data["message"] == "Password changed successfully"
            mock_service.change_password.assert_called_once()
        finally:
            app.dependency_overrides.clear()

    @patch("routers.auth.auth_service")
    def test_change_password_wrong_current(
        self,
        mock_service,
        mock_db_session
    ):
        """Should return 400 when current password is incorrect."""
        from fastapi import HTTPException
        
        mock_user = Mock(spec=models.User)
        mock_user.id = 1
        mock_user.username = "testuser"
        mock_user.email = "test@example.com"
        mock_user.is_active = True
        
        mock_service.change_password.side_effect = HTTPException(
            status_code=400,
            detail="Current password is incorrect"
        )
        
        # Override dependencies before creating client
        app.dependency_overrides[get_current_user] = lambda: mock_user
        app.dependency_overrides[get_db] = lambda: mock_db_session
        
        try:
            client = TestClient(app)
            response = client.post(
                "/api/v1/auth/change-password",
                json={
                    "current_password": "WrongPassword",
                    "new_password": "NewPassword456"
                }
            )
            
            assert response.status_code == status.HTTP_400_BAD_REQUEST
            assert "Current password is incorrect" in response.json()["detail"]
        finally:
            app.dependency_overrides.clear()

    def test_change_password_not_authenticated(
        self,
        client
    ):
        """Should return 401 when not authenticated."""
        # No dependency override - should fail authentication
        response = client.post(
            "/api/v1/auth/change-password",
            json={
                "current_password": "OldPassword123",
                "new_password": "NewPassword456"
            }
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_change_password_weak_new_password(
        self,
        mock_db_session
    ):
        """Should return 422 when new password doesn't meet requirements."""
        mock_user = Mock(spec=models.User)
        mock_user.id = 1
        mock_user.username = "testuser"
        mock_user.is_active = True
        
        # Override dependencies before creating client
        app.dependency_overrides[get_current_user] = lambda: mock_user
        app.dependency_overrides[get_db] = lambda: mock_db_session
        
        try:
            client = TestClient(app)
            response = client.post(
                "/api/v1/auth/change-password",
                json={
                    "current_password": "OldPassword123",
                    "new_password": "weak"  # Too short, no uppercase, no digit
                }
            )
            
            assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT
        finally:
            app.dependency_overrides.clear()

    def test_change_password_missing_fields(
        self,
        mock_db_session
    ):
        """Should return 422 when required fields are missing."""
        mock_user = Mock(spec=models.User)
        mock_user.id = 1
        mock_user.username = "testuser"
        mock_user.is_active = True
        
        # Override dependencies before creating client
        app.dependency_overrides[get_current_user] = lambda: mock_user
        app.dependency_overrides[get_db] = lambda: mock_db_session
        
        try:
            client = TestClient(app)
            response = client.post(
                "/api/v1/auth/change-password",
                json={
                    "current_password": "OldPassword123"
                    # Missing new_password
                }
            )
            
            assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT
        finally:
            app.dependency_overrides.clear()
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT


# ==================== POST /api/v1/auth/logout Tests ====================


class TestLogoutEndpoint:
    """Test logout endpoint."""

    @patch("routers.auth.auth_service")
    def test_logout_success(
        self,
        mock_service,
        client
    ):
        """Should logout successfully and clear session."""
        mock_service.logout.return_value = {"message": "Logged out successfully"}
        
        response = client.post("/api/v1/auth/logout")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["message"] == "Logged out successfully"
        mock_service.logout.assert_called_once()

    @patch("routers.auth.auth_service")
    def test_logout_when_not_logged_in(
        self,
        mock_service,
        client
    ):
        """Should succeed even when not logged in (idempotent)."""
        mock_service.logout.return_value = {"message": "Logged out successfully"}
        
        response = client.post("/api/v1/auth/logout")
        
        # Should still succeed
        assert response.status_code == status.HTTP_200_OK
