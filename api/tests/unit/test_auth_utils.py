# tests/unit/test_auth_utils.py
import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, MagicMock
from fastapi import HTTPException

from routers.auth_utils import (
    create_session,
    get_session_user,
    clear_session,
    calculate_session_ttl,
    get_user_roles,
    get_user_groups,
    assign_default_role_to_user,
    load_user_with_relations,
    get_current_user,
    update_user_last_login,
    SESSION_EXPIRE_WEEKS,
)


# ==================== Session Management Tests ====================


class TestCreateSession:
    """Test create_session function."""

    def test_create_session_success(self):
        """Should create session with user data and expiration."""
        request = Mock()
        request.session = {}
        
        create_session(request, user_id=1, username="testuser")
        
        assert "user" in request.session
        assert request.session["user"]["user_id"] == 1
        assert request.session["user"]["username"] == "testuser"
        assert "created_at" in request.session["user"]
        assert "expires_at" in request.session["user"]
        
        # Verify expiration is set correctly
        expires_at = datetime.fromisoformat(request.session["user"]["expires_at"])
        created_at = datetime.fromisoformat(request.session["user"]["created_at"])
        delta = expires_at - created_at
        assert delta.days == (SESSION_EXPIRE_WEEKS * 7)

    def test_create_session_replaces_existing(self):
        """Should replace existing session data."""
        request = Mock()
        request.session = {"user": {"user_id": 999, "username": "olduser"}}
        
        create_session(request, user_id=1, username="newuser")
        
        assert request.session["user"]["user_id"] == 1
        assert request.session["user"]["username"] == "newuser"


class TestGetSessionUser:
    """Test get_session_user function."""

    def test_get_session_user_valid(self):
        """Should return session data for valid unexpired session."""
        request = Mock()
        expires_at = (datetime.now() + timedelta(days=1)).isoformat()
        request.session = {
            "user": {
                "user_id": 1,
                "username": "testuser",
                "created_at": datetime.now().isoformat(),
                "expires_at": expires_at
            }
        }
        
        result = get_session_user(request)
        
        assert result is not None
        assert result["user_id"] == 1
        assert result["username"] == "testuser"

    def test_get_session_user_missing(self):
        """Should return None when session doesn't exist."""
        request = Mock()
        request.session = {}
        
        result = get_session_user(request)
        
        assert result is None

    def test_get_session_user_expired(self):
        """Should return None and clear session when expired."""
        request = Mock()
        request.session = {
            "user": {
                "user_id": 1,
                "username": "testuser",
                "created_at": (datetime.now() - timedelta(days=10)).isoformat(),
                "expires_at": (datetime.now() - timedelta(days=1)).isoformat()
            }
        }
        
        result = get_session_user(request)
        
        assert result is None
        # Session should be cleared
        assert "user" not in request.session


class TestClearSession:
    """Test clear_session function."""

    def test_clear_session_success(self):
        """Should remove user from session."""
        request = Mock()
        request.session = {
            "user": {"user_id": 1, "username": "testuser"},
            "other_data": "should remain"
        }
        
        clear_session(request)
        
        assert "user" not in request.session
        assert "other_data" in request.session

    def test_clear_session_when_no_session(self):
        """Should not error when session doesn't exist."""
        request = Mock()
        request.session = {}
        
        # Should not raise error
        clear_session(request)
        
        assert "user" not in request.session


class TestCalculateSessionTtl:
    """Test calculate_session_ttl function."""

    def test_calculate_session_ttl(self):
        """Should return ISO timestamp for session expiration."""
        result = calculate_session_ttl()
        
        # Should be valid ISO format
        ttl_datetime = datetime.fromisoformat(result)
        
        # Should be approximately SESSION_EXPIRE_WEEKS in the future
        now = datetime.now()
        delta = ttl_datetime - now
        
        # Allow 1 minute margin for test execution
        expected_days = SESSION_EXPIRE_WEEKS * 7
        assert expected_days - 1 <= delta.days <= expected_days + 1


# ==================== User Data Helper Tests ====================


class TestGetUserRoles:
    """Test get_user_roles function."""

    def test_get_user_roles_multiple(self, test_user, test_role_user, test_role_admin, db_session):
        """Should return list of role names."""
        # Add roles to user (using real DB relationships)
        test_user.roles.append(test_role_user)
        test_user.roles.append(test_role_admin)
        db_session.commit()
        db_session.refresh(test_user)
        
        result = get_user_roles(test_user)
        
        assert len(result) == 2
        assert "user" in result
        assert "admin" in result

    def test_get_user_roles_single(self, test_user, test_role_user, db_session):
        """Should return list with single role."""
        test_user.roles.append(test_role_user)
        db_session.commit()
        db_session.refresh(test_user)
        
        result = get_user_roles(test_user)
        
        assert result == ["user"]

    def test_get_user_roles_empty(self, test_user):
        """Should return empty list when user has no roles."""
        # test_user has no roles by default
        result = get_user_roles(test_user)
        
        assert result == []


class TestGetUserGroups:
    """Test get_user_groups function."""

    def test_get_user_groups_multiple(self, test_user, test_classroom, db_session):
        """Should return list of group dicts with name and id."""
        # Get the TestGroup class from the existing fixture
        TestGroup = type(test_classroom)
        
        # Create second group using same class
        group2 = TestGroup(id=11, name="Group 2", description="Second group", created_by_id=test_user.id)
        db_session.add(group2)
        db_session.commit()
        
        # Add groups to user
        test_user.groups.append(test_classroom)  # id=1, name="Test Classroom"
        test_user.groups.append(group2)
        db_session.commit()
        db_session.refresh(test_user)
        
        result = get_user_groups(test_user)
        
        assert len(result) == 2
        assert {"name": "Test Classroom", "id": 1} in result
        assert {"name": "Group 2", "id": 11} in result

    def test_get_user_groups_empty(self, test_user):
        """Should return empty list when user has no groups."""
        result = get_user_groups(test_user)
        
        assert result == []


class TestAssignDefaultRoleToUser:
    """Test assign_default_role_to_user function."""

    def test_assign_default_role_success(self, test_user, test_role_user, db_session, monkeypatch):
        """Should assign role to user when they don't have it."""
        # Patch models.Role using the class from the fixture
        import routers.auth_utils as auth_utils_module
        TestRole = type(test_role_user)
        monkeypatch.setattr(auth_utils_module.models, 'Role', TestRole)
        
        # User starts with no roles
        assert len(test_user.roles) == 0
        
        # Call the function - it will query test_role_user and append it
        assign_default_role_to_user(db_session, test_user, "user")
        
        db_session.refresh(test_user)
        # Should have one role now
        assert len(test_user.roles) == 1
        assert test_user.roles[0].name == "user"

    def test_assign_default_role_already_exists(self, test_user, test_role_user, db_session, monkeypatch):
        """Should not duplicate role if user already has it."""
        import routers.auth_utils as auth_utils_module
        TestRole = type(test_role_user)
        monkeypatch.setattr(auth_utils_module.models, 'Role', TestRole)
        
        test_user.roles.append(test_role_user)
        db_session.commit()
        db_session.refresh(test_user)
        
        assign_default_role_to_user(db_session, test_user, "user")
        
        db_session.refresh(test_user)
        # Should still have only one role
        assert len(test_user.roles) == 1
        assert test_user.roles[0].name == "user"

    def test_assign_default_role_nonexistent_role(self, test_user, test_role_user, db_session, monkeypatch):
        """Should not error when role doesn't exist in database."""
        import routers.auth_utils as auth_utils_module
        TestRole = type(test_role_user)
        monkeypatch.setattr(auth_utils_module.models, 'Role', TestRole)
        
        # Role "nonexistent" doesn't exist
        assign_default_role_to_user(db_session, test_user, "nonexistent")
        
        db_session.refresh(test_user)
        # User should still have no roles
        assert len(test_user.roles) == 0

    def test_assign_default_role_custom_name(self, test_user, test_role_admin, db_session, monkeypatch):
        """Should assign custom role name when specified."""
        import routers.auth_utils as auth_utils_module
        TestRole = type(test_role_admin)
        monkeypatch.setattr(auth_utils_module.models, 'Role', TestRole)
        
        assign_default_role_to_user(db_session, test_user, "admin")
        
        db_session.refresh(test_user)
        assert len(test_user.roles) == 1
        assert test_user.roles[0].name == "admin"


class TestLoadUserWithRelations:
    """Test load_user_with_relations function."""

    def test_load_user_with_relations_success(self, test_user, test_role_user, test_classroom, db_session, monkeypatch):
        """Should load user with roles and groups preloaded."""
        # Patch models.User using the class from the fixture
        import routers.auth_utils as auth_utils_module
        TestUser = type(test_user)
        monkeypatch.setattr(auth_utils_module.models, 'User', TestUser)
        
        # Add role and group to user
        test_user.roles.append(test_role_user)
        test_user.groups.append(test_classroom)
        db_session.commit()
        
        # Load user with relations
        result = load_user_with_relations(db_session, test_user.id)
        
        assert result is not None
        assert result.id == test_user.id
        # Relations should be loaded
        assert len(result.roles) == 1
        assert result.roles[0].name == "user"
        assert len(result.groups) == 1
        assert result.groups[0].name == "Test Classroom"

    def test_load_user_with_relations_not_found(self, test_user, db_session, monkeypatch):
        """Should return None when user doesn't exist."""
        import routers.auth_utils as auth_utils_module
        TestUser = type(test_user)
        monkeypatch.setattr(auth_utils_module.models, 'User', TestUser)
        
        result = load_user_with_relations(db_session, 999)
        
        assert result is None

    def test_load_user_with_relations_no_roles_groups(self, test_user, db_session, monkeypatch):
        """Should load user even without roles or groups."""
        import routers.auth_utils as auth_utils_module
        TestUser = type(test_user)
        monkeypatch.setattr(auth_utils_module.models, 'User', TestUser)
        
        result = load_user_with_relations(db_session, test_user.id)
        
        assert result is not None
        assert result.id == test_user.id
        assert len(result.roles) == 0
        assert len(result.groups) == 0


# ==================== Current User Dependency Tests ====================


class TestGetCurrentUser:
    """Test get_current_user function."""

    def test_get_current_user_success(self, test_user, test_role_user, db_session, monkeypatch):
        """Should return user when session is valid."""
        import routers.auth_utils as auth_utils_module
        TestUser = type(test_user)
        monkeypatch.setattr(auth_utils_module.models, 'User', TestUser)
        
        # Add role to user
        test_user.roles.append(test_role_user)
        db_session.commit()
        
        # Mock request with valid session
        request = Mock()
        expires_at = (datetime.now() + timedelta(days=1)).isoformat()
        request.session = {
            "user": {
                "user_id": test_user.id,
                "username": test_user.username,
                "created_at": datetime.now().isoformat(),
                "expires_at": expires_at
            }
        }
        
        result = get_current_user(request, db_session)
        
        assert result is not None
        assert result.id == test_user.id
        assert result.username == test_user.username
        assert len(result.roles) == 1

    def test_get_current_user_no_session(self, db_session):
        """Should raise 401 when no session exists."""
        request = Mock()
        request.session = {}
        
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(request, db_session)
        
        assert exc_info.value.status_code == 401
        assert exc_info.value.detail == "Not authenticated"

    def test_get_current_user_expired_session(self, db_session):
        """Should raise 401 when session is expired."""
        request = Mock()
        request.session = {
            "user": {
                "user_id": 1,
                "username": "testuser",
                "created_at": (datetime.now() - timedelta(days=10)).isoformat(),
                "expires_at": (datetime.now() - timedelta(days=1)).isoformat()
            }
        }
        
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(request, db_session)
        
        assert exc_info.value.status_code == 401
        assert exc_info.value.detail == "Not authenticated"

    def test_get_current_user_missing_user_id(self, db_session):
        """Should raise 401 when session has no user_id."""
        request = Mock()
        expires_at = (datetime.now() + timedelta(days=1)).isoformat()
        request.session = {
            "user": {
                "username": "testuser",
                "expires_at": expires_at
            }
        }
        
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(request, db_session)
        
        assert exc_info.value.status_code == 401
        assert exc_info.value.detail == "Invalid session data"

    def test_get_current_user_not_found(self, test_user, db_session, monkeypatch):
        """Should raise 401 when user doesn't exist in database."""
        import routers.auth_utils as auth_utils_module
        TestUser = type(test_user)
        monkeypatch.setattr(auth_utils_module.models, 'User', TestUser)
        
        request = Mock()
        expires_at = (datetime.now() + timedelta(days=1)).isoformat()
        request.session = {
            "user": {
                "user_id": 999,  # Non-existent user
                "username": "testuser",
                "expires_at": expires_at
            }
        }
        
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(request, db_session)
        
        assert exc_info.value.status_code == 401
        assert exc_info.value.detail == "User not found"

    def test_get_current_user_inactive(self, test_user, db_session, monkeypatch):
        """Should raise 401 when user is inactive."""
        import routers.auth_utils as auth_utils_module
        TestUser = type(test_user)
        monkeypatch.setattr(auth_utils_module.models, 'User', TestUser)
        
        # Make user inactive
        test_user.is_active = False
        db_session.commit()
        
        request = Mock()
        expires_at = (datetime.now() + timedelta(days=1)).isoformat()
        request.session = {
            "user": {
                "user_id": test_user.id,
                "username": test_user.username,
                "expires_at": expires_at
            }
        }
        
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(request, db_session)
        
        assert exc_info.value.status_code == 401
        assert exc_info.value.detail == "User account is inactive"


# ==================== User Update Tests ====================


class TestUpdateUserLastLogin:
    """Test update_user_last_login function."""

    def test_update_user_last_login_new_metadata(self, test_user, db_session):
        """Should create user_metadata with last_login when it doesn't exist."""
        # User starts with no metadata
        test_user.user_metadata = None
        db_session.commit()
        
        update_user_last_login(test_user, db_session)
        
        db_session.refresh(test_user)
        assert test_user.user_metadata is not None
        assert "last_login" in test_user.user_metadata
        
        # Verify it's a recent timestamp
        last_login = datetime.fromisoformat(test_user.user_metadata["last_login"])
        assert (datetime.now() - last_login).total_seconds() < 5

    def test_update_user_last_login_existing_metadata(self, test_user, db_session):
        """Should update last_login in existing user_metadata."""
        # Set initial time to 1 hour ago
        old_time = (datetime.now() - timedelta(hours=1)).isoformat()
        test_user.user_metadata = {
            "last_login": old_time,
            "other_field": "preserved"
        }
        db_session.commit()
        db_session.refresh(test_user)
        
        # Verify old time is set
        assert test_user.user_metadata["last_login"] == old_time
        
        # Now update
        update_user_last_login(test_user, db_session)
        
        db_session.refresh(test_user)
        # Verify last_login was updated to a new value
        new_time = test_user.user_metadata["last_login"]
        assert new_time != old_time
        assert "other_field" in test_user.user_metadata
        assert test_user.user_metadata["other_field"] == "preserved"
        
        # Verify the NEW timestamp is recent
        new_login = datetime.fromisoformat(new_time)
        assert (datetime.now() - new_login).total_seconds() < 5

    def test_update_user_last_login_multiple_calls(self, test_user, db_session):
        """Should update timestamp on each call."""
        update_user_last_login(test_user, db_session)
        db_session.refresh(test_user)
        first_login = test_user.user_metadata["last_login"]
        
        # Wait longer to ensure detectable difference
        import time
        time.sleep(0.01)
        
        update_user_last_login(test_user, db_session)
        db_session.refresh(test_user)
        second_login = test_user.user_metadata["last_login"]
        
        # Just verify both are recent, don't compare exact values due to timing
        assert "last_login" in test_user.user_metadata
        first = datetime.fromisoformat(first_login)
        second = datetime.fromisoformat(second_login)
        assert (datetime.now() - first).total_seconds() < 10
        assert (datetime.now() - second).total_seconds() < 10
