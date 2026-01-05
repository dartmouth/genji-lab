"""
Tests for User management operations.

These are unit tests that test the user data operations directly,
without going through the HTTP layer. Tests cover:
- User CRUD operations
- Role assignment and management
- User filtering and search
- User-role relationships
"""

import pytest
from sqlalchemy import select, func
from sqlalchemy.orm import Session, joinedload

from tests.conftest import User, Role, user_roles


class TestCreateUser:
    """Tests for user creation."""

    def test_create_user_success(self, db_session: Session):
        """Test creating a user with valid data."""
        user = User(
            first_name="John",
            last_name="Doe",
            email="john.doe@example.com",
            username="johndoe",
            is_active=True,
            viewed_tutorial=False,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        assert user.id is not None
        assert user.first_name == "John"
        assert user.last_name == "Doe"
        assert user.email == "john.doe@example.com"
        assert user.username == "johndoe"
        assert user.is_active is True
        assert user.viewed_tutorial is False

    def test_create_user_with_metadata(self, db_session: Session):
        """Test creating a user with user_metadata."""
        user = User(
            first_name="Jane",
            last_name="Smith",
            email="jane@example.com",
            username="janesmith",
            user_metadata={"department": "Engineering", "level": "Senior"}
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        assert user.user_metadata is not None
        assert user.user_metadata["department"] == "Engineering"
        assert user.user_metadata["level"] == "Senior"

    def test_create_user_with_role(self, db_session: Session, admin_role: Role):
        """Test creating a user with an assigned role."""
        user = User(
            first_name="Admin",
            last_name="User",
            email="admin2@example.com",
            username="adminuser2",
        )
        db_session.add(user)
        db_session.commit()

        # Add role via SQL insert to association table
        db_session.execute(
            user_roles.insert().values(user_id=user.id, role_id=admin_role.id)
        )
        db_session.commit()
        db_session.refresh(user)

        assert len(user.roles) == 1
        assert user.roles[0].name == "admin"

    def test_create_user_duplicate_email(self, db_session: Session, sample_user: User):
        """Test that duplicate emails are not allowed."""
        duplicate_user = User(
            first_name="Duplicate",
            last_name="User",
            email=sample_user.email,  # Same email
            username="differentusername",
        )
        db_session.add(duplicate_user)

        with pytest.raises(Exception):  # SQLAlchemy will raise an integrity error
            db_session.commit()

    def test_create_user_duplicate_username(self, db_session: Session, sample_user: User):
        """Test that duplicate usernames are not allowed."""
        duplicate_user = User(
            first_name="Duplicate",
            last_name="User",
            email="different@example.com",
            username=sample_user.username,  # Same username
        )
        db_session.add(duplicate_user)

        with pytest.raises(Exception):  # SQLAlchemy will raise an integrity error
            db_session.commit()


class TestReadUsers:
    """Tests for user retrieval."""

    def test_read_users_empty(self, db_session: Session):
        """Test reading users when none exist."""
        users = db_session.execute(select(User)).scalars().all()
        assert users == []

    def test_read_users_list(self, db_session: Session, sample_user: User):
        """Test reading a list of users."""
        users = db_session.execute(select(User)).scalars().all()
        assert len(users) >= 1
        user_ids = [u.id for u in users]
        assert sample_user.id in user_ids

    def test_read_single_user(self, db_session: Session, sample_user: User):
        """Test reading a single user by ID."""
        user = db_session.execute(
            select(User).where(User.id == sample_user.id)
        ).scalar_one_or_none()

        assert user is not None
        assert user.id == sample_user.id
        assert user.email == sample_user.email

    def test_read_user_not_found(self, db_session: Session):
        """Test reading a non-existent user."""
        user = db_session.execute(
            select(User).where(User.id == 99999)
        ).scalar_one_or_none()

        assert user is None

    def test_read_user_with_roles(self, db_session: Session, user_with_admin_role: User):
        """Test reading a user with roles loaded."""
        user = db_session.execute(
            select(User)
            .options(joinedload(User.roles))
            .where(User.id == user_with_admin_role.id)
        ).unique().scalar_one()

        assert len(user.roles) == 1
        assert user.roles[0].name == "admin"

    def test_read_users_filter_by_first_name(self, db_session: Session, sample_user: User):
        """Test filtering users by first name."""
        users = db_session.execute(
            select(User).where(User.first_name.ilike(f"%{sample_user.first_name}%"))
        ).scalars().all()

        assert len(users) >= 1
        assert all(sample_user.first_name.lower() in user.first_name.lower() for user in users)

    def test_read_users_filter_by_last_name(self, db_session: Session, sample_user: User):
        """Test filtering users by last name."""
        users = db_session.execute(
            select(User).where(User.last_name.ilike(f"%{sample_user.last_name}%"))
        ).scalars().all()

        assert len(users) >= 1
        assert all(sample_user.last_name.lower() in user.last_name.lower() for user in users)

    def test_read_users_name_search_first_name(self, db_session: Session):
        """Test name search functionality with first name."""
        # Create users with known names
        user1 = User(
            first_name="Alice",
            last_name="Johnson",
            email="alice@example.com",
            username="alicej"
        )
        user2 = User(
            first_name="Bob",
            last_name="Alice",
            email="bob@example.com",
            username="bobalice"
        )
        db_session.add_all([user1, user2])
        db_session.commit()

        # Search for "Alice" - should find both
        search_term = "Alice"
        users = db_session.execute(
            select(User).where(
                (User.first_name.ilike(f"%{search_term}%")) |
                (User.last_name.ilike(f"%{search_term}%"))
            )
        ).scalars().all()

        assert len(users) >= 2

    def test_read_users_pagination(self, db_session: Session):
        """Test pagination of user results."""
        # Create multiple users
        for i in range(10):
            user = User(
                first_name=f"User{i}",
                last_name=f"Test{i}",
                email=f"user{i}@example.com",
                username=f"user{i}"
            )
            db_session.add(user)
        db_session.commit()

        # Test pagination
        page1 = db_session.execute(
            select(User).offset(0).limit(5)
        ).scalars().all()

        page2 = db_session.execute(
            select(User).offset(5).limit(5)
        ).scalars().all()

        assert len(page1) == 5
        assert len(page2) == 5
        # Ensure no overlap
        assert not any(user in page2 for user in page1)


class TestUpdateUser:
    """Tests for user updates."""

    def test_update_user_full(self, db_session: Session, sample_user: User):
        """Test full update of a user."""
        sample_user.first_name = "Updated"
        sample_user.last_name = "Name"
        sample_user.email = "updated@example.com"
        db_session.commit()
        db_session.refresh(sample_user)

        assert sample_user.first_name == "Updated"
        assert sample_user.last_name == "Name"
        assert sample_user.email == "updated@example.com"

    def test_partial_update_user(self, db_session: Session, sample_user: User):
        """Test partial update of a user."""
        original_last_name = sample_user.last_name

        sample_user.first_name = "PartialUpdate"
        db_session.commit()
        db_session.refresh(sample_user)

        assert sample_user.first_name == "PartialUpdate"
        assert sample_user.last_name == original_last_name

    def test_update_user_metadata(self, db_session: Session, sample_user: User):
        """Test updating user metadata."""
        sample_user.user_metadata = {"key": "value", "department": "IT"}
        db_session.commit()
        db_session.refresh(sample_user)

        assert sample_user.user_metadata["key"] == "value"
        assert sample_user.user_metadata["department"] == "IT"

    def test_update_user_viewed_tutorial(self, db_session: Session, sample_user: User):
        """Test updating the viewed_tutorial flag."""
        assert sample_user.viewed_tutorial is False

        sample_user.viewed_tutorial = True
        db_session.commit()
        db_session.refresh(sample_user)

        assert sample_user.viewed_tutorial is True

    def test_update_user_is_active(self, db_session: Session, sample_user: User):
        """Test deactivating a user."""
        assert sample_user.is_active is True

        sample_user.is_active = False
        db_session.commit()
        db_session.refresh(sample_user)

        assert sample_user.is_active is False


class TestDeleteUser:
    """Tests for user deletion."""

    def test_delete_user(self, db_session: Session, sample_user: User):
        """Test deleting a user."""
        user_id = sample_user.id

        db_session.delete(sample_user)
        db_session.commit()

        deleted_user = db_session.execute(
            select(User).where(User.id == user_id)
        ).scalar_one_or_none()

        assert deleted_user is None

    def test_delete_user_with_roles(self, db_session: Session, user_with_admin_role: User):
        """Test deleting a user with assigned roles."""
        user_id = user_with_admin_role.id
        role_id = user_with_admin_role.roles[0].id

        db_session.delete(user_with_admin_role)
        db_session.commit()

        # User should be deleted
        deleted_user = db_session.execute(
            select(User).where(User.id == user_id)
        ).scalar_one_or_none()
        assert deleted_user is None

        # Role should still exist (many-to-many relationship)
        role = db_session.execute(
            select(Role).where(Role.id == role_id)
        ).scalar_one_or_none()
        assert role is not None


class TestUserRoleAssignment:
    """Tests for assigning and managing user roles."""

    def test_assign_single_role_to_user(self, db_session: Session, sample_user: User, admin_role: Role):
        """Test assigning a single role to a user."""
        assert len(sample_user.roles) == 0

        sample_user.roles.append(admin_role)
        db_session.commit()
        db_session.refresh(sample_user)

        assert len(sample_user.roles) == 1
        assert sample_user.roles[0].name == "admin"

    def test_assign_multiple_roles_to_user(
        self, db_session: Session, sample_user: User, sample_roles: list[Role]
    ):
        """Test assigning multiple roles to a user."""
        sample_user.roles.extend(sample_roles)
        db_session.commit()
        db_session.refresh(sample_user)

        assert len(sample_user.roles) == 3
        role_names = {role.name for role in sample_user.roles}
        assert role_names == {"admin", "editor", "viewer"}

    def test_remove_role_from_user(
        self, db_session: Session, user_with_multiple_roles: User
    ):
        """Test removing a role from a user."""
        assert len(user_with_multiple_roles.roles) == 2

        # Remove the first role
        role_to_remove = user_with_multiple_roles.roles[0]
        user_with_multiple_roles.roles.remove(role_to_remove)
        db_session.commit()
        db_session.refresh(user_with_multiple_roles)

        assert len(user_with_multiple_roles.roles) == 1
        assert role_to_remove not in user_with_multiple_roles.roles

    def test_replace_all_user_roles(
        self, db_session: Session, user_with_admin_role: User, viewer_role: Role
    ):
        """Test replacing all roles for a user."""
        assert len(user_with_admin_role.roles) == 1
        assert user_with_admin_role.roles[0].name == "admin"

        # Replace with viewer role
        user_with_admin_role.roles = [viewer_role]
        db_session.commit()
        db_session.refresh(user_with_admin_role)

        assert len(user_with_admin_role.roles) == 1
        assert user_with_admin_role.roles[0].name == "viewer"

    def test_clear_all_user_roles(
        self, db_session: Session, user_with_multiple_roles: User
    ):
        """Test removing all roles from a user."""
        assert len(user_with_multiple_roles.roles) > 0

        user_with_multiple_roles.roles = []
        db_session.commit()
        db_session.refresh(user_with_multiple_roles)

        assert len(user_with_multiple_roles.roles) == 0

    def test_update_roles_by_id_list(
        self, db_session: Session, sample_user: User, sample_roles: list[Role]
    ):
        """Test updating user roles using a list of role IDs (mimics the API endpoint)."""
        # Get role IDs
        role_ids = [sample_roles[0].id, sample_roles[2].id]  # admin and viewer

        # Clear existing roles
        db_session.execute(
            user_roles.delete().where(user_roles.c.user_id == sample_user.id)
        )

        # Add new roles via association table
        for role_id in role_ids:
            db_session.execute(
                user_roles.insert().values(user_id=sample_user.id, role_id=role_id)
            )

        db_session.commit()
        db_session.refresh(sample_user)

        assert len(sample_user.roles) == 2
        role_names = {role.name for role in sample_user.roles}
        assert role_names == {"admin", "viewer"}

    def test_prevent_duplicate_role_assignment(
        self, db_session: Session, sample_user: User, admin_role: Role
    ):
        """Test that assigning the same role twice doesn't create duplicates."""
        sample_user.roles.append(admin_role)
        db_session.commit()

        # Try to add the same role again
        sample_user.roles.append(admin_role)
        db_session.commit()
        db_session.refresh(sample_user)

        # Should still only have one admin role (SQLAlchemy handles this)
        assert len(sample_user.roles) == 1


class TestRoleOperations:
    """Tests for role management."""

    def test_create_role(self, db_session: Session):
        """Test creating a new role."""
        role = Role(
            name="custom_role",
            description="A custom role for testing"
        )
        db_session.add(role)
        db_session.commit()
        db_session.refresh(role)

        assert role.id is not None
        assert role.name == "custom_role"
        assert role.description == "A custom role for testing"

    def test_read_all_roles(self, db_session: Session, sample_roles: list[Role]):
        """Test reading all roles."""
        roles = db_session.execute(select(Role)).scalars().all()

        assert len(roles) >= 3
        role_names = {role.name for role in roles}
        assert "admin" in role_names
        assert "editor" in role_names
        assert "viewer" in role_names

    def test_read_role_with_users(
        self, db_session: Session, admin_role: Role, user_with_admin_role: User
    ):
        """Test reading a role with its assigned users."""
        role = db_session.execute(
            select(Role)
            .options(joinedload(Role.users))
            .where(Role.id == admin_role.id)
        ).unique().scalar_one()

        assert len(role.users) >= 1
        user_ids = [u.id for u in role.users]
        assert user_with_admin_role.id in user_ids

    def test_duplicate_role_name_not_allowed(self, db_session: Session, admin_role: Role):
        """Test that duplicate role names are not allowed."""
        duplicate_role = Role(
            name=admin_role.name,
            description="Duplicate role"
        )
        db_session.add(duplicate_role)

        with pytest.raises(Exception):  # SQLAlchemy will raise an integrity error
            db_session.commit()


class TestUserRoleQueries:
    """Tests for complex queries involving users and roles."""

    def test_find_users_with_specific_role(
        self, db_session: Session, admin_role: Role, user_with_admin_role: User
    ):
        """Test finding all users with a specific role."""
        users = db_session.execute(
            select(User)
            .join(User.roles)
            .where(Role.name == "admin")
        ).scalars().all()

        assert len(users) >= 1
        user_ids = [u.id for u in users]
        assert user_with_admin_role.id in user_ids

    def test_find_users_without_roles(self, db_session: Session, sample_user: User):
        """Test finding users without any assigned roles."""
        # Get users without roles using a left join
        users_with_role_count = db_session.execute(
            select(User, func.count(Role.id).label('role_count'))
            .outerjoin(User.roles)
            .group_by(User.id)
        ).all()

        users_without_roles = [user for user, count in users_with_role_count if count == 0]
        user_ids_without_roles = [u.id for u in users_without_roles]

        assert sample_user.id in user_ids_without_roles

    def test_count_users_per_role(
        self, db_session: Session, sample_roles: list[Role],
        user_with_admin_role: User, user_with_multiple_roles: User
    ):
        """Test counting how many users have each role."""
        role_counts = db_session.execute(
            select(Role.name, func.count(User.id).label('user_count'))
            .outerjoin(Role.users)
            .group_by(Role.id, Role.name)
        ).all()

        role_count_dict = {name: count for name, count in role_counts}

        # Admin role should have at least 2 users
        assert role_count_dict.get("admin", 0) >= 2

    def test_filter_users_with_multiple_roles(
        self, db_session: Session, user_with_multiple_roles: User
    ):
        """Test filtering users who have multiple roles."""
        users_with_counts = db_session.execute(
            select(User, func.count(Role.id).label('role_count'))
            .join(User.roles)
            .group_by(User.id)
            .having(func.count(Role.id) > 1)
        ).all()

        users_with_multiple = [user for user, count in users_with_counts]
        user_ids_with_multiple = [u.id for u in users_with_multiple]

        assert user_with_multiple_roles.id in user_ids_with_multiple


class TestUserCollectionRelationships:
    """Tests for user relationships with collections (from ManageUsers context)."""

    def test_user_has_owned_collections(
        self, db_session: Session, sample_user: User, sample_collection
    ):
        """Test that users can own collections."""
        # Refresh to load relationships
        db_session.refresh(sample_user)

        assert len(sample_user.owned_collections) >= 1
        assert sample_collection in sample_user.owned_collections

    def test_user_has_created_collections(
        self, db_session: Session, sample_user: User, sample_collection
    ):
        """Test that users can create collections."""
        db_session.refresh(sample_user)

        assert len(sample_user.created_collections) >= 1
        assert sample_collection in sample_user.created_collections
