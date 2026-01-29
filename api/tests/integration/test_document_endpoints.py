# tests/integration/test_document_endpoints.py
import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime


# ==================== Fixtures ====================

@pytest.fixture(scope="module", autouse=True)
def mock_database_init():
    """Mock database initialization to prevent connection attempts."""
    with patch('models.models.Base.metadata.create_all'):
        yield


@pytest.fixture
def mock_current_user():
    """Create a mock authenticated user."""
    user = Mock()
    user.id = 1
    user.first_name = "Test"
    user.last_name = "User"
    user.email = "test@example.com"
    user.username = "testuser"
    user.is_active = True
    user.roles = ["user"]
    return user


@pytest.fixture
def mock_db_session():
    """Create a mock database session."""
    return MagicMock()


@pytest.fixture
def client():
    """Create a test client."""
    from main import app
    return TestClient(app)


@pytest.fixture
def sample_document():
    """Sample document for testing."""
    doc = Mock()
    doc.id = 1
    doc.title = "Test Document"
    doc.description = "Test Description"
    doc.document_collection_id = 1
    doc.created = datetime.now()
    doc.modified = datetime.now()
    doc.elements_count = 0
    doc.collection = None
    return doc


# ==================== Tests ====================


class TestCreateDocument:
    """Test POST /api/documents endpoint."""

    @patch('routers.documents.get_db')
    @patch('routers.documents.document_service')
    def test_create_document_success(self, mock_service, mock_get_db, client, mock_db_session, mock_current_user, sample_document):
        """Should create document successfully."""
        mock_get_db.return_value = mock_db_session
        mock_service.create.return_value = sample_document
        
        response = client.post(
            "/api/v1/documents",
            json={
                "title": "New Document",
                "description": "Test Description",
                "document_collection_id": 1
            },
            headers={"X-User-ID": str(mock_current_user.id)}
        )
        
        assert response.status_code == 201
        assert mock_service.create.called

    @patch('routers.documents.get_db')
    @patch('routers.documents.document_service')
    def test_create_document_duplicate_title(self, mock_service, mock_get_db, client, mock_db_session, mock_current_user):
        """Should return 400 for duplicate title."""
        from fastapi import HTTPException
        
        mock_get_db.return_value = mock_db_session
        mock_service.create.side_effect = HTTPException(status_code=400, detail="Document with this title already exists in the collection")
        
        response = client.post(
            "/api/v1/documents",
            json={
                "title": "Duplicate Title",
                "description": "Test Description",
                "document_collection_id": 1
            },
            headers={"X-User-ID": str(mock_current_user.id)}
        )
        
        assert response.status_code == 400


class TestListDocuments:
    """Test GET /api/documents endpoint."""

    @patch('routers.documents.get_db')
    @patch('routers.documents.document_service')
    def test_list_documents_default(self, mock_service, mock_get_db, client, mock_db_session, mock_current_user, sample_document):
        """Should list documents with default pagination."""
        mock_get_db.return_value = mock_db_session
        mock_service.list.return_value = [sample_document]
        
        response = client.get(
            "/api/v1/documents",
            headers={"X-User-ID": str(mock_current_user.id)}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @patch('routers.documents.get_db')
    @patch('routers.documents.document_service')
    def test_list_documents_filter_by_title(self, mock_service, mock_get_db, client, mock_db_session, mock_current_user, sample_document):
        """Should filter documents by title."""
        mock_get_db.return_value = mock_db_session
        mock_service.list.return_value = [sample_document]
        
        response = client.get(
            "/api/v1/documents?title=Test",
            headers={"X-User-ID": str(mock_current_user.id)}
        )
        
        assert response.status_code == 200
        assert mock_service.list.called

    @patch('routers.documents.get_db')
    @patch('routers.documents.document_service')
    def test_list_documents_filter_by_collection(self, mock_service, mock_get_db, client, mock_db_session, mock_current_user, sample_document):
        """Should filter documents by collection_id."""
        mock_get_db.return_value = mock_db_session
        mock_service.list.return_value = [sample_document]
        
        response = client.get(
            "/api/v1/documents?collection_id=1",
            headers={"X-User-ID": str(mock_current_user.id)}
        )
        
        assert response.status_code == 200
        assert mock_service.list.called


class TestGetDocumentById:
    """Test GET /api/documents/{id} endpoint."""

    @patch('routers.documents.get_db')
    @patch('routers.documents.document_service')
    def test_get_document_with_details(self, mock_service, mock_get_db, client, mock_db_session, mock_current_user, sample_document):
        """Should return document with details."""
        mock_get_db.return_value = mock_db_session
        mock_service.get_by_id.return_value = sample_document
        
        response = client.get(
            "/api/v1/documents/1",
            headers={"X-User-ID": str(mock_current_user.id)}
        )
        
        assert response.status_code == 200
        assert mock_service.get_by_id.called

    @patch('routers.documents.get_db')
    @patch('routers.documents.document_service')
    def test_get_document_not_found(self, mock_service, mock_get_db, client, mock_db_session, mock_current_user):
        """Should return 404 when document not found."""
        from fastapi import HTTPException
        
        mock_get_db.return_value = mock_db_session
        mock_service.get_by_id.side_effect = HTTPException(status_code=404, detail="Document not found")
        
        response = client.get(
            "/api/v1/documents/9999",
            headers={"X-User-ID": str(mock_current_user.id)}
        )
        
        assert response.status_code == 404


class TestUpdateDocument:
    """Test PUT /api/documents/{id} endpoint."""

    @patch('routers.documents.get_db')
    @patch('routers.documents.document_service')
    def test_update_document_success(self, mock_service, mock_get_db, client, mock_db_session, mock_current_user, sample_document):
        """Should update document successfully."""
        sample_document.title = "Updated Title"
        mock_get_db.return_value = mock_db_session
        mock_service.update.return_value = sample_document
        
        response = client.put(
            "/api/v1/documents/1",
            json={
                "title": "Updated Title",
                "description": "Updated Description",
                "document_collection_id": 1
            },
            headers={"X-User-ID": str(mock_current_user.id)}
        )
        
        assert response.status_code == 200
        assert mock_service.update.called


class TestPartialUpdateDocument:
    """Test PATCH /api/documents/{id} endpoint."""

    @patch('routers.documents.get_db')
    @patch('routers.documents.document_service')
    def test_partial_update_only_title(self, mock_service, mock_get_db, client, mock_db_session, mock_current_user, sample_document):
        """Should update only title field."""
        sample_document.title = "Partially Updated"
        mock_get_db.return_value = mock_db_session
        mock_service.partial_update.return_value = sample_document
        
        response = client.patch(
            "/api/v1/documents/1",
            json={"title": "Partially Updated"},
            headers={"X-User-ID": str(mock_current_user.id)}
        )
        
        assert response.status_code == 200
        assert mock_service.partial_update.called


class TestDeleteDocument:
    """Test DELETE /api/documents/{id} endpoint."""

    @patch('routers.documents.get_db')
    @patch('routers.documents.document_service')
    def test_delete_document_without_force(self, mock_service, mock_get_db, client, mock_db_session, mock_current_user):
        """Should delete document without cascade."""
        mock_get_db.return_value = mock_db_session
        mock_service.delete.return_value = {"message": "Document deleted successfully"}
        
        response = client.delete(
            "/api/v1/documents/1",
            headers={"X-User-ID": str(mock_current_user.id)}
        )
        
        assert response.status_code == 204
        assert mock_service.delete.called

    @patch('routers.documents.get_db')
    @patch('routers.documents.document_service')
    def test_delete_document_with_force(self, mock_service, mock_get_db, client, mock_db_session, mock_current_user):
        """Should delete document and cascade to elements."""
        mock_get_db.return_value = mock_db_session
        mock_service.delete.return_value = {"message": "Document and all related content deleted successfully"}
        
        response = client.delete(
            "/api/v1/documents/1?force=true",
            headers={"X-User-ID": str(mock_current_user.id)}
        )
        
        assert response.status_code == 204
        assert mock_service.delete.called


class TestBulkDeleteDocuments:
    """Test DELETE /api/documents/bulk-delete endpoint."""

    @patch('routers.documents.get_db')
    @patch('routers.documents.document_service')
    def test_bulk_delete_success(self, mock_service, mock_get_db, client, mock_db_session, mock_current_user):
        """Should delete multiple documents."""
        mock_get_db.return_value = mock_db_session
        mock_service.bulk_delete.return_value = {"message": "Documents deleted successfully", "deleted_count": 2}
        
        import json as json_module
        response = client.request(
            "DELETE",
            "/api/v1/documents/bulk-delete?force=true",
            content=json_module.dumps({"document_ids": [1, 2]}).encode('utf-8'),
            headers={"X-User-ID": str(mock_current_user.id), "Content-Type": "application/json"}
        )
        
        assert response.status_code == 204
        assert mock_service.bulk_delete.called

    @patch('routers.documents.get_db')
    @patch('routers.documents.document_service')
    def test_bulk_delete_empty_list(self, mock_service, mock_get_db, client, mock_db_session, mock_current_user):
        """Should return 400 for empty list."""
        from fastapi import HTTPException
        
        mock_get_db.return_value = mock_db_session
        mock_service.bulk_delete.side_effect = HTTPException(status_code=400, detail="No document IDs provided")
        
        import json as json_module
        response = client.request(
            "DELETE",
            "/api/v1/documents/bulk-delete",
            content=json_module.dumps({"document_ids": []}).encode('utf-8'),
            headers={"X-User-ID": str(mock_current_user.id), "Content-Type": "application/json"}
        )
        
        assert response.status_code == 400


class TestGetDocumentElements:
    """Test GET /api/documents/{id}/elements/ endpoint."""

    @patch('routers.documents.get_db')
    @patch('routers.documents.document_service')
    def test_get_elements_with_pagination(self, mock_service, mock_get_db, client, mock_db_session, mock_current_user):
        """Should return document elements with pagination."""
        mock_element = Mock()
        mock_element.id = 1
        mock_element.document_id = 1
        mock_element.element_type = "paragraph"
        mock_element.content = {"text": "Test content"}
        mock_element.hierarchy = {"element_order": 1}
        mock_element.created = datetime.now()
        mock_element.modified = datetime.now()
        
        mock_get_db.return_value = mock_db_session
        mock_service.get_elements.return_value = [mock_element]
        
        response = client.get(
            "/api/v1/documents/1/elements/",
            headers={"X-User-ID": str(mock_current_user.id)}
        )
        
        assert response.status_code == 200
        assert mock_service.get_elements.called
