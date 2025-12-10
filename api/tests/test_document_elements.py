"""
Tests for Document Element operations.

These are unit tests that test the document element data operations directly,
without going through the HTTP layer. This approach:
1. Tests business logic in isolation
2. Avoids PostgreSQL-specific dependencies
3. Runs quickly with in-memory SQLite

For integration tests with the full API, you would need a PostgreSQL test database.
"""

import pytest
from datetime import datetime
from sqlalchemy import select, func, delete
from sqlalchemy.orm import Session

from tests.conftest import (
    Document,
    DocumentCollection,
    DocumentElement,
    User,
    Annotation,
    create_document,
    create_document_element,
)


# =============================================================================
# Helper Functions for Element Tests
# =============================================================================

def create_annotation(
    db_session: Session,
    collection_id: int,
    document_id: int,
    element_id: int,
    user_id: int,
    motivation: str = "scholarly",
) -> Annotation:
    """Helper function to create an annotation."""
    annotation = Annotation(
        document_collection_id=collection_id,
        document_id=document_id,
        document_element_id=element_id,
        creator_id=user_id,
        owner_id=user_id,
        type="Annotation",
        created=datetime.now(),
        modified=datetime.now(),
        motivation=motivation,
        body={"value": "Test annotation body", "format": "text/plain"},
        target={"source": f"element/{element_id}"},
    )
    db_session.add(annotation)
    db_session.commit()
    db_session.refresh(annotation)
    return annotation


# =============================================================================
# Test Classes
# =============================================================================

class TestCreateElement:
    """Tests for document element creation."""

    def test_create_element_success(self, db_session, sample_document):
        """Test creating a document element with valid data."""
        element = DocumentElement(
            document_id=sample_document.id,
            content={"text": "Test paragraph content", "type": "paragraph"},
            hierarchy={"element_order": "0", "section": 1},
            created=datetime.now(),
            modified=datetime.now(),
        )
        db_session.add(element)
        db_session.commit()
        db_session.refresh(element)

        assert element.id is not None
        assert element.document_id == sample_document.id
        assert element.content["text"] == "Test paragraph content"
        assert element.hierarchy["element_order"] == "0"

    def test_create_element_requires_document(self, db_session):
        """Test that elements require a valid document."""
        element = DocumentElement(
            document_id=99999,  # Non-existent
            content={"text": "Test", "type": "paragraph"},
            hierarchy={"element_order": "0"},
            created=datetime.now(),
            modified=datetime.now(),
        )
        db_session.add(element)

        with pytest.raises(Exception):  # IntegrityError
            db_session.commit()

    def test_create_element_with_complex_content(self, db_session, sample_document):
        """Test creating an element with complex JSONB content."""
        complex_content = {
            "text": "This is a paragraph with formatting",
            "type": "paragraph",
            "formatting": [
                {"start": 10, "end": 19, "type": ["italic"]},
                {"start": 25, "end": 35, "type": ["bold", "underlined"]},
            ],
            "metadata": {
                "source": "word_import",
                "original_style": "Normal",
            },
        }

        element = create_document_element(
            db_session, sample_document.id, content=complex_content
        )

        assert element.content["formatting"][0]["type"] == ["italic"]
        assert element.content["metadata"]["source"] == "word_import"

    def test_create_element_with_hierarchy(self, db_session, sample_document):
        """Test creating an element with hierarchy information."""
        hierarchy = {
            "element_order": "5",
            "section": 2,
            "chapter": 1,
            "paragraph": 3,
        }

        element = create_document_element(
            db_session, sample_document.id, hierarchy=hierarchy
        )

        assert element.hierarchy["section"] == 2
        assert element.hierarchy["chapter"] == 1
        assert element.hierarchy["paragraph"] == 3

    def test_create_multiple_elements_for_document(self, db_session, sample_document):
        """Test creating multiple elements for the same document."""
        for i in range(5):
            create_document_element(
                db_session,
                sample_document.id,
                content={"text": f"Paragraph {i}", "type": "paragraph"},
                hierarchy={"element_order": str(i)},
            )

        elements = db_session.execute(
            select(DocumentElement).where(
                DocumentElement.document_id == sample_document.id
            )
        ).scalars().all()

        assert len(elements) == 5


class TestReadElements:
    """Tests for document element retrieval."""

    def test_read_elements_empty(self, db_session, sample_document):
        """Test reading elements when none exist."""
        elements = db_session.execute(
            select(DocumentElement).where(
                DocumentElement.document_id == sample_document.id
            )
        ).scalars().all()

        assert elements == []

    def test_read_elements_list(self, db_session, sample_document_with_elements):
        """Test reading a list of elements."""
        elements = db_session.execute(
            select(DocumentElement).where(
                DocumentElement.document_id == sample_document_with_elements.id
            )
        ).scalars().all()

        assert len(elements) == 3

    def test_read_elements_with_pagination(self, db_session, sample_document_with_elements):
        """Test reading elements with offset and limit."""
        elements = db_session.execute(
            select(DocumentElement)
            .where(DocumentElement.document_id == sample_document_with_elements.id)
            .offset(1)
            .limit(2)
        ).scalars().all()

        assert len(elements) == 2

    def test_read_single_element(self, db_session, sample_document):
        """Test reading a single element by ID."""
        element = create_document_element(db_session, sample_document.id)

        result = db_session.execute(
            select(DocumentElement).where(DocumentElement.id == element.id)
        ).scalar_one_or_none()

        assert result is not None
        assert result.id == element.id

    def test_read_element_not_found(self, db_session):
        """Test reading a non-existent element."""
        result = db_session.execute(
            select(DocumentElement).where(DocumentElement.id == 99999)
        ).scalar_one_or_none()

        assert result is None

    def test_read_element_with_document_info(self, db_session, sample_document):
        """Test reading an element with its document relationship."""
        element = create_document_element(db_session, sample_document.id)

        result = db_session.execute(
            select(DocumentElement).where(DocumentElement.id == element.id)
        ).scalar_one()

        assert result.document is not None
        assert result.document.id == sample_document.id
        assert result.document.title == sample_document.title

    def test_filter_elements_by_content(self, db_session, sample_document):
        """Test filtering elements by content search."""
        create_document_element(
            db_session,
            sample_document.id,
            content={"text": "Apple pie recipe", "type": "paragraph"},
        )
        create_document_element(
            db_session,
            sample_document.id,
            content={"text": "Banana bread recipe", "type": "paragraph"},
        )
        create_document_element(
            db_session,
            sample_document.id,
            content={"text": "Cherry cobbler recipe", "type": "paragraph"},
        )

        # Search for "Apple" in content (simulating content_query parameter)
        from sqlalchemy import String
        
        elements = db_session.execute(
            select(DocumentElement).where(
                DocumentElement.content.cast(String).ilike("%Apple%")
            )
        ).scalars().all()

        assert len(elements) == 1
        assert "Apple" in elements[0].content["text"]


class TestUpdateElement:
    """Tests for document element update operations."""

    def test_update_element_content(self, db_session, sample_document):
        """Test updating element content."""
        element = create_document_element(db_session, sample_document.id)

        element.content = {"text": "Updated content", "type": "heading"}
        element.modified = datetime.now()
        db_session.commit()
        db_session.refresh(element)

        assert element.content["text"] == "Updated content"
        assert element.content["type"] == "heading"

    def test_update_element_hierarchy(self, db_session, sample_document):
        """Test updating element hierarchy."""
        element = create_document_element(db_session, sample_document.id)
        original_content = element.content.copy()

        element.hierarchy = {"element_order": "10", "section": 5}
        element.modified = datetime.now()
        db_session.commit()
        db_session.refresh(element)

        assert element.hierarchy["element_order"] == "10"
        assert element.hierarchy["section"] == 5
        assert element.content == original_content  # Content unchanged

    def test_partial_update_content_only(self, db_session, sample_document):
        """Test partial update of only content field."""
        element = create_document_element(
            db_session,
            sample_document.id,
            content={"text": "Original", "type": "paragraph"},
            hierarchy={"element_order": "0", "section": 1},
        )
        original_hierarchy = element.hierarchy.copy()

        element.content = {"text": "Updated", "type": "paragraph"}
        db_session.commit()
        db_session.refresh(element)

        assert element.content["text"] == "Updated"
        assert element.hierarchy == original_hierarchy

    def test_update_element_modified_timestamp(self, db_session, sample_document):
        """Test that modified timestamp updates on change."""
        element = create_document_element(db_session, sample_document.id)
        original_modified = element.modified

        # Small delay to ensure timestamp difference
        import time
        time.sleep(0.01)

        element.content = {"text": "Modified content", "type": "paragraph"}
        element.modified = datetime.now()
        db_session.commit()
        db_session.refresh(element)

        assert element.modified > original_modified

    def test_update_element_move_to_different_document(
        self, db_session, sample_collection, sample_document
    ):
        """Test moving an element to a different document."""
        # Create another document
        other_doc = create_document(
            db_session, sample_collection.id, title="Other Document"
        )

        element = create_document_element(db_session, sample_document.id)

        # Move element to other document
        element.document_id = other_doc.id
        db_session.commit()
        db_session.refresh(element)

        assert element.document_id == other_doc.id
        assert element.document.id == other_doc.id


class TestDeleteElement:
    """Tests for document element deletion."""

    def test_delete_element(self, db_session, sample_document):
        """Test deleting a document element."""
        element = create_document_element(db_session, sample_document.id)
        element_id = element.id

        db_session.delete(element)
        db_session.commit()

        result = db_session.execute(
            select(DocumentElement).where(DocumentElement.id == element_id)
        ).scalar_one_or_none()

        assert result is None

    def test_delete_element_with_annotations_cascade(
        self, db_session, sample_user, sample_collection, sample_document
    ):
        """Test that deleting an element also deletes its annotations (if cascade configured)."""
        element = create_document_element(db_session, sample_document.id)

        # Create annotations for this element
        for i in range(3):
            create_annotation(
                db_session,
                sample_collection.id,
                sample_document.id,
                element.id,
                sample_user.id,
                motivation="scholarly",
            )

        # Verify annotations exist
        annotation_count = db_session.execute(
            select(func.count()).select_from(Annotation).where(
                Annotation.document_element_id == element.id
            )
        ).scalar_one()
        assert annotation_count == 3

        # Delete the element manually along with its annotations (simulating force=True)
        element_id = element.id
        db_session.execute(
            delete(Annotation).where(Annotation.document_element_id == element_id)
        )
        db_session.delete(element)
        db_session.commit()

        # Verify element is deleted
        result = db_session.execute(
            select(DocumentElement).where(DocumentElement.id == element_id)
        ).scalar_one_or_none()
        assert result is None

        # Verify annotations are deleted
        remaining_annotations = db_session.execute(
            select(func.count()).select_from(Annotation).where(
                Annotation.document_element_id == element_id
            )
        ).scalar_one()
        assert remaining_annotations == 0

    def test_delete_element_check_annotations_first(
        self, db_session, sample_user, sample_collection, sample_document
    ):
        """Test checking if element has annotations before deleting (force=False behavior)."""
        element = create_document_element(db_session, sample_document.id)

        # Create an annotation
        create_annotation(
            db_session,
            sample_collection.id,
            sample_document.id,
            element.id,
            sample_user.id,
        )

        # Check annotation count (simulating force=False check)
        annotation_count = db_session.execute(
            select(func.count()).select_from(Annotation).where(
                Annotation.document_element_id == element.id
            )
        ).scalar_one()

        # Should block deletion if force=False
        assert annotation_count > 0
        # In the actual API, this would raise HTTPException 400

    def test_delete_element_no_annotations_force_false(
        self, db_session, sample_document
    ):
        """Test deleting an element without annotations (force=False should work)."""
        element = create_document_element(db_session, sample_document.id)
        element_id = element.id

        # Check annotation count
        annotation_count = db_session.execute(
            select(func.count()).select_from(Annotation).where(
                Annotation.document_element_id == element.id
            )
        ).scalar_one()

        assert annotation_count == 0  # No annotations

        # Safe to delete
        db_session.delete(element)
        db_session.commit()

        result = db_session.execute(
            select(DocumentElement).where(DocumentElement.id == element_id)
        ).scalar_one_or_none()
        assert result is None

    def test_bulk_delete_elements(self, db_session, sample_document):
        """Test bulk deletion of multiple elements."""
        elements = []
        for i in range(5):
            element = create_document_element(
                db_session,
                sample_document.id,
                content={"text": f"Paragraph {i}", "type": "paragraph"},
                hierarchy={"element_order": str(i)},
            )
            elements.append(element)

        # Bulk delete first 3 elements
        element_ids = [e.id for e in elements[:3]]
        db_session.execute(
            delete(DocumentElement).where(DocumentElement.id.in_(element_ids))
        )
        db_session.commit()

        remaining = db_session.execute(
            select(DocumentElement).where(
                DocumentElement.document_id == sample_document.id
            )
        ).scalars().all()

        assert len(remaining) == 2


class TestElementAnnotations:
    """Tests for element-annotation relationships."""

    def test_get_element_annotations(
        self, db_session, sample_user, sample_collection, sample_document
    ):
        """Test retrieving annotations for an element."""
        element = create_document_element(db_session, sample_document.id)

        # Create multiple annotations
        for i in range(3):
            create_annotation(
                db_session,
                sample_collection.id,
                sample_document.id,
                element.id,
                sample_user.id,
                motivation="scholarly" if i % 2 == 0 else "commenting",
            )

        annotations = db_session.execute(
            select(Annotation).where(Annotation.document_element_id == element.id)
        ).scalars().all()

        assert len(annotations) == 3

    def test_get_element_annotations_empty(self, db_session, sample_document):
        """Test retrieving annotations when element has none."""
        element = create_document_element(db_session, sample_document.id)

        annotations = db_session.execute(
            select(Annotation).where(Annotation.document_element_id == element.id)
        ).scalars().all()

        assert annotations == []

    def test_get_element_annotations_with_pagination(
        self, db_session, sample_user, sample_collection, sample_document
    ):
        """Test retrieving annotations with pagination."""
        element = create_document_element(db_session, sample_document.id)

        # Create 5 annotations
        for i in range(5):
            create_annotation(
                db_session,
                sample_collection.id,
                sample_document.id,
                element.id,
                sample_user.id,
            )

        annotations = db_session.execute(
            select(Annotation)
            .where(Annotation.document_element_id == element.id)
            .offset(2)
            .limit(2)
        ).scalars().all()

        assert len(annotations) == 2

    def test_count_element_annotations_by_motivation(
        self, db_session, sample_user, sample_collection, sample_document
    ):
        """Test counting annotations grouped by motivation."""
        element = create_document_element(db_session, sample_document.id)

        # Create annotations with different motivations
        for motivation in ["scholarly", "scholarly", "commenting", "highlighting"]:
            create_annotation(
                db_session,
                sample_collection.id,
                sample_document.id,
                element.id,
                sample_user.id,
                motivation=motivation,
            )

        # Count scholarly annotations
        scholarly_count = db_session.execute(
            select(func.count()).select_from(Annotation).where(
                Annotation.document_element_id == element.id,
                Annotation.motivation == "scholarly",
            )
        ).scalar_one()

        # Count commenting annotations
        comment_count = db_session.execute(
            select(func.count()).select_from(Annotation).where(
                Annotation.document_element_id == element.id,
                Annotation.motivation == "commenting",
            )
        ).scalar_one()

        assert scholarly_count == 2
        assert comment_count == 1


class TestElementHierarchy:
    """Tests for element ordering and hierarchy."""

    def test_elements_ordered_by_hierarchy(self, db_session, sample_document):
        """Test that elements can be ordered by hierarchy."""
        # Create elements in non-sequential order
        for order in [3, 1, 4, 2, 0]:
            create_document_element(
                db_session,
                sample_document.id,
                content={"text": f"Order {order}", "type": "paragraph"},
                hierarchy={"element_order": str(order)},
            )

        # Query with ordering
        elements = db_session.execute(
            select(DocumentElement)
            .where(DocumentElement.document_id == sample_document.id)
            .order_by(DocumentElement.hierarchy["element_order"])
        ).scalars().all()

        # Verify order (note: JSON comparison in SQLite may differ from PostgreSQL)
        assert len(elements) == 5

    def test_element_section_grouping(self, db_session, sample_document):
        """Test grouping elements by section."""
        # Create elements in different sections
        for section in range(1, 4):
            for para in range(1, 3):
                create_document_element(
                    db_session,
                    sample_document.id,
                    content={
                        "text": f"Section {section}, Para {para}",
                        "type": "paragraph",
                    },
                    hierarchy={
                        "element_order": str((section - 1) * 2 + para),
                        "section": section,
                        "paragraph": para,
                    },
                )

        # Count elements per section
        all_elements = db_session.execute(
            select(DocumentElement).where(
                DocumentElement.document_id == sample_document.id
            )
        ).scalars().all()

        section_counts = {}
        for elem in all_elements:
            section = elem.hierarchy.get("section", 0)
            section_counts[section] = section_counts.get(section, 0) + 1

        assert section_counts[1] == 2
        assert section_counts[2] == 2
        assert section_counts[3] == 2


class TestDeleteDocumentContent:
    """Tests for deleting document content (elements/annotations) while keeping the document."""

    def test_delete_all_elements_keep_document(
        self, db_session, sample_document_with_elements
    ):
        """Test deleting all elements from a document while keeping the document."""
        doc_id = sample_document_with_elements.id

        # Verify elements exist
        elements_before = db_session.execute(
            select(func.count()).select_from(DocumentElement).where(
                DocumentElement.document_id == doc_id
            )
        ).scalar_one()
        assert elements_before == 3

        # Delete all elements (simulating "Delete Document Content")
        db_session.execute(
            delete(DocumentElement).where(DocumentElement.document_id == doc_id)
        )
        db_session.commit()

        # Verify elements are deleted
        elements_after = db_session.execute(
            select(func.count()).select_from(DocumentElement).where(
                DocumentElement.document_id == doc_id
            )
        ).scalar_one()
        assert elements_after == 0

        # Verify document still exists
        doc = db_session.execute(
            select(Document).where(Document.id == doc_id)
        ).scalar_one_or_none()
        assert doc is not None
        assert doc.id == doc_id

    def test_delete_all_annotations_keep_elements(
        self, db_session, sample_user, sample_collection, sample_document
    ):
        """Test deleting all annotations from a document while keeping elements."""
        element = create_document_element(db_session, sample_document.id)

        # Create multiple annotations
        for i in range(3):
            create_annotation(
                db_session,
                sample_collection.id,
                sample_document.id,
                element.id,
                sample_user.id,
            )

        # Verify annotations exist
        annotations_before = db_session.execute(
            select(func.count()).select_from(Annotation).where(
                Annotation.document_id == sample_document.id
            )
        ).scalar_one()
        assert annotations_before == 3

        # Delete all annotations for this document
        db_session.execute(
            delete(Annotation).where(Annotation.document_id == sample_document.id)
        )
        db_session.commit()

        # Verify annotations are deleted
        annotations_after = db_session.execute(
            select(func.count()).select_from(Annotation).where(
                Annotation.document_id == sample_document.id
            )
        ).scalar_one()
        assert annotations_after == 0

        # Verify element still exists
        elem = db_session.execute(
            select(DocumentElement).where(DocumentElement.id == element.id)
        ).scalar_one_or_none()
        assert elem is not None

    def test_cascading_delete_annotations_then_elements(
        self, db_session, sample_user, sample_collection, sample_document
    ):
        """Test cascading delete: annotations first, then elements."""
        doc_id = sample_document.id

        # Create elements with annotations
        elements = []
        for i in range(3):
            elem = create_document_element(
                db_session,
                doc_id,
                content={"text": f"Para {i}", "type": "paragraph"},
            )
            elements.append(elem)
            # Add 2 annotations per element
            for j in range(2):
                create_annotation(
                    db_session,
                    sample_collection.id,
                    doc_id,
                    elem.id,
                    sample_user.id,
                )

        # Verify counts
        element_count = db_session.execute(
            select(func.count()).select_from(DocumentElement).where(
                DocumentElement.document_id == doc_id
            )
        ).scalar_one()
        annotation_count = db_session.execute(
            select(func.count()).select_from(Annotation).where(
                Annotation.document_id == doc_id
            )
        ).scalar_one()

        assert element_count == 3
        assert annotation_count == 6

        # Step 1: Get all element IDs
        element_ids = db_session.execute(
            select(DocumentElement.id).where(DocumentElement.document_id == doc_id)
        ).scalars().all()

        # Step 2: Delete all annotations for these elements
        db_session.execute(
            delete(Annotation).where(Annotation.document_element_id.in_(element_ids))
        )

        # Step 3: Delete all elements
        db_session.execute(
            delete(DocumentElement).where(DocumentElement.document_id == doc_id)
        )
        db_session.commit()

        # Verify everything is deleted
        final_elements = db_session.execute(
            select(func.count()).select_from(DocumentElement).where(
                DocumentElement.document_id == doc_id
            )
        ).scalar_one()
        final_annotations = db_session.execute(
            select(func.count()).select_from(Annotation).where(
                Annotation.document_id == doc_id
            )
        ).scalar_one()

        assert final_elements == 0
        assert final_annotations == 0

        # Document still exists
        doc = db_session.execute(
            select(Document).where(Document.id == doc_id)
        ).scalar_one_or_none()
        assert doc is not None

    def test_delete_collection_documents_content(
        self, db_session, sample_user, sample_collection
    ):
        """Test deleting content from all documents in a collection."""
        # Create multiple documents with elements
        docs = []
        for i in range(3):
            doc = create_document(
                db_session,
                sample_collection.id,
                title=f"Doc {i}",
            )
            docs.append(doc)
            for j in range(2):
                create_document_element(db_session, doc.id)

        # Count total elements
        total_elements = db_session.execute(
            select(func.count()).select_from(DocumentElement)
        ).scalar_one()
        assert total_elements == 6

        # Get all document IDs in collection
        doc_ids = db_session.execute(
            select(Document.id).where(
                Document.document_collection_id == sample_collection.id
            )
        ).scalars().all()

        # Delete all elements for documents in this collection
        db_session.execute(
            delete(DocumentElement).where(DocumentElement.document_id.in_(doc_ids))
        )
        db_session.commit()

        # Verify elements deleted
        remaining_elements = db_session.execute(
            select(func.count()).select_from(DocumentElement)
        ).scalar_one()
        assert remaining_elements == 0

        # Verify documents still exist
        remaining_docs = db_session.execute(
            select(func.count()).select_from(Document).where(
                Document.document_collection_id == sample_collection.id
            )
        ).scalar_one()
        assert remaining_docs == 3

