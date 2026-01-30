# tests/unit/test_document_element_schemas.py
import pytest
from pydantic import ValidationError
from schemas.document_elements import (
    DocumentElementCreate,
    DocumentElementUpdate,
    DocumentElementPartialUpdate,
    DocumentElement,
)


class TestDocumentElementCreate:
    """Test DocumentElementCreate schema."""
    
    def test_valid_create(self):
        """Should create valid element with all fields."""
        data = {
            "document_id": 1,
            "hierarchy": {"element_order": 1, "level": 0},
            "content": {"text": "Test content", "formatting": {}}
        }
        
        element = DocumentElementCreate(**data)
        
        assert element.document_id == 1
        assert element.hierarchy == {"element_order": 1, "level": 0}
        assert element.content == {"text": "Test content", "formatting": {}}
    
    def test_create_with_minimal_fields(self):
        """Should create with only required document_id."""
        element = DocumentElementCreate(document_id=1)
        
        assert element.document_id == 1
        assert element.hierarchy is None
        assert element.content is None
    
    def test_create_missing_document_id(self):
        """Should reject creation without document_id."""
        with pytest.raises(ValidationError) as exc_info:
            DocumentElementCreate()
        
        errors = exc_info.value.errors()
        assert any(e["loc"] == ("document_id",) for e in errors)


class TestDocumentElementUpdate:
    """Test DocumentElementUpdate schema."""
    
    def test_valid_update_all_fields(self):
        """Should update all fields."""
        data = {
            "document_id": 2,
            "hierarchy": {"element_order": 2},
            "content": {"text": "Updated content"}
        }
        
        element = DocumentElementUpdate(**data)
        
        assert element.document_id == 2
        assert element.hierarchy == {"element_order": 2}
        assert element.content == {"text": "Updated content"}
    
    def test_update_all_fields_optional(self):
        """Should allow empty update."""
        element = DocumentElementUpdate()
        
        assert element.document_id is None
        assert element.hierarchy is None
        assert element.content is None


class TestDocumentElementPartialUpdate:
    """Test DocumentElementPartialUpdate schema."""
    
    def test_partial_update_content_only(self):
        """Should update only content field."""
        element = DocumentElementPartialUpdate(
            content={"text": "New content"}
        )
        
        assert element.content == {"text": "New content"}
        assert element.document_id is None
        assert element.hierarchy is None
    
    def test_partial_update_hierarchy_only(self):
        """Should update only hierarchy field."""
        element = DocumentElementPartialUpdate(
            hierarchy={"element_order": 5}
        )
        
        assert element.hierarchy == {"element_order": 5}
        assert element.content is None
    
    def test_partial_update_all_fields_optional(self):
        """Should allow empty partial update."""
        element = DocumentElementPartialUpdate()
        
        assert element.document_id is None
        assert element.hierarchy is None
        assert element.content is None


class TestDocumentElement:
    """Test DocumentElement response schema."""
    
    def test_valid_element(self):
        """Should create element with ID and timestamps."""
        from datetime import datetime
        
        data = {
            "id": 1,
            "document_id": 1,
            "hierarchy": {"element_order": 1},
            "content": {"text": "Content"},
            "created": datetime.now(),
            "modified": datetime.now()
        }
        
        element = DocumentElement(**data)
        
        assert element.id == 1
        assert element.document_id == 1
        assert isinstance(element.created, datetime)
        assert isinstance(element.modified, datetime)
    
    def test_element_config(self):
        """Should have from_attributes config."""
        assert DocumentElement.model_config.get("from_attributes") is True
