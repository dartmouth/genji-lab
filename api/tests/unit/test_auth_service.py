# tests/unit/test_auth_service.py
import pytest
from datetime import datetime
from unittest.mock import Mock, patch
from fastapi import HTTPException
from passlib.context import CryptContext
import sys
import os

# Add tests directory to path to import conftest
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from conftest import test_user_roles, UserPasswordModel

from services.auth_service import AuthService, auth_service
from schemas.auth import UserRegister, UserLogin, PasswordChange


# Password context for generating test passwords
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ==================== Password Utilities Tests ====================


class TestPasswordUtilities:
    """Test password hashing and verification utilities."""

    def test_get_password_hash(self):
        """Should generate bcrypt hash for password."""
        service = AuthService()
        password = "TestPassword123"
        
        hashed = service.get_password_hash(password)
        
        assert hashed is not None
        assert hashed != password
        assert hashed.startswith("$2b$")  # bcrypt hash prefix

    def test_verify_password_correct(self):
        """Should verify correct password against hash."""
        service = AuthService()
        password = "TestPassword123"
        hashed = service.get_password_hash(password)
        
        result = service.verify_password(password, hashed)
        
        assert result is True

    def test_verify_password_incorrect(self):
        """Should reject incorrect password."""
        service = AuthService()
        password = "TestPassword123"
        wrong_password = "WrongPassword456"
        hashed = service.get_password_hash(password)
        
        result = service.verify_password(wrong_password, hashed)
        
        assert result is False

    def test_password_hash_unique(self):
        """Should generate different hashes for same password (due to salt)."""
        service = AuthService()
        password = "TestPassword123"
        
        hash1 = service.get_password_hash(password)
        hash2 = service.get_password_hash(password)
        
        # Hashes should be different but both should verify
        assert hash1 != hash2
        assert service.verify_password(password, hash1)
        assert service.verify_password(password, hash2)


# ==================== Helper Methods Tests ====================


class TestCheckExistingUser:
    """Test _check_existing_user helper method."""

    def test_check_existing_user_email_exists(self, test_user, db_session, monkeypatch):
        """Should raise 400 when email already exists."""
        # Patch models to use test models
        TestUser = type(test_user)
        import services.auth_service as auth_module
        monkeypatch.setattr(auth_module.models, 'User', TestUser)
        
        service = AuthService()
        
        with pytest.raises(HTTPException) as exc_info:
            service._check_existing_user(db_session, test_user.email, "newusername")
        
        assert exc_info.value.status_code == 400
        assert "Email already registered" in exc_info.value.detail

    def test_check_existing_user_username_exists(self, test_user, db_session, monkeypatch):
        """Should raise 400 when username already exists."""
        # Patch models to use test models
        TestUser = type(test_user)
        import services.auth_service as auth_module
        monkeypatch.setattr(auth_module.models, 'User', TestUser)
        
        service = AuthService()
        
        with pytest.raises(HTTPException) as exc_info:
            service._check_existing_user(db_session, "new@example.com", test_user.username)
        
        assert exc_info.value.status_code == 400
        assert "Username already taken" in exc_info.value.detail

    def test_check_existing_user_both_available(self, test_user, db_session, monkeypatch):
        """Should not raise when both email and username are available."""
        # Patch models to use test models
        TestUser = type(test_user)
        import services.auth_service as auth_module
        monkeypatch.setattr(auth_module.models, 'User', TestUser)
        
        service = AuthService()
        
        # Should not raise any exception
        service._check_existing_user(db_session, "new@example.com", "newusername")


class TestAssignAdminIfFirstUser:
    """Test _assign_admin_if_first_user helper method."""

    def test_assign_admin_if_first_user_creates_role(self, test_user, test_role_user, db_session, monkeypatch):
        """Should create admin role if it doesn't exist and assign to first user."""
        TestUser = type(test_user)
        TestRole = type(test_role_user)
        
        # Patch models in auth_service module
        import services.auth_service as auth_module
        monkeypatch.setattr(auth_module.models, 'User', TestUser)
        monkeypatch.setattr(auth_module.models, 'Role', TestRole)
        monkeypatch.setattr(auth_module.models, 'user_roles', test_user_roles)
        
        service = AuthService()
        service.model = TestUser
        
        user = TestUser(
            first_name="First",
            last_name="User",
            email="first@example.com",
            username="firstuser",
            is_active=True
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        
        result = service._assign_admin_if_first_user(db_session, user)
        
        assert result is True
        db_session.refresh(user)
        assert len(user.roles) == 1
        assert user.roles[0].name == "admin"

    def test_assign_admin_if_first_user_admin_exists(self, admin_user, test_role_admin, db_session, monkeypatch):
        """Should not assign admin when another admin already exists."""
        TestUser = type(admin_user)
        TestRole = type(test_role_admin)
        
        # Patch models in auth_service module
        import services.auth_service as auth_module
        monkeypatch.setattr(auth_module.models, 'User', TestUser)
        monkeypatch.setattr(auth_module.models, 'Role', TestRole)
        monkeypatch.setattr(auth_module.models, 'user_roles', test_user_roles)
        
        # admin_user already has admin role
        admin_user.roles.append(test_role_admin)
        db_session.commit()
        
        service = AuthService()
        service.model = TestUser
        
        # Create new user
        new_user = TestUser(
            first_name="Second",
            last_name="User",
            email="second@example.com",
            username="seconduser",
            is_active=True
        )
        db_session.add(new_user)
        db_session.commit()
        db_session.refresh(new_user)
        
        result = service._assign_admin_if_first_user(db_session, new_user)
        
        assert result is False
        db_session.refresh(new_user)
        assert len(new_user.roles) == 0


class TestBuildUserResponseData:
    """Test _build_user_response_data helper method."""

    def test_build_user_response_data_complete(self, test_user, test_role_user, db_session):
        """Should build complete user response with all fields."""
        test_user.roles.append(test_role_user)
        test_user.user_metadata = {"custom": "data"}
        db_session.commit()
        db_session.refresh(test_user)
        
        service = AuthService()
        
        result = service._build_user_response_data(test_user)
        
        assert result["id"] == test_user.id
        assert result["first_name"] == test_user.first_name
        assert result["last_name"] == test_user.last_name
        assert result["email"] == test_user.email
        assert result["username"] == test_user.username
        assert result["is_active"] is True
        assert result["viewed_tutorial"] is False
        assert result["roles"] == ["user"]
        assert result["groups"] == []
        assert result["user_metadata"] == {"custom": "data"}
        assert "ttl" in result
        # TTL should be an ISO timestamp
        assert isinstance(result["ttl"], str)


# ==================== Registration Tests ====================


class TestRegister:
    """Test user registration."""

    @patch('services.auth_service.create_session')
    def test_register_success(self, mock_create_session, test_user, db_session, test_role_user, monkeypatch):
        """Should register new user successfully and create session."""
        TestUser = type(test_user)
        TestRole = type(test_role_user)
        
        # Patch models in both auth_service and auth_utils modules
        import services.auth_service as auth_module
        import routers.auth_utils as auth_utils_module
        monkeypatch.setattr(auth_module.models, 'User', TestUser)
        monkeypatch.setattr(auth_module.models, 'UserPassword', UserPasswordModel)
        monkeypatch.setattr(auth_module.models, 'Role', TestRole)
        monkeypatch.setattr(auth_utils_module.models, 'User', TestUser)
        monkeypatch.setattr(auth_utils_module.models, 'Role', TestRole)
        
        service = AuthService()
        service.model = TestUser
            
        user_data = UserRegister(
            first_name="New",
            last_name="User",
            email="new@example.com",
            username="newuser",
            password="SecurePass123"
        )
        
        mock_request = Mock()
        
        result = service.register(db_session, user_data, mock_request)
        
        # Check user was created
        user = db_session.query(TestUser).filter_by(username="newuser").first()
        assert user is not None
        assert user.first_name == "New"
        assert user.last_name == "User"
        assert user.email == "new@example.com"
        assert user.is_active is True
        
        # Check password was created
        password = db_session.query(UserPasswordModel).filter_by(user_id=user.id).first()
        assert password is not None
        assert password.hashed_password is not None
        
        # Check session was created
        mock_create_session.assert_called_once()
        
        # Check response
        assert result["id"] == user.id
        assert result["username"] == "newuser"
        assert result["email"] == "new@example.com"

    @patch('services.auth_service.create_session')
    def test_register_first_user_gets_admin(self, mock_create_session, test_user, test_role_user, db_session, monkeypatch):
        """Should assign admin role to first user."""
        TestUser = type(test_user)
        TestRole = type(test_role_user)
        
        # Patch models in both auth_service and auth_utils modules
        import services.auth_service as auth_module
        import routers.auth_utils as auth_utils_module
        monkeypatch.setattr(auth_module.models, 'User', TestUser)
        monkeypatch.setattr(auth_module.models, 'UserPassword', UserPasswordModel)
        monkeypatch.setattr(auth_module.models, 'Role', TestRole)
        monkeypatch.setattr(auth_module.models, 'user_roles', test_user_roles)
        monkeypatch.setattr(auth_utils_module.models, 'User', TestUser)
        monkeypatch.setattr(auth_utils_module.models, 'Role', TestRole)
        
        service = AuthService()
        service.model = TestUser
        
        user_data = UserRegister(
            first_name="First",
            last_name="Admin",
            email="first@example.com",
            username="firstadmin",
            password="SecurePass123"
        )
        
        mock_request = Mock()
        
        result = service.register(db_session, user_data, mock_request)
        
        user = db_session.query(TestUser).filter_by(username="firstadmin").first()
        db_session.refresh(user)
        
        # Should have admin role
        role_names = [role.name for role in user.roles]
        assert "admin" in role_names

    def test_register_duplicate_email(self, test_user, db_session, monkeypatch):
        """Should raise 400 when email already exists."""
        TestUser = type(test_user)
        
        # Patch models in auth_service module
        import services.auth_service as auth_module
        monkeypatch.setattr(auth_module.models, 'User', TestUser)
        
        service = AuthService()
        
        user_data = UserRegister(
            first_name="Duplicate",
            last_name="Email",
            email=test_user.email,  # Existing email
            username="uniqueusername",
            password="SecurePass123"
        )
        
        mock_request = Mock()
        
        with pytest.raises(HTTPException) as exc_info:
            service.register(db_session, user_data, mock_request)
        
        assert exc_info.value.status_code == 400
        assert "Email already registered" in exc_info.value.detail

    def test_register_duplicate_username(self, test_user, db_session, monkeypatch):
        """Should raise 400 when username already exists."""
        TestUser = type(test_user)
        
        # Patch models in auth_service module
        import services.auth_service as auth_module
        monkeypatch.setattr(auth_module.models, 'User', TestUser)
        
        service = AuthService()
        
        user_data = UserRegister(
            first_name="Duplicate",
            last_name="Username",
            email="unique@example.com",
            username=test_user.username,  # Existing username
            password="SecurePass123"
        )
        
        mock_request = Mock()
        
        with pytest.raises(HTTPException) as exc_info:
            service.register(db_session, user_data, mock_request)
        
        assert exc_info.value.status_code == 400
        assert "Username already taken" in exc_info.value.detail


# ==================== Login Tests ====================


class TestLogin:
    """Test user login."""

    @patch('services.auth_service.create_session')
    @patch('services.auth_service.update_user_last_login')
    def test_login_success(self, mock_update_login, mock_create_session, test_user, test_role_user, db_session, monkeypatch):
        """Should login user with correct credentials."""
        TestUser = type(test_user)
        
        # Create password for test user
        service = AuthService()
        hashed = service.get_password_hash("TestPassword123")
        password = UserPasswordModel(user_id=test_user.id, hashed_password=hashed)
        db_session.add(password)
        test_user.roles.append(test_role_user)
        db_session.commit()
        db_session.refresh(test_user)
        
        # Patch models
        import services.auth_service as auth_module
        monkeypatch.setattr(auth_module.models, 'User', TestUser)
        
        login_data = UserLogin(
            username="testuser",
            password="TestPassword123"
        )
        
        mock_request = Mock()
        
        result = service.login(db_session, login_data, mock_request)
        
        # Check session was created
        mock_create_session.assert_called_once()
        
        # Check last login was updated
        mock_update_login.assert_called_once()
        
        # Check response
        assert result["id"] == test_user.id
        assert result["username"] == "testuser"

    def test_login_invalid_username(self, test_user, db_session, monkeypatch):
        """Should raise 401 for non-existent username."""
        TestUser = type(test_user)
        
        # Patch models
        import services.auth_service as auth_module
        monkeypatch.setattr(auth_module.models, 'User', TestUser)
        
        service = AuthService()
        
        login_data = UserLogin(
            username="nonexistent",
            password="TestPassword123"
        )
        
        mock_request = Mock()
        
        with pytest.raises(HTTPException) as exc_info:
            service.login(db_session, login_data, mock_request)
        
        assert exc_info.value.status_code == 401
        assert "Invalid username or password" in exc_info.value.detail

    def test_login_invalid_password(self, test_user, db_session, monkeypatch):
        """Should raise 401 for incorrect password."""
        TestUser = type(test_user)
        
        # Create password for test user
        service = AuthService()
        hashed = service.get_password_hash("CorrectPassword123")
        password = UserPasswordModel(user_id=test_user.id, hashed_password=hashed)
        db_session.add(password)
        db_session.commit()
        
        # Patch models
        import services.auth_service as auth_module
        monkeypatch.setattr(auth_module.models, 'User', TestUser)
        
        login_data = UserLogin(
            username="testuser",
            password="WrongPassword123"
        )
        
        mock_request = Mock()
        
        with pytest.raises(HTTPException) as exc_info:
            service.login(db_session, login_data, mock_request)
        
        assert exc_info.value.status_code == 401
        assert "Invalid username or password" in exc_info.value.detail

    def test_login_inactive_user(self, test_user, db_session, monkeypatch):
        """Should raise 401 when user is inactive."""
        TestUser = type(test_user)
        
        # Make user inactive
        test_user.is_active = False
        
        # Create password for test user
        service = AuthService()
        hashed = service.get_password_hash("TestPassword123")
        password = UserPasswordModel(user_id=test_user.id, hashed_password=hashed)
        db_session.add(password)
        db_session.commit()
        
        # Patch models
        import services.auth_service as auth_module
        monkeypatch.setattr(auth_module.models, 'User', TestUser)
        
        login_data = UserLogin(
            username="testuser",
            password="TestPassword123"
        )
        
        mock_request = Mock()
        
        with pytest.raises(HTTPException) as exc_info:
            service.login(db_session, login_data, mock_request)
        
        assert exc_info.value.status_code == 401
        assert "User account is inactive" in exc_info.value.detail

    def test_login_no_password_auth(self, test_user, db_session, monkeypatch):
        """Should raise 401 when user has no password authentication."""
        TestUser = type(test_user)
        
        # User has no password_auth relationship
        service = AuthService()
        
        # Patch models
        import services.auth_service as auth_module
        monkeypatch.setattr(auth_module.models, 'User', TestUser)
        
        login_data = UserLogin(
            username="testuser",
            password="TestPassword123"
        )
        
        mock_request = Mock()
        
        with pytest.raises(HTTPException) as exc_info:
            service.login(db_session, login_data, mock_request)
        
        assert exc_info.value.status_code == 401
        assert "Password authentication not available" in exc_info.value.detail


# ==================== Get Current User Info Tests ====================


class TestGetCurrentUserInfo:
    """Test get_current_user_info method."""

    def test_get_current_user_info(self, test_user, test_role_user, db_session):
        """Should return user response data for current user."""
        test_user.roles.append(test_role_user)
        db_session.commit()
        db_session.refresh(test_user)
        
        service = AuthService()
        
        result = service.get_current_user_info(test_user)
        
        assert result["id"] == test_user.id
        assert result["username"] == test_user.username
        assert result["email"] == test_user.email
        assert result["roles"] == ["user"]
        assert "ttl" in result


# ==================== Change Password Tests ====================


class TestChangePassword:
    """Test password change functionality."""

    def test_change_password_success(self, test_user, db_session, monkeypatch):
        """Should change password successfully with correct current password."""
        # Create password for test user
        service = AuthService()
        hashed = service.get_password_hash("OldPassword123")
        password = UserPasswordModel(user_id=test_user.id, hashed_password=hashed)
        db_session.add(password)
        db_session.commit()
        db_session.refresh(test_user)
        
        password_data = PasswordChange(
            current_password="OldPassword123",
            new_password="NewPassword456"
        )
        
        result = service.change_password(db_session, password_data, test_user)
        
        assert result["message"] == "Password changed successfully"
        
        # Verify new password works
        db_session.refresh(password)
        assert service.verify_password("NewPassword456", password.hashed_password)
        assert not service.verify_password("OldPassword123", password.hashed_password)

    def test_change_password_wrong_current(self, test_user, db_session, monkeypatch):
        """Should raise 400 when current password is incorrect."""
        # Create password for test user
        service = AuthService()
        hashed = service.get_password_hash("OldPassword123")
        password = UserPasswordModel(user_id=test_user.id, hashed_password=hashed)
        db_session.add(password)
        db_session.commit()
        db_session.refresh(test_user)
        
        password_data = PasswordChange(
            current_password="WrongPassword",
            new_password="NewPassword456"
        )
        
        with pytest.raises(HTTPException) as exc_info:
            service.change_password(db_session, password_data, test_user)
        
        assert exc_info.value.status_code == 400
        assert "Current password is incorrect" in exc_info.value.detail

    def test_change_password_no_auth(self, test_user, db_session):
        """Should raise 400 when user has no password authentication."""
        service = AuthService()
        
        password_data = PasswordChange(
            current_password="OldPassword123",
            new_password="NewPassword456"
        )
        
        with pytest.raises(HTTPException) as exc_info:
            service.change_password(db_session, password_data, test_user)
        
        assert exc_info.value.status_code == 400
        assert "Password authentication not available" in exc_info.value.detail


# ==================== Logout Tests ====================


class TestLogout:
    """Test logout functionality."""

    @patch('services.auth_service.clear_session')
    def test_logout_success(self, mock_clear_session):
        """Should clear session and return success message."""
        service = AuthService()
        mock_request = Mock()
        
        result = service.logout(mock_request)
        
        mock_clear_session.assert_called_once_with(mock_request)
        assert result["message"] == "Logged out successfully"
