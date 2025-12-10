"""
Tests for Document operations.

These are unit tests that test the document data operations directly,
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


class TestCreateDocument:
    """Tests for document creation logic."""
    
    def test_create_document_success(self, db_session, sample_collection):
        """Test creating a document with valid data."""
        document = Document(
            title="New Document",
            description="A new test document",
            document_collection_id=sample_collection.id,
            created=datetime.now(),
            modified=datetime.now(),
        )
        db_session.add(document)
        db_session.commit()
        db_session.refresh(document)
        
        assert document.id is not None
        assert document.title == "New Document"
        assert document.description == "A new test document"
        assert document.document_collection_id == sample_collection.id
    
    def test_create_document_requires_collection(self, db_session):
        """Test that documents require a valid collection."""
        # SQLite with foreign key constraints will reject invalid collection_id
        document = Document(
            title="New Document",
            description="Test",
            document_collection_id=99999,  # Non-existent
            created=datetime.now(),
            modified=datetime.now(),
        )
        db_session.add(document)
        
        with pytest.raises(Exception):  # IntegrityError
            db_session.commit()
    
    def test_duplicate_document_name_detection(
        self, db_session, sample_collection, sample_document
    ):
        """Test detecting duplicate document names in same collection."""
        # Check if a document with the same name exists (case-insensitive)
        existing = db_session.execute(
            select(Document).where(
                Document.document_collection_id == sample_collection.id,
                func.lower(Document.title) == sample_document.title.lower()
            )
        ).scalar_one_or_none()
        
        assert existing is not None
        assert existing.id == sample_document.id
    
    def test_duplicate_name_case_insensitive(
        self, db_session, sample_collection, sample_document
    ):
        """Test that duplicate detection is case-insensitive."""
        # Query with uppercase version of the title
        upper_title = sample_document.title.upper()
        
        existing = db_session.execute(
            select(Document).where(
                Document.document_collection_id == sample_collection.id,
                func.lower(Document.title) == upper_title.lower()
            )
        ).scalar_one_or_none()
        
        assert existing is not None
    
    def test_same_name_different_collection_allowed(
        self, db_session, sample_user, sample_document
    ):
        """Test that same document name is allowed in different collections."""
        # Create another collection
        other_collection = DocumentCollection(
            title="Other Collection",
            visibility="public",
            text_direction="ltr",
            owner_id=sample_user.id,
            language="en",
        )
        db_session.add(other_collection)
        db_session.commit()
        
        # Create document with same title in different collection
        new_doc = Document(
            title=sample_document.title,  # Same title
            description="Different collection",
            document_collection_id=other_collection.id,  # Different collection
            created=datetime.now(),
            modified=datetime.now(),
        )
        db_session.add(new_doc)
        db_session.commit()
        
        # Verify both exist
        docs = db_session.execute(
            select(Document).where(Document.title == sample_document.title)
        ).scalars().all()
        
        assert len(docs) == 2


class TestReadDocuments:
    """Tests for document retrieval operations."""
    
    def test_read_documents_empty(self, db_session, sample_collection):
        """Test reading documents when none exist in collection."""
        docs = db_session.execute(
            select(Document).where(
                Document.document_collection_id == sample_collection.id
            )
        ).scalars().all()
        
        assert docs == []
    
    def test_read_documents_list(self, db_session, multiple_documents):
        """Test reading a list of documents."""
        docs = db_session.execute(select(Document)).scalars().all()
        
        assert len(docs) == 5
    
    def test_read_documents_with_pagination(self, db_session, multiple_documents):
        """Test reading documents with offset and limit."""
        docs = db_session.execute(
            select(Document).offset(2).limit(2)
        ).scalars().all()
        
        assert len(docs) == 2
    
    def test_read_documents_filter_by_collection(
        self, db_session, sample_user, sample_collection, multiple_documents
    ):
        """Test filtering documents by collection ID."""
        # Create a document in a different collection
        other_collection = DocumentCollection(
            title="Other Collection",
            visibility="public",
            text_direction="ltr",
            owner_id=sample_user.id,
            language="en",
        )
        db_session.add(other_collection)
        db_session.commit()
        
        other_doc = Document(
            title="Document in Other Collection",
            description="Test",
            document_collection_id=other_collection.id,
            created=datetime.now(),
            modified=datetime.now(),
        )
        db_session.add(other_doc)
        db_session.commit()
        
        # Query only sample_collection
        docs = db_session.execute(
            select(Document).where(
                Document.document_collection_id == sample_collection.id
            )
        ).scalars().all()
        
        assert len(docs) == 5  # Only the 5 from multiple_documents
        for doc in docs:
            assert doc.document_collection_id == sample_collection.id
    
    def test_read_documents_filter_by_title(self, db_session, multiple_documents):
        """Test filtering documents by title (partial match)."""
        search_term = "Document 1"
        
        docs = db_session.execute(
            select(Document).where(Document.title.ilike(f"%{search_term}%"))
        ).scalars().all()
        
        assert len(docs) >= 1
        assert any(search_term in doc.title for doc in docs)
    
    def test_read_single_document(self, db_session, sample_document):
        """Test reading a single document by ID."""
        doc = db_session.execute(
            select(Document).where(Document.id == sample_document.id)
        ).scalar_one_or_none()
        
        assert doc is not None
        assert doc.id == sample_document.id
        assert doc.title == sample_document.title
    
    def test_read_document_not_found(self, db_session):
        """Test reading a non-existent document."""
        doc = db_session.execute(
            select(Document).where(Document.id == 99999)
        ).scalar_one_or_none()
        
        assert doc is None
    
    def test_read_document_element_count(self, db_session, sample_document_with_elements):
        """Test counting document elements."""
        element_count = db_session.execute(
            select(func.count()).select_from(DocumentElement).where(
                DocumentElement.document_id == sample_document_with_elements.id
            )
        ).scalar_one()
        
        assert element_count == 3


class TestUpdateDocument:
    """Tests for document update operations."""
    
    def test_update_document_full(self, db_session, sample_document):
        """Test full update of a document."""
        sample_document.title = "Updated Title"
        sample_document.description = "Updated description"
        db_session.commit()
        db_session.refresh(sample_document)
        
        assert sample_document.title == "Updated Title"
        assert sample_document.description == "Updated description"
    
    def test_update_document_duplicate_name_detection(
        self, db_session, sample_collection, sample_document
    ):
        """Test detecting duplicate when updating to existing name."""
        # Create another document
        other_doc = create_document(
            db_session, 
            sample_collection.id, 
            title="Other Document"
        )
        
        # Try to check if "Other Document" already exists before updating
        existing = db_session.execute(
            select(Document).where(
                Document.document_collection_id == sample_collection.id,
                func.lower(Document.title) == "other document",
                Document.id != sample_document.id  # Exclude current document
            )
        ).scalar_one_or_none()
        
        assert existing is not None  # "Other Document" exists
    
    def test_partial_update_document_title(self, db_session, sample_document):
        """Test partial update of only document title."""
        original_description = sample_document.description
        
        sample_document.title = "Partially Updated Title"
        db_session.commit()
        db_session.refresh(sample_document)
        
        assert sample_document.title == "Partially Updated Title"
        assert sample_document.description == original_description
    
    def test_partial_update_document_description(self, db_session, sample_document):
        """Test partial update of only document description."""
        original_title = sample_document.title
        
        sample_document.description = "New description only"
        db_session.commit()
        db_session.refresh(sample_document)
        
        assert sample_document.title == original_title
        assert sample_document.description == "New description only"

    def test_update_description_to_empty(self, db_session, sample_document):
        """Test updating description to empty string (should be allowed)."""
        sample_document.description = ""
        db_session.commit()
        db_session.refresh(sample_document)
        
        assert sample_document.description == ""

    def test_update_description_to_none(self, db_session, sample_document):
        """Test updating description to None/null (should be allowed)."""
        sample_document.description = None
        db_session.commit()
        db_session.refresh(sample_document)
        
        assert sample_document.description is None

    def test_rename_to_same_name(self, db_session, sample_document):
        """Test renaming document to its current name (should be allowed)."""
        original_title = sample_document.title
        
        sample_document.title = original_title  # Same name
        db_session.commit()
        db_session.refresh(sample_document)
        
        assert sample_document.title == original_title

    def test_rename_case_change_only(self, db_session, sample_document):
        """Test changing only the case of the title (should be allowed)."""
        sample_document.title = sample_document.title.upper()
        db_session.commit()
        db_session.refresh(sample_document)
        
        assert sample_document.title == "TEST DOCUMENT"

    def test_rename_duplicate_detection_case_insensitive(
        self, db_session, sample_collection, sample_document
    ):
        """Test that duplicate detection is case-insensitive when renaming."""
        # Create another document
        create_document(
            db_session,
            sample_collection.id,
            title="Existing Document"
        )
        
        # Check if a case-variant exists (simulating API validation)
        new_title = "EXISTING DOCUMENT"  # Same as "Existing Document" case-insensitive
        
        existing = db_session.execute(
            select(Document).where(
                Document.document_collection_id == sample_collection.id,
                func.lower(Document.title) == new_title.lower(),
                Document.id != sample_document.id
            )
        ).scalar_one_or_none()
        
        assert existing is not None  # Duplicate detected

    def test_update_modified_timestamp(self, db_session, sample_document):
        """Test that modified timestamp updates on change."""
        original_modified = sample_document.modified
        
        # Small delay to ensure timestamp difference
        import time
        time.sleep(0.01)
        
        sample_document.title = "Renamed Document"
        sample_document.modified = datetime.now()
        db_session.commit()
        db_session.refresh(sample_document)
        
        assert sample_document.modified > original_modified

    def test_update_preserves_created_timestamp(self, db_session, sample_document):
        """Test that created timestamp is not changed on update."""
        original_created = sample_document.created
        
        sample_document.title = "Renamed Document"
        sample_document.description = "New description"
        sample_document.modified = datetime.now()
        db_session.commit()
        db_session.refresh(sample_document)
        
        assert sample_document.created == original_created

    def test_update_preserves_collection_relationship(
        self, db_session, sample_collection, sample_document
    ):
        """Test that updating document doesn't change its collection."""
        original_collection_id = sample_document.document_collection_id
        
        sample_document.title = "Renamed Document"
        sample_document.description = "New description"
        db_session.commit()
        db_session.refresh(sample_document)
        
        assert sample_document.document_collection_id == original_collection_id
        assert sample_document.collection.id == sample_collection.id

    def test_move_document_to_different_collection(
        self, db_session, sample_user, sample_collection, sample_document
    ):
        """Test moving a document to a different collection."""
        # Create another collection
        other_collection = DocumentCollection(
            title="Other Collection",
            visibility="public",
            text_direction="ltr",
            owner_id=sample_user.id,
            language="en",
        )
        db_session.add(other_collection)
        db_session.commit()
        
        # Move document
        sample_document.document_collection_id = other_collection.id
        db_session.commit()
        db_session.refresh(sample_document)
        
        assert sample_document.document_collection_id == other_collection.id
        assert sample_document.collection.id == other_collection.id


class TestDeleteDocument:
    """Tests for document deletion operations."""
    
    def test_delete_document(self, db_session, sample_document):
        """Test deleting a document."""
        doc_id = sample_document.id
        
        db_session.delete(sample_document)
        db_session.commit()
        
        # Verify it's deleted
        deleted_doc = db_session.execute(
            select(Document).where(Document.id == doc_id)
        ).scalar_one_or_none()
        
        assert deleted_doc is None
    
    def test_delete_document_cascades_elements(
        self, db_session, sample_document_with_elements
    ):
        """Test that deleting a document also deletes its elements."""
        doc_id = sample_document_with_elements.id
        
        # Verify elements exist before delete
        elements_before = db_session.execute(
            select(func.count()).select_from(DocumentElement).where(
                DocumentElement.document_id == doc_id
            )
        ).scalar_one()
        assert elements_before == 3
        
        # Delete the document
        db_session.delete(sample_document_with_elements)
        db_session.commit()
        
        # Verify elements are deleted (cascade)
        elements_after = db_session.execute(
            select(func.count()).select_from(DocumentElement).where(
                DocumentElement.document_id == doc_id
            )
        ).scalar_one()
        assert elements_after == 0
    
    def test_bulk_delete_documents(self, db_session, multiple_documents):
        """Test bulk deletion of multiple documents."""
        doc_ids = [doc.id for doc in multiple_documents[:3]]
        
        db_session.execute(
            delete(Document).where(Document.id.in_(doc_ids))
        )
        db_session.commit()
        
        # Verify they're deleted
        remaining = db_session.execute(select(Document)).scalars().all()
        assert len(remaining) == 2


class TestDocumentElements:
    """Tests for document element operations."""
    
    def test_get_document_elements(self, db_session, sample_document_with_elements):
        """Test retrieving elements for a document."""
        elements = db_session.execute(
            select(DocumentElement).where(
                DocumentElement.document_id == sample_document_with_elements.id
            )
        ).scalars().all()
        
        assert len(elements) == 3
        
        for element in elements:
            assert element.document_id == sample_document_with_elements.id
            assert "content" in element.content or "text" in element.content
    
    def test_get_document_elements_empty(self, db_session, sample_document):
        """Test retrieving elements when document has none."""
        elements = db_session.execute(
            select(DocumentElement).where(
                DocumentElement.document_id == sample_document.id
            )
        ).scalars().all()
        
        assert elements == []
    
    def test_get_document_elements_with_pagination(
        self, db_session, sample_document_with_elements
    ):
        """Test retrieving elements with pagination."""
        elements = db_session.execute(
            select(DocumentElement)
            .where(DocumentElement.document_id == sample_document_with_elements.id)
            .offset(1)
            .limit(1)
        ).scalars().all()
        
        assert len(elements) == 1
    
    def test_create_document_element(self, db_session, sample_document):
        """Test creating a document element."""
        element = create_document_element(
            db_session,
            sample_document.id,
            content={"text": "New paragraph", "type": "paragraph"},
            hierarchy={"element_order": "0"}
        )
        
        assert element.id is not None
        assert element.document_id == sample_document.id
        assert element.content["text"] == "New paragraph"


class TestDocumentAnnotationStats:
    """Tests for document annotation statistics."""
    
    def test_get_document_stats(
        self, db_session, sample_document_with_elements
    ):
        """Test getting document statistics including annotation counts."""
        doc = sample_document_with_elements
        
        # Get element count
        element_count = db_session.execute(
            select(func.count()).select_from(DocumentElement).where(
                DocumentElement.document_id == doc.id
            )
        ).scalar_one()
        
        # Get annotation count (should be 0 for new document)
        annotation_count = db_session.execute(
            select(func.count()).select_from(Annotation).where(
                Annotation.document_id == doc.id
            )
        ).scalar_one()
        
        assert element_count == 3
        assert annotation_count == 0
    
    def test_get_documents_with_stats_for_collection(
        self, db_session, sample_collection, sample_document
    ):
        """Test getting all documents in collection with their stats."""
        docs = db_session.execute(
            select(Document).where(
                Document.document_collection_id == sample_collection.id
            )
        ).scalars().all()
        
        result = []
        for doc in docs:
            element_count = db_session.execute(
                select(func.count()).select_from(DocumentElement).where(
                    DocumentElement.document_id == doc.id
                )
            ).scalar_one()
            
            result.append({
                "id": doc.id,
                "title": doc.title,
                "element_count": element_count,
            })
        
        assert len(result) == 1
        assert result[0]["title"] == sample_document.title


class TestDocumentCollectionRelationship:
    """Tests for document-collection relationships."""
    
    def test_document_belongs_to_collection(self, db_session, sample_document):
        """Test that document correctly references its collection."""
        # Load document with collection relationship
        doc = db_session.execute(
            select(Document).where(Document.id == sample_document.id)
        ).scalar_one()
        
        assert doc.collection is not None
        assert doc.collection.title == "Test Collection"
    
    def test_collection_has_documents(self, db_session, sample_collection, sample_document):
        """Test that collection correctly lists its documents."""
        # Refresh to load relationship
        db_session.refresh(sample_collection)
        
        assert len(sample_collection.documents) == 1
        assert sample_collection.documents[0].id == sample_document.id
    
    def test_deleting_collection_cascades_to_documents(
        self, db_session, sample_collection, sample_document
    ):
        """Test that deleting collection also deletes its documents."""
        collection_id = sample_collection.id
        doc_id = sample_document.id
        
        db_session.delete(sample_collection)
        db_session.commit()
        
        # Verify document is also deleted
        deleted_doc = db_session.execute(
            select(Document).where(Document.id == doc_id)
        ).scalar_one_or_none()
        
        assert deleted_doc is None
