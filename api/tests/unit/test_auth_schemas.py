# tests/unit/test_auth_schemas.py
import pytest
from pydantic import ValidationError
from datetime import datetime, timedelta

from schemas.auth import (
    TicketValidation,
    UserResponse,
    UserRegister,
    UserLogin,
    TokenResponse,
    PasswordChange,
)


# ==================== TicketValidation Tests ====================


class TestTicketValidation:
    """Test CAS ticket validation schema."""

    def test_valid_ticket_validation(self):
        """Should accept valid ticket and service."""
        data = {
            "ticket": "ST-12345-abcdefghijklmnopqrst-cas",
            "service": "https://example.com/cas/callback"
        }
        ticket = TicketValidation(**data)
        assert ticket.ticket == data["ticket"]
        assert ticket.service == data["service"]

    def test_missing_ticket(self):
        """Should fail when ticket is missing."""
        data = {"service": "https://example.com/cas/callback"}
        with pytest.raises(ValidationError) as exc_info:
            TicketValidation(**data)
        assert "ticket" in str(exc_info.value)

    def test_missing_service(self):
        """Should fail when service is missing."""
        data = {"ticket": "ST-12345-abcdefghijklmnopqrst-cas"}
        with pytest.raises(ValidationError) as exc_info:
            TicketValidation(**data)
        assert "service" in str(exc_info.value)


# ==================== UserResponse Tests ====================


class TestUserResponse:
    """Test user response schema."""

    def test_valid_user_response_minimal(self):
        """Should accept minimal valid user data."""
        data = {
            "id": 1,
            "first_name": "John",
            "last_name": "Doe",
            "username": "johndoe",
            "is_active": True,
            "ttl": "2026-02-01T12:00:00"
        }
        user = UserResponse(**data)
        assert user.id == 1
        assert user.first_name == "John"
        assert user.last_name == "Doe"
        assert user.username == "johndoe"
        assert user.is_active is True
        assert user.viewed_tutorial is False  # default
        assert user.roles == []  # default
        assert user.groups == []  # default
        assert user.user_metadata is None  # default
        assert user.email is None  # optional

    def test_valid_user_response_complete(self):
        """Should accept complete user data with all fields."""
        data = {
            "id": 1,
            "first_name": "John",
            "last_name": "Doe",
            "email": "john.doe@example.com",
            "username": "johndoe",
            "is_active": True,
            "viewed_tutorial": True,
            "roles": ["admin", "user"],
            "groups": [{"id": 1, "name": "Admins"}],
            "user_metadata": {"last_login": "2026-01-28T10:00:00"},
            "ttl": "2026-02-01T12:00:00"
        }
        user = UserResponse(**data)
        assert user.email == "john.doe@example.com"
        assert user.viewed_tutorial is True
        assert user.roles == ["admin", "user"]
        assert len(user.groups) == 1
        assert user.groups[0]["name"] == "Admins"
        assert user.user_metadata["last_login"] == "2026-01-28T10:00:00"

    def test_missing_required_field(self):
        """Should fail when required field is missing."""
        data = {
            "id": 1,
            "first_name": "John",
            # Missing last_name
            "username": "johndoe",
            "is_active": True,
            "ttl": "2026-02-01T12:00:00"
        }
        with pytest.raises(ValidationError) as exc_info:
            UserResponse(**data)
        assert "last_name" in str(exc_info.value)


# ==================== UserRegister Tests ====================


class TestUserRegister:
    """Test user registration schema with validators."""

    def test_valid_registration(self):
        """Should accept valid registration data."""
        data = {
            "first_name": "John",
            "last_name": "Doe",
            "email": "john.doe@example.com",
            "username": "john_doe",
            "password": "SecurePass123"
        }
        user = UserRegister(**data)
        assert user.first_name == "John"
        assert user.last_name == "Doe"
        assert user.email == "john.doe@example.com"
        assert user.username == "john_doe"
        assert user.password == "SecurePass123"

    def test_username_with_special_characters(self):
        """Should accept username with underscores, hyphens, and periods."""
        valid_usernames = [
            "john_doe",
            "john-doe",
            "john.doe",
            "john_doe.test-123"
        ]
        for username in valid_usernames:
            data = {
                "first_name": "John",
                "last_name": "Doe",
                "email": "john@example.com",
                "username": username,
                "password": "SecurePass123"
            }
            user = UserRegister(**data)
            assert user.username == username

    def test_username_with_invalid_characters(self):
        """Should reject username with invalid characters."""
        invalid_usernames = [
            "john@doe",  # @ not allowed
            "john doe",  # space not allowed
            "john#doe",  # # not allowed
            "john$doe",  # $ not allowed
        ]
        for username in invalid_usernames:
            data = {
                "first_name": "John",
                "last_name": "Doe",
                "email": "john@example.com",
                "username": username,
                "password": "SecurePass123"
            }
            with pytest.raises(ValidationError) as exc_info:
                UserRegister(**data)
            assert "Username can only contain letters, numbers, underscores, hyphens, and periods" in str(exc_info.value)

    def test_username_too_short(self):
        """Should reject username shorter than 3 characters."""
        data = {
            "first_name": "John",
            "last_name": "Doe",
            "email": "john@example.com",
            "username": "jo",
            "password": "SecurePass123"
        }
        with pytest.raises(ValidationError) as exc_info:
            UserRegister(**data)
        assert "username" in str(exc_info.value)

    def test_password_too_short(self):
        """Should reject password shorter than 8 characters."""
        data = {
            "first_name": "John",
            "last_name": "Doe",
            "email": "john@example.com",
            "username": "johndoe",
            "password": "Pass1"
        }
        with pytest.raises(ValidationError) as exc_info:
            UserRegister(**data)
        # Pydantic's Field min_length validation happens before custom validator
        assert "at least 8 characters" in str(exc_info.value)

    def test_password_missing_uppercase(self):
        """Should reject password without uppercase letter."""
        data = {
            "first_name": "John",
            "last_name": "Doe",
            "email": "john@example.com",
            "username": "johndoe",
            "password": "password123"
        }
        with pytest.raises(ValidationError) as exc_info:
            UserRegister(**data)
        assert "Password must contain at least one uppercase letter" in str(exc_info.value)

    def test_password_missing_lowercase(self):
        """Should reject password without lowercase letter."""
        data = {
            "first_name": "John",
            "last_name": "Doe",
            "email": "john@example.com",
            "username": "johndoe",
            "password": "PASSWORD123"
        }
        with pytest.raises(ValidationError) as exc_info:
            UserRegister(**data)
        assert "Password must contain at least one lowercase letter" in str(exc_info.value)

    def test_password_missing_digit(self):
        """Should reject password without digit."""
        data = {
            "first_name": "John",
            "last_name": "Doe",
            "email": "john@example.com",
            "username": "johndoe",
            "password": "PasswordOnly"
        }
        with pytest.raises(ValidationError) as exc_info:
            UserRegister(**data)
        assert "Password must contain at least one digit" in str(exc_info.value)

    def test_first_name_empty(self):
        """Should reject empty first name."""
        data = {
            "first_name": "",
            "last_name": "Doe",
            "email": "john@example.com",
            "username": "johndoe",
            "password": "SecurePass123"
        }
        with pytest.raises(ValidationError) as exc_info:
            UserRegister(**data)
        assert "first_name" in str(exc_info.value)

    def test_invalid_email(self):
        """Should reject invalid email format."""
        data = {
            "first_name": "John",
            "last_name": "Doe",
            "email": "not-an-email",
            "username": "johndoe",
            "password": "SecurePass123"
        }
        with pytest.raises(ValidationError) as exc_info:
            UserRegister(**data)
        assert "email" in str(exc_info.value)


# ==================== UserLogin Tests ====================


class TestUserLogin:
    """Test user login schema."""

    def test_valid_login(self):
        """Should accept valid login credentials."""
        data = {
            "username": "johndoe",
            "password": "SecurePass123"
        }
        login = UserLogin(**data)
        assert login.username == "johndoe"
        assert login.password == "SecurePass123"

    def test_missing_username(self):
        """Should fail when username is missing."""
        data = {"password": "SecurePass123"}
        with pytest.raises(ValidationError) as exc_info:
            UserLogin(**data)
        assert "username" in str(exc_info.value)

    def test_missing_password(self):
        """Should fail when password is missing."""
        data = {"username": "johndoe"}
        with pytest.raises(ValidationError) as exc_info:
            UserLogin(**data)
        assert "password" in str(exc_info.value)


# ==================== TokenResponse Tests ====================


class TestTokenResponse:
    """Test token response schema."""

    def test_valid_token_response(self):
        """Should accept valid token response."""
        user_data = {
            "id": 1,
            "first_name": "John",
            "last_name": "Doe",
            "username": "johndoe",
            "is_active": True,
            "ttl": "2026-02-01T12:00:00"
        }
        data = {
            "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            "token_type": "bearer",
            "expires_in": 3600,
            "user": user_data
        }
        token = TokenResponse(**data)
        assert token.access_token == data["access_token"]
        assert token.token_type == "bearer"
        assert token.expires_in == 3600
        assert token.user.id == 1
        assert token.user.username == "johndoe"

    def test_default_token_type(self):
        """Should use default token_type of 'bearer'."""
        user_data = {
            "id": 1,
            "first_name": "John",
            "last_name": "Doe",
            "username": "johndoe",
            "is_active": True,
            "ttl": "2026-02-01T12:00:00"
        }
        data = {
            "access_token": "token",
            "expires_in": 3600,
            "user": user_data
        }
        token = TokenResponse(**data)
        assert token.token_type == "bearer"


# ==================== PasswordChange Tests ====================


class TestPasswordChange:
    """Test password change schema with validators."""

    def test_valid_password_change(self):
        """Should accept valid password change data."""
        data = {
            "current_password": "OldPass123",
            "new_password": "NewPass456"
        }
        pwd_change = PasswordChange(**data)
        assert pwd_change.current_password == "OldPass123"
        assert pwd_change.new_password == "NewPass456"

    def test_new_password_too_short(self):
        """Should reject new password shorter than 8 characters."""
        data = {
            "current_password": "OldPass123",
            "new_password": "New1"
        }
        with pytest.raises(ValidationError) as exc_info:
            PasswordChange(**data)
        # Pydantic's Field min_length validation happens before custom validator
        assert "at least 8 characters" in str(exc_info.value)

    def test_new_password_missing_uppercase(self):
        """Should reject new password without uppercase letter."""
        data = {
            "current_password": "OldPass123",
            "new_password": "newpass456"
        }
        with pytest.raises(ValidationError) as exc_info:
            PasswordChange(**data)
        assert "Password must contain at least one uppercase letter" in str(exc_info.value)

    def test_new_password_missing_lowercase(self):
        """Should reject new password without lowercase letter."""
        data = {
            "current_password": "OldPass123",
            "new_password": "NEWPASS456"
        }
        with pytest.raises(ValidationError) as exc_info:
            PasswordChange(**data)
        assert "Password must contain at least one lowercase letter" in str(exc_info.value)

    def test_new_password_missing_digit(self):
        """Should reject new password without digit."""
        data = {
            "current_password": "OldPass123",
            "new_password": "NewPassword"
        }
        with pytest.raises(ValidationError) as exc_info:
            PasswordChange(**data)
        assert "Password must contain at least one digit" in str(exc_info.value)

    def test_missing_current_password(self):
        """Should fail when current password is missing."""
        data = {"new_password": "NewPass456"}
        with pytest.raises(ValidationError) as exc_info:
            PasswordChange(**data)
        assert "current_password" in str(exc_info.value)

    def test_missing_new_password(self):
        """Should fail when new password is missing."""
        data = {"current_password": "OldPass123"}
        with pytest.raises(ValidationError) as exc_info:
            PasswordChange(**data)
        assert "new_password" in str(exc_info.value)
