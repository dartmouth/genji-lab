# tests/integration/test_document_collections_endpoints.py
import pytest
from unittest.mock import Mock, patch, MagicMock, ANY
from fastapi.testclient import TestClient
from fastapi import status, HTTPException
from datetime import datetime


# ==================== Fixtures ====================

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
def sample_collection_response():
    """Sample collection data as returned by the service."""
    mock_creator = Mock()
    mock_creator.id = 1
    mock_creator.first_name = "Test"
    mock_creator.last_name = "User"
    mock_creator.email = "test@example.com"
    mock_creator.username = "testuser"
    mock_creator.is_active = True
    mock_creator.viewed_tutorial = False
    mock_creator.roles = []
    mock_creator.user_metadata = {}
    
    mock_collection = Mock()
    mock_collection.id = 1
    mock_collection.title = "Test Collection"
    mock_collection.visibility = "public"
    mock_collection.text_direction = "ltr"
    mock_collection.language = "en"
    mock_collection.hierarchy = {"type": "sequence"}
    mock_collection.collection_metadata = {"description": "Test"}
    mock_collection.created = datetime.now()
    mock_collection.modified = datetime.now()
    mock_collection.created_by_id = 1
    mock_collection.modified_by_id = None
    mock_collection.created_by = mock_creator
    mock_collection.modified_by = None
    mock_collection.document_count = 0
    mock_collection.element_count = 0
    mock_collection.scholarly_annotation_count = 0
    mock_collection.comment_count = 0
    
    return mock_collection


@pytest.fixture
def sample_collection_create_payload():
    """Sample payload for creating a collection."""
    return {
        "title": "New Collection",
        "visibility": "public",
        "text_direction": "ltr",
        "language": "en",
        "hierarchy": {"type": "sequence"},
        "collection_metadata": {"description": "New collection"},
        "created_by_id": 1
    }


@pytest.fixture
def client():
    """Create a test client."""
    from main import app
    return TestClient(app)


# ==================== Test Classes ====================

class TestCreateCollectionEndpoint:
    """Test POST /api/v1/collections/"""
    
    @patch("routers.document_collections.document_collection_service")
    @patch("routers.document_collections.get_db")
    def test_create_collection_success(
        self, 
        mock_get_db, 
        mock_service,
        client,
        mock_db_session,
        sample_collection_response,
        sample_collection_create_payload
    ):
        """Should create collection and return 201."""
        mock_get_db.return_value = mock_db_session
        mock_service.create.return_value = sample_collection_response
        
        response = client.post(
            "/api/v1/collections/",
            json=sample_collection_create_payload
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["id"] == 1
        assert data["title"] == "Test Collection"
        assert data["created_by_id"] == 1
        
        mock_service.create.assert_called_once()
    
    @patch("routers.document_collections.document_collection_service")
    @patch("routers.document_collections.get_db")
    def test_create_collection_missing_required_field(
        self,
        mock_get_db,
        mock_service,
        client,
        mock_db_session
    ):
        """Should return 422 when required field is missing."""
        mock_get_db.return_value = mock_db_session
        
        response = client.post(
            "/api/v1/collections/",
            json={"title": "Test"}  # Missing created_by_id
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT
        mock_service.create.assert_not_called()
    
    @patch("routers.document_collections.document_collection_service")
    @patch("routers.document_collections.get_db")
    def test_create_collection_duplicate_title(
        self,
        mock_get_db,
        mock_service,
        client,
        mock_db_session,
        sample_collection_create_payload
    ):
        """Should return 400 when title already exists."""
        mock_get_db.return_value = mock_db_session
        mock_service.create.side_effect = HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Collection name already exists"
        )
        
        response = client.post(
            "/api/v1/collections/",
            json=sample_collection_create_payload
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "already exists" in response.json()["detail"].lower()


class TestListCollectionsEndpoint:
    """Test GET /api/v1/collections/"""
    
    @patch("routers.document_collections.document_collection_service")
    @patch("routers.document_collections.get_db")
    def test_list_collections_success(
        self,
        mock_get_db,
        mock_service,
        client,
        mock_db_session,
        sample_collection_response
    ):
        """Should return list of collections."""
        mock_get_db.return_value = mock_db_session
        mock_service.list.return_value = [sample_collection_response]
        
        response = client.get("/api/v1/collections/")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["title"] == "Test Collection"
        
        mock_service.list.assert_called_once()
    
    @patch("routers.document_collections.document_collection_service")
    @patch("routers.document_collections.get_db")
    def test_list_collections_with_filters(
        self,
        mock_get_db,
        mock_service,
        client,
        mock_db_session
    ):
        """Should pass filters to service."""
        mock_get_db.return_value = mock_db_session
        mock_service.list.return_value = []
        
        response = client.get(
            "/api/v1/collections/",
            params={
                "title": "Test",
                "visibility": "public",
                "language": "en",
                "created_by_id": 1,
                "skip": 10,
                "limit": 50
            }
        )
        
        assert response.status_code == status.HTTP_200_OK
        mock_service.list.assert_called_once()
        call_kwargs = mock_service.list.call_args[1]
        assert call_kwargs["title"] == "Test"
        assert call_kwargs["visibility"] == "public"
        assert call_kwargs["language"] == "en"
        assert call_kwargs["created_by_id"] == 1
        assert call_kwargs["skip"] == 10
        assert call_kwargs["limit"] == 50
    
    @patch("routers.document_collections.document_collection_service")
    @patch("routers.document_collections.get_db")
    def test_list_collections_empty(
        self,
        mock_get_db,
        mock_service,
        client,
        mock_db_session
    ):
        """Should return empty list when no collections exist."""
        mock_get_db.return_value = mock_db_session
        mock_service.list.return_value = []
        
        response = client.get("/api/v1/collections/")
        
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == []


class TestGetCollectionEndpoint:
    """Test GET /api/v1/collections/{collection_id}"""
    
    @patch("routers.document_collections.document_collection_service")
    @patch("routers.document_collections.get_db")
    def test_get_collection_success(
        self,
        mock_get_db,
        mock_service,
        client,
        mock_db_session,
        sample_collection_response
    ):
        """Should return collection with statistics."""
        mock_get_db.return_value = mock_db_session
        mock_service.get_by_id.return_value = sample_collection_response
        
        response = client.get("/api/v1/collections/1")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == 1
        assert data["title"] == "Test Collection"
        assert "document_count" in data
        assert "element_count" in data
        assert "scholarly_annotation_count" in data
        
        mock_service.get_by_id.assert_called_once_with(ANY, 1)
    
    @patch("routers.document_collections.document_collection_service")
    @patch("routers.document_collections.get_db")
    def test_get_collection_not_found(
        self,
        mock_get_db,
        mock_service,
        client,
        mock_db_session
    ):
        """Should return 404 when collection doesn't exist."""
        mock_get_db.return_value = mock_db_session
        mock_service.get_by_id.side_effect = HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document collection not found"
        )
        
        response = client.get("/api/v1/collections/999")
        
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestUpdateCollectionEndpoint:
    """Test PUT /api/v1/collections/{collection_id}"""
    
    @patch("routers.document_collections.document_collection_service")
    @patch("routers.document_collections.get_db")
    def test_update_collection_success(
        self,
        mock_get_db,
        mock_service,
        client,
        mock_db_session,
        sample_collection_response
    ):
        """Should update collection and return updated data."""
        mock_get_db.return_value = mock_db_session
        mock_service.update.return_value = sample_collection_response
        
        update_payload = {
            "title": "Updated Collection",
            "visibility": "private"
        }
        
        response = client.put("/api/v1/collections/1", json=update_payload)
        
        assert response.status_code == status.HTTP_200_OK
        mock_service.update.assert_called_once()
    
    @patch("routers.document_collections.document_collection_service")
    @patch("routers.document_collections.get_db")
    def test_update_collection_not_found(
        self,
        mock_get_db,
        mock_service,
        client,
        mock_db_session
    ):
        """Should return 404 when collection doesn't exist."""
        mock_get_db.return_value = mock_db_session
        mock_service.update.side_effect = HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document collection not found"
        )
        
        response = client.put("/api/v1/collections/999", json={"title": "Updated"})
        
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestPartialUpdateCollectionEndpoint:
    """Test PATCH /api/v1/collections/{collection_id}"""
    
    @patch("routers.document_collections.document_collection_service")
    @patch("routers.document_collections.get_db")
    def test_partial_update_collection_success(
        self,
        mock_get_db,
        mock_service,
        client,
        mock_db_session,
        sample_collection_response
    ):
        """Should partially update collection."""
        mock_get_db.return_value = mock_db_session
        mock_service.partial_update.return_value = sample_collection_response
        
        response = client.patch(
            "/api/v1/collections/1",
            json={"visibility": "private"}
        )
        
        assert response.status_code == status.HTTP_200_OK
        mock_service.partial_update.assert_called_once()
    
    @patch("routers.document_collections.document_collection_service")
    @patch("routers.document_collections.get_db")
    def test_partial_update_empty_payload(
        self,
        mock_get_db,
        mock_service,
        client,
        mock_db_session,
        sample_collection_response
    ):
        """Should accept empty payload for partial update."""
        mock_get_db.return_value = mock_db_session
        mock_service.partial_update.return_value = sample_collection_response
        
        response = client.patch("/api/v1/collections/1", json={})
        
        assert response.status_code == status.HTTP_200_OK


class TestDeleteCollectionEndpoint:
    """Test DELETE /api/v1/collections/{collection_id}"""
    
    @patch("routers.document_collections.document_collection_service")
    @patch("routers.document_collections.get_db")
    def test_delete_collection_success(
        self,
        mock_get_db,
        mock_service,
        client,
        mock_db_session
    ):
        """Should delete collection and return 204."""
        mock_get_db.return_value = mock_db_session
        mock_service.delete.return_value = None
        
        response = client.delete("/api/v1/collections/1")
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert response.content == b''
        mock_service.delete.assert_called_once_with(ANY, 1, force=True)
    
    @patch("routers.document_collections.document_collection_service")
    @patch("routers.document_collections.get_db")
    def test_delete_collection_with_force_false(
        self,
        mock_get_db,
        mock_service,
        client,
        mock_db_session
    ):
        """Should pass force parameter to service."""
        mock_get_db.return_value = mock_db_session
        mock_service.delete.return_value = None
        
        response = client.delete("/api/v1/collections/1?force=false")
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
        mock_service.delete.assert_called_once_with(ANY, 1, force=False)
    
    @patch("routers.document_collections.document_collection_service")
    @patch("routers.document_collections.get_db")
    def test_delete_collection_not_found(
        self,
        mock_get_db,
        mock_service,
        client,
        mock_db_session
    ):
        """Should return 404 when collection doesn't exist."""
        mock_get_db.return_value = mock_db_session
        mock_service.delete.side_effect = HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document collection not found"
        )
        
        response = client.delete("/api/v1/collections/999")
        
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestGetCollectionDocumentsEndpoint:
    """Test GET /api/v1/collections/{collection_id}/documents"""
    
    @patch("routers.document_collections.document_collection_service")
    @patch("routers.document_collections.get_db")
    def test_get_collection_documents_success(
        self,
        mock_get_db,
        mock_service,
        client,
        mock_db_session
    ):
        """Should return list of documents."""
        mock_get_db.return_value = mock_db_session
        mock_documents = [
            {"id": 1, "title": "Doc 1"},
            {"id": 2, "title": "Doc 2"}
        ]
        mock_service.get_documents.return_value = mock_documents
        
        response = client.get("/api/v1/collections/1/documents")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 2
        assert data[0]["title"] == "Doc 1"
        
        mock_service.get_documents.assert_called_once()
    
    @patch("routers.document_collections.document_collection_service")
    @patch("routers.document_collections.get_db")
    def test_get_collection_documents_with_pagination(
        self,
        mock_get_db,
        mock_service,
        client,
        mock_db_session
    ):
        """Should pass pagination parameters."""
        mock_get_db.return_value = mock_db_session
        mock_service.get_documents.return_value = []
        
        response = client.get("/api/v1/collections/1/documents?skip=10&limit=20")
        
        assert response.status_code == status.HTTP_200_OK
        mock_service.get_documents.assert_called_once_with(
            ANY, 1, skip=10, limit=20
        )


class TestDeleteCollectionDocumentsEndpoint:
    """Test DELETE /api/v1/collections/{collection_id}/documents"""
    
    @patch("routers.document_collections.document_collection_service")
    @patch("routers.document_collections.get_db")
    def test_delete_all_documents_success(
        self,
        mock_get_db,
        mock_service,
        client,
        mock_db_session
    ):
        """Should delete all documents and return 204."""
        mock_get_db.return_value = mock_db_session
        mock_service.delete_all_documents.return_value = None
        
        response = client.delete("/api/v1/collections/1/documents")
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
        mock_service.delete_all_documents.assert_called_once_with(
            ANY, 1, force=True
        )
    
    @patch("routers.document_collections.document_collection_service")
    @patch("routers.document_collections.get_db")
    def test_delete_all_documents_with_force_parameter(
        self,
        mock_get_db,
        mock_service,
        client,
        mock_db_session
    ):
        """Should pass force parameter."""
        mock_get_db.return_value = mock_db_session
        mock_service.delete_all_documents.return_value = None
        
        response = client.delete("/api/v1/collections/1/documents?force=false")
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
        mock_service.delete_all_documents.assert_called_once_with(
            ANY, 1, force=False
        )
