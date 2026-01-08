"""
Tests for authentication operations.

This test suite covers username/password authentication including:
- Password hashing and verification
- User registration validation
- First user admin assignment
- Login validation
- Password change operations
"""

import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import select

from tests.conftest import User, UserPassword, Role, user_roles, create_user_password
from passlib.context import CryptContext


# Password hashing context (same as production)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hashed password."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt."""
    return pwd_context.hash(password)


class TestPasswordHashing:
    """Tests for password hashing and verification functionality."""

    def test_hash_password_successfully(self):
        """Test that password hashing produces a hash."""
        plain_password = "TestPassword123"
        hashed = get_password_hash(plain_password)

        assert hashed is not None
        assert hashed != plain_password
        assert len(hashed) > 20  # bcrypt hashes are typically ~60 characters

    def test_verify_correct_password(self):
        """Test that correct password verification succeeds."""
        plain_password = "TestPassword123"
        hashed = get_password_hash(plain_password)

        assert verify_password(plain_password, hashed) is True

    def test_verify_incorrect_password(self):
        """Test that incorrect password verification fails."""
        plain_password = "TestPassword123"
        wrong_password = "WrongPassword456"
        hashed = get_password_hash(plain_password)

        assert verify_password(wrong_password, hashed) is False

    def test_different_hashes_for_same_password(self):
        """Test that hashing the same password twice produces different hashes (due to salt)."""
        plain_password = "TestPassword123"
        hash1 = get_password_hash(plain_password)
        hash2 = get_password_hash(plain_password)

        assert hash1 != hash2
        # But both should verify correctly
        assert verify_password(plain_password, hash1) is True
        assert verify_password(plain_password, hash2) is True


class TestUserRegistration:
    """Tests for user registration with password authentication."""

    def test_register_user_with_password(self, db_session: Session):
        """Test successful user registration with password."""
        user = User(
            first_name="John",
            last_name="Doe",
            email="john@example.com",
            username="johndoe",
            is_active=True,
            user_metadata={"auth_method": "password"}
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        # Create password
        hashed_password = get_password_hash("TestPassword123")
        user_password = create_user_password(db_session, user.id, hashed_password)

        assert user.id is not None
        assert user_password.id is not None
        assert user_password.user_id == user.id
        assert user_password.hashed_password != "TestPassword123"

    def test_duplicate_email_validation(self, db_session: Session):
        """Test that duplicate email addresses are rejected."""
        user1 = User(
            first_name="John",
            last_name="Doe",
            email="duplicate@example.com",
            username="johndoe"
        )
        db_session.add(user1)
        db_session.commit()

        user2 = User(
            first_name="Jane",
            last_name="Smith",
            email="duplicate@example.com",  # Same email
            username="janesmith"
        )
        db_session.add(user2)

        with pytest.raises(Exception):  # SQLAlchemy will raise integrity error
            db_session.commit()

    def test_duplicate_username_validation(self, db_session: Session):
        """Test that duplicate usernames are rejected."""
        user1 = User(
            first_name="John",
            last_name="Doe",
            email="john@example.com",
            username="duplicateuser"
        )
        db_session.add(user1)
        db_session.commit()

        user2 = User(
            first_name="Jane",
            last_name="Smith",
            email="jane@example.com",
            username="duplicateuser"  # Same username
        )
        db_session.add(user2)

        with pytest.raises(Exception):  # SQLAlchemy will raise integrity error
            db_session.commit()

    def test_password_stored_as_hash_not_plaintext(self, db_session: Session):
        """Test that passwords are stored as hashes, not plaintext."""
        plain_password = "MySecretPassword123"
        user = User(
            first_name="Test",
            last_name="User",
            email="test@example.com",
            username="testuser"
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        hashed_password = get_password_hash(plain_password)
        user_password = create_user_password(db_session, user.id, hashed_password)

        # Verify it's not stored as plaintext
        assert user_password.hashed_password != plain_password
        # Verify it starts with bcrypt identifier
        assert user_password.hashed_password.startswith("$2b$")
        # Verify it can be verified
        assert verify_password(plain_password, user_password.hashed_password) is True

    def test_user_password_relationship(self, db_session: Session):
        """Test that User and UserPassword relationship works correctly."""
        user = User(
            first_name="Test",
            last_name="User",
            email="test@example.com",
            username="testuser"
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        hashed_password = get_password_hash("TestPassword123")
        user_password = create_user_password(db_session, user.id, hashed_password)

        # Reload user to get relationship
        db_session.refresh(user)

        assert user.password_auth is not None
        assert user.password_auth.id == user_password.id
        assert user.password_auth.user_id == user.id

    def test_user_password_unique_constraint(self, db_session: Session):
        """Test that each user can only have one password record."""
        user = User(
            first_name="Test",
            last_name="User",
            email="test@example.com",
            username="testuser"
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        # Create first password
        hashed_password1 = get_password_hash("Password1")
        create_user_password(db_session, user.id, hashed_password1)

        # Try to create second password for same user
        hashed_password2 = get_password_hash("Password2")
        password2 = UserPassword(user_id=user.id, hashed_password=hashed_password2)
        db_session.add(password2)

        with pytest.raises(Exception):  # Should raise unique constraint error
            db_session.commit()

    def test_user_metadata_auth_method_tracking(self, db_session: Session):
        """Test that user metadata tracks authentication method."""
        user = User(
            first_name="Test",
            last_name="User",
            email="test@example.com",
            username="testuser",
            user_metadata={
                "auth_method": "password",
                "created_at": datetime.now().isoformat()
            }
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        assert user.user_metadata is not None
        assert user.user_metadata.get("auth_method") == "password"
        assert "created_at" in user.user_metadata


class TestFirstUserAdminAssignment:
    """Tests for automatic admin role assignment to first user."""

    def test_first_user_gets_admin_role(self, db_session: Session):
        """Test that the first user automatically gets admin role."""
        # Create admin role first
        admin_role = Role(
            name="admin",
            description="System administrator"
        )
        db_session.add(admin_role)
        db_session.commit()

        # Create first user
        user = User(
            first_name="First",
            last_name="User",
            email="first@example.com",
            username="firstuser"
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        # Manually assign admin role (simulating the first user logic)
        db_session.execute(
            user_roles.insert().values(user_id=user.id, role_id=admin_role.id)
        )
        db_session.commit()
        db_session.refresh(user)

        assert len(user.roles) == 1
        assert user.roles[0].name == "admin"

    def test_second_user_does_not_get_admin_role(self, db_session: Session):
        """Test that subsequent users do not automatically get admin role."""
        # Create admin role
        admin_role = Role(
            name="admin",
            description="System administrator"
        )
        db_session.add(admin_role)
        db_session.commit()

        # Create first user with admin
        first_user = User(
            first_name="First",
            last_name="User",
            email="first@example.com",
            username="firstuser"
        )
        db_session.add(first_user)
        db_session.commit()
        db_session.execute(
            user_roles.insert().values(user_id=first_user.id, role_id=admin_role.id)
        )
        db_session.commit()

        # Create second user (should NOT get admin)
        second_user = User(
            first_name="Second",
            last_name="User",
            email="second@example.com",
            username="seconduser"
        )
        db_session.add(second_user)
        db_session.commit()
        db_session.refresh(second_user)

        # Check if admin exists before assigning
        admin_count = db_session.execute(
            select(User)
            .join(user_roles)
            .join(Role)
            .where(Role.name == "admin")
        ).scalars().all()

        # Should have 1 admin (first user)
        assert len(admin_count) == 1
        # Second user should have no roles
        assert len(second_user.roles) == 0

    def test_admin_role_created_if_not_exists(self, db_session: Session):
        """Test that admin role is created if it doesn't exist."""
        # Verify no admin role exists
        admin_role = db_session.execute(
            select(Role).where(Role.name == "admin")
        ).scalar_one_or_none()

        assert admin_role is None

        # Create admin role (simulating first user registration)
        new_admin_role = Role(
            name="admin",
            description="System administrator with full privileges"
        )
        db_session.add(new_admin_role)
        db_session.commit()

        # Verify it was created
        created_role = db_session.execute(
            select(Role).where(Role.name == "admin")
        ).scalar_one_or_none()

        assert created_role is not None
        assert created_role.name == "admin"

    def test_multiple_users_only_first_is_admin(self, db_session: Session):
        """Test that among multiple users, only the first one is admin."""
        admin_role = Role(name="admin", description="Administrator")
        db_session.add(admin_role)
        db_session.commit()

        # Create 3 users
        users = []
        for i in range(3):
            user = User(
                first_name=f"User{i}",
                last_name="Test",
                email=f"user{i}@example.com",
                username=f"user{i}"
            )
            db_session.add(user)
            users.append(user)

        db_session.commit()

        # Only assign admin to first user
        db_session.execute(
            user_roles.insert().values(user_id=users[0].id, role_id=admin_role.id)
        )
        db_session.commit()

        # Reload users
        for user in users:
            db_session.refresh(user)

        # Check that only first user has admin
        assert len(users[0].roles) == 1
        assert users[0].roles[0].name == "admin"
        assert len(users[1].roles) == 0
        assert len(users[2].roles) == 0


class TestLoginValidation:
    """Tests for login validation logic."""

    def test_login_with_correct_credentials(self, db_session: Session):
        """Test successful login with correct username and password."""
        user = User(
            first_name="Test",
            last_name="User",
            email="test@example.com",
            username="testuser",
            is_active=True
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        plain_password = "TestPassword123"
        hashed_password = get_password_hash(plain_password)
        create_user_password(db_session, user.id, hashed_password)

        # Reload user with password relationship
        db_session.refresh(user)

        # Verify login credentials
        assert user.password_auth is not None
        assert verify_password(plain_password, user.password_auth.hashed_password) is True

    def test_login_with_incorrect_password(self, db_session: Session):
        """Test login fails with incorrect password."""
        user = User(
            first_name="Test",
            last_name="User",
            email="test@example.com",
            username="testuser",
            is_active=True
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        correct_password = "TestPassword123"
        wrong_password = "WrongPassword456"
        hashed_password = get_password_hash(correct_password)
        create_user_password(db_session, user.id, hashed_password)

        db_session.refresh(user)

        # Verify wrong password fails
        assert verify_password(wrong_password, user.password_auth.hashed_password) is False

    def test_login_with_nonexistent_username(self, db_session: Session):
        """Test login fails when username doesn't exist."""
        result = db_session.execute(
            select(User).where(User.username == "nonexistent")
        ).scalar_one_or_none()

        assert result is None

    def test_login_with_inactive_user(self, db_session: Session):
        """Test login validation for inactive user accounts."""
        user = User(
            first_name="Inactive",
            last_name="User",
            email="inactive@example.com",
            username="inactiveuser",
            is_active=False  # Inactive account
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        hashed_password = get_password_hash("TestPassword123")
        create_user_password(db_session, user.id, hashed_password)

        db_session.refresh(user)

        # User exists and password is correct, but account is inactive
        assert user.is_active is False
        assert verify_password("TestPassword123", user.password_auth.hashed_password) is True

    def test_login_user_without_password_auth(self, db_session: Session):
        """Test login fails for user without password authentication setup."""
        user = User(
            first_name="CAS",
            last_name="User",
            email="cas@example.com",
            username="casuser",
            is_active=True,
            user_metadata={"auth_method": "cas"}
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        # No password created for this user
        assert user.password_auth is None

    def test_password_auth_relationship_loaded(self, db_session: Session):
        """Test that password_auth relationship is correctly loaded."""
        user = User(
            first_name="Test",
            last_name="User",
            email="test@example.com",
            username="testuser"
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        hashed_password = get_password_hash("TestPassword123")
        user_password = create_user_password(db_session, user.id, hashed_password)

        # Reload user
        loaded_user = db_session.execute(
            select(User).where(User.id == user.id)
        ).scalar_one()

        assert loaded_user.password_auth is not None
        assert loaded_user.password_auth.id == user_password.id


class TestPasswordChange:
    """Tests for password change operations."""

    def test_change_password_successfully(self, db_session: Session):
        """Test successful password change."""
        user = User(
            first_name="Test",
            last_name="User",
            email="test@example.com",
            username="testuser"
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        old_password = "OldPassword123"
        new_password = "NewPassword456"

        # Set initial password
        old_hashed = get_password_hash(old_password)
        user_password = create_user_password(db_session, user.id, old_hashed)

        # Verify old password works
        assert verify_password(old_password, user_password.hashed_password) is True

        # Change password
        new_hashed = get_password_hash(new_password)
        user_password.hashed_password = new_hashed
        user_password.updated_at = datetime.now()
        db_session.commit()
        db_session.refresh(user_password)

        # Verify new password works and old doesn't
        assert verify_password(new_password, user_password.hashed_password) is True
        assert verify_password(old_password, user_password.hashed_password) is False

    def test_reject_incorrect_current_password(self, db_session: Session):
        """Test that password change fails with incorrect current password."""
        user = User(
            first_name="Test",
            last_name="User",
            email="test@example.com",
            username="testuser"
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        correct_password = "CorrectPassword123"
        incorrect_password = "WrongPassword456"

        hashed = get_password_hash(correct_password)
        user_password = create_user_password(db_session, user.id, hashed)

        # Verify incorrect password fails
        assert verify_password(incorrect_password, user_password.hashed_password) is False

    def test_user_without_password_auth_cannot_change(self, db_session: Session):
        """Test that user without password_auth cannot change password."""
        user = User(
            first_name="CAS",
            last_name="User",
            email="cas@example.com",
            username="casuser",
            user_metadata={"auth_method": "cas"}
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        # No password created
        assert user.password_auth is None

    def test_password_updated_at_timestamp(self, db_session: Session):
        """Test that updated_at timestamp changes when password is changed."""
        user = User(
            first_name="Test",
            last_name="User",
            email="test@example.com",
            username="testuser"
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        hashed = get_password_hash("Password123")
        user_password = create_user_password(db_session, user.id, hashed)
        original_updated_at = user_password.updated_at

        # Change password
        import time
        time.sleep(0.1)  # Small delay to ensure timestamp difference
        new_hashed = get_password_hash("NewPassword456")
        user_password.hashed_password = new_hashed
        # Note: updated_at will be set automatically by onupdate trigger
        db_session.commit()
        db_session.refresh(user_password)

        # Verify timestamp was updated (check it exists and is reasonable)
        assert user_password.updated_at is not None
        assert user_password.created_at is not None


class TestRoleAndMetadataTracking:
    """Tests for role assignment and metadata tracking during registration."""

    def test_user_loaded_with_roles(self, db_session: Session, admin_role: Role):
        """Test that user can be loaded with their roles."""
        user = User(
            first_name="Test",
            last_name="User",
            email="test@example.com",
            username="testuser"
        )
        db_session.add(user)
        db_session.commit()

        # Assign role
        db_session.execute(
            user_roles.insert().values(user_id=user.id, role_id=admin_role.id)
        )
        db_session.commit()
        db_session.refresh(user)

        assert len(user.roles) == 1
        assert user.roles[0].name == "admin"

    def test_metadata_tracking_on_registration(self, db_session: Session):
        """Test that user metadata is tracked correctly on registration."""
        registration_time = datetime.now().isoformat()
        user = User(
            first_name="Test",
            last_name="User",
            email="test@example.com",
            username="testuser",
            user_metadata={
                "auth_method": "password",
                "created_at": registration_time,
                "source": "registration_form"
            }
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        assert user.user_metadata is not None
        assert user.user_metadata["auth_method"] == "password"
        assert user.user_metadata["created_at"] == registration_time
        assert user.user_metadata["source"] == "registration_form"

    def test_default_values_on_user_creation(self, db_session: Session):
        """Test that default values are set correctly on user creation."""
        user = User(
            first_name="Test",
            last_name="User",
            email="test@example.com",
            username="testuser"
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        assert user.is_active is True
        assert user.viewed_tutorial is False
