# tests/unit/test_document_schemas.py
import pytest
from datetime import datetime
from pydantic import ValidationError

from schemas.documents import (
    DocumentCreate,
    DocumentUpdate,
    DocumentPartialUpdate,
    Document,
    DocumentWithDetails
)
from routers.documents import BulkDeleteRequest


# ==================== DocumentCreate Tests ====================


class TestDocumentCreate:
    """Test DocumentCreate schema."""

    def test_valid_document_create(self):
        """Should create valid document with required fields."""
        data = {
            "title": "Test Document",
            "description": "Test Description",
            "document_collection_id": 1
        }
        
        doc = DocumentCreate(**data)
        
        assert doc.title == "Test Document"
        assert doc.description == "Test Description"
        assert doc.document_collection_id == 1

    def test_document_create_with_none_title(self):
        """Should allow None title."""
        data = {
            "title": None,
            "description": "Test Description",
            "document_collection_id": 1
        }
        
        doc = DocumentCreate(**data)
        
        assert doc.title is None
        assert doc.document_collection_id == 1

    def test_document_create_with_none_description(self):
        """Should allow None description."""
        data = {
            "title": "Test Document",
            "description": None,
            "document_collection_id": 1
        }
        
        doc = DocumentCreate(**data)
        
        assert doc.description is None
        assert doc.title == "Test Document"

    def test_document_create_requires_collection_id(self):
        """Should require document_collection_id."""
        data = {
            "title": "Test Document",
            "description": "Test Description"
        }
        
        with pytest.raises(ValidationError) as exc_info:
            DocumentCreate(**data)
        
        assert "document_collection_id" in str(exc_info.value)

    def test_document_create_empty_strings(self):
        """Should accept empty strings for title and description."""
        data = {
            "title": "",
            "description": "",
            "document_collection_id": 1
        }
        
        doc = DocumentCreate(**data)
        
        assert doc.title == ""
        assert doc.description == ""


# ==================== DocumentUpdate Tests ====================


class TestDocumentUpdate:
    """Test DocumentUpdate schema."""

    def test_valid_document_update_all_fields(self):
        """Should update with all fields provided."""
        data = {
            "title": "Updated Title",
            "description": "Updated Description",
            "document_collection_id": 2
        }
        
        doc = DocumentUpdate(**data)
        
        assert doc.title == "Updated Title"
        assert doc.description == "Updated Description"
        assert doc.document_collection_id == 2

    def test_document_update_optional_collection_id(self):
        """Should allow None for document_collection_id."""
        data = {
            "title": "Updated Title",
            "description": "Updated Description",
            "document_collection_id": None
        }
        
        doc = DocumentUpdate(**data)
        
        assert doc.title == "Updated Title"
        assert doc.document_collection_id is None

    def test_document_update_with_none_values(self):
        """Should allow None for all fields."""
        data = {
            "title": None,
            "description": None,
            "document_collection_id": None
        }
        
        doc = DocumentUpdate(**data)
        
        assert doc.title is None
        assert doc.description is None
        assert doc.document_collection_id is None


# ==================== DocumentPartialUpdate Tests ====================


class TestDocumentPartialUpdate:
    """Test DocumentPartialUpdate schema."""

    def test_partial_update_all_fields_optional(self):
        """Should allow creating with no fields."""
        doc = DocumentPartialUpdate()
        
        assert doc.title is None
        assert doc.description is None
        assert doc.document_collection_id is None

    def test_partial_update_only_title(self):
        """Should allow updating only title."""
        data = {"title": "New Title"}
        
        doc = DocumentPartialUpdate(**data)
        
        assert doc.title == "New Title"
        assert doc.description is None
        assert doc.document_collection_id is None

    def test_partial_update_only_description(self):
        """Should allow updating only description."""
        data = {"description": "New Description"}
        
        doc = DocumentPartialUpdate(**data)
        
        assert doc.description == "New Description"
        assert doc.title is None
        assert doc.document_collection_id is None

    def test_partial_update_only_collection_id(self):
        """Should allow updating only collection_id."""
        data = {"document_collection_id": 5}
        
        doc = DocumentPartialUpdate(**data)
        
        assert doc.document_collection_id == 5
        assert doc.title is None
        assert doc.description is None

    def test_partial_update_multiple_fields(self):
        """Should allow updating multiple fields."""
        data = {
            "title": "New Title",
            "document_collection_id": 3
        }
        
        doc = DocumentPartialUpdate(**data)
        
        assert doc.title == "New Title"
        assert doc.document_collection_id == 3
        assert doc.description is None


# ==================== Document Tests ====================


class TestDocument:
    """Test Document response schema."""

    def test_valid_document_response(self):
        """Should create valid document response with all fields."""
        data = {
            "id": 1,
            "title": "Test Document",
            "description": "Test Description",
            "document_collection_id": 1,
            "created": datetime(2026, 1, 29, 10, 0, 0),
            "modified": datetime(2026, 1, 29, 12, 0, 0)
        }
        
        doc = Document(**data)
        
        assert doc.id == 1
        assert doc.title == "Test Document"
        assert doc.description == "Test Description"
        assert doc.document_collection_id == 1
        assert isinstance(doc.created, datetime)
        assert isinstance(doc.modified, datetime)

    def test_document_requires_id(self):
        """Should require id field."""
        data = {
            "title": "Test Document",
            "description": "Test Description",
            "document_collection_id": 1,
            "created": datetime(2026, 1, 29, 10, 0, 0),
            "modified": datetime(2026, 1, 29, 12, 0, 0)
        }
        
        with pytest.raises(ValidationError) as exc_info:
            Document(**data)
        
        assert "id" in str(exc_info.value)

    def test_document_requires_timestamps(self):
        """Should require created and modified timestamps."""
        data = {
            "id": 1,
            "title": "Test Document",
            "description": "Test Description",
            "document_collection_id": 1
        }
        
        with pytest.raises(ValidationError) as exc_info:
            Document(**data)
        
        error_str = str(exc_info.value)
        assert "created" in error_str or "modified" in error_str

    def test_document_with_none_title_description(self):
        """Should allow None for title and description."""
        data = {
            "id": 1,
            "title": None,
            "description": None,
            "document_collection_id": 1,
            "created": datetime(2026, 1, 29, 10, 0, 0),
            "modified": datetime(2026, 1, 29, 12, 0, 0)
        }
        
        doc = Document(**data)
        
        assert doc.title is None
        assert doc.description is None


# ==================== DocumentWithDetails Tests ====================


class TestDocumentWithDetails:
    """Test DocumentWithDetails schema."""

    def test_document_with_details_full(self):
        """Should include collection and elements_count."""
        data = {
            "id": 1,
            "title": "Test Document",
            "description": "Test Description",
            "document_collection_id": 1,
            "created": datetime(2026, 1, 29, 10, 0, 0),
            "modified": datetime(2026, 1, 29, 12, 0, 0),
            "collection": {
                "id": 1,
                "title": "Test Collection",
                "visibility": "public",
                "text_direction": "ltr",
                "language": "en",
                "hierarchy": {},
                "collection_metadata": {},
                "created": datetime(2026, 1, 29, 10, 0, 0),
                "modified": datetime(2026, 1, 29, 12, 0, 0),
                "created_by_id": 1,
                "modified_by_id": None,
                "display_order": 0
            },
            "elements_count": 25
        }
        
        doc = DocumentWithDetails(**data)
        
        assert doc.id == 1
        assert doc.collection is not None
        assert doc.collection.id == 1
        assert doc.collection.title == "Test Collection"
        assert doc.elements_count == 25

    def test_document_with_details_none_collection(self):
        """Should allow None for collection."""
        data = {
            "id": 1,
            "title": "Test Document",
            "description": "Test Description",
            "document_collection_id": 1,
            "created": datetime(2026, 1, 29, 10, 0, 0),
            "modified": datetime(2026, 1, 29, 12, 0, 0),
            "collection": None,
            "elements_count": 0
        }
        
        doc = DocumentWithDetails(**data)
        
        assert doc.collection is None
        assert doc.elements_count == 0

    def test_document_with_details_default_elements_count(self):
        """Should default elements_count to 0."""
        data = {
            "id": 1,
            "title": "Test Document",
            "description": "Test Description",
            "document_collection_id": 1,
            "created": datetime(2026, 1, 29, 10, 0, 0),
            "modified": datetime(2026, 1, 29, 12, 0, 0)
        }
        
        doc = DocumentWithDetails(**data)
        
        assert doc.elements_count == 0

    def test_document_with_details_inherits_document_fields(self):
        """Should inherit all Document fields."""
        data = {
            "id": 1,
            "title": "Test Document",
            "description": "Test Description",
            "document_collection_id": 1,
            "created": datetime(2026, 1, 29, 10, 0, 0),
            "modified": datetime(2026, 1, 29, 12, 0, 0)
        }
        
        doc = DocumentWithDetails(**data)
        
        # Verify base Document fields
        assert doc.id == 1
        assert doc.title == "Test Document"
        assert doc.document_collection_id == 1
        assert isinstance(doc.created, datetime)
        assert isinstance(doc.modified, datetime)


# ==================== BulkDeleteRequest Tests ====================


class TestBulkDeleteRequest:
    """Test BulkDeleteRequest schema."""

    def test_valid_bulk_delete_request(self):
        """Should create valid bulk delete request."""
        data = {"document_ids": [1, 2, 3, 4, 5]}
        
        request = BulkDeleteRequest(**data)
        
        assert request.document_ids == [1, 2, 3, 4, 5]
        assert len(request.document_ids) == 5

    def test_bulk_delete_single_id(self):
        """Should allow single ID in list."""
        data = {"document_ids": [1]}
        
        request = BulkDeleteRequest(**data)
        
        assert request.document_ids == [1]

    def test_bulk_delete_empty_list(self):
        """Should allow empty list."""
        data = {"document_ids": []}
        
        request = BulkDeleteRequest(**data)
        
        assert request.document_ids == []

    def test_bulk_delete_requires_document_ids(self):
        """Should require document_ids field."""
        with pytest.raises(ValidationError) as exc_info:
            BulkDeleteRequest()
        
        assert "document_ids" in str(exc_info.value)

    def test_bulk_delete_duplicate_ids(self):
        """Should accept duplicate IDs."""
        data = {"document_ids": [1, 2, 1, 3, 2]}
        
        request = BulkDeleteRequest(**data)
        
        assert request.document_ids == [1, 2, 1, 3, 2]
