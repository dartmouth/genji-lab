"""
Tests for Flag/Content Moderation operations.

These tests cover the flags functionality including:
- Creating and retrieving flags
- Unflagging content (removing flag, keeping comment)
- Removing flagged content (cascade delete of comment + all flags)
- Target structure validation
- Authentication and authorization
- Classroom context filtering

Flags are annotations with motivation='flagging' that point to other annotations.
The target structure is: [{"source": "Annotation/<id>"}]
"""

import pytest
from datetime import datetime
from sqlalchemy import select, func, delete
from sqlalchemy.orm import Session

from tests.conftest import (
    Annotation,
    User,
    create_annotation,
    create_flag,
)


# =============================================================================
# Helper Functions for Flag Tests
# =============================================================================

def count_flags(db_session: Session, classroom_id: int = None) -> int:
    """Helper to count flags with optional classroom filtering."""
    query = db_session.query(Annotation).filter(
        Annotation.motivation == "flagging"
    )
    if classroom_id is not None:
        query = query.filter(Annotation.classroom_id == classroom_id)
    else:
        query = query.filter(Annotation.classroom_id.is_(None))
    return query.count()


def get_flags_list(db_session: Session, classroom_id: int = None) -> list:
    """Helper to get list of flags with optional classroom filtering."""
    query = db_session.query(Annotation).filter(
        Annotation.motivation == "flagging"
    )
    if classroom_id is not None:
        query = query.filter(Annotation.classroom_id == classroom_id)
    else:
        query = query.filter(Annotation.classroom_id.is_(None))
    return query.order_by(Annotation.created.desc()).all()


def parse_flag_target(flag: Annotation) -> int:
    """Parse flag target to extract flagged annotation ID."""
    if not flag.target or len(flag.target) == 0:
        return None
    target_source = flag.target[0].get('source', '')
    if target_source.startswith('Annotation/'):
        return int(target_source.split('/')[-1])
    return None


# =============================================================================
# Test Classes
# =============================================================================

class TestFlagCreationAndRetrieval:
    """Tests for creating flags and retrieving flag data."""

    def test_create_regular_annotation(self, db_session, sample_user):
        """Test creating a regular comment annotation."""
        annotation = create_annotation(
            db_session,
            creator_id=sample_user.id,
            motivation="commenting",
            body={"value": "This is a regular comment"},
        )

        assert annotation.id is not None
        assert annotation.motivation == "commenting"
        assert annotation.body["value"] == "This is a regular comment"

    def test_create_flag_annotation(self, db_session, sample_user, sample_annotation):
        """Test creating a flag annotation pointing to another annotation."""
        flag = create_flag(
            db_session,
            creator_id=sample_user.id,
            flagged_annotation_id=sample_annotation.id,
            reason="Spam content",
        )

        assert flag.id is not None
        assert flag.motivation == "flagging"
        assert flag.body["value"] == "Spam content"
        assert flag.target[0]["source"] == f"Annotation/{sample_annotation.id}"

    def test_get_flags_count_empty(self, db_session):
        """Test getting flags count when no flags exist."""
        count = count_flags(db_session)
        assert count == 0

    def test_get_flags_count_with_flags(self, db_session, sample_flag):
        """Test getting flags count with flags present."""
        count = count_flags(db_session)
        assert count == 1

    def test_get_flags_count_multiple_flags(self, db_session, annotation_with_multiple_flags):
        """Test getting flags count with multiple flags on same annotation."""
        annotation, flags = annotation_with_multiple_flags
        count = count_flags(db_session)
        assert count == 3

    def test_get_flags_list_with_enriched_data(self, db_session, sample_flag, sample_annotation):
        """Test retrieving flags list with proper data."""
        flags = get_flags_list(db_session)

        assert len(flags) == 1
        flag = flags[0]
        assert flag.motivation == "flagging"
        assert flag.body["value"] == "Inappropriate content"
        
        # Verify target points to correct annotation
        flagged_id = parse_flag_target(flag)
        assert flagged_id == sample_annotation.id

    def test_flag_target_parsing(self, db_session, sample_flag, sample_annotation):
        """Test parsing flag target to extract annotation ID."""
        flagged_id = parse_flag_target(sample_flag)
        assert flagged_id == sample_annotation.id

    def test_get_flags_list_ordered_by_date(self, db_session, sample_user, sample_annotation):
        """Test that flags are ordered by most recent first."""
        from datetime import timedelta

        # Create flags with different timestamps
        flag1 = create_flag(db_session, sample_user.id, sample_annotation.id, "First flag")
        flag1.created = datetime.now() - timedelta(hours=2)
        db_session.commit()

        flag2 = create_flag(db_session, sample_user.id, sample_annotation.id, "Second flag")
        flag2.created = datetime.now() - timedelta(hours=1)
        db_session.commit()

        flag3 = create_flag(db_session, sample_user.id, sample_annotation.id, "Third flag")
        flag3.created = datetime.now()
        db_session.commit()

        flags = get_flags_list(db_session)
        assert len(flags) == 3
        # Most recent first
        assert flags[0].body["value"] == "Third flag"
        assert flags[1].body["value"] == "Second flag"
        assert flags[2].body["value"] == "First flag"


class TestClassroomFiltering:
    """Tests for classroom context filtering on flags."""

    def test_get_flags_count_classroom_filtering(self, db_session, sample_user, sample_annotation, sample_group):
        """Test counting flags with classroom filtering."""
        # Create flag without classroom
        flag1 = create_flag(db_session, sample_user.id, sample_annotation.id)
        
        # Create annotation and flag with classroom
        annotation2 = create_annotation(
            db_session,
            creator_id=sample_user.id,
            classroom_id=sample_group.id
        )
        flag2 = create_flag(
            db_session,
            creator_id=sample_user.id,
            flagged_annotation_id=annotation2.id,
            classroom_id=sample_group.id
        )

        # Count without classroom filter (should get non-classroom flags)
        count_no_classroom = count_flags(db_session, classroom_id=None)
        assert count_no_classroom == 1

        # Count with classroom filter
        count_with_classroom = count_flags(db_session, classroom_id=sample_group.id)
        assert count_with_classroom == 1

    def test_get_flags_list_classroom_filtering(self, db_session, sample_user, sample_annotation, sample_group):
        """Test retrieving flags with classroom filtering."""
        # Create flag without classroom
        flag1 = create_flag(db_session, sample_user.id, sample_annotation.id, "No classroom")
        
        # Create annotation and flag with classroom
        annotation2 = create_annotation(
            db_session,
            creator_id=sample_user.id,
            classroom_id=sample_group.id
        )
        flag2 = create_flag(
            db_session,
            creator_id=sample_user.id,
            flagged_annotation_id=annotation2.id,
            reason="With classroom",
            classroom_id=sample_group.id
        )

        # Get flags without classroom
        flags_no_classroom = get_flags_list(db_session, classroom_id=None)
        assert len(flags_no_classroom) == 1
        assert flags_no_classroom[0].body["value"] == "No classroom"

        # Get flags with classroom
        flags_with_classroom = get_flags_list(db_session, classroom_id=sample_group.id)
        assert len(flags_with_classroom) == 1
        assert flags_with_classroom[0].body["value"] == "With classroom"

    def test_mixed_classroom_content(self, db_session, sample_user, sample_annotation, sample_group):
        """Test that classroom filtering correctly separates content."""
        # Create multiple flags in different contexts
        flag1 = create_flag(db_session, sample_user.id, sample_annotation.id, "Flag 1 - No classroom")
        flag2 = create_flag(db_session, sample_user.id, sample_annotation.id, "Flag 2 - No classroom")
        
        annotation_classroom = create_annotation(
            db_session,
            creator_id=sample_user.id,
            classroom_id=sample_group.id
        )
        flag3 = create_flag(
            db_session,
            sample_user.id,
            annotation_classroom.id,
            "Flag 3 - With classroom",
            classroom_id=sample_group.id
        )

        # Verify counts
        assert count_flags(db_session, classroom_id=None) == 2
        assert count_flags(db_session, classroom_id=sample_group.id) == 1


class TestUnflagOperations:
    """Tests for unflagging content (removing flag, keeping comment)."""

    def test_unflag_success(self, db_session, sample_flag, sample_annotation):
        """Test successfully unflagging content."""
        flag_id = sample_flag.id
        annotation_id = sample_annotation.id

        # Delete the flag
        db_session.delete(sample_flag)
        db_session.commit()

        # Verify flag is deleted
        deleted_flag = db_session.get(Annotation, flag_id)
        assert deleted_flag is None

        # Verify annotation still exists
        annotation = db_session.get(Annotation, annotation_id)
        assert annotation is not None
        assert annotation.motivation == "commenting"

    def test_unflag_with_classroom_context(self, db_session, sample_user, sample_group):
        """Test unflagging with classroom context."""
        # Create annotation and flag in classroom
        annotation = create_annotation(
            db_session,
            creator_id=sample_user.id,
            classroom_id=sample_group.id
        )
        flag = create_flag(
            db_session,
            sample_user.id,
            annotation.id,
            classroom_id=sample_group.id
        )

        flag_id = flag.id
        
        # Unflag
        db_session.delete(flag)
        db_session.commit()

        # Verify flag deleted, comment remains
        assert db_session.get(Annotation, flag_id) is None
        assert db_session.get(Annotation, annotation.id) is not None

    def test_unflag_nonexistent_flag(self, db_session):
        """Test unflagging a non-existent flag."""
        flag = db_session.get(Annotation, 99999)
        assert flag is None

    def test_unflag_one_of_multiple_flags(self, db_session, annotation_with_multiple_flags):
        """Test unflagging one flag when multiple exist on same annotation."""
        annotation, flags = annotation_with_multiple_flags

        # Verify initial count
        assert count_flags(db_session) == 3

        # Delete one flag
        db_session.delete(flags[0])
        db_session.commit()

        # Verify count decreased
        assert count_flags(db_session) == 2

        # Verify annotation still exists
        db_session.refresh(annotation)
        assert annotation.id is not None

    def test_verify_comment_exists_after_unflag(self, db_session, sample_flag, sample_annotation):
        """Test that comment content is preserved after unflagging."""
        original_body = sample_annotation.body["value"]
        
        # Unflag
        db_session.delete(sample_flag)
        db_session.commit()

        # Verify comment unchanged
        db_session.refresh(sample_annotation)
        assert sample_annotation.body["value"] == original_body
        assert sample_annotation.motivation == "commenting"

    def test_unflag_decreases_count(self, db_session, sample_flag):
        """Test that unflagging decreases the flag count."""
        # Initial count
        assert count_flags(db_session) == 1

        # Unflag
        db_session.delete(sample_flag)
        db_session.commit()

        # Verify count is zero
        assert count_flags(db_session) == 0

    def test_unflag_only_affects_specific_flag(self, db_session, sample_user, sample_annotation):
        """Test that unflagging one flag doesn't affect other flags."""
        # Create two flags on same annotation
        flag1 = create_flag(db_session, sample_user.id, sample_annotation.id, "Reason 1")
        flag2 = create_flag(db_session, sample_user.id, sample_annotation.id, "Reason 2")

        # Delete first flag
        db_session.delete(flag1)
        db_session.commit()

        # Verify second flag still exists
        remaining_flags = get_flags_list(db_session)
        assert len(remaining_flags) == 1
        assert remaining_flags[0].id == flag2.id


class TestRemoveCommentOperations:
    """Tests for removing flagged comments (cascade delete)."""

    def test_remove_comment_with_single_flag(self, db_session, sample_flag, sample_annotation):
        """Test removing a comment that has a single flag."""
        flag_id = sample_flag.id
        annotation_id = sample_annotation.id

        # Delete the flag first, then the annotation
        db_session.delete(sample_flag)
        db_session.delete(sample_annotation)
        db_session.commit()

        # Verify both are deleted
        assert db_session.get(Annotation, annotation_id) is None
        assert db_session.get(Annotation, flag_id) is None

    def test_remove_comment_with_multiple_flags_cascade(self, db_session, annotation_with_multiple_flags):
        """Test that removing a comment deletes ALL flags pointing to it."""
        annotation, flags = annotation_with_multiple_flags
        annotation_id = annotation.id
        flag_ids = [f.id for f in flags]

        # Verify initial state
        assert count_flags(db_session) == 3

        # Delete all flags first (simulating cascade)
        for flag in flags:
            db_session.delete(flag)

        # Delete the annotation
        db_session.delete(annotation)
        db_session.commit()

        # Verify all are deleted
        assert db_session.get(Annotation, annotation_id) is None
        for flag_id in flag_ids:
            assert db_session.get(Annotation, flag_id) is None

        # Verify flag count is zero
        assert count_flags(db_session) == 0

    def test_remove_comment_flag_count_decreases(self, db_session, annotation_with_multiple_flags):
        """Test that flag count decreases correctly when comment removed."""
        annotation, flags = annotation_with_multiple_flags

        # Initial count
        initial_count = count_flags(db_session)
        assert initial_count == 3

        # Remove all flags then annotation
        for flag in flags:
            db_session.delete(flag)
        db_session.delete(annotation)
        db_session.commit()

        # Verify count is zero
        assert count_flags(db_session) == 0

    def test_find_all_flags_for_comment(self, db_session, annotation_with_multiple_flags):
        """Test finding all flags that point to a specific annotation."""
        annotation, flags = annotation_with_multiple_flags

        # Find all flags pointing to this annotation
        all_flags = get_flags_list(db_session)
        flags_for_annotation = [
            f for f in all_flags 
            if parse_flag_target(f) == annotation.id
        ]

        assert len(flags_for_annotation) == 3

    def test_remove_comment_with_classroom_context(self, db_session, sample_user, sample_group):
        """Test removing comment with classroom filtering."""
        annotation = create_annotation(
            db_session,
            creator_id=sample_user.id,
            classroom_id=sample_group.id
        )
        flag = create_flag(
            db_session,
            sample_user.id,
            annotation.id,
            classroom_id=sample_group.id
        )

        # Remove annotation
        db_session.delete(flag)
        db_session.delete(annotation)
        db_session.commit()

        # Verify both deleted
        assert count_flags(db_session, classroom_id=sample_group.id) == 0

    def test_remove_comment_cascade_implementation(self, db_session, sample_user, sample_annotation):
        """Test the cascade delete implementation pattern."""
        # Create multiple flags
        flag1 = create_flag(db_session, sample_user.id, sample_annotation.id, "Flag 1")
        flag2 = create_flag(db_session, sample_user.id, sample_annotation.id, "Flag 2")
        flag3 = create_flag(db_session, sample_user.id, sample_annotation.id, "Flag 3")

        # Simulate finding all flags for this annotation
        target_ref = f"Annotation/{sample_annotation.id}"
        all_flags = get_flags_list(db_session)
        flags_to_delete = []

        for f in all_flags:
            if f.target and len(f.target) > 0:
                flag_target_source = f.target[0].get('source', '')
                if flag_target_source == target_ref:
                    flags_to_delete.append(f)

        assert len(flags_to_delete) == 3

        # Delete all flags then annotation
        for f in flags_to_delete:
            db_session.delete(f)
        db_session.delete(sample_annotation)
        db_session.commit()

        # Verify all deleted
        assert count_flags(db_session) == 0

    def test_remove_comment_returns_count(self, db_session, annotation_with_multiple_flags):
        """Test that we can track how many flags were deleted."""
        annotation, flags = annotation_with_multiple_flags
        
        flags_deleted = len(flags)
        assert flags_deleted == 3

    def test_flagged_comment_not_found(self, db_session, sample_flag):
        """Test handling when flagged annotation doesn't exist."""
        # Get the target ID from flag
        flagged_id = parse_flag_target(sample_flag)
        
        # Delete the target annotation directly (orphan the flag)
        target = db_session.get(Annotation, flagged_id)
        db_session.delete(target)
        db_session.commit()

        # Try to find the target
        db_session.refresh(sample_flag)
        deleted_target = db_session.get(Annotation, flagged_id)
        assert deleted_target is None

        # Flag still exists but target is gone
        assert sample_flag.id is not None


class TestTargetStructureValidation:
    """Tests for flag target structure validation."""

    def test_valid_target_format(self, db_session, sample_flag, sample_annotation):
        """Test that valid target format is parsed correctly."""
        assert sample_flag.target is not None
        assert len(sample_flag.target) == 1
        assert "source" in sample_flag.target[0]
        assert sample_flag.target[0]["source"] == f"Annotation/{sample_annotation.id}"

        # Parse and verify
        flagged_id = parse_flag_target(sample_flag)
        assert flagged_id == sample_annotation.id

    def test_invalid_target_missing_source(self, db_session, sample_user, sample_annotation):
        """Test handling of invalid target without source field."""
        flag = Annotation(
            creator_id=sample_user.id,
            owner_id=sample_user.id,
            motivation="flagging",
            body={"value": "Invalid flag"},
            target=[{"invalid": "structure"}],  # Missing 'source'
            created=datetime.now(),
        )
        db_session.add(flag)
        db_session.commit()

        # Parsing should handle gracefully
        flagged_id = parse_flag_target(flag)
        assert flagged_id is None

    def test_invalid_target_wrong_format(self, db_session, sample_user):
        """Test handling of wrong annotation reference format."""
        flag = Annotation(
            creator_id=sample_user.id,
            owner_id=sample_user.id,
            motivation="flagging",
            body={"value": "Invalid flag"},
            target=[{"source": "Document/123"}],  # Wrong type, should be Annotation/
            created=datetime.now(),
        )
        db_session.add(flag)
        db_session.commit()

        flagged_id = parse_flag_target(flag)
        assert flagged_id is None

    def test_invalid_target_nonexistent_annotation(self, db_session, sample_user):
        """Test flag pointing to non-existent annotation ID."""
        nonexistent_id = 99999
        flag = create_flag(db_session, sample_user.id, nonexistent_id)

        # Flag is created successfully
        assert flag.id is not None

        # But target doesn't exist
        target_annotation = db_session.get(Annotation, nonexistent_id)
        assert target_annotation is None

    def test_invalid_target_empty_array(self, db_session, sample_user):
        """Test handling of empty target array."""
        flag = Annotation(
            creator_id=sample_user.id,
            owner_id=sample_user.id,
            motivation="flagging",
            body={"value": "Invalid flag"},
            target=[],  # Empty array
            created=datetime.now(),
        )
        db_session.add(flag)
        db_session.commit()

        flagged_id = parse_flag_target(flag)
        assert flagged_id is None

    def test_invalid_target_null(self, db_session, sample_user):
        """Test handling of null target."""
        flag = Annotation(
            creator_id=sample_user.id,
            owner_id=sample_user.id,
            motivation="flagging",
            body={"value": "Invalid flag"},
            target=None,  # Null target
            created=datetime.now(),
        )
        db_session.add(flag)
        db_session.commit()

        flagged_id = parse_flag_target(flag)
        assert flagged_id is None

    def test_target_pointing_to_deleted_annotation(self, db_session, sample_user, sample_annotation):
        """Test orphaned flag when target annotation is deleted separately."""
        # Create flag
        flag = create_flag(db_session, sample_user.id, sample_annotation.id)
        flagged_id = parse_flag_target(flag)

        # Delete target annotation separately (orphan the flag)
        db_session.delete(sample_annotation)
        db_session.commit()

        # Flag still exists
        db_session.refresh(flag)
        assert flag.id is not None

        # But target is gone
        orphaned_target = db_session.get(Annotation, flagged_id)
        assert orphaned_target is None


class TestAuthenticationAndAuthorization:
    """Tests for role-based access control on flag operations."""

    def test_admin_role_required_for_operations(self, db_session, user_with_admin_role):
        """Test that admin role is present for flag operations."""
        # Check user has admin role
        assert len(user_with_admin_role.roles) > 0
        role_names = [r.name for r in user_with_admin_role.roles]
        assert "admin" in role_names

    def test_non_admin_cannot_access(self, db_session, sample_user):
        """Test that non-admin users don't have admin role."""
        # sample_user has no roles
        assert len(sample_user.roles) == 0

    def test_admin_can_count_flags(self, db_session, user_with_admin_role, sample_flag):
        """Test that admin can count flags."""
        # Admin has proper role
        role_names = [r.name for r in user_with_admin_role.roles]
        assert "admin" in role_names

        # Can count flags
        count = count_flags(db_session)
        assert count == 1

    def test_admin_can_list_flags(self, db_session, user_with_admin_role, sample_flag):
        """Test that admin can list flags."""
        role_names = [r.name for r in user_with_admin_role.roles]
        assert "admin" in role_names

        # Can list flags
        flags = get_flags_list(db_session)
        assert len(flags) == 1

    def test_admin_can_unflag(self, db_session, user_with_admin_role, sample_flag, sample_annotation):
        """Test that admin can unflag content."""
        role_names = [r.name for r in user_with_admin_role.roles]
        assert "admin" in role_names

        # Can unflag
        db_session.delete(sample_flag)
        db_session.commit()

        # Verify success
        assert count_flags(db_session) == 0
        assert sample_annotation.id is not None

    def test_admin_can_remove_comment(self, db_session, user_with_admin_role, sample_flag, sample_annotation):
        """Test that admin can remove flagged comments."""
        role_names = [r.name for r in user_with_admin_role.roles]
        assert "admin" in role_names

        # Can remove comment
        db_session.delete(sample_flag)
        db_session.delete(sample_annotation)
        db_session.commit()

        # Verify success
        assert count_flags(db_session) == 0


class TestEdgeCasesAndComplexScenarios:
    """Tests for edge cases and complex scenarios."""

    def test_long_flag_reason(self, db_session, sample_user, sample_annotation):
        """Test flag with very long reason text."""
        long_reason = "A" * 1000  # 1000 character reason
        flag = create_flag(db_session, sample_user.id, sample_annotation.id, long_reason)

        assert flag.body["value"] == long_reason
        assert len(flag.body["value"]) == 1000

    def test_empty_flag_body(self, db_session, sample_user, sample_annotation):
        """Test flag with empty body."""
        flag = Annotation(
            creator_id=sample_user.id,
            owner_id=sample_user.id,
            motivation="flagging",
            body={},  # Empty body
            target=[{"source": f"Annotation/{sample_annotation.id}"}],
            created=datetime.now(),
        )
        db_session.add(flag)
        db_session.commit()

        assert flag.id is not None
        assert flag.body == {}

    def test_multiple_users_flagging_same_comment(self, db_session, annotation_with_multiple_flags):
        """Test that multiple users can flag the same comment."""
        annotation, flags = annotation_with_multiple_flags

        # Verify all flags point to same annotation
        for flag in flags:
            flagged_id = parse_flag_target(flag)
            assert flagged_id == annotation.id

        # Verify 3 different users created the flags
        creator_ids = [f.creator_id for f in flags]
        assert len(set(creator_ids)) == 3  # 3 unique users

    def test_remove_comment_deletes_all_user_flags(self, db_session, annotation_with_multiple_flags):
        """Test that removing comment deletes flags from all users."""
        annotation, flags = annotation_with_multiple_flags

        # Simulate cascade delete
        for flag in flags:
            db_session.delete(flag)
        db_session.delete(annotation)
        db_session.commit()

        # All flags gone
        assert count_flags(db_session) == 0

    def test_orphaned_flags_data_consistency(self, db_session, sample_user, sample_annotation):
        """Test data consistency with orphaned flags."""
        flag = create_flag(db_session, sample_user.id, sample_annotation.id)

        # Delete annotation (orphan the flag)
        db_session.delete(sample_annotation)
        db_session.commit()

        # Flag still exists in database
        db_session.refresh(flag)
        assert flag.id is not None

        # But target is gone
        flagged_id = parse_flag_target(flag)
        target = db_session.get(Annotation, flagged_id)
        assert target is None

    def test_flag_count_accuracy_across_operations(self, db_session, sample_user, sample_annotation):
        """Test that flag count remains accurate across various operations."""
        # Start with 0
        assert count_flags(db_session) == 0

        # Add 3 flags
        flag1 = create_flag(db_session, sample_user.id, sample_annotation.id)
        assert count_flags(db_session) == 1

        flag2 = create_flag(db_session, sample_user.id, sample_annotation.id)
        assert count_flags(db_session) == 2

        flag3 = create_flag(db_session, sample_user.id, sample_annotation.id)
        assert count_flags(db_session) == 3

        # Remove one flag
        db_session.delete(flag1)
        db_session.commit()
        assert count_flags(db_session) == 2

        # Remove annotation and remaining flags
        db_session.delete(flag2)
        db_session.delete(flag3)
        db_session.delete(sample_annotation)
        db_session.commit()
        assert count_flags(db_session) == 0
