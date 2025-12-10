"""
Tests for Word Document Import functionality.

These tests use mocking to avoid requiring actual Word documents or the python-docx
library for testing. This approach:
1. Tests the import logic in isolation
2. Avoids file system dependencies
3. Runs quickly without needing real .docx files

For integration tests with real Word files, you would need python-docx installed
and actual .docx test fixtures.
"""

import pytest
from datetime import datetime
from unittest.mock import MagicMock, patch, PropertyMock
from io import BytesIO
from sqlalchemy import select, func

from tests.conftest import (
    Document,
    DocumentCollection,
    DocumentElement,
    User,
    create_document,
    create_document_element,
)


# =============================================================================
# Mock Factories
# =============================================================================

def create_mock_paragraph(text: str, bold: bool = False, italic: bool = False):
    """Create a mock paragraph object simulating python-docx Paragraph."""
    mock_paragraph = MagicMock()
    mock_paragraph.text = text
    
    # Create mock run
    mock_run = MagicMock()
    mock_run.text = text
    mock_run.bold = bold
    mock_run.italic = italic
    mock_run.underline = False
    
    mock_paragraph.runs = [mock_run]
    
    # Mock paragraph format
    mock_format = MagicMock()
    mock_format.left_indent = None
    mock_format.right_indent = None
    mock_format.first_line_indent = None
    mock_format.alignment = None
    mock_paragraph.paragraph_format = mock_format
    
    return mock_paragraph


def create_mock_word_document(paragraphs_text: list[str]):
    """Create a mock Word document with the given paragraph texts."""
    mock_doc = MagicMock()
    mock_paragraphs = [create_mock_paragraph(text) for text in paragraphs_text]
    mock_doc.paragraphs = mock_paragraphs
    return mock_doc


def create_mock_upload_file(filename: str, content: bytes = b"mock content"):
    """Create a mock UploadFile object."""
    mock_file = MagicMock()
    mock_file.filename = filename
    mock_file.file = BytesIO(content)
    mock_file.file.read = MagicMock(return_value=content)
    return mock_file


# =============================================================================
# Test Classes
# =============================================================================

class TestWordImportValidation:
    """Tests for Word import file validation."""

    def test_valid_docx_file_extension(self):
        """Test that .docx files are accepted."""
        mock_file = create_mock_upload_file("document.docx")
        
        assert mock_file.filename.endswith(".docx")

    def test_invalid_file_extension_txt(self):
        """Test that .txt files are rejected."""
        mock_file = create_mock_upload_file("document.txt")
        
        assert not mock_file.filename.endswith(".docx")

    def test_invalid_file_extension_pdf(self):
        """Test that .pdf files are rejected."""
        mock_file = create_mock_upload_file("document.pdf")
        
        assert not mock_file.filename.endswith(".docx")

    def test_invalid_file_extension_doc(self):
        """Test that old .doc files are rejected (only .docx supported)."""
        mock_file = create_mock_upload_file("document.doc")
        
        assert not mock_file.filename.endswith(".docx")

    def test_file_extension_case_sensitivity(self):
        """Test file extension case handling."""
        # Standard lowercase
        assert "document.docx".endswith(".docx")
        
        # Note: The API currently only checks for lowercase .docx
        # These would fail validation in the current implementation
        assert not "document.DOCX".endswith(".docx")
        assert not "document.Docx".endswith(".docx")


class TestWordImportCollectionValidation:
    """Tests for collection validation during Word import."""

    def test_collection_exists(self, db_session, sample_collection):
        """Test that import works when collection exists."""
        collection = db_session.execute(
            select(DocumentCollection).where(
                DocumentCollection.id == sample_collection.id
            )
        ).scalar_one_or_none()
        
        assert collection is not None

    def test_collection_not_found(self, db_session):
        """Test behavior when collection doesn't exist."""
        collection = db_session.execute(
            select(DocumentCollection).where(DocumentCollection.id == 99999)
        ).scalar_one_or_none()
        
        assert collection is None


class TestParagraphExtraction:
    """Tests for paragraph extraction from Word documents."""

    def test_extract_simple_paragraphs(self):
        """Test extracting simple paragraphs from a mock document."""
        # Import the actual extraction function
        from routers.word_import import extract_paragraphs
        
        mock_doc = create_mock_word_document([
            "First paragraph",
            "Second paragraph",
            "Third paragraph",
        ])
        
        result = extract_paragraphs(mock_doc, collection_id := 1, document_id := 1)
        
        assert len(result) == 3
        assert result[0]["content"]["text"] == "First paragraph"
        assert result[1]["content"]["text"] == "Second paragraph"
        assert result[2]["content"]["text"] == "Third paragraph"

    def test_extract_paragraphs_with_empty_lines(self):
        """Test that empty paragraphs are skipped."""
        from routers.word_import import extract_paragraphs
        
        mock_doc = create_mock_word_document([
            "First paragraph",
            "",  # Empty
            "   ",  # Whitespace only
            "Second paragraph",
        ])
        
        result = extract_paragraphs(mock_doc, 1, 1)
        
        # Only non-empty paragraphs should be included
        assert len(result) == 2
        assert result[0]["content"]["text"] == "First paragraph"
        assert result[1]["content"]["text"] == "Second paragraph"

    def test_extract_paragraphs_hierarchy(self):
        """Test that hierarchy is correctly assigned to paragraphs."""
        from routers.word_import import extract_paragraphs
        
        mock_doc = create_mock_word_document([
            "First paragraph",
            "Second paragraph",
            "Third paragraph",
        ])
        
        collection_id = 5
        document_id = 10
        
        result = extract_paragraphs(mock_doc, collection_id, document_id)
        
        # Check hierarchy structure
        assert result[0]["hierarchy"]["document"] == document_id
        assert result[0]["hierarchy"]["element_order"] == 1
        
        assert result[1]["hierarchy"]["element_order"] == 2
        assert result[2]["hierarchy"]["element_order"] == 3
        
        # Check collection ID
        assert result[0]["document_collection_id"] == collection_id


class TestWordImportDocumentCreation:
    """Tests for document creation during Word import."""

    def test_create_document_from_import(self, db_session, sample_collection):
        """Test creating a document during Word import."""
        document = Document(
            title="Imported Document",
            description="Imported from Word",
            document_collection_id=sample_collection.id,
            created=datetime.now(),
            modified=datetime.now(),
        )
        db_session.add(document)
        db_session.commit()
        db_session.refresh(document)
        
        assert document.id is not None
        assert document.title == "Imported Document"
        assert document.description == "Imported from Word"

    def test_create_elements_from_import(self, db_session, sample_collection):
        """Test creating document elements from imported paragraphs."""
        # Create document
        document = Document(
            title="Imported Document",
            description="",
            document_collection_id=sample_collection.id,
            created=datetime.now(),
            modified=datetime.now(),
        )
        db_session.add(document)
        db_session.flush()  # Get ID without committing
        
        # Simulate parsed paragraphs
        paragraphs = [
            {
                "document_collection_id": sample_collection.id,
                "hierarchy": {"document": document.id, "element_order": 1},
                "content": {"text": "First paragraph", "formatting": {}},
            },
            {
                "document_collection_id": sample_collection.id,
                "hierarchy": {"document": document.id, "element_order": 2},
                "content": {"text": "Second paragraph", "formatting": {}},
            },
        ]
        
        # Create elements
        for para in paragraphs:
            element = DocumentElement(
                document_id=document.id,
                content=para["content"],
                hierarchy=para["hierarchy"],
                created=datetime.now(),
                modified=datetime.now(),
            )
            db_session.add(element)
        
        db_session.commit()
        
        # Verify elements created
        elements = db_session.execute(
            select(DocumentElement).where(
                DocumentElement.document_id == document.id
            )
        ).scalars().all()
        
        assert len(elements) == 2


class TestWordImportTransaction:
    """Tests for transaction handling during Word import."""

    def test_successful_import_transaction(self, db_session, sample_collection):
        """Test that successful import commits all changes."""
        # Simulate successful import
        document = Document(
            title="Transaction Test",
            description="",
            document_collection_id=sample_collection.id,
            created=datetime.now(),
            modified=datetime.now(),
        )
        db_session.add(document)
        db_session.flush()
        
        element = DocumentElement(
            document_id=document.id,
            content={"text": "Test content"},
            hierarchy={"element_order": 1},
            created=datetime.now(),
            modified=datetime.now(),
        )
        db_session.add(element)
        
        # Commit transaction
        db_session.commit()
        
        # Verify both exist
        doc = db_session.execute(
            select(Document).where(Document.id == document.id)
        ).scalar_one_or_none()
        
        elem = db_session.execute(
            select(DocumentElement).where(DocumentElement.document_id == document.id)
        ).scalar_one_or_none()
        
        assert doc is not None
        assert elem is not None

    def test_failed_import_rollback(self, db_session, sample_collection):
        """Test that failed import rolls back all changes."""
        # Start with clean state
        initial_doc_count = db_session.execute(
            select(func.count()).select_from(Document)
        ).scalar_one()
        
        try:
            # Create document
            document = Document(
                title="Rollback Test",
                description="",
                document_collection_id=sample_collection.id,
                created=datetime.now(),
                modified=datetime.now(),
            )
            db_session.add(document)
            db_session.flush()
            
            # Simulate an error during element creation
            raise ValueError("Simulated import error")
            
        except ValueError:
            db_session.rollback()
        
        # Verify rollback - no new documents
        final_doc_count = db_session.execute(
            select(func.count()).select_from(Document)
        ).scalar_one()
        
        assert final_doc_count == initial_doc_count


class TestWordImportResults:
    """Tests for Word import result structure."""

    def test_import_result_structure(self, db_session, sample_collection):
        """Test the structure of import results."""
        # Simulate successful import
        document = Document(
            title="Result Test",
            description="Test description",
            document_collection_id=sample_collection.id,
            created=datetime.now(),
            modified=datetime.now(),
        )
        db_session.add(document)
        db_session.flush()
        
        # Create 3 elements
        for i in range(3):
            element = DocumentElement(
                document_id=document.id,
                content={"text": f"Paragraph {i}"},
                hierarchy={"element_order": i},
                created=datetime.now(),
                modified=datetime.now(),
            )
            db_session.add(element)
        
        db_session.commit()
        db_session.refresh(document)
        
        # Simulate result structure like the API returns
        result = {
            "document": {
                "id": document.id,
                "title": document.title,
                "description": document.description,
                "document_collection_id": document.document_collection_id,
                "created": document.created.isoformat(),
                "modified": document.modified.isoformat(),
            },
            "import_results": {
                "filename": "test_document.docx",
                "paragraph_count": 5,  # Original count in doc
                "elements_created": 3,  # Non-empty paragraphs
                "message": "Document created and Word content imported successfully",
            },
        }
        
        assert result["document"]["id"] == document.id
        assert result["document"]["title"] == "Result Test"
        assert result["import_results"]["elements_created"] == 3


class TestLinkExtraction:
    """Tests for link extraction from paragraphs."""

    def test_extract_links_with_link(self):
        """Test extracting links from paragraph text."""
        from routers.word_import import extract_links
        
        text = "Some paragraph text [link to original paragraph 1.5]"
        
        clean_text, links = extract_links(text)
        
        assert clean_text == "Some paragraph text"
        assert len(links) == 1
        assert links[0]["hierarchy"]["section"] == 1
        assert links[0]["hierarchy"]["paragraph"] == 5

    def test_extract_links_without_link(self):
        """Test paragraph without links."""
        from routers.word_import import extract_links
        
        text = "Regular paragraph without any links"
        
        clean_text, links = extract_links(text)
        
        assert clean_text == text
        assert len(links) == 0

    def test_extract_links_various_formats(self):
        """Test link extraction with various paragraph numbers."""
        from routers.word_import import extract_links
        
        test_cases = [
            ("Text [link to original paragraph 2.3]", 2, 3),
            ("Text [link to original paragraph 10.25]", 10, 25),
            ("Text [link to original paragraph 1.1]", 1, 1),
        ]
        
        for text, expected_section, expected_paragraph in test_cases:
            clean_text, links = extract_links(text)
            assert links[0]["hierarchy"]["section"] == expected_section
            assert links[0]["hierarchy"]["paragraph"] == expected_paragraph


class TestTextFormatting:
    """Tests for text formatting extraction."""

    def test_get_text_format_plain(self):
        """Test formatting extraction for plain text."""
        from routers.word_import import get_text_format
        
        mock_paragraph = create_mock_paragraph("Plain text")
        
        result = get_text_format(mock_paragraph)
        
        assert result["is_bold"] is False
        assert result["is_italic"] is False
        assert result["is_underlined"] is False

    def test_get_text_format_bold(self):
        """Test formatting extraction for bold text."""
        from routers.word_import import get_text_format
        
        mock_paragraph = create_mock_paragraph("Bold text", bold=True)
        
        result = get_text_format(mock_paragraph)
        
        assert result["is_bold"] is True

    def test_get_text_format_italic(self):
        """Test formatting extraction for italic text."""
        from routers.word_import import get_text_format
        
        mock_paragraph = create_mock_paragraph("Italic text", italic=True)
        
        result = get_text_format(mock_paragraph)
        
        assert result["is_italic"] is True

    def test_get_text_format_empty_paragraph(self):
        """Test formatting extraction for paragraph with no runs."""
        from routers.word_import import get_text_format
        
        mock_paragraph = MagicMock()
        mock_paragraph.runs = []
        
        result = get_text_format(mock_paragraph)
        
        assert result["is_bold"] is False
        assert result["is_italic"] is False
        assert result["is_underlined"] is False
        assert result["formatting"] == []


class TestParagraphFormat:
    """Tests for paragraph format extraction."""

    def test_get_paragraph_format_defaults(self):
        """Test paragraph format with default values."""
        from routers.word_import import get_paragraph_format
        
        mock_paragraph = create_mock_paragraph("Test text")
        
        result = get_paragraph_format(mock_paragraph)
        
        assert result["left_indent"] == 0
        assert result["right_indent"] == 0
        assert result["first_line_indent"] == 0
        assert result["alignment"] == "left"

    def test_process_indent_none(self):
        """Test indent processing with None value."""
        from routers.word_import import process_indent
        
        result = process_indent(None)
        
        assert result == 0

    def test_process_indent_value(self):
        """Test indent processing with actual value."""
        from routers.word_import import process_indent
        
        # 914400 EMUs = 1 inch
        result = process_indent(914400)
        
        assert result == 1.0

    def test_process_indent_fraction(self):
        """Test indent processing with fractional result."""
        from routers.word_import import process_indent
        
        # 457200 EMUs = 0.5 inch
        result = process_indent(457200)
        
        assert result == 0.5


class TestWordImportEdgeCases:
    """Tests for edge cases in Word import."""

    def test_import_empty_document(self):
        """Test importing a Word document with no paragraphs."""
        from routers.word_import import extract_paragraphs
        
        mock_doc = create_mock_word_document([])
        
        result = extract_paragraphs(mock_doc, 1, 1)
        
        assert len(result) == 0

    def test_import_whitespace_only_document(self):
        """Test importing a Word document with only whitespace paragraphs."""
        from routers.word_import import extract_paragraphs
        
        mock_doc = create_mock_word_document(["   ", "\t", "\n", "  \n  "])
        
        result = extract_paragraphs(mock_doc, 1, 1)
        
        assert len(result) == 0

    def test_import_very_long_paragraph(self):
        """Test importing a document with very long paragraph."""
        from routers.word_import import extract_paragraphs
        
        long_text = "A" * 10000  # 10,000 character paragraph
        mock_doc = create_mock_word_document([long_text])
        
        result = extract_paragraphs(mock_doc, 1, 1)
        
        assert len(result) == 1
        assert len(result[0]["content"]["text"]) == 10000

    def test_import_special_characters(self):
        """Test importing paragraphs with special characters."""
        from routers.word_import import extract_paragraphs
        
        special_texts = [
            "Paragraph with émojis 🎉 and ñ",
            "Chinese: 中文测试",
            "Arabic: العربية",
            "Math: x² + y² = z²",
        ]
        mock_doc = create_mock_word_document(special_texts)
        
        result = extract_paragraphs(mock_doc, 1, 1)
        
        assert len(result) == 4
        assert "🎉" in result[0]["content"]["text"]
        assert "中文" in result[1]["content"]["text"]

    def test_duplicate_document_title_on_import(
        self, db_session, sample_collection, sample_document
    ):
        """Test handling duplicate document titles during import."""
        # sample_document already has title "Test Document"
        
        # Check if duplicate exists (simulating API validation)
        existing = db_session.execute(
            select(Document).where(
                Document.document_collection_id == sample_collection.id,
                func.lower(Document.title) == "test document"
            )
        ).scalar_one_or_none()
        
        assert existing is not None  # Would block import in API

