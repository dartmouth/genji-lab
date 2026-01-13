"""
Tests for annotation CRUD operations.

This test suite covers:
- Creating annotations (commenting, linking, tagging)
- Reading/listing annotations with filters
- Updating annotations (body, motivation)
- Deleting annotations
- Classroom context filtering
- Data structure validation

These are unit tests that test annotation data operations directly,
without going through the HTTP layer. Layer 1 focuses on basic CRUD operations.
"""

import pytest
import time
from datetime import datetime
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, func

from tests.conftest import (
    User,
    Annotation,
    Document,
    DocumentElement,
    Group,
    group_members,
    create_full_annotation,
    create_annotation_body,
    create_annotation_target,
)


# =============================================================================
# Helper Functions
# =============================================================================

def count_annotations(db_session: Session, classroom_id: int = None, motivation: str = None) -> int:
    """Helper to count annotations with optional filtering."""
    query = db_session.query(Annotation)
    if classroom_id is not None:
        query = query.filter(Annotation.classroom_id == classroom_id)
    else:
        query = query.filter(Annotation.classroom_id.is_(None))
    if motivation:
        query = query.filter(Annotation.motivation == motivation)
    return query.count()


def get_annotations_list(db_session: Session, classroom_id: int = None, motivation: str = None) -> list:
    """Helper to get list of annotations with optional filtering."""
    query = db_session.query(Annotation)
    if classroom_id is not None:
        query = query.filter(Annotation.classroom_id == classroom_id)
    else:
        query = query.filter(Annotation.classroom_id.is_(None))
    if motivation:
        query = query.filter(Annotation.motivation == motivation)
    return query.order_by(Annotation.created.desc()).all()


# =============================================================================
# Test Classes - Layer 1: Basic CRUD
# =============================================================================

class TestCreateAnnotation:
    """Tests for creating annotations."""

    def test_create_annotation_success(self, db_session: Session, sample_user: User, sample_document: Document):
        """Test creating a basic annotation."""
        body = create_annotation_body(body_id=1, value="Test comment")
        target = create_annotation_target(target_id=1, element_id=sample_document.id)
        
        annotation = Annotation(
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=None,
            creator_id=sample_user.id,
            owner_id=sample_user.id,
            type="Annotation",
            motivation="commenting",
            body=body,
            target=[target],
            status="active",
            annotation_type="standard",
            created=datetime.now(),
            modified=datetime.now(),
            generated=datetime.now(),
            generator="Genji",
        )
        db_session.add(annotation)
        db_session.commit()
        db_session.refresh(annotation)
        
        assert annotation.id is not None
        assert annotation.motivation == "commenting"
        assert annotation.creator_id == sample_user.id
        assert annotation.document_id == sample_document.id
        assert annotation.body["id"] == 1
        assert annotation.target[0]["id"] == 1

    def test_create_annotation_with_classroom_context(
        self, db_session: Session, sample_user: User, sample_document: Document, sample_group: Group
    ):
        """Test creating an annotation within a classroom context."""
        annotation = create_full_annotation(
            db_session=db_session,
            creator_id=sample_user.id,
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=None,
            motivation="commenting",
            body_value="Classroom comment",
            classroom_id=sample_group.id,
        )
        
        assert annotation.classroom_id == sample_group.id
        assert annotation.motivation == "commenting"
        
    def test_create_annotation_linking_motivation(
        self, db_session: Session, sample_user: User, sample_document: Document
    ):
        """Test creating a linking annotation."""
        annotation = create_full_annotation(
            db_session=db_session,
            creator_id=sample_user.id,
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=None,
            motivation="linking",
            body_value="Link annotation",
        )
        
        assert annotation.motivation == "linking"
        
    def test_create_annotation_with_multiple_targets(
        self, db_session: Session, sample_user: User, sample_document_with_elements
    ):
        """Test creating an annotation with multiple targets."""
        sample_document = sample_document_with_elements
        elements = sample_document.elements
        
        annotation = create_full_annotation(
            db_session=db_session,
            creator_id=sample_user.id,
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=elements[0].id,
            motivation="commenting",
            body_value="Comment on multiple elements",
            target_element_ids=[elements[0].id, elements[1].id],
        )
        
        assert len(annotation.target) == 2
        
    def test_create_annotation_sets_timestamps(
        self, db_session: Session, sample_user: User, sample_document: Document
    ):
        """Test that creating an annotation sets all required timestamps."""
        before_creation = datetime.now()
        
        annotation = create_full_annotation(
            db_session=db_session,
            creator_id=sample_user.id,
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=None,
            motivation="commenting",
            body_value="Timestamp test",
        )
        
        after_creation = datetime.now()
        
        assert before_creation <= annotation.created <= after_creation
        assert before_creation <= annotation.modified <= after_creation
        assert before_creation <= annotation.generated <= after_creation


class TestListAnnotations:
    """Tests for listing and filtering annotations."""

    def test_list_annotations_empty(self, db_session: Session):
        """Test listing annotations when database is empty."""
        annotations = get_annotations_list(db_session)
        assert len(annotations) == 0
        
    def test_list_annotations_with_results(
        self, db_session: Session, sample_user: User, sample_document: Document
    ):
        """Test listing annotations returns all annotations."""
        # Create 3 annotations
        for i in range(3):
            create_full_annotation(
                db_session=db_session,
                creator_id=sample_user.id,
                document_collection_id=sample_document.document_collection_id,
                document_id=sample_document.id,
                document_element_id=None,
                motivation="commenting",
                body_value=f"Comment {i}",
            )
        
        annotations = get_annotations_list(db_session)
        assert len(annotations) == 3
        
    def test_list_annotations_pagination(
        self, db_session: Session, sample_user: User, sample_document: Document
    ):
        """Test listing annotations with pagination (skip/limit)."""
        # Create 5 annotations
        for i in range(5):
            create_full_annotation(
                db_session=db_session,
                creator_id=sample_user.id,
                document_collection_id=sample_document.document_collection_id,
                document_id=sample_document.id,
                document_element_id=None,
                motivation="commenting",
                body_value=f"Comment {i}",
            )
        
        # Test pagination
        page1 = db_session.query(Annotation).order_by(Annotation.created.desc()).limit(2).all()
        assert len(page1) == 2
        
        page2 = db_session.query(Annotation).order_by(Annotation.created.desc()).offset(2).limit(2).all()
        assert len(page2) == 2
        
        # Ensure pages contain different annotations
        assert page1[0].id != page2[0].id
        
    def test_list_annotations_filter_by_motivation(
        self, db_session: Session, sample_user: User, sample_document: Document
    ):
        """Test filtering annotations by motivation."""
        # Create annotations with different motivations
        create_full_annotation(
            db_session=db_session,
            creator_id=sample_user.id,
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=None,
            motivation="commenting",
            body_value="Comment",
        )
        create_full_annotation(
            db_session=db_session,
            creator_id=sample_user.id,
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=None,
            motivation="linking",
            body_value="Link",
        )
        create_full_annotation(
            db_session=db_session,
            creator_id=sample_user.id,
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=None,
            motivation="tagging",
            body_value="Tag",
        )
        
        # Filter by motivation
        linking_annotations = get_annotations_list(db_session, motivation="linking")
        assert len(linking_annotations) == 1
        assert linking_annotations[0].motivation == "linking"
        
    def test_list_annotations_filter_by_element_id(
        self, db_session: Session, sample_user: User, sample_document_with_elements
    ):
        """Test filtering annotations by document_element_id."""
        sample_document = sample_document_with_elements
        elements = sample_document.elements
        
        # Create annotation with element_id
        create_full_annotation(
            db_session=db_session,
            creator_id=sample_user.id,
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=elements[0].id,
            motivation="commenting",
            body_value="Comment on element",
        )
        
        # Create annotation without element_id
        create_full_annotation(
            db_session=db_session,
            creator_id=sample_user.id,
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=None,
            motivation="commenting",
            body_value="General comment",
        )
        
        # Filter by element_id
        element_annotations = db_session.query(Annotation).filter(
            Annotation.document_element_id == elements[0].id
        ).all()
        assert len(element_annotations) == 1
        assert element_annotations[0].document_element_id == elements[0].id
        
    def test_list_annotations_classroom_context_filtering(
        self, db_session: Session, sample_user: User, sample_document: Document, sample_group: Group
    ):
        """Test filtering annotations by classroom context."""
        # Add user to classroom
        db_session.execute(
            group_members.insert().values(group_id=sample_group.id, user_id=sample_user.id)
        )
        db_session.commit()
        
        # Create annotation in classroom
        create_full_annotation(
            db_session=db_session,
            creator_id=sample_user.id,
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=None,
            motivation="commenting",
            body_value="Classroom comment",
            classroom_id=sample_group.id,
        )
        
        # Create annotation outside classroom
        create_full_annotation(
            db_session=db_session,
            creator_id=sample_user.id,
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=None,
            motivation="commenting",
            body_value="Global comment",
            classroom_id=None,
        )
        
        # Filter by classroom
        classroom_annotations = get_annotations_list(db_session, classroom_id=sample_group.id)
        assert len(classroom_annotations) == 1
        assert classroom_annotations[0].classroom_id == sample_group.id
        
        # Filter non-classroom
        global_annotations = get_annotations_list(db_session, classroom_id=None)
        assert len(global_annotations) == 1
        assert global_annotations[0].classroom_id is None


class TestGetSingleAnnotation:
    """Tests for retrieving single annotations."""

    def test_get_annotation_by_id_success(
        self, db_session: Session, sample_user: User, sample_document: Document
    ):
        """Test retrieving an annotation by ID."""
        annotation = create_full_annotation(
            db_session=db_session,
            creator_id=sample_user.id,
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=None,
            motivation="commenting",
            body_value="Test comment",
        )
        
        retrieved = db_session.query(Annotation).filter(Annotation.id == annotation.id).first()
        assert retrieved is not None
        assert retrieved.id == annotation.id
        assert retrieved.body["value"] == "Test comment"
        
    def test_get_annotation_not_found(self, db_session: Session):
        """Test retrieving a non-existent annotation."""
        retrieved = db_session.query(Annotation).filter(Annotation.id == 999999).first()
        assert retrieved is None
        
    def test_get_annotation_classroom_context_validation(
        self, db_session: Session, sample_user: User, sample_document: Document, sample_group: Group
    ):
        """Test retrieving annotation with wrong classroom context returns nothing."""
        # Create annotation in classroom
        annotation = create_full_annotation(
            db_session=db_session,
            creator_id=sample_user.id,
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=None,
            motivation="commenting",
            body_value="Classroom comment",
            classroom_id=sample_group.id,
        )
        
        # Try to retrieve with wrong classroom context (classroom_id=None)
        retrieved = db_session.query(Annotation).filter(
            Annotation.id == annotation.id,
            Annotation.classroom_id.is_(None)
        ).first()
        assert retrieved is None
        
    def test_get_annotation_eager_loads_creator(
        self, db_session: Session, sample_user: User, sample_document: Document
    ):
        """Test that retrieving annotation can eager-load creator relationship."""
        annotation = create_full_annotation(
            db_session=db_session,
            creator_id=sample_user.id,
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=None,
            motivation="commenting",
            body_value="Test comment",
        )
        
        # Query with joinedload
        retrieved = db_session.query(Annotation).options(
            joinedload(Annotation.creator)
        ).filter(Annotation.id == annotation.id).first()
        
        assert retrieved.creator is not None
        assert retrieved.creator.id == sample_user.id
        assert retrieved.creator.username == sample_user.username


class TestUpdateAnnotation:
    """Tests for updating annotations."""

    def test_update_annotation_body_value(
        self, db_session: Session, sample_user: User, sample_document: Document
    ):
        """Test updating an annotation's body value."""
        from sqlalchemy.orm.attributes import flag_modified
        
        annotation = create_full_annotation(
            db_session=db_session,
            creator_id=sample_user.id,
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=None,
            motivation="commenting",
            body_value="Original text",
        )
        
        # Update body value - need to mark JSON field as modified
        annotation.body["value"] = "Updated text"
        flag_modified(annotation, "body")
        annotation.modified = datetime.now()
        db_session.commit()
        db_session.refresh(annotation)
        
        assert annotation.body["value"] == "Updated text"
        
    def test_update_annotation_motivation(
        self, db_session: Session, sample_user: User, sample_document: Document
    ):
        """Test updating an annotation's motivation."""
        annotation = create_full_annotation(
            db_session=db_session,
            creator_id=sample_user.id,
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=None,
            motivation="commenting",
            body_value="Test comment",
        )
        
        # Update motivation
        annotation.motivation = "tagging"
        annotation.modified = datetime.now()
        db_session.commit()
        db_session.refresh(annotation)
        
        assert annotation.motivation == "tagging"
        
    def test_update_annotation_updates_modified_timestamp(
        self, db_session: Session, sample_user: User, sample_document: Document
    ):
        """Test that updating an annotation updates the modified timestamp."""
        annotation = create_full_annotation(
            db_session=db_session,
            creator_id=sample_user.id,
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=None,
            motivation="commenting",
            body_value="Test comment",
        )
        
        original_modified = annotation.modified
        
        # Wait a tiny bit to ensure timestamp difference
        time.sleep(0.01)
        
        # Update annotation
        annotation.body["value"] = "Updated"
        annotation.modified = datetime.now()
        db_session.commit()
        db_session.refresh(annotation)
        
        assert annotation.modified > original_modified
        
    def test_update_annotation_not_found(self, db_session: Session):
        """Test updating a non-existent annotation."""
        annotation = db_session.query(Annotation).filter(Annotation.id == 999999).first()
        assert annotation is None


class TestDeleteAnnotation:
    """Tests for deleting annotations."""

    def test_delete_annotation_success(
        self, db_session: Session, sample_user: User, sample_document: Document
    ):
        """Test deleting an annotation."""
        annotation = create_full_annotation(
            db_session=db_session,
            creator_id=sample_user.id,
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=None,
            motivation="commenting",
            body_value="Test comment",
        )
        
        annotation_id = annotation.id
        
        # Delete annotation
        db_session.delete(annotation)
        db_session.commit()
        
        # Verify deletion
        retrieved = db_session.query(Annotation).filter(Annotation.id == annotation_id).first()
        assert retrieved is None
        
    def test_delete_annotation_not_found(self, db_session: Session):
        """Test deleting a non-existent annotation."""
        annotation = db_session.query(Annotation).filter(Annotation.id == 999999).first()
        assert annotation is None
        
    def test_delete_annotation_classroom_context_validation(
        self, db_session: Session, sample_user: User, sample_document: Document, sample_group: Group
    ):
        """Test that classroom context is validated before deletion."""
        # Create annotation in classroom
        annotation = create_full_annotation(
            db_session=db_session,
            creator_id=sample_user.id,
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=None,
            motivation="commenting",
            body_value="Classroom comment",
            classroom_id=sample_group.id,
        )
        
        annotation_id = annotation.id
        
        # Query with wrong classroom context - should not find it
        retrieved = db_session.query(Annotation).filter(
            Annotation.id == annotation_id,
            Annotation.classroom_id.is_(None)
        ).first()
        assert retrieved is None
        
        # Query with correct classroom context - should find it
        retrieved = db_session.query(Annotation).filter(
            Annotation.id == annotation_id,
            Annotation.classroom_id == sample_group.id
        ).first()
        assert retrieved is not None


# =============================================================================
# Test Classes - Layer 2: Data Structure Validation
# =============================================================================

class TestBodyStructure:
    """Tests for annotation body structure validation."""

    def test_body_has_required_fields(
        self, db_session: Session, sample_user: User, sample_document: Document
    ):
        """Test that body contains all required fields."""
        annotation = create_full_annotation(
            db_session=db_session,
            creator_id=sample_user.id,
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=None,
            motivation="commenting",
            body_value="Test comment",
        )
        
        # Verify body structure
        assert "id" in annotation.body
        assert "type" in annotation.body
        assert "value" in annotation.body
        assert "format" in annotation.body
        
    def test_body_id_is_integer(
        self, db_session: Session, sample_user: User, sample_document: Document
    ):
        """Test that body id is an integer."""
        body = create_annotation_body(body_id=123, value="Test")
        
        annotation = Annotation(
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=None,
            creator_id=sample_user.id,
            owner_id=sample_user.id,
            type="Annotation",
            motivation="commenting",
            body=body,
            target=[],
            status="active",
            created=datetime.now(),
            modified=datetime.now(),
            generated=datetime.now(),
        )
        db_session.add(annotation)
        db_session.commit()
        db_session.refresh(annotation)
        
        assert isinstance(annotation.body["id"], int)
        assert annotation.body["id"] == 123
        
    def test_body_type_field(
        self, db_session: Session, sample_user: User, sample_document: Document
    ):
        """Test body type field values."""
        body = create_annotation_body(body_id=1, value="Test", body_type="TextualBody")
        
        annotation = Annotation(
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=None,
            creator_id=sample_user.id,
            owner_id=sample_user.id,
            type="Annotation",
            motivation="commenting",
            body=body,
            target=[],
            status="active",
            created=datetime.now(),
            modified=datetime.now(),
            generated=datetime.now(),
        )
        db_session.add(annotation)
        db_session.commit()
        db_session.refresh(annotation)
        
        assert annotation.body["type"] == "TextualBody"
        
    def test_body_format_field(
        self, db_session: Session, sample_user: User, sample_document: Document
    ):
        """Test body format field values."""
        body = create_annotation_body(body_id=1, value="Test", format="text/html")
        
        annotation = Annotation(
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=None,
            creator_id=sample_user.id,
            owner_id=sample_user.id,
            type="Annotation",
            motivation="commenting",
            body=body,
            target=[],
            status="active",
            created=datetime.now(),
            modified=datetime.now(),
            generated=datetime.now(),
        )
        db_session.add(annotation)
        db_session.commit()
        db_session.refresh(annotation)
        
        assert annotation.body["format"] == "text/html"


class TestTargetStructure:
    """Tests for annotation target structure validation."""

    def test_target_has_required_fields(
        self, db_session: Session, sample_user: User, sample_document: Document
    ):
        """Test that target contains all required fields."""
        annotation = create_full_annotation(
            db_session=db_session,
            creator_id=sample_user.id,
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=None,
            motivation="commenting",
            body_value="Test comment",
            target_element_ids=[1],  # Explicitly create at least one target
        )
        
        # Verify target structure
        assert len(annotation.target) > 0
        target = annotation.target[0]
        assert "id" in target
        assert "type" in target
        assert "source" in target
        assert "selector" in target
        
    def test_target_id_is_integer(
        self, db_session: Session, sample_user: User, sample_document: Document
    ):
        """Test that target id is an integer."""
        target = create_annotation_target(target_id=456, element_id=1)
        
        annotation = Annotation(
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=None,
            creator_id=sample_user.id,
            owner_id=sample_user.id,
            type="Annotation",
            motivation="commenting",
            body=create_annotation_body(body_id=1, value="Test"),
            target=[target],
            status="active",
            created=datetime.now(),
            modified=datetime.now(),
            generated=datetime.now(),
        )
        db_session.add(annotation)
        db_session.commit()
        db_session.refresh(annotation)
        
        assert isinstance(annotation.target[0]["id"], int)
        assert annotation.target[0]["id"] == 456
        
    def test_target_source_format(
        self, db_session: Session, sample_user: User, sample_document: Document
    ):
        """Test target source field format (URI pattern)."""
        annotation = create_full_annotation(
            db_session=db_session,
            creator_id=sample_user.id,
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=None,
            motivation="commenting",
            body_value="Test comment",
            target_element_ids=[123],
        )
        
        target = annotation.target[0]
        assert "source" in target
        # Source should be in format "DocumentElements/{id}"
        assert target["source"].startswith("DocumentElements/")
        
    def test_target_selector_structure(
        self, db_session: Session, sample_user: User, sample_document: Document
    ):
        """Test target selector has TextQuoteSelector with refined_by."""
        target = create_annotation_target(
            target_id=1,
            element_id=1,
            start=10,
            end=20,
            text="selected text"
        )
        
        annotation = Annotation(
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=None,
            creator_id=sample_user.id,
            owner_id=sample_user.id,
            type="Annotation",
            motivation="commenting",
            body=create_annotation_body(body_id=1, value="Test"),
            target=[target],
            status="active",
            created=datetime.now(),
            modified=datetime.now(),
            generated=datetime.now(),
        )
        db_session.add(annotation)
        db_session.commit()
        db_session.refresh(annotation)
        
        selector = annotation.target[0]["selector"]
        assert selector["type"] == "TextQuoteSelector"
        assert "value" in selector
        assert "refined_by" in selector
        
        refined_by = selector["refined_by"]
        assert refined_by["type"] == "TextPositionSelector"
        assert "start" in refined_by
        assert "end" in refined_by
        assert refined_by["start"] == 10
        assert refined_by["end"] == 20


class TestMultipleTargets:
    """Tests for annotations with multiple targets."""

    def test_multiple_targets_array(
        self, db_session: Session, sample_user: User, sample_document_with_elements
    ):
        """Test annotation can have multiple targets in array."""
        sample_document = sample_document_with_elements
        elements = sample_document.elements
        
        annotation = create_full_annotation(
            db_session=db_session,
            creator_id=sample_user.id,
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=elements[0].id,
            motivation="linking",
            body_value="Links multiple elements",
            target_element_ids=[elements[0].id, elements[1].id, elements[2].id],
        )
        
        assert len(annotation.target) == 3
        # Verify each target has proper structure
        for target in annotation.target:
            assert "id" in target
            assert "type" in target
            assert "source" in target
            assert "selector" in target
            
    def test_targets_have_unique_ids(
        self, db_session: Session, sample_user: User, sample_document_with_elements
    ):
        """Test that each target in array has a unique id."""
        sample_document = sample_document_with_elements
        elements = sample_document.elements
        
        annotation = create_full_annotation(
            db_session=db_session,
            creator_id=sample_user.id,
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=elements[0].id,
            motivation="linking",
            body_value="Multiple targets",
            target_element_ids=[elements[0].id, elements[1].id],
        )
        
        target_ids = [target["id"] for target in annotation.target]
        # Check all IDs are unique
        assert len(target_ids) == len(set(target_ids))
        
    def test_empty_target_array(
        self, db_session: Session, sample_user: User, sample_document: Document
    ):
        """Test annotation with empty target array."""
        annotation = Annotation(
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=None,
            creator_id=sample_user.id,
            owner_id=sample_user.id,
            type="Annotation",
            motivation="commenting",
            body=create_annotation_body(body_id=1, value="Test"),
            target=[],
            status="active",
            created=datetime.now(),
            modified=datetime.now(),
            generated=datetime.now(),
        )
        db_session.add(annotation)
        db_session.commit()
        db_session.refresh(annotation)
        
        assert isinstance(annotation.target, list)
        assert len(annotation.target) == 0


class TestSelectorValidation:
    """Tests for TextQuoteSelector and TextPositionSelector validation."""

    def test_text_position_selector_fields(
        self, db_session: Session, sample_user: User, sample_document: Document
    ):
        """Test TextPositionSelector has start and end fields."""
        target = create_annotation_target(
            target_id=1,
            element_id=1,
            start=0,
            end=50,
            text="Selected text content"
        )
        
        annotation = Annotation(
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=None,
            creator_id=sample_user.id,
            owner_id=sample_user.id,
            type="Annotation",
            motivation="commenting",
            body=create_annotation_body(body_id=1, value="Test"),
            target=[target],
            status="active",
            created=datetime.now(),
            modified=datetime.now(),
            generated=datetime.now(),
        )
        db_session.add(annotation)
        db_session.commit()
        db_session.refresh(annotation)
        
        refined_by = annotation.target[0]["selector"]["refined_by"]
        assert refined_by["start"] == 0
        assert refined_by["end"] == 50
        assert isinstance(refined_by["start"], int)
        assert isinstance(refined_by["end"], int)
        
    def test_text_quote_selector_value(
        self, db_session: Session, sample_user: User, sample_document: Document
    ):
        """Test TextQuoteSelector value field contains selected text."""
        selected_text = "This is the selected text"
        target = create_annotation_target(
            target_id=1,
            element_id=1,
            start=10,
            end=35,
            text=selected_text
        )
        
        annotation = Annotation(
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=None,
            creator_id=sample_user.id,
            owner_id=sample_user.id,
            type="Annotation",
            motivation="commenting",
            body=create_annotation_body(body_id=1, value="Test"),
            target=[target],
            status="active",
            created=datetime.now(),
            modified=datetime.now(),
            generated=datetime.now(),
        )
        db_session.add(annotation)
        db_session.commit()
        db_session.refresh(annotation)
        
        selector = annotation.target[0]["selector"]
        assert selector["value"] == selected_text
        
    def test_selector_position_range_valid(
        self, db_session: Session, sample_user: User, sample_document: Document
    ):
        """Test that start position is less than end position."""
        target = create_annotation_target(
            target_id=1,
            element_id=1,
            start=100,
            end=200,
            text="Text"
        )
        
        annotation = Annotation(
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=None,
            creator_id=sample_user.id,
            owner_id=sample_user.id,
            type="Annotation",
            motivation="commenting",
            body=create_annotation_body(body_id=1, value="Test"),
            target=[target],
            status="active",
            created=datetime.now(),
            modified=datetime.now(),
            generated=datetime.now(),
        )
        db_session.add(annotation)
        db_session.commit()
        db_session.refresh(annotation)
        
        refined_by = annotation.target[0]["selector"]["refined_by"]
        assert refined_by["start"] < refined_by["end"]


class TestJSONStructureIntegrity:
    """Tests for overall JSON structure integrity of body and target."""

    def test_body_is_dict_not_string(
        self, db_session: Session, sample_user: User, sample_document: Document
    ):
        """Test that body is stored as dict, not stringified JSON."""
        annotation = create_full_annotation(
            db_session=db_session,
            creator_id=sample_user.id,
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=None,
            motivation="commenting",
            body_value="Test",
        )
        
        assert isinstance(annotation.body, dict)
        assert not isinstance(annotation.body, str)
        
    def test_target_is_list_not_string(
        self, db_session: Session, sample_user: User, sample_document: Document
    ):
        """Test that target is stored as list, not stringified JSON."""
        annotation = create_full_annotation(
            db_session=db_session,
            creator_id=sample_user.id,
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=None,
            motivation="commenting",
            body_value="Test",
        )
        
        assert isinstance(annotation.target, list)
        assert not isinstance(annotation.target, str)
        
    def test_nested_selector_structure(
        self, db_session: Session, sample_user: User, sample_document: Document
    ):
        """Test that nested selector structures are preserved."""
        target = create_annotation_target(
            target_id=1,
            element_id=1,
            start=5,
            end=15,
            text="nested test"
        )
        
        annotation = Annotation(
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=None,
            creator_id=sample_user.id,
            owner_id=sample_user.id,
            type="Annotation",
            motivation="commenting",
            body=create_annotation_body(body_id=1, value="Test"),
            target=[target],
            status="active",
            created=datetime.now(),
            modified=datetime.now(),
            generated=datetime.now(),
        )
        db_session.add(annotation)
        db_session.commit()
        db_session.refresh(annotation)
        
        # Navigate nested structure
        assert isinstance(annotation.target[0], dict)
        assert isinstance(annotation.target[0]["selector"], dict)
        assert isinstance(annotation.target[0]["selector"]["refined_by"], dict)
        
    def test_json_roundtrip_preserves_structure(
        self, db_session: Session, sample_user: User, sample_document: Document
    ):
        """Test that JSON structures survive database roundtrip unchanged."""
        original_body = create_annotation_body(body_id=99, value="Original text")
        original_target = create_annotation_target(
            target_id=88,
            element_id=77,
            start=10,
            end=20,
            text="original"
        )
        
        annotation = Annotation(
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=None,
            creator_id=sample_user.id,
            owner_id=sample_user.id,
            type="Annotation",
            motivation="commenting",
            body=original_body,
            target=[original_target],
            status="active",
            created=datetime.now(),
            modified=datetime.now(),
            generated=datetime.now(),
        )
        db_session.add(annotation)
        db_session.commit()
        annotation_id = annotation.id
        
        # Clear session and re-query
        db_session.expunge_all()
        retrieved = db_session.query(Annotation).filter(Annotation.id == annotation_id).first()
        
        # Verify structure matches original
        assert retrieved.body == original_body
        assert retrieved.target[0] == original_target


# =============================================================================
# Test Classes - Layer 3: Complex Queries and Target Matching
# =============================================================================

class TestTargetMatching:
    """Tests for finding annotations by target source (simulates JSONB path queries)."""

    def test_find_annotations_by_target_element_id(
        self, db_session: Session, sample_user: User, sample_document_with_elements
    ):
        """Test finding annotations that target a specific element."""
        sample_document = sample_document_with_elements
        elements = sample_document.elements
        target_element_id = elements[0].id
        
        # Create annotations targeting different elements
        annotation1 = create_full_annotation(
            db_session=db_session,
            creator_id=sample_user.id,
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=target_element_id,
            motivation="commenting",
            body_value="Comment on element 0",
            target_element_ids=[target_element_id],
        )
        
        annotation2 = create_full_annotation(
            db_session=db_session,
            creator_id=sample_user.id,
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=elements[1].id,
            motivation="commenting",
            body_value="Comment on element 1",
            target_element_ids=[elements[1].id],
        )
        
        # Query annotations - simulate JSONB path logic in Python
        target_uri = f"DocumentElements/{target_element_id}"
        matching_annotations = []
        
        for annotation in db_session.query(Annotation).all():
            for target in annotation.target:
                if target.get("source") == target_uri:
                    matching_annotations.append(annotation)
                    break
        
        # Should find only annotation1
        assert len(matching_annotations) == 1
        assert matching_annotations[0].id == annotation1.id


class TestByMotivationEndpoint:
    """Tests for grouping annotations by motivation."""

    def test_group_by_motivation_single_motivation(
        self, db_session: Session, sample_user: User, sample_document_with_elements
    ):
        """Test grouping when all annotations have same motivation."""
        sample_document = sample_document_with_elements
        elements = sample_document.elements
        
        # Create 3 commenting annotations
        for i in range(3):
            create_full_annotation(
                db_session=db_session,
                creator_id=sample_user.id,
                document_collection_id=sample_document.document_collection_id,
                document_id=sample_document.id,
                document_element_id=elements[0].id,
                motivation="commenting",
                body_value=f"Comment {i}",
                target_element_ids=[elements[0].id],
            )
        
        # Query and group by motivation
        from collections import defaultdict
        annotations = db_session.query(Annotation).all()
        grouped = defaultdict(list)
        for annotation in annotations:
            grouped[annotation.motivation].append(annotation)
        
        assert "commenting" in grouped
        assert len(grouped["commenting"]) == 3
        assert len(grouped) == 1
        
    def test_group_by_motivation_multiple_motivations(
        self, db_session: Session, sample_user: User, sample_document_with_elements
    ):
        """Test grouping annotations with different motivations."""
        sample_document = sample_document_with_elements
        elements = sample_document.elements
        
        # Create annotations with different motivations
        create_full_annotation(
            db_session=db_session,
            creator_id=sample_user.id,
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=elements[0].id,
            motivation="commenting",
            body_value="Comment",
            target_element_ids=[elements[0].id],
        )
        
        create_full_annotation(
            db_session=db_session,
            creator_id=sample_user.id,
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=elements[0].id,
            motivation="linking",
            body_value="Link",
            target_element_ids=[elements[0].id, elements[1].id],
        )
        
        create_full_annotation(
            db_session=db_session,
            creator_id=sample_user.id,
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=elements[0].id,
            motivation="tagging",
            body_value="Tag",
            target_element_ids=[elements[0].id],
        )
        
        # Query and group by motivation
        from collections import defaultdict
        annotations = db_session.query(Annotation).all()
        grouped = defaultdict(list)
        for annotation in annotations:
            grouped[annotation.motivation].append(annotation)
        
        assert len(grouped) == 3
        assert "commenting" in grouped
        assert "linking" in grouped
        assert "tagging" in grouped
        assert len(grouped["commenting"]) == 1
        assert len(grouped["linking"]) == 1
        assert len(grouped["tagging"]) == 1
        
    def test_group_by_motivation_with_classroom_filter(
        self, db_session: Session, sample_user: User, sample_document_with_elements, sample_group: Group
    ):
        """Test grouping with classroom context filtering."""
        sample_document = sample_document_with_elements
        elements = sample_document.elements
        
        # Create annotation in classroom
        classroom_annotation = create_full_annotation(
            db_session=db_session,
            creator_id=sample_user.id,
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=elements[0].id,
            motivation="commenting",
            body_value="Classroom comment",
            target_element_ids=[elements[0].id],
            classroom_id=sample_group.id,
        )
        
        # Create annotation outside classroom
        global_annotation = create_full_annotation(
            db_session=db_session,
            creator_id=sample_user.id,
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=elements[0].id,
            motivation="linking",
            body_value="Global link",
            target_element_ids=[elements[0].id],
            classroom_id=None,
        )
        
        # Query with classroom filter (commenting only from classroom)
        from collections import defaultdict
        from sqlalchemy import or_, and_
        
        query = db_session.query(Annotation).filter(
            or_(
                and_(Annotation.motivation == "commenting", Annotation.classroom_id == sample_group.id),
                Annotation.motivation != "commenting"
            )
        )
        
        annotations = query.all()
        grouped = defaultdict(list)
        for annotation in annotations:
            grouped[annotation.motivation].append(annotation)
        
        # Should have classroom commenting and global linking
        assert "commenting" in grouped
        assert "linking" in grouped
        assert grouped["commenting"][0].classroom_id == sample_group.id
        assert grouped["linking"][0].classroom_id is None


class TestLinksEndpoint:
    """Tests for finding linking annotations."""

    def test_find_linking_annotations_by_target(
        self, db_session: Session, sample_user: User, sample_document_with_elements
    ):
        """Test finding linking annotations that reference a specific element."""
        sample_document = sample_document_with_elements
        elements = sample_document.elements
        target_element_id = elements[0].id
        
        # Create linking annotation that includes target element
        linking_annotation = create_full_annotation(
            db_session=db_session,
            creator_id=sample_user.id,
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=elements[1].id,
            motivation="linking",
            body_value="Links element 0 to element 1",
            target_element_ids=[target_element_id, elements[1].id],
        )
        
        # Create commenting annotation (should not match)
        commenting_annotation = create_full_annotation(
            db_session=db_session,
            creator_id=sample_user.id,
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=target_element_id,
            motivation="commenting",
            body_value="Just a comment",
            target_element_ids=[target_element_id],
        )
        
        # Query for linking annotations targeting our element
        target_uri = f"DocumentElements/{target_element_id}"
        matching_annotations = []
        
        query = db_session.query(Annotation).filter(Annotation.motivation == "linking")
        for annotation in query.all():
            for target in annotation.target:
                if target.get("source") == target_uri:
                    matching_annotations.append(annotation)
                    break
        
        assert len(matching_annotations) == 1
        assert matching_annotations[0].id == linking_annotation.id
        assert matching_annotations[0].motivation == "linking"
        
    def test_links_with_classroom_context(
        self, db_session: Session, sample_user: User, sample_document_with_elements, sample_group: Group
    ):
        """Test finding links with classroom context filtering."""
        sample_document = sample_document_with_elements
        elements = sample_document.elements
        
        # Create linking annotation in classroom
        classroom_link = create_full_annotation(
            db_session=db_session,
            creator_id=sample_user.id,
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=elements[0].id,
            motivation="linking",
            body_value="Classroom link",
            target_element_ids=[elements[0].id, elements[1].id],
            classroom_id=sample_group.id,
        )
        
        # Create linking annotation outside classroom
        global_link = create_full_annotation(
            db_session=db_session,
            creator_id=sample_user.id,
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=elements[0].id,
            motivation="linking",
            body_value="Global link",
            target_element_ids=[elements[0].id, elements[1].id],
            classroom_id=None,
        )
        
        # Query with classroom filter
        classroom_links = db_session.query(Annotation).filter(
            Annotation.motivation == "linking",
            Annotation.classroom_id == sample_group.id
        ).all()
        
        assert len(classroom_links) == 1
        assert classroom_links[0].id == classroom_link.id
        
    def test_links_no_matches(
        self, db_session: Session, sample_user: User, sample_document_with_elements
    ):
        """Test finding links when no annotations reference the element."""
        sample_document = sample_document_with_elements
        elements = sample_document.elements
        
        # Create linking annotation that doesn't target element 2
        create_full_annotation(
            db_session=db_session,
            creator_id=sample_user.id,
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=elements[0].id,
            motivation="linking",
            body_value="Link between 0 and 1",
            target_element_ids=[elements[0].id, elements[1].id],
        )
        
        # Query for links to element 2 (should be empty)
        target_uri = f"DocumentElements/{elements[2].id}"
        matching_annotations = []
        
        query = db_session.query(Annotation).filter(Annotation.motivation == "linking")
        for annotation in query.all():
            for target in annotation.target:
                if target.get("source") == target_uri:
                    matching_annotations.append(annotation)
                    break
        
        assert len(matching_annotations) == 0


class TestNestedTargets:
    """Tests for handling nested target structures."""

    def test_nested_target_array_structure(
        self, db_session: Session, sample_user: User, sample_document: Document
    ):
        """Test annotation with nested target arrays (cross-element selections)."""
        # Create annotation with nested targets
        nested_target = [
            create_annotation_target(target_id=1, element_id=1),
            create_annotation_target(target_id=2, element_id=2),
        ]
        
        annotation = Annotation(
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=None,
            creator_id=sample_user.id,
            owner_id=sample_user.id,
            type="Annotation",
            motivation="linking",
            body=create_annotation_body(body_id=1, value="Cross-element link"),
            target=[nested_target],  # Nested array
            status="active",
            created=datetime.now(),
            modified=datetime.now(),
            generated=datetime.now(),
        )
        db_session.add(annotation)
        db_session.commit()
        db_session.refresh(annotation)
        
        # Verify nested structure
        assert len(annotation.target) == 1
        assert isinstance(annotation.target[0], list)
        assert len(annotation.target[0]) == 2
        
    def test_find_annotations_with_nested_targets(
        self, db_session: Session, sample_user: User, sample_document: Document
    ):
        """Test finding annotations when target is nested."""
        target_element_id = 123
        
        # Create annotation with nested targets
        nested_target = [
            create_annotation_target(target_id=1, element_id=target_element_id),
            create_annotation_target(target_id=2, element_id=456),
        ]
        
        annotation = Annotation(
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=None,
            creator_id=sample_user.id,
            owner_id=sample_user.id,
            type="Annotation",
            motivation="linking",
            body=create_annotation_body(body_id=1, value="Nested link"),
            target=[nested_target],
            status="active",
            created=datetime.now(),
            modified=datetime.now(),
            generated=datetime.now(),
        )
        db_session.add(annotation)
        db_session.commit()
        
        # Query for annotations targeting element (handles nested)
        target_uri = f"DocumentElements/{target_element_id}"
        matching_annotations = []
        
        for annotation in db_session.query(Annotation).all():
            for target in annotation.target:
                # Handle nested lists
                if isinstance(target, list):
                    for sub_target in target:
                        if sub_target.get("source") == target_uri:
                            matching_annotations.append(annotation)
                            break
                else:
                    if target.get("source") == target_uri:
                        matching_annotations.append(annotation)
                        break
        
        assert len(matching_annotations) == 1
        assert matching_annotations[0].motivation == "linking"


class TestElementIdExtraction:
    """Tests for extracting element IDs from target sources."""

    def test_extract_element_id_from_source_uri(self):
        """Test extracting element ID from DocumentElements URI."""
        source_uri = "DocumentElements/123"
        
        # Simple extraction logic
        if source_uri.startswith("DocumentElements/"):
            element_id = int(source_uri.split("/")[-1])
            assert element_id == 123
            
    def test_extract_multiple_element_ids(
        self, db_session: Session, sample_user: User, sample_document_with_elements
    ):
        """Test extracting all unique element IDs from annotation targets."""
        sample_document = sample_document_with_elements
        elements = sample_document.elements
        
        # Create annotation with multiple targets
        annotation = create_full_annotation(
            db_session=db_session,
            creator_id=sample_user.id,
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=elements[0].id,
            motivation="linking",
            body_value="Multi-element link",
            target_element_ids=[elements[0].id, elements[1].id, elements[2].id],
        )
        
        # Extract element IDs from targets
        element_ids = set()
        for target in annotation.target:
            if isinstance(target, list):
                for sub_target in target:
                    source = sub_target.get("source", "")
                    if source.startswith("DocumentElements/"):
                        element_id = int(source.split("/")[-1])
                        element_ids.add(element_id)
            else:
                source = target.get("source", "")
                if source.startswith("DocumentElements/"):
                    element_id = int(source.split("/")[-1])
                    element_ids.add(element_id)
        
        assert len(element_ids) == 3
        assert elements[0].id in element_ids
        assert elements[1].id in element_ids
        assert elements[2].id in element_ids
        
    def test_filter_out_source_element_id(
        self, db_session: Session, sample_user: User, sample_document_with_elements
    ):
        """Test extracting element IDs but excluding the source element."""
        sample_document = sample_document_with_elements
        elements = sample_document.elements
        source_element_id = elements[0].id
        
        # Create annotation
        annotation = create_full_annotation(
            db_session=db_session,
            creator_id=sample_user.id,
            document_collection_id=sample_document.document_collection_id,
            document_id=sample_document.id,
            document_element_id=source_element_id,
            motivation="linking",
            body_value="Self-referencing link",
            target_element_ids=[source_element_id, elements[1].id, elements[2].id],
        )
        
        # Extract element IDs excluding source
        element_ids = set()
        for target in annotation.target:
            source = target.get("source", "")
            if source.startswith("DocumentElements/"):
                element_id = int(source.split("/")[-1])
                if element_id != source_element_id:
                    element_ids.add(element_id)
        
        # Should have 2 elements (excluding source)
        assert len(element_ids) == 2
        assert source_element_id not in element_ids
        assert elements[1].id in element_ids
        assert elements[2].id in element_ids
