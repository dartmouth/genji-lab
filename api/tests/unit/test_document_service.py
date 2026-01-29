# tests/unit/test_document_service.py
import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime
from fastapi import HTTPException
from io import BytesIO

from services.document_service import DocumentService
from schemas.documents import DocumentCreate, DocumentUpdate, DocumentPartialUpdate
import sys
import os

# Add tests directory to path to import conftest
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# ==================== Word Document Processing Utilities Tests ====================


class TestExtractLinks:
    """Test _extract_links utility."""

    def test_extract_link_with_section_paragraph(self):
        """Should extract link with section and paragraph numbers."""
        service = DocumentService()
        text = "This is a paragraph [link to original paragraph 1.2]"
        
        clean_text, links = service._extract_links(text)
        
        assert clean_text == "This is a paragraph"
        assert len(links) == 1
        assert links[0]["textCollectionId"] == "original"
        assert links[0]["hierarchy"]["section"] == 1
        assert links[0]["hierarchy"]["chapter"] == 1
        assert links[0]["hierarchy"]["paragraph"] == 2

    def test_extract_link_different_numbers(self):
        """Should extract link with different section/paragraph numbers."""
        service = DocumentService()
        text = "Some text here [link to original paragraph 5.10]"
        
        clean_text, links = service._extract_links(text)
        
        assert clean_text == "Some text here"
        assert len(links) == 1
        assert links[0]["hierarchy"]["section"] == 5
        assert links[0]["hierarchy"]["paragraph"] == 10

    def test_extract_links_no_link(self):
        """Should return original text when no link present."""
        service = DocumentService()
        text = "This paragraph has no link"
        
        clean_text, links = service._extract_links(text)
        
        assert clean_text == "This paragraph has no link"
        assert links == []

    def test_extract_links_invalid_format(self):
        """Should handle invalid link format gracefully."""
        service = DocumentService()
        text = "Text [link to original paragraph invalid]"
        
        clean_text, links = service._extract_links(text)
        
        # Should clean text but not add malformed link
        assert "[link to original paragraph invalid]" not in clean_text or links == []


class TestGetTextFormat:
    """Test _get_text_format utility."""

    def test_get_text_format_all_bold(self):
        """Should detect when all runs are bold."""
        service = DocumentService()
        
        mock_paragraph = Mock()
        mock_run1 = Mock(bold=True, italic=False, underline=False, text="Bold text")
        mock_run2 = Mock(bold=True, italic=False, underline=False, text=" more bold")
        mock_paragraph.runs = [mock_run1, mock_run2]
        mock_paragraph.text = "Bold text more bold"
        
        result = service._get_text_format(mock_paragraph)
        
        assert result["is_bold"] is True
        assert result["is_italic"] is False
        assert result["is_underlined"] is False

    def test_get_text_format_mixed_formatting(self):
        """Should detect mixed formatting in runs."""
        service = DocumentService()
        
        mock_paragraph = Mock()
        mock_run1 = Mock(bold=True, italic=False, underline=False, text="Bold ")
        mock_run2 = Mock(bold=False, italic=True, underline=False, text="italic")
        mock_paragraph.runs = [mock_run1, mock_run2]
        mock_paragraph.text = "Bold italic"
        
        result = service._get_text_format(mock_paragraph)
        
        assert result["is_bold"] is False  # Not ALL bold
        assert result["is_italic"] is False  # Not ALL italic
        assert len(result["formatting"]) == 1  # Only italic run gets formatting

    def test_get_text_format_no_runs(self):
        """Should handle paragraph with no runs."""
        service = DocumentService()
        
        mock_paragraph = Mock()
        mock_paragraph.runs = []
        
        result = service._get_text_format(mock_paragraph)
        
        assert result["is_bold"] is False
        assert result["is_italic"] is False
        assert result["is_underlined"] is False
        assert result["formatting"] == []

    def test_get_text_format_with_underline(self):
        """Should detect underlined text."""
        service = DocumentService()
        
        mock_paragraph = Mock()
        mock_run = Mock(bold=False, italic=False, underline=True, text="underlined")
        mock_paragraph.runs = [mock_run]
        mock_paragraph.text = "underlined"
        
        result = service._get_text_format(mock_paragraph)
        
        assert result["is_underlined"] is True
        assert len(result["formatting"]) == 1
        assert "underlined" in result["formatting"][0]["type"]


class TestProcessIndent:
    """Test _process_indent utility."""

    def test_process_indent_with_value(self):
        """Should normalize indent value."""
        service = DocumentService()
        
        result = service._process_indent(914400)
        
        assert result == 1.0

    def test_process_indent_with_none(self):
        """Should return 0 for None."""
        service = DocumentService()
        
        result = service._process_indent(None)
        
        assert result == 0

    def test_process_indent_different_values(self):
        """Should handle different indent values."""
        service = DocumentService()
        
        assert service._process_indent(457200) == 0.5
        assert service._process_indent(1828800) == 2.0


class TestGetParagraphFormat:
    """Test _get_paragraph_format utility."""

    @patch.object(DocumentService, '_get_text_format')
    @patch.object(DocumentService, '_process_indent')
    def test_get_paragraph_format_complete(self, mock_process_indent, mock_get_text_format):
        """Should extract complete paragraph formatting."""
        service = DocumentService()
        
        mock_process_indent.side_effect = lambda x: 1.0 if x else 0
        mock_get_text_format.return_value = {
            "is_bold": True,
            "is_italic": False,
            "is_underlined": False,
            "formatting": []
        }
        
        mock_paragraph = Mock()
        mock_paragraph.paragraph_format.left_indent = 914400
        mock_paragraph.paragraph_format.right_indent = None
        mock_paragraph.paragraph_format.first_line_indent = 914400
        mock_paragraph.paragraph_format.alignment = None
        
        result = service._get_paragraph_format(mock_paragraph)
        
        assert result["left_indent"] == 1.0
        assert result["right_indent"] == 0
        assert result["first_line_indent"] == 1.0
        assert result["alignment"] == "left"
        assert "text_styles" in result


class TestExtractParagraphs:
    """Test _extract_paragraphs utility."""

    @patch.object(DocumentService, '_extract_links')
    @patch.object(DocumentService, '_get_paragraph_format')
    def test_extract_paragraphs_success(self, mock_get_format, mock_extract_links):
        """Should extract paragraphs from document."""
        service = DocumentService()
        
        mock_extract_links.side_effect = [
            ("First paragraph", []),
            ("Second paragraph", [])
        ]
        mock_get_format.return_value = {
            "left_indent": 0,
            "right_indent": 0,
            "first_line_indent": 0,
            "alignment": "left",
            "text_styles": {}
        }
        
        mock_doc = Mock()
        mock_para1 = Mock(text="First paragraph")
        mock_para2 = Mock(text="Second paragraph")
        mock_doc.paragraphs = [mock_para1, mock_para2]
        
        result = service._extract_paragraphs(mock_doc, 1, 100)
        
        assert len(result) == 2
        assert result[0]["content"]["text"] == "First paragraph"
        assert result[1]["content"]["text"] == "Second paragraph"
        assert result[0]["hierarchy"]["document"] == 100
        assert result[0]["hierarchy"]["element_order"] == 1
        assert result[1]["hierarchy"]["element_order"] == 2

    @patch.object(DocumentService, '_extract_links')
    @patch.object(DocumentService, '_get_paragraph_format')
    def test_extract_paragraphs_skip_empty(self, mock_get_format, mock_extract_links):
        """Should skip empty paragraphs."""
        service = DocumentService()
        
        mock_extract_links.return_value = ("Text", [])
        mock_get_format.return_value = {"alignment": "left", "text_styles": {}}
        
        mock_doc = Mock()
        mock_para1 = Mock(text="Text")
        mock_para2 = Mock(text="   ")  # Empty/whitespace
        mock_para3 = Mock(text="More text")
        mock_doc.paragraphs = [mock_para1, mock_para2, mock_para3]
        
        result = service._extract_paragraphs(mock_doc, 1, 100)
        
        assert len(result) == 2
        assert result[0]["hierarchy"]["element_order"] == 1
        assert result[1]["hierarchy"]["element_order"] == 2


# ==================== Helper Methods Tests ====================


class TestVerifyCollectionExists:
    """Test _verify_collection_exists helper."""

    def test_verify_collection_exists_found(self, db_session, test_document_collection, monkeypatch):
        """Should return collection when found."""
        TestDocumentCollection = type(test_document_collection)
        
        import services.document_service as doc_service_module
        monkeypatch.setattr(doc_service_module, 'DocumentCollection', TestDocumentCollection)
        
        service = DocumentService()
        result = service._verify_collection_exists(db_session, test_document_collection.id)
        
        assert result is not None
        assert result.id == test_document_collection.id

    def test_verify_collection_exists_not_found(self, db_session, test_document_collection, monkeypatch):
        """Should raise 404 when collection not found."""
        TestDocumentCollection = type(test_document_collection)
        
        import services.document_service as doc_service_module
        monkeypatch.setattr(doc_service_module, 'DocumentCollection', TestDocumentCollection)
        
        service = DocumentService()
        
        with pytest.raises(HTTPException) as exc_info:
            service._verify_collection_exists(db_session, 9999)
        
        assert exc_info.value.status_code == 404
        assert "not found" in exc_info.value.detail.lower()


class TestGetDocumentById:
    """Test _get_document_by_id helper."""

    def test_get_document_by_id_found(self, db_session, test_document, monkeypatch):
        """Should return document when found."""
        TestDocument = type(test_document)
        
        import services.document_service as doc_service_module
        monkeypatch.setattr(doc_service_module, 'DocumentModel', TestDocument)
        
        service = DocumentService()
        result = service._get_document_by_id(db_session, test_document.id)
        
        assert result is not None
        assert result.id == test_document.id

    def test_get_document_by_id_not_found(self, db_session, test_document, monkeypatch):
        """Should raise 404 when document not found."""
        TestDocument = type(test_document)
        
        import services.document_service as doc_service_module
        monkeypatch.setattr(doc_service_module, 'DocumentModel', TestDocument)
        
        service = DocumentService()
        
        with pytest.raises(HTTPException) as exc_info:
            service._get_document_by_id(db_session, 9999)
        
        assert exc_info.value.status_code == 404


class TestCheckDuplicateTitle:
    """Test _check_duplicate_title helper."""

    def test_check_duplicate_title_case_insensitive(self, db_session, test_document, monkeypatch):
        """Should detect duplicate with different case."""
        TestDocument = type(test_document)
        
        import services.document_service as doc_service_module
        monkeypatch.setattr(doc_service_module, 'DocumentModel', TestDocument)
        
        service = DocumentService()
        
        with pytest.raises(HTTPException) as exc_info:
            service._check_duplicate_title(
                db_session, 
                test_document.title.upper(),
                test_document.document_collection_id
            )
        
        assert exc_info.value.status_code == 400
        assert "already exists" in exc_info.value.detail.lower()

    def test_check_duplicate_title_exclude_self(self, db_session, test_document, monkeypatch):
        """Should not flag duplicate when excluding document itself."""
        TestDocument = type(test_document)
        
        import services.document_service as doc_service_module
        monkeypatch.setattr(doc_service_module, 'DocumentModel', TestDocument)
        
        service = DocumentService()
        
        # Should not raise when excluding the document itself
        service._check_duplicate_title(
            db_session,
            test_document.title,
            test_document.document_collection_id,
            exclude_id=test_document.id
        )

    def test_check_duplicate_title_different_collection(self, db_session, test_document, monkeypatch):
        """Should allow same title in different collection."""
        TestDocument = type(test_document)
        
        import services.document_service as doc_service_module
        monkeypatch.setattr(doc_service_module, 'DocumentModel', TestDocument)
        
        service = DocumentService()
        
        # Should not raise for different collection
        service._check_duplicate_title(
            db_session,
            test_document.title,
            999  # Different collection
        )


class TestGetElementCount:
    """Test _get_element_count helper."""

    def test_get_element_count_with_elements(self, db_session, test_document_with_elements, monkeypatch):
        """Should return correct element count."""
        TestDocumentElement = type(test_document_with_elements["elements"][0])
        
        import services.document_service as doc_service_module
        monkeypatch.setattr(doc_service_module, 'DocumentElement', TestDocumentElement)
        
        service = DocumentService()
        count = service._get_element_count(db_session, test_document_with_elements["document"].id)
        
        assert count == len(test_document_with_elements["elements"])

    def test_get_element_count_no_elements(self, db_session, test_document, monkeypatch):
        """Should return 0 when no elements."""
        from conftest import TestDocumentElement
        
        import services.document_service as doc_service_module
        monkeypatch.setattr(doc_service_module, 'DocumentElement', TestDocumentElement)
        
        service = DocumentService()
        count = service._get_element_count(db_session, test_document.id)
        
        assert count == 0


class TestCascadeDeleteDocumentContent:
    """Test _cascade_delete_document_content helper."""

    def test_cascade_delete_removes_elements_and_annotations(
        self, db_session, test_document_with_elements, monkeypatch
    ):
        """Should delete all elements and annotations for document."""
        TestDocumentElement = type(test_document_with_elements["elements"][0])
        from conftest import TestAnnotation
        
        import services.document_service as doc_service_module
        monkeypatch.setattr(doc_service_module, 'DocumentElement', TestDocumentElement)
        monkeypatch.setattr(doc_service_module, 'AnnotationModel', TestAnnotation)
        
        document_id = test_document_with_elements["document"].id
        element_ids = [e.id for e in test_document_with_elements["elements"]]
        
        # Create annotations for elements
        for element_id in element_ids:
            annotation = TestAnnotation(
                document_collection_id=1,
                document_id=document_id,
                document_element_id=element_id,
                creator_id=1,
                type="Annotation",
                motivation="commenting",
                body={"type": "TextualBody", "value": "Test"},
                target=[{"source": "test"}]
            )
            db_session.add(annotation)
        db_session.commit()
        
        service = DocumentService()
        service._cascade_delete_document_content(db_session, document_id)
        db_session.commit()
        
        # Verify elements deleted
        remaining_elements = db_session.query(TestDocumentElement).filter(
            TestDocumentElement.document_id == document_id
        ).count()
        assert remaining_elements == 0
        
        # Verify annotations deleted
        remaining_annotations = db_session.query(TestAnnotation).filter(
            TestAnnotation.document_element_id.in_(element_ids)
        ).count()
        assert remaining_annotations == 0


# ==================== CRUD Operations Tests ====================


class TestCreate:
    """Test create method."""

    def test_create_document_success(self, db_session, test_document_collection, monkeypatch):
        """Should create document successfully."""
        TestDocumentCollection = type(test_document_collection)
        from conftest import TestDocument
        
        import services.document_service as doc_service_module
        monkeypatch.setattr(doc_service_module, 'DocumentCollection', TestDocumentCollection)
        monkeypatch.setattr(doc_service_module, 'DocumentModel', TestDocument)
        
        service = DocumentService()
        
        document_data = DocumentCreate(
            title="New Document",
            description="Test Description",
            document_collection_id=test_document_collection.id
        )
        
        result = service.create(db_session, document_data)
        
        assert result.title == "New Document"
        assert result.description == "Test Description"
        assert result.document_collection_id == test_document_collection.id

    def test_create_document_collection_not_found(self, db_session, monkeypatch):
        """Should raise 404 when collection doesn't exist."""
        from conftest import TestDocumentCollection, TestDocument
        
        import services.document_service as doc_service_module
        monkeypatch.setattr(doc_service_module, 'DocumentCollection', TestDocumentCollection)
        monkeypatch.setattr(doc_service_module, 'DocumentModel', TestDocument)
        
        service = DocumentService()
        
        document_data = DocumentCreate(
            title="New Document",
            description="Test Description",
            document_collection_id=9999
        )
        
        with pytest.raises(HTTPException) as exc_info:
            service.create(db_session, document_data)
        
        assert exc_info.value.status_code == 404

    def test_create_document_duplicate_title(self, db_session, test_document, test_document_collection, monkeypatch):
        """Should raise 400 when title already exists."""
        TestDocumentCollection = type(test_document_collection)
        TestDocument = type(test_document)
        
        import services.document_service as doc_service_module
        monkeypatch.setattr(doc_service_module, 'DocumentCollection', TestDocumentCollection)
        monkeypatch.setattr(doc_service_module, 'DocumentModel', TestDocument)
        
        service = DocumentService()
        
        document_data = DocumentCreate(
            title=test_document.title,
            description="Different Description",
            document_collection_id=test_document.document_collection_id
        )
        
        with pytest.raises(HTTPException) as exc_info:
            service.create(db_session, document_data)
        
        assert exc_info.value.status_code == 400
        assert "already exists" in exc_info.value.detail.lower()


class TestGetById:
    """Test get_by_id method."""

    def test_get_by_id_success(self, db_session, test_document, monkeypatch):
        """Should return document with element count."""
        TestDocument = type(test_document)
        from conftest import TestDocumentElement
        
        import services.document_service as doc_service_module
        monkeypatch.setattr(doc_service_module, 'DocumentModel', TestDocument)
        monkeypatch.setattr(doc_service_module, 'DocumentElement', TestDocumentElement)
        
        service = DocumentService()
        result = service.get_by_id(db_session, test_document.id)
        
        assert result.id == test_document.id
        assert hasattr(result, "elements_count")
        assert result.elements_count == 0

    def test_get_by_id_not_found(self, db_session, monkeypatch):
        """Should raise 404 when document not found."""
        from conftest import TestDocument
        
        import services.document_service as doc_service_module
        monkeypatch.setattr(doc_service_module, 'DocumentModel', TestDocument)
        
        service = DocumentService()
        
        with pytest.raises(HTTPException) as exc_info:
            service.get_by_id(db_session, 9999)
        
        assert exc_info.value.status_code == 404


class TestList:
    """Test list method."""

    def test_list_documents_pagination(self, db_session, test_document, monkeypatch):
        """Should return paginated documents."""
        TestDocument = type(test_document)
        
        import services.document_service as doc_service_module
        monkeypatch.setattr(doc_service_module, 'DocumentModel', TestDocument)
        
        service = DocumentService()
        result = service.list(db_session, skip=0, limit=10)
        
        assert len(result) >= 1
        assert result[0].id == test_document.id

    def test_list_documents_filter_by_title(self, db_session, test_document, monkeypatch):
        """Should filter documents by title."""
        TestDocument = type(test_document)
        
        import services.document_service as doc_service_module
        monkeypatch.setattr(doc_service_module, 'DocumentModel', TestDocument)
        
        service = DocumentService()
        result = service.list(db_session, title=test_document.title[:5])
        
        assert len(result) >= 1
        assert test_document.title[:5].lower() in result[0].title.lower()

    def test_list_documents_filter_by_collection(self, db_session, test_document, monkeypatch):
        """Should filter documents by collection_id."""
        TestDocument = type(test_document)
        
        import services.document_service as doc_service_module
        monkeypatch.setattr(doc_service_module, 'DocumentModel', TestDocument)
        
        service = DocumentService()
        result = service.list(db_session, collection_id=test_document.document_collection_id)
        
        assert len(result) >= 1
        assert all(doc.document_collection_id == test_document.document_collection_id for doc in result)


class TestUpdate:
    """Test update method."""

    def test_update_document_success(self, db_session, test_document, test_document_collection, monkeypatch):
        """Should update document successfully."""
        TestDocument = type(test_document)
        TestDocumentCollection = type(test_document_collection)
        
        import services.document_service as doc_service_module
        monkeypatch.setattr(doc_service_module, 'DocumentModel', TestDocument)
        monkeypatch.setattr(doc_service_module, 'DocumentCollection', TestDocumentCollection)
        
        service = DocumentService()
        
        update_data = DocumentUpdate(
            title="Updated Title",
            description="Updated Description",
            document_collection_id=test_document_collection.id
        )
        
        result = service.update(db_session, test_document.id, update_data)
        
        assert result.title == "Updated Title"
        assert result.description == "Updated Description"


class TestPartialUpdate:
    """Test partial_update method."""

    def test_partial_update_only_title(self, db_session, test_document, monkeypatch):
        """Should update only title."""
        TestDocument = type(test_document)
        
        import services.document_service as doc_service_module
        monkeypatch.setattr(doc_service_module, 'DocumentModel', TestDocument)
        
        service = DocumentService()
        original_description = test_document.description
        
        update_data = DocumentPartialUpdate(title="Partially Updated")
        
        result = service.partial_update(db_session, test_document.id, update_data)
        
        assert result.title == "Partially Updated"
        assert result.description == original_description


class TestDelete:
    """Test delete method."""

    def test_delete_document_with_force(self, db_session, test_document_with_elements, monkeypatch):
        """Should delete document and cascade to elements."""
        TestDocument = type(test_document_with_elements["document"])
        TestDocumentElement = type(test_document_with_elements["elements"][0])
        from conftest import TestAnnotation
        
        import services.document_service as doc_service_module
        monkeypatch.setattr(doc_service_module, 'DocumentModel', TestDocument)
        monkeypatch.setattr(doc_service_module, 'DocumentElement', TestDocumentElement)
        monkeypatch.setattr(doc_service_module, 'AnnotationModel', TestAnnotation)
        
        service = DocumentService()
        document_id = test_document_with_elements["document"].id
        
        service.delete(db_session, document_id, force=True)
        
        # Verify document deleted
        doc = db_session.query(TestDocument).filter(TestDocument.id == document_id).first()
        assert doc is None


class TestBulkDelete:
    """Test bulk_delete method."""

    def test_bulk_delete_success(self, db_session, test_document, monkeypatch):
        """Should delete multiple documents."""
        TestDocument = type(test_document)
        from conftest import TestDocumentElement, TestAnnotation
        
        import services.document_service as doc_service_module
        monkeypatch.setattr(doc_service_module, 'DocumentModel', TestDocument)
        monkeypatch.setattr(doc_service_module, 'DocumentElement', TestDocumentElement)
        monkeypatch.setattr(doc_service_module, 'AnnotationModel', TestAnnotation)
        
        # Create second document
        doc2 = TestDocument(
            title="Document 2",
            description="Description 2",
            document_collection_id=test_document.document_collection_id
        )
        db_session.add(doc2)
        db_session.commit()
        
        service = DocumentService()
        service.bulk_delete(db_session, [test_document.id, doc2.id], force=True)
        
        # Verify both deleted
        remaining = db_session.query(TestDocument).filter(
            TestDocument.id.in_([test_document.id, doc2.id])
        ).count()
        assert remaining == 0

    def test_bulk_delete_empty_list(self, db_session, monkeypatch):
        """Should raise 400 for empty list."""
        from conftest import TestDocument
        
        import services.document_service as doc_service_module
        monkeypatch.setattr(doc_service_module, 'DocumentModel', TestDocument)
        
        service = DocumentService()
        
        with pytest.raises(HTTPException) as exc_info:
            service.bulk_delete(db_session, [], force=True)
        
        assert exc_info.value.status_code == 400

    def test_bulk_delete_missing_ids(self, db_session, test_document, monkeypatch):
        """Should raise 404 when some IDs not found."""
        TestDocument = type(test_document)
        
        import services.document_service as doc_service_module
        monkeypatch.setattr(doc_service_module, 'DocumentModel', TestDocument)
        
        service = DocumentService()
        
        with pytest.raises(HTTPException) as exc_info:
            service.bulk_delete(db_session, [test_document.id, 9999], force=True)
        
        assert exc_info.value.status_code == 404
        assert "9999" in exc_info.value.detail
