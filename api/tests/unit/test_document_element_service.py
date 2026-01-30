# tests/unit/test_document_element_service.py
import pytest
from unittest.mock import Mock, patch
from datetime import datetime
from fastapi import HTTPException
import sys
import os

from services.document_element_service import DocumentElementService
from schemas.document_elements import (
    DocumentElementCreate,
    DocumentElementUpdate,
    DocumentElementPartialUpdate
)

# Add tests directory to path to import conftest
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class TestVerifyDocumentExists:
    """Test _verify_document_exists helper method."""
    
    def test_document_exists(self, db_session, test_document, document_element_service):
        """Should return document when it exists."""
        result = document_element_service._verify_document_exists(db_session, test_document.id)
        
        assert result.id == test_document.id
        assert result.title == test_document.title
    
    def test_document_not_found(self, db_session, document_element_service):
        """Should raise 404 when document not found."""
        with pytest.raises(HTTPException) as exc_info:
            document_element_service._verify_document_exists(db_session, 9999)
        
        assert exc_info.value.status_code == 404


class TestGetElementById:
    """Test _get_element_by_id helper method."""
    
    def test_element_exists_with_document(self, db_session, test_document_with_elements, document_element_service):
        """Should return element with joined document data."""
        element_id = test_document_with_elements["elements"][0].id
        
        result = document_element_service._get_element_by_id(db_session, element_id)
        
        assert result.id == element_id
        assert result.document is not None
        assert result.document.id == test_document_with_elements["document"].id
    
    def test_element_not_found(self, db_session, document_element_service):
        """Should raise 404 when element not found."""
        with pytest.raises(HTTPException) as exc_info:
            document_element_service._get_element_by_id(db_session, 9999)
        
        assert exc_info.value.status_code == 404


class TestGetAnnotationCount:
    """Test _get_annotation_count helper method."""
    
    def test_with_annotations(self, db_session, test_document_with_elements, document_element_service):
        """Should return annotation count for element."""
        from conftest import TestAnnotation
        
        element = test_document_with_elements["elements"][0]
        
        # Create annotations
        for i in range(3):
            annotation = TestAnnotation(
                document_element_id=element.id,
                motivation="commenting",
                creator_id=1
            )
            db_session.add(annotation)
        db_session.commit()
        
        count = document_element_service._get_annotation_count(db_session, element.id)
        
        assert count == 3
    
    def test_zero_annotations(self, db_session, test_document_with_elements, document_element_service):
        """Should return 0 when no annotations."""
        element = test_document_with_elements["elements"][0]
        
        count = document_element_service._get_annotation_count(db_session, element.id)
        
        assert count == 0


class TestCreate:
    """Test create method."""
    
    def test_create_success(self, db_session, test_document, document_element_service):
        """Should create new element."""
        element_data = DocumentElementCreate(
            document_id=test_document.id,
            hierarchy={"element_order": 1},
            content={"text": "New element"}
        )
        
        result = document_element_service.create(db_session, element_data)
        
        assert result.id is not None
        assert result.document_id == test_document.id
        assert result.hierarchy == {"element_order": 1}
        assert result.content == {"text": "New element"}
        
        # Verify in database
        TestDocumentElement = type(result)
        db_element = db_session.query(TestDocumentElement).filter_by(id=result.id).first()
        assert db_element is not None
    
    def test_create_document_not_found(self, db_session, document_element_service):
        """Should raise 404 when document doesn't exist."""
        element_data = DocumentElementCreate(
            document_id=9999,
            content={"text": "Test"}
        )
        
        with pytest.raises(HTTPException) as exc_info:
            document_element_service.create(db_session, element_data)
        
        assert exc_info.value.status_code == 404
    
    def test_create_stores_json_fields(self, db_session, test_document, document_element_service):
        """Should properly store complex JSON in content and hierarchy."""
        complex_content = {
            "text": "Test",
            "formatting": {"bold": True, "styles": [{"type": "emphasis"}]}
        }
        complex_hierarchy = {
            "element_order": 1,
            "level": 2,
            "parent_id": None
        }
        
        element_data = DocumentElementCreate(
            document_id=test_document.id,
            hierarchy=complex_hierarchy,
            content=complex_content
        )
        
        result = document_element_service.create(db_session, element_data)
        
        assert result.content == complex_content
        assert result.hierarchy == complex_hierarchy


class TestGetById:
    """Test get_by_id method."""
    
    def test_get_by_id_success(self, db_session, test_document_with_elements, document_element_service):
        """Should return element with document info."""
        element = test_document_with_elements["elements"][0]
        
        result = document_element_service.get_by_id(db_session, element.id)
        
        assert result.id == element.id
        assert result.document is not None
    
    def test_get_by_id_not_found(self, db_session, document_element_service):
        """Should raise 404 when element not found."""
        with pytest.raises(HTTPException) as exc_info:
            document_element_service.get_by_id(db_session, 9999)
        
        assert exc_info.value.status_code == 404


class TestList:
    """Test list method."""
    
    def test_list_all_elements(self, db_session, test_document_with_elements, document_element_service):
        """Should return all elements."""
        result = document_element_service.list(db_session)
        
        assert len(result) == 3  # test_document_with_elements creates 3 elements
    
    def test_list_filter_by_document_id(self, db_session, test_document, test_document_with_elements, document_element_service):
        """Should filter elements by document ID."""
        from conftest import TestDocumentElement
        
        # Create element for test_document
        element = TestDocumentElement(
            document_id=test_document.id,
            content={"text": "Test"}
        )
        db_session.add(element)
        db_session.commit()
        
        result = document_element_service.list(db_session, document_id=test_document.id)
        
        assert len(result) == 1
        assert all(e.document_id == test_document.id for e in result)
    
    def test_list_pagination(self, db_session, test_document_with_elements, document_element_service):
        """Should respect pagination parameters."""
        result = document_element_service.list(db_session, skip=1, limit=1)
        
        assert len(result) == 1
    
    def test_list_with_content_query(self, db_session, test_document, document_element_service):
        """Should filter by content query."""
        from conftest import TestDocumentElement
        
        # Create elements with different content
        element1 = TestDocumentElement(
            document_id=test_document.id,
            content={"text": "Find this keyword"}
        )
        element2 = TestDocumentElement(
            document_id=test_document.id,
            content={"text": "Different text"}
        )
        db_session.add_all([element1, element2])
        db_session.commit()
        
        result = document_element_service.list(db_session, content_query="keyword")
        
        assert len(result) == 1
        assert result[0].content["text"] == "Find this keyword"


class TestUpdate:
    """Test update method."""
    
    def test_update_success(self, db_session, test_document_with_elements, document_element_service):
        """Should update element fields."""
        element = test_document_with_elements["elements"][0]
        
        update_data = DocumentElementUpdate(
            document_id=element.document_id,
            hierarchy={"element_order": 99},
            content={"text": "Updated"}
        )
        
        result = document_element_service.update(db_session, element.id, update_data)
        
        assert result.hierarchy == {"element_order": 99}
        assert result.content == {"text": "Updated"}
    
    def test_update_element_not_found(self, db_session, document_element_service):
        """Should raise 404 when element not found."""
        update_data = DocumentElementUpdate(document_id=1)
        
        with pytest.raises(HTTPException) as exc_info:
            document_element_service.update(db_session, 9999, update_data)
        
        assert exc_info.value.status_code == 404


class TestPartialUpdate:
    """Test partial_update method."""
    
    def test_partial_update_content_only(self, db_session, test_document_with_elements, document_element_service):
        """Should update only content field."""
        element = test_document_with_elements["elements"][0]
        original_hierarchy = element.hierarchy
        
        update_data = DocumentElementPartialUpdate(
            content={"text": "Partial update"}
        )
        
        result = document_element_service.partial_update(db_session, element.id, update_data)
        
        assert result.content == {"text": "Partial update"}
        assert result.hierarchy == original_hierarchy  # Unchanged
    
    def test_partial_update_hierarchy_only(self, db_session, test_document_with_elements, document_element_service):
        """Should update only hierarchy field."""
        element = test_document_with_elements["elements"][0]
        original_content = element.content
        
        update_data = DocumentElementPartialUpdate(
            hierarchy={"element_order": 10}
        )
        
        result = document_element_service.partial_update(db_session, element.id, update_data)
        
        assert result.hierarchy == {"element_order": 10}
        assert result.content == original_content  # Unchanged
    
    def test_partial_update_element_not_found(self, db_session, document_element_service):
        """Should raise 404 when element not found."""
        update_data = DocumentElementPartialUpdate(content={"text": "Test"})
        
        with pytest.raises(HTTPException) as exc_info:
            document_element_service.partial_update(db_session, 9999, update_data)
        
        assert exc_info.value.status_code == 404


class TestDelete:
    """Test delete method."""
    
    def test_delete_without_annotations(self, db_session, test_document_with_elements, document_element_service):
        """Should delete element when no annotations and force=False."""
        element = test_document_with_elements["elements"][0]
        element_id = element.id
        TestDocumentElement = type(element)
        
        document_element_service.delete(db_session, element_id, force=False)
        
        # Verify deleted
        deleted = db_session.query(TestDocumentElement).filter_by(id=element_id).first()
        assert deleted is None
    
    def test_delete_with_force_true(self, db_session, test_document_with_elements, document_element_service):
        """Should delete element and annotations when force=True."""
        from conftest import TestAnnotation
        
        element = test_document_with_elements["elements"][0]
        TestDocumentElement = type(element)
        
        # Create annotation
        annotation = TestAnnotation(
            document_element_id=element.id,
            motivation="commenting",
            creator_id=1
        )
        db_session.add(annotation)
        db_session.commit()
        annotation_id = annotation.id
        
        document_element_service.delete(db_session, element.id, force=True)
        
        # Verify element deleted
        deleted_element = db_session.query(TestDocumentElement).filter_by(id=element.id).first()
        assert deleted_element is None
        
        # Verify annotation deleted
        deleted_annotation = db_session.query(TestAnnotation).filter_by(id=annotation_id).first()
        assert deleted_annotation is None
    
    def test_delete_fails_with_annotations_when_force_false(self, db_session, test_document_with_elements, document_element_service):
        """Should raise 400 when has annotations and force=False."""
        from conftest import TestAnnotation
        
        element = test_document_with_elements["elements"][0]
        
        # Create annotation
        annotation = TestAnnotation(
            document_element_id=element.id,
            motivation="commenting",
            creator_id=1
        )
        db_session.add(annotation)
        db_session.commit()
        
        with pytest.raises(HTTPException) as exc_info:
            document_element_service.delete(db_session, element.id, force=False)
        
        assert exc_info.value.status_code == 400
        assert "annotation" in exc_info.value.detail.lower()


class TestUpdateContent:
    """Test update_content method."""
    
    def test_update_content_success(self, db_session, test_document_with_elements, document_element_service):
        """Should update only content field."""
        element = test_document_with_elements["elements"][0]
        new_content = {"text": "Content updated"}
        
        result = document_element_service.update_content(db_session, element.id, new_content)
        
        assert result.content == new_content
    
    def test_update_content_element_not_found(self, db_session, document_element_service):
        """Should raise 404 when element not found."""
        with pytest.raises(HTTPException) as exc_info:
            document_element_service.update_content(db_session, 9999, {"text": "Test"})
        
        assert exc_info.value.status_code == 404


class TestUpdateHierarchy:
    """Test update_hierarchy method."""
    
    def test_update_hierarchy_success(self, db_session, test_document_with_elements, document_element_service):
        """Should update only hierarchy field."""
        element = test_document_with_elements["elements"][0]
        new_hierarchy = {"element_order": 50, "level": 2}
        
        result = document_element_service.update_hierarchy(db_session, element.id, new_hierarchy)
        
        assert result.hierarchy == new_hierarchy
    
    def test_update_hierarchy_element_not_found(self, db_session, document_element_service):
        """Should raise 404 when element not found."""
        with pytest.raises(HTTPException) as exc_info:
            document_element_service.update_hierarchy(db_session, 9999, {"order": 1})
        
        assert exc_info.value.status_code == 404


class TestGetByDocument:
    """Test get_by_document method."""
    
    def test_get_by_document_success(self, db_session, test_document_with_elements, document_element_service):
        """Should return all elements for document."""
        document = test_document_with_elements["document"]
        
        result = document_element_service.get_by_document(db_session, document.id)
        
        assert len(result) == 3
        assert all(e.document_id == document.id for e in result)
    
    def test_get_by_document_empty_list(self, db_session, test_document, document_element_service):
        """Should return empty list for document with no elements."""
        result = document_element_service.get_by_document(db_session, test_document.id)
        
        assert result == []
    
    def test_get_by_document_pagination(self, db_session, test_document_with_elements, document_element_service):
        """Should respect pagination parameters."""
        document = test_document_with_elements["document"]
        
        result = document_element_service.get_by_document(db_session, document.id, skip=1, limit=1)
        
        assert len(result) == 1


class TestGetDocumentStats:
    """Test get_document_stats method."""
    
    def test_stats_with_elements(self, db_session, test_document_with_elements, document_element_service):
        """Should return element count for document."""
        document = test_document_with_elements["document"]
        
        result = document_element_service.get_document_stats(db_session, document.id)
        
        assert "element_count" in result
        assert result["element_count"] == 3
    
    def test_stats_empty_document(self, db_session, test_document, document_element_service):
        """Should return 0 for document with no elements."""
        result = document_element_service.get_document_stats(db_session, test_document.id)
        
        assert result["element_count"] == 0


class TestDeleteAllByDocument:
    """Test delete_all_by_document method."""
    
    def test_delete_all_success(self, db_session, test_document_with_elements, document_element_service):
        """Should delete all elements for document."""
        document = test_document_with_elements["document"]
        TestDocumentElement = type(test_document_with_elements["elements"][0])
        
        document_element_service.delete_all_by_document(db_session, document.id, force=True)
        
        # Verify all deleted
        remaining = db_session.query(TestDocumentElement).filter_by(document_id=document.id).all()
        assert len(remaining) == 0
    
    def test_delete_all_document_not_found(self, db_session, document_element_service):
        """Should raise 404 when document not found."""
        with pytest.raises(HTTPException) as exc_info:
            document_element_service.delete_all_by_document(db_session, 9999, force=True)
        
        assert exc_info.value.status_code == 404


class TestGetAnnotations:
    """Test get_annotations method."""
    
    def test_get_annotations_success(self, db_session, test_document_with_elements, document_element_service):
        """Should return annotations for element."""
        from conftest import TestAnnotation
        
        element = test_document_with_elements["elements"][0]
        
        # Create annotations
        for i in range(3):
            annotation = TestAnnotation(
                document_element_id=element.id,
                motivation="commenting",
                creator_id=1
            )
            db_session.add(annotation)
        db_session.commit()
        
        result = document_element_service.get_annotations(db_session, element.id)
        
        assert len(result) == 3
    
    def test_get_annotations_empty_list(self, db_session, test_document_with_elements, document_element_service):
        """Should return empty list when no annotations."""
        element = test_document_with_elements["elements"][0]
        
        result = document_element_service.get_annotations(db_session, element.id)
        
        assert result == []
    
    def test_get_annotations_pagination(self, db_session, test_document_with_elements, document_element_service):
        """Should respect pagination parameters."""
        from conftest import TestAnnotation
        
        element = test_document_with_elements["elements"][0]
        
        # Create 5 annotations
        for i in range(5):
            annotation = TestAnnotation(
                document_element_id=element.id,
                motivation="commenting",
                creator_id=1
            )
            db_session.add(annotation)
        db_session.commit()
        
        result = document_element_service.get_annotations(db_session, element.id, skip=2, limit=2)
        
        assert len(result) == 2
