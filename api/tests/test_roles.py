"""
Tests for role management operations.

This test suite covers the data layer operations for role management,
focusing on the read operations used by the /api/v1/roles endpoints.
"""

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from tests.conftest import Role


class TestListRoles:
    """Tests for listing roles with pagination and ordering."""

    def test_list_roles_empty_database(self, db_session: Session):
        """Test listing roles when database is empty."""
        roles = db_session.execute(
            select(Role).order_by(Role.name)
        ).scalars().all()

        assert len(roles) == 0

    def test_list_roles_sorted_alphabetically(self, db_session: Session, sample_roles: list[Role]):
        """Test that roles are sorted alphabetically by name."""
        roles = db_session.execute(
            select(Role).order_by(Role.name)
        ).scalars().all()

        assert len(roles) == 3
        # Should be sorted: admin, editor, viewer
        assert roles[0].name == "admin"
        assert roles[1].name == "editor"
        assert roles[2].name == "viewer"

    def test_list_roles_with_skip_parameter(self, db_session: Session, sample_roles: list[Role]):
        """Test pagination using skip parameter."""
        # Skip first role
        roles = db_session.execute(
            select(Role).order_by(Role.name).offset(1)
        ).scalars().all()

        assert len(roles) == 2
        assert roles[0].name == "editor"  # First after skip
        assert roles[1].name == "viewer"

    def test_list_roles_with_limit_parameter(self, db_session: Session, sample_roles: list[Role]):
        """Test pagination using limit parameter."""
        # Limit to 2 roles
        roles = db_session.execute(
            select(Role).order_by(Role.name).limit(2)
        ).scalars().all()

        assert len(roles) == 2
        assert roles[0].name == "admin"
        assert roles[1].name == "editor"

    def test_list_roles_with_skip_and_limit(self, db_session: Session, sample_roles: list[Role]):
        """Test pagination with both skip and limit parameters."""
        # Skip 1, limit 1 (should get only 'editor')
        roles = db_session.execute(
            select(Role).order_by(Role.name).offset(1).limit(1)
        ).scalars().all()

        assert len(roles) == 1
        assert roles[0].name == "editor"

    def test_list_roles_default_pagination(self, db_session: Session):
        """Test default pagination behavior (skip=0, limit=100)."""
        # Create many roles to test limit
        for i in range(10):
            role = Role(name=f"role_{i:02d}", description=f"Test role {i}")
            db_session.add(role)
        db_session.commit()

        # Default: skip=0, limit=100
        roles = db_session.execute(
            select(Role).order_by(Role.name).offset(0).limit(100)
        ).scalars().all()

        assert len(roles) == 10
        # Verify alphabetical ordering
        role_names = [r.name for r in roles]
        assert role_names == sorted(role_names)


class TestGetSingleRole:
    """Tests for retrieving a single role by ID."""

    def test_get_role_by_id_success(self, db_session: Session, admin_role: Role):
        """Test getting a role by ID successfully."""
        role = db_session.execute(
            select(Role).filter(Role.id == admin_role.id)
        ).scalar_one_or_none()

        assert role is not None
        assert role.id == admin_role.id
        assert role.name == "admin"
        assert role.description == "Administrator role with full permissions"

    def test_get_role_by_id_not_found(self, db_session: Session):
        """Test getting a non-existent role returns None."""
        role = db_session.execute(
            select(Role).filter(Role.id == 99999)
        ).scalar_one_or_none()

        assert role is None

    def test_get_role_with_null_description(self, db_session: Session):
        """Test getting a role with null description (optional field)."""
        role = Role(name="test_role", description=None)
        db_session.add(role)
        db_session.commit()
        db_session.refresh(role)

        retrieved_role = db_session.execute(
            select(Role).filter(Role.id == role.id)
        ).scalar_one_or_none()

        assert retrieved_role is not None
        assert retrieved_role.name == "test_role"
        assert retrieved_role.description is None

    def test_get_role_verify_all_fields(self, db_session: Session, editor_role: Role):
        """Test that all role fields are correctly retrieved."""
        role = db_session.execute(
            select(Role).filter(Role.id == editor_role.id)
        ).scalar_one_or_none()

        assert role is not None
        assert hasattr(role, 'id')
        assert hasattr(role, 'name')
        assert hasattr(role, 'description')
        assert isinstance(role.id, int)
        assert isinstance(role.name, str)
        assert role.description is None or isinstance(role.description, str)

    def test_get_role_with_different_roles(self, db_session: Session, sample_roles: list[Role]):
        """Test getting each role from sample_roles."""
        for expected_role in sample_roles:
            role = db_session.execute(
                select(Role).filter(Role.id == expected_role.id)
            ).scalar_one_or_none()

            assert role is not None
            assert role.id == expected_role.id
            assert role.name == expected_role.name
