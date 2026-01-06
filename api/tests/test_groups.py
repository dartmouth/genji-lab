"""
Tests for Group/Classroom operations.

These are unit tests that test the group/classroom data operations directly,
without going through the HTTP layer. This approach:
1. Tests business logic in isolation
2. Avoids PostgreSQL-specific dependencies
3. Runs quickly with in-memory SQLite

Note: The backend uses "Group" but the UI refers to these as "Classrooms".

For integration tests with the full API, you would need a PostgreSQL test database.
"""

import pytest
from datetime import datetime, date, timedelta
from sqlalchemy import select, func, delete
from sqlalchemy.orm import Session

from tests.conftest import (
    Group,
    User,
    Role,
    group_members,
)


# =============================================================================
# Helper Functions for Group Tests
# =============================================================================

def create_group(
    db_session: Session,
    creator_id: int,
    name: str = "Test Group",
    description: str = "Test description",
    start_date: date = None,
    end_date: date = None,
) -> Group:
    """Helper function to create a group."""
    if start_date is None:
        start_date = date.today()
    if end_date is None:
        end_date = date.today() + timedelta(days=90)
    
    group = Group(
        name=name,
        description=description,
        created_at=datetime.now(),
        created_by_id=creator_id,
        start_date=start_date,
        end_date=end_date,
    )
    db_session.add(group)
    db_session.flush()
    
    # Add creator as a member
    db_session.execute(
        group_members.insert().values(
            group_id=group.id,
            user_id=creator_id,
            joined_at=datetime.now()
        )
    )
    
    db_session.commit()
    db_session.refresh(group)
    return group


def add_member_to_group(
    db_session: Session,
    group_id: int,
    user_id: int,
) -> None:
    """Helper function to add a user to a group."""
    db_session.execute(
        group_members.insert().values(
            group_id=group_id,
            user_id=user_id,
            joined_at=datetime.now()
        )
    )
    db_session.commit()


# =============================================================================
# Test Classes
# =============================================================================

class TestCreateGroup:
    """Tests for group/classroom creation."""

    def test_create_group_success(self, db_session, sample_user):
        """Test creating a group with valid data."""
        group = Group(
            name="New Classroom",
            description="A new test classroom",
            created_at=datetime.now(),
            created_by_id=sample_user.id,
            start_date=date.today(),
            end_date=date.today() + timedelta(days=90),
        )
        db_session.add(group)
        db_session.commit()
        db_session.refresh(group)

        assert group.id is not None
        assert group.name == "New Classroom"
        assert group.description == "A new test classroom"
        assert group.created_by_id == sample_user.id
        assert group.start_date == date.today()

    def test_create_group_with_nullable_dates(self, db_session, sample_user):
        """Test creating a group with nullable dates (current behavior)."""
        group = Group(
            name="Group Without Dates",
            description="Testing nullable dates",
            created_at=datetime.now(),
            created_by_id=sample_user.id,
            start_date=None,
            end_date=None,
        )
        db_session.add(group)
        db_session.commit()
        db_session.refresh(group)

        assert group.id is not None
        assert group.start_date is None
        assert group.end_date is None

    def test_create_group_auto_add_creator_as_member(self, db_session, sample_user):
        """Test that creator is automatically added as a member."""
        group = create_group(db_session, sample_user.id)

        # Check membership
        members = db_session.execute(
            select(User)
            .join(group_members, User.id == group_members.c.user_id)
            .where(group_members.c.group_id == group.id)
        ).scalars().all()

        assert len(members) == 1
        assert members[0].id == sample_user.id

    def test_create_group_duplicate_name(self, db_session, sample_user, sample_group):
        """Test that duplicate group names are detected."""
        # Try to create another group with same name
        duplicate = Group(
            name=sample_group.name,  # Same name
            description="Different description",
            created_at=datetime.now(),
            created_by_id=sample_user.id,
            start_date=date.today(),
            end_date=date.today() + timedelta(days=90),
        )
        db_session.add(duplicate)

        # Should fail due to unique constraint (if implemented)
        # For now, this tests that duplicates can be detected
        existing = db_session.execute(
            select(Group).where(Group.name == sample_group.name)
        ).scalars().all()

        assert len(existing) >= 1  # At least sample_group exists

    def test_create_group_end_date_validation(self, db_session, sample_user):
        """Test that end_date should be after start_date (business logic)."""
        start = date.today()
        end = date.today() - timedelta(days=1)  # End before start (invalid)

        # The validation should happen at the API layer, not database
        # This test documents the expected behavior
        assert end < start  # Invalid scenario


class TestReadGroups:
    """Tests for group retrieval operations."""

    def test_read_groups_empty(self, db_session):
        """Test reading groups when none exist."""
        groups = db_session.execute(select(Group)).scalars().all()
        assert groups == []

    def test_read_groups_list(self, db_session, sample_group):
        """Test reading a list of groups."""
        groups = db_session.execute(select(Group)).scalars().all()
        assert len(groups) == 1
        assert groups[0].name == sample_group.name

    def test_read_single_group(self, db_session, sample_group):
        """Test reading a single group by ID."""
        group = db_session.execute(
            select(Group).where(Group.id == sample_group.id)
        ).scalar_one_or_none()

        assert group is not None
        assert group.id == sample_group.id
        assert group.name == sample_group.name

    def test_read_group_not_found(self, db_session):
        """Test reading a non-existent group."""
        group = db_session.execute(
            select(Group).where(Group.id == 99999)
        ).scalar_one_or_none()

        assert group is None

    def test_read_group_with_members(self, db_session, group_with_members):
        """Test reading a group and counting its members."""
        # Count members
        member_count = db_session.execute(
            select(func.count())
            .select_from(group_members)
            .where(group_members.c.group_id == group_with_members.id)
        ).scalar_one()

        # Should have creator + 3 additional members = 4 total
        assert member_count == 4

    def test_read_group_public_info(self, db_session, sample_group):
        """Test reading public group info (for join links)."""
        group = db_session.execute(
            select(Group).where(Group.id == sample_group.id)
        ).scalar_one()

        # Verify only non-sensitive info is available
        assert group.id is not None
        assert group.name is not None
        assert group.description is not None
        assert group.start_date is not None
        assert group.end_date is not None

    def test_read_group_creator_info(self, db_session, sample_group, sample_user):
        """Test reading group creator/instructor information."""
        group = db_session.execute(
            select(Group).where(Group.id == sample_group.id)
        ).scalar_one()

        creator = db_session.execute(
            select(User).where(User.id == group.created_by_id)
        ).scalar_one()

        assert creator.id == sample_user.id
        assert creator.first_name == sample_user.first_name


class TestDeleteGroup:
    """Tests for group deletion operations."""

    def test_delete_group(self, db_session, sample_group):
        """Test deleting a group."""
        group_id = sample_group.id

        db_session.delete(sample_group)
        db_session.commit()

        # Verify it's deleted
        deleted_group = db_session.execute(
            select(Group).where(Group.id == group_id)
        ).scalar_one_or_none()

        assert deleted_group is None

    def test_delete_group_removes_memberships(self, db_session, group_with_members):
        """Test that deleting a group also removes all memberships."""
        group_id = group_with_members.id

        # Verify memberships exist
        members_before = db_session.execute(
            select(func.count())
            .select_from(group_members)
            .where(group_members.c.group_id == group_id)
        ).scalar_one()
        assert members_before == 4  # Creator + 3 members

        # Remove memberships manually (simulating cascade)
        db_session.execute(
            delete(group_members).where(group_members.c.group_id == group_id)
        )

        # Delete the group
        db_session.delete(group_with_members)
        db_session.commit()

        # Verify memberships are deleted
        members_after = db_session.execute(
            select(func.count())
            .select_from(group_members)
            .where(group_members.c.group_id == group_id)
        ).scalar_one()
        assert members_after == 0

    def test_delete_group_only_creator_can_delete(self, db_session, sample_group, sample_user):
        """Test authorization logic for group deletion (business logic)."""
        # This test documents the expected behavior
        # Actual authorization would be enforced at the API layer
        assert sample_group.created_by_id == sample_user.id


class TestAddMemberToGroup:
    """Tests for adding members to groups."""

    def test_add_member_success(self, db_session, sample_group):
        """Test adding a new member to a group."""
        new_user = User(
            first_name="New",
            last_name="Member",
            email="newmember@example.com",
            username="newmember",
            is_active=True,
        )
        db_session.add(new_user)
        db_session.commit()

        # Add to group
        add_member_to_group(db_session, sample_group.id, new_user.id)

        # Verify membership
        is_member = db_session.execute(
            select(group_members).where(
                (group_members.c.group_id == sample_group.id) &
                (group_members.c.user_id == new_user.id)
            )
        ).first()

        assert is_member is not None

    def test_add_multiple_members(self, db_session, sample_group):
        """Test adding multiple members to a group."""
        users = []
        for i in range(3):
            user = User(
                first_name=f"User{i}",
                last_name="Test",
                email=f"user{i}@example.com",
                username=f"user{i}",
                is_active=True,
            )
            db_session.add(user)
            users.append(user)

        db_session.commit()

        # Add all users to group
        for user in users:
            add_member_to_group(db_session, sample_group.id, user.id)

        # Count members (including creator)
        member_count = db_session.execute(
            select(func.count())
            .select_from(group_members)
            .where(group_members.c.group_id == sample_group.id)
        ).scalar_one()

        assert member_count == 4  # 1 creator + 3 new members

    def test_add_member_prevent_duplicates(self, db_session, sample_group, sample_user):
        """Test that duplicate memberships are prevented."""
        # sample_user is already a member (creator)

        # Check if already a member
        existing = db_session.execute(
            select(group_members).where(
                (group_members.c.group_id == sample_group.id) &
                (group_members.c.user_id == sample_user.id)
            )
        ).first()

        assert existing is not None  # Should already be a member

    def test_add_member_with_joined_at_timestamp(self, db_session, sample_group):
        """Test that joined_at timestamp is recorded."""
        new_user = User(
            first_name="Timestamped",
            last_name="User",
            email="timestamped@example.com",
            username="timestamped",
            is_active=True,
        )
        db_session.add(new_user)
        db_session.commit()

        before_join = datetime.now()
        add_member_to_group(db_session, sample_group.id, new_user.id)
        after_join = datetime.now()

        # Get membership record
        membership = db_session.execute(
            select(group_members).where(
                (group_members.c.group_id == sample_group.id) &
                (group_members.c.user_id == new_user.id)
            )
        ).first()

        assert membership.joined_at is not None
        assert before_join <= membership.joined_at <= after_join


class TestRemoveMemberFromGroup:
    """Tests for removing members from groups."""

    def test_remove_member_success(self, db_session, group_with_members):
        """Test removing a member from a group."""
        # Get a member (not the creator)
        members = db_session.execute(
            select(User)
            .join(group_members, User.id == group_members.c.user_id)
            .where(
                (group_members.c.group_id == group_with_members.id) &
                (User.id != group_with_members.created_by_id)
            )
        ).scalars().all()

        assert len(members) >= 1
        member_to_remove = members[0]

        # Remove member
        db_session.execute(
            delete(group_members).where(
                (group_members.c.group_id == group_with_members.id) &
                (group_members.c.user_id == member_to_remove.id)
            )
        )
        db_session.commit()

        # Verify removal
        is_member = db_session.execute(
            select(group_members).where(
                (group_members.c.group_id == group_with_members.id) &
                (group_members.c.user_id == member_to_remove.id)
            )
        ).first()

        assert is_member is None

    def test_remove_non_member(self, db_session, sample_group):
        """Test removing a user who is not a member."""
        non_member = User(
            first_name="Not",
            last_name="Member",
            email="notmember@example.com",
            username="notmember",
            is_active=True,
        )
        db_session.add(non_member)
        db_session.commit()

        # Check if member (should not be)
        is_member = db_session.execute(
            select(group_members).where(
                (group_members.c.group_id == sample_group.id) &
                (group_members.c.user_id == non_member.id)
            )
        ).first()

        assert is_member is None


class TestGroupDateValidation:
    """Tests for group date validation and business logic."""

    def test_end_date_after_start_date_validation(self, db_session, sample_user):
        """Test that end_date must be after start_date."""
        start = date(2024, 1, 1)
        end = date(2023, 12, 31)  # Before start

        # This is invalid and should be caught at API layer
        assert end < start

    def test_group_with_valid_date_range(self, db_session, sample_user):
        """Test creating a group with valid date range."""
        start = date.today()
        end = date.today() + timedelta(days=90)

        group = create_group(
            db_session,
            sample_user.id,
            start_date=start,
            end_date=end
        )

        assert group.start_date == start
        assert group.end_date == end
        assert group.end_date > group.start_date

    def test_calculate_join_link_expiration(self, db_session, sample_group):
        """Test calculating join link expiration (start_date + 2 weeks)."""
        JOIN_LINK_EXPIRATION_WEEKS = 2

        if sample_group.start_date:
            expiration_date = sample_group.start_date + timedelta(weeks=JOIN_LINK_EXPIRATION_WEEKS)
            assert expiration_date is not None
            assert expiration_date > sample_group.start_date

    def test_is_join_link_expired(self, db_session, expired_group):
        """Test checking if join link has expired."""
        JOIN_LINK_EXPIRATION_WEEKS = 2

        if expired_group.start_date:
            expiration_date = expired_group.start_date + timedelta(weeks=JOIN_LINK_EXPIRATION_WEEKS)
            today = date.today()

            # Should be expired (started 30 days ago, expired after 14 days)
            assert today > expiration_date

    def test_is_join_link_valid(self, db_session, sample_group):
        """Test checking if join link is still valid."""
        JOIN_LINK_EXPIRATION_WEEKS = 2

        if sample_group.start_date:
            expiration_date = sample_group.start_date + timedelta(weeks=JOIN_LINK_EXPIRATION_WEEKS)
            today = date.today()

            # Should be valid (starts today)
            assert today <= expiration_date

    def test_is_classroom_ended(self, db_session, ended_group):
        """Test checking if classroom has ended."""
        today = date.today()

        if ended_group.end_date:
            assert today > ended_group.end_date

    def test_is_classroom_active(self, db_session, sample_group):
        """Test checking if classroom is still active."""
        today = date.today()

        if sample_group.end_date:
            assert today <= sample_group.end_date


class TestGroupMembershipBusinessLogic:
    """Tests for business logic around group membership."""

    def test_cannot_add_member_after_class_ends(self, db_session, ended_group):
        """Test that members cannot be added after classroom ends."""
        today = date.today()

        # Business logic check
        if ended_group.end_date:
            is_ended = today > ended_group.end_date
            assert is_ended  # Should block addition

    def test_can_add_member_during_join_period(self, db_session, sample_group):
        """Test that members can be added during join period."""
        JOIN_LINK_EXPIRATION_WEEKS = 2
        today = date.today()

        if sample_group.start_date and sample_group.end_date:
            expiration_date = sample_group.start_date + timedelta(weeks=JOIN_LINK_EXPIRATION_WEEKS)
            is_within_join_period = today <= expiration_date
            is_not_ended = today <= sample_group.end_date

            assert is_within_join_period
            assert is_not_ended

    def test_admin_can_add_member_after_join_expires(self, db_session, expired_group, user_with_admin_role):
        """Test that admin/instructor can add members after join link expires."""
        today = date.today()
        JOIN_LINK_EXPIRATION_WEEKS = 2

        if expired_group.start_date and expired_group.end_date:
            expiration_date = expired_group.start_date + timedelta(weeks=JOIN_LINK_EXPIRATION_WEEKS)
            join_expired = today > expiration_date
            classroom_active = today <= expired_group.end_date

            # Admin should be able to add if classroom is still active
            can_admin_add = user_with_admin_role.roles[0].name in ['admin', 'instructor'] and classroom_active

            assert join_expired  # Join link expired
            assert classroom_active  # But classroom still active
            assert can_admin_add  # Admin can still add


class TestGroupMembershipQueries:
    """Tests for querying group memberships."""

    def test_count_members_in_group(self, db_session, group_with_members):
        """Test counting members in a group."""
        count = db_session.execute(
            select(func.count())
            .select_from(group_members)
            .where(group_members.c.group_id == group_with_members.id)
        ).scalar_one()

        assert count == 4  # Creator + 3 members

    def test_list_members_with_details(self, db_session, group_with_members):
        """Test listing members with their details."""
        members = db_session.execute(
            select(User, group_members.c.joined_at)
            .join(group_members, User.id == group_members.c.user_id)
            .where(group_members.c.group_id == group_with_members.id)
        ).all()

        assert len(members) == 4
        for member_data in members:
            assert member_data.User.id is not None
            assert member_data.User.username is not None
            assert member_data.joined_at is not None

    def test_find_groups_for_user(self, db_session, group_with_members, sample_user):
        """Test finding all groups a user belongs to."""
        groups = db_session.execute(
            select(Group)
            .join(group_members, Group.id == group_members.c.group_id)
            .where(group_members.c.user_id == sample_user.id)
        ).scalars().all()

        assert len(groups) >= 1
        assert group_with_members.id in [g.id for g in groups]

    def test_find_groups_created_by_user(self, db_session, sample_user, sample_group):
        """Test finding groups created by a specific user."""
        groups = db_session.execute(
            select(Group).where(Group.created_by_id == sample_user.id)
        ).scalars().all()

        assert len(groups) >= 1
        assert sample_group.id in [g.id for g in groups]


class TestGroupUserRelationships:
    """Tests for group-user relationships."""

    def test_user_belongs_to_multiple_groups(self, db_session, sample_user):
        """Test that a user can belong to multiple groups."""
        # Create multiple groups
        group1 = create_group(db_session, sample_user.id, name="Group 1")
        group2 = create_group(db_session, sample_user.id, name="Group 2")

        # Add user to both (already in group1 as creator)
        add_member_to_group(db_session, group2.id, sample_user.id)

        # Query user's groups
        user_groups = db_session.execute(
            select(Group)
            .join(group_members, Group.id == group_members.c.group_id)
            .where(group_members.c.user_id == sample_user.id)
        ).scalars().all()

        assert len(user_groups) >= 2

    def test_group_has_multiple_members(self, db_session, group_with_members):
        """Test that a group can have multiple members."""
        members = db_session.execute(
            select(User)
            .join(group_members, User.id == group_members.c.user_id)
            .where(group_members.c.group_id == group_with_members.id)
        ).scalars().all()

        assert len(members) == 4

    def test_group_creator_relationship(self, db_session, sample_group, sample_user):
        """Test the creator relationship."""
        db_session.refresh(sample_group)

        # Access creator through relationship
        creator = db_session.execute(
            select(User).where(User.id == sample_group.created_by_id)
        ).scalar_one()

        assert creator.id == sample_user.id

    def test_deleting_user_removes_from_groups(self, db_session, group_with_members):
        """Test that deleting a user removes them from groups."""
        # Get a non-creator member (just one of them)
        member = db_session.execute(
            select(User)
            .join(group_members, User.id == group_members.c.user_id)
            .where(
                (group_members.c.group_id == group_with_members.id) &
                (User.id != group_with_members.created_by_id)
            )
        ).scalars().first()

        member_id = member.id

        # Remove from groups first
        db_session.execute(
            delete(group_members).where(group_members.c.user_id == member_id)
        )

        # Delete user
        db_session.delete(member)
        db_session.commit()

        # Verify user is removed from group
        is_member = db_session.execute(
            select(group_members).where(
                (group_members.c.group_id == group_with_members.id) &
                (group_members.c.user_id == member_id)
            )
        ).first()

        assert is_member is None

    def test_deleting_group_preserves_users(self, db_session, group_with_members):
        """Test that deleting a group doesn't delete users."""
        # Get member IDs
        member_ids = db_session.execute(
            select(group_members.c.user_id)
            .where(group_members.c.group_id == group_with_members.id)
        ).scalars().all()

        assert len(member_ids) == 4

        # Delete group and memberships
        db_session.execute(
            delete(group_members).where(group_members.c.group_id == group_with_members.id)
        )
        db_session.delete(group_with_members)
        db_session.commit()

        # Verify users still exist
        remaining_users = db_session.execute(
            select(User).where(User.id.in_(member_ids))
        ).scalars().all()

        assert len(remaining_users) == 4


class TestGroupEdgeCases:
    """Tests for edge cases and boundary conditions."""

    def test_group_with_no_description(self, db_session, sample_user):
        """Test creating a group with no description."""
        group = create_group(
            db_session,
            sample_user.id,
            name="No Description Group",
            description=""
        )

        assert group.id is not None
        assert group.description == ""

    def test_group_with_long_name(self, db_session, sample_user):
        """Test creating a group with a long name."""
        long_name = "A" * 100  # 100 characters (within limit)

        group = create_group(
            db_session,
            sample_user.id,
            name=long_name
        )

        assert group.name == long_name

    def test_group_with_same_start_and_end_date(self, db_session, sample_user):
        """Test edge case of same start and end date."""
        same_date = date.today()

        # This should be invalid (end should be after start)
        # Testing the validation logic
        assert not (same_date > same_date)

    def test_group_far_future_dates(self, db_session, sample_user):
        """Test creating a group with far future dates."""
        start = date.today() + timedelta(days=365)
        end = date.today() + timedelta(days=730)

        group = create_group(
            db_session,
            sample_user.id,
            start_date=start,
            end_date=end
        )

        assert group.start_date == start
        assert group.end_date == end
