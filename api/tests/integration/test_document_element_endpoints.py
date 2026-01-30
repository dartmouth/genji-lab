# tests/integration/test_document_element_endpoints.py
import pytest
from unittest.mock import Mock, patch
from datetime import datetime
from fastapi.testclient import TestClient


@pytest.fixture(scope="module", autouse=True)
def mock_database_init():
    """Mock database initialization to prevent connecting to dev database."""
    with patch('models.models.Base.metadata.create_all'):
        yield


@pytest.fixture
def client():
    """Create FastAPI test client."""
    from main import app
    return TestClient(app)


@pytest.fixture
def mock_current_user():
    """Mock current user for authentication."""
    user = Mock()
    user.id = 1
    user.username = "testuser"
    return user


@pytest.fixture
def mock_db_session():
    """Mock database session."""
    return Mock()


class TestCreateElement:
    """Test POST / endpoint."""
    
    @patch('routers.document_elements.get_db')
    @patch('routers.document_elements.document_element_service')
    def test_create_element_success(self, mock_service, mock_get_db, client, mock_db_session, mock_current_user):
        """Should create new element."""
        mock_get_db.return_value = mock_db_session
        mock_element = Mock()
        mock_element.id = 1
        mock_element.document_id = 1
        mock_element.hierarchy = {"element_order": 1}
        mock_element.content = {"text": "Test"}
        mock_element.created = datetime.now()
        mock_element.modified = datetime.now()
        mock_service.create.return_value = mock_element
        
        response = client.post(
            "/api/v1/elements/",
            json={
                "document_id": 1,
                "hierarchy": {"element_order": 1},
                "content": {"text": "Test"}
            },
            headers={"X-User-ID": str(mock_current_user.id)}
        )
        
        assert response.status_code == 201
        assert mock_service.create.called
    
    @patch('routers.document_elements.get_db')
    @patch('routers.document_elements.document_element_service')
    def test_create_element_validation_error(self, mock_service, mock_get_db, client, mock_db_session, mock_current_user):
        """Should return 422 for invalid data."""
        mock_get_db.return_value = mock_db_session
        
        response = client.post(
            "/api/v1/elements/",
            json={},  # Missing required document_id
            headers={"X-User-ID": str(mock_current_user.id)}
        )
        
        assert response.status_code == 422


class TestListElements:
    """Test GET / endpoint."""
    
    @patch('routers.document_elements.get_db')
    @patch('routers.document_elements.document_element_service')
    def test_list_all_elements(self, mock_service, mock_get_db, client, mock_db_session, mock_current_user):
        """Should return all elements."""
        mock_get_db.return_value = mock_db_session
        mock_elements = [Mock(id=1, document_id=1), Mock(id=2, document_id=1)]
        for elem in mock_elements:
            elem.created = datetime.now()
            elem.modified = datetime.now()
            elem.hierarchy = {}
            elem.content = {}
        mock_service.list.return_value = mock_elements
        
        response = client.get(
            "/api/v1/elements/",
            headers={"X-User-ID": str(mock_current_user.id)}
        )
        
        assert response.status_code == 200
        assert mock_service.list.called
    
    @patch('routers.document_elements.get_db')
    @patch('routers.document_elements.document_element_service')
    def test_list_filter_by_document_id(self, mock_service, mock_get_db, client, mock_db_session, mock_current_user):
        """Should filter by document_id."""
        mock_get_db.return_value = mock_db_session
        mock_service.list.return_value = []
        
        response = client.get(
            "/api/v1/elements/?document_id=1",
            headers={"X-User-ID": str(mock_current_user.id)}
        )
        
        assert response.status_code == 200
        mock_service.list.assert_called_once()
        call_kwargs = mock_service.list.call_args.kwargs
        assert call_kwargs["document_id"] == 1
    
    @patch('routers.document_elements.get_db')
    @patch('routers.document_elements.document_element_service')
    def test_list_with_content_query(self, mock_service, mock_get_db, client, mock_db_session, mock_current_user):
        """Should pass content_query parameter."""
        mock_get_db.return_value = mock_db_session
        mock_service.list.return_value = []
        
        response = client.get(
            "/api/v1/elements/?content_query=test",
            headers={"X-User-ID": str(mock_current_user.id)}
        )
        
        assert response.status_code == 200
        call_kwargs = mock_service.list.call_args.kwargs
        assert call_kwargs["content_query"] == "test"


class TestGetElementById:
    """Test GET /{element_id} endpoint."""
    
    @patch('routers.document_elements.get_db')
    @patch('routers.document_elements.document_element_service')
    def test_get_element_success(self, mock_service, mock_get_db, client, mock_db_session, mock_current_user):
        """Should return element with document info."""
        mock_get_db.return_value = mock_db_session
        mock_element = Mock()
        mock_element.id = 1
        mock_element.document_id = 1
        mock_element.hierarchy = {}
        mock_element.content = {}
        mock_element.created = datetime.now()
        mock_element.modified = datetime.now()
        # Mock document with all required fields
        mock_doc = Mock()
        mock_doc.id = 1
        mock_doc.title = "Test Doc"
        mock_doc.description = "Test Description"
        mock_doc.document_collection_id = 1
        mock_doc.created = datetime.now()
        mock_doc.modified = datetime.now()
        mock_element.document = mock_doc
        mock_service.get_by_id.return_value = mock_element
        
        response = client.get(
            "/api/v1/elements/1",
            headers={"X-User-ID": str(mock_current_user.id)}
        )
        
        assert response.status_code == 200
        assert mock_service.get_by_id.called
    
    @patch('routers.document_elements.get_db')
    @patch('routers.document_elements.document_element_service')
    def test_get_element_not_found(self, mock_service, mock_get_db, client, mock_db_session, mock_current_user):
        """Should return 404 when element not found."""
        from fastapi import HTTPException
        
        mock_get_db.return_value = mock_db_session
        mock_service.get_by_id.side_effect = HTTPException(status_code=404, detail="Not found")
        
        response = client.get(
            "/api/v1/elements/9999",
            headers={"X-User-ID": str(mock_current_user.id)}
        )
        
        assert response.status_code == 404


class TestUpdateElement:
    """Test PUT /{element_id} endpoint."""
    
    @patch('routers.document_elements.get_db')
    @patch('routers.document_elements.document_element_service')
    def test_update_element_success(self, mock_service, mock_get_db, client, mock_db_session, mock_current_user):
        """Should update element."""
        mock_get_db.return_value = mock_db_session
        mock_element = Mock()
        mock_element.id = 1
        mock_element.document_id = 1
        mock_element.hierarchy = {"element_order": 2}
        mock_element.content = {"text": "Updated"}
        mock_element.created = datetime.now()
        mock_element.modified = datetime.now()
        mock_service.update.return_value = mock_element
        
        response = client.put(
            "/api/v1/elements/1",
            json={
                "document_id": 1,
                "hierarchy": {"element_order": 2},
                "content": {"text": "Updated"}
            },
            headers={"X-User-ID": str(mock_current_user.id)}
        )
        
        assert response.status_code == 200
        assert mock_service.update.called


class TestPartialUpdateElement:
    """Test PATCH /{element_id} endpoint."""
    
    @patch('routers.document_elements.get_db')
    @patch('routers.document_elements.document_element_service')
    def test_partial_update_success(self, mock_service, mock_get_db, client, mock_db_session, mock_current_user):
        """Should partially update element."""
        mock_get_db.return_value = mock_db_session
        mock_element = Mock()
        mock_element.id = 1
        mock_element.document_id = 1
        mock_element.hierarchy = {}
        mock_element.content = {"text": "Partial update"}
        mock_element.created = datetime.now()
        mock_element.modified = datetime.now()
        mock_service.partial_update.return_value = mock_element
        
        response = client.patch(
            "/api/v1/elements/1",
            json={"content": {"text": "Partial update"}},
            headers={"X-User-ID": str(mock_current_user.id)}
        )
        
        assert response.status_code == 200
        assert mock_service.partial_update.called


class TestDeleteElement:
    """Test DELETE /{element_id} endpoint."""
    
    @patch('routers.document_elements.get_db')
    @patch('routers.document_elements.document_element_service')
    def test_delete_element_success(self, mock_service, mock_get_db, client, mock_db_session, mock_current_user):
        """Should delete element."""
        mock_get_db.return_value = mock_db_session
        mock_service.delete.return_value = None
        
        response = client.delete(
            "/api/v1/elements/1",
            headers={"X-User-ID": str(mock_current_user.id)}
        )
        
        assert response.status_code == 204
        assert mock_service.delete.called
    
    @patch('routers.document_elements.get_db')
    @patch('routers.document_elements.document_element_service')
    def test_delete_with_force_flag(self, mock_service, mock_get_db, client, mock_db_session, mock_current_user):
        """Should pass force flag to service."""
        mock_get_db.return_value = mock_db_session
        mock_service.delete.return_value = None
        
        response = client.delete(
            "/api/v1/elements/1?force=true",
            headers={"X-User-ID": str(mock_current_user.id)}
        )
        
        assert response.status_code == 204
        call_kwargs = mock_service.delete.call_args.kwargs
        assert call_kwargs["force"] is True


class TestUpdateContent:
    """Test PATCH /{element_id}/content endpoint."""
    
    @patch('routers.document_elements.get_db')
    @patch('routers.document_elements.document_element_service')
    def test_update_content_success(self, mock_service, mock_get_db, client, mock_db_session, mock_current_user):
        """Should update only content field."""
        mock_get_db.return_value = mock_db_session
        mock_element = Mock()
        mock_element.id = 1
        mock_element.document_id = 1
        mock_element.hierarchy = {}
        mock_element.content = {"text": "New content"}
        mock_element.created = datetime.now()
        mock_element.modified = datetime.now()
        mock_service.update_content.return_value = mock_element
        
        response = client.patch(
            "/api/v1/elements/1/content",
            json={"text": "New content"},
            headers={"X-User-ID": str(mock_current_user.id)}
        )
        
        assert response.status_code == 200
        assert mock_service.update_content.called


class TestUpdateHierarchy:
    """Test PATCH /{element_id}/hierarchy endpoint."""
    
    @patch('routers.document_elements.get_db')
    @patch('routers.document_elements.document_element_service')
    def test_update_hierarchy_success(self, mock_service, mock_get_db, client, mock_db_session, mock_current_user):
        """Should update only hierarchy field."""
        mock_get_db.return_value = mock_db_session
        mock_element = Mock()
        mock_element.id = 1
        mock_element.document_id = 1
        mock_element.hierarchy = {"element_order": 5}
        mock_element.content = {}
        mock_element.created = datetime.now()
        mock_element.modified = datetime.now()
        mock_service.update_hierarchy.return_value = mock_element
        
        response = client.patch(
            "/api/v1/elements/1/hierarchy",
            json={"element_order": 5},
            headers={"X-User-ID": str(mock_current_user.id)}
        )
        
        assert response.status_code == 200
        assert mock_service.update_hierarchy.called


class TestGetElementAnnotations:
    """Test GET /{element_id}/annotations endpoint."""
    
    @patch('routers.document_elements.get_db')
    @patch('routers.document_elements.document_element_service')
    def test_get_annotations_success(self, mock_service, mock_get_db, client, mock_db_session, mock_current_user):
        """Should return annotations for element."""
        mock_get_db.return_value = mock_db_session
        # Create properly mocked annotations with all required fields
        mock_creator = Mock()
        mock_creator.id = 1
        mock_creator.username = "testuser"
        mock_creator.email = "test@example.com"
        mock_creator.first_name = "Test"
        mock_creator.last_name = "User"
        mock_creator.is_active = True
        mock_creator.roles = []
        mock_creator.user_metadata = {}
        mock_creator.viewed_tutorial = False
        
        mock_annotation1 = Mock()
        mock_annotation1.id = 1
        mock_annotation1.context = "http://www.w3.org/ns/anno.jsonld"
        mock_annotation1.document_collection_id = 1
        mock_annotation1.document_id = 1
        mock_annotation1.document_element_id = 1
        mock_annotation1.creator_id = 1
        mock_annotation1.classroom_id = None
        mock_annotation1.type = "Annotation"
        mock_annotation1.motivation = "commenting"
        mock_annotation1.generator = "test-app"
        mock_annotation1.created = datetime.now()
        mock_annotation1.modified = datetime.now()
        mock_annotation1.generated = datetime.now()
        mock_annotation1.status = "active"
        mock_annotation1.annotation_type = "comment"
        mock_annotation1.body = {"id": 1, "type": "TextualBody", "value": "Test", "format": "text/plain", "language": "en"}
        mock_annotation1.target = [{"id": 1, "type": "TextTarget", "source": "doc/1", "selector": None}]
        mock_annotation1.creator = mock_creator
        
        mock_annotation2 = Mock()
        mock_annotation2.id = 2
        mock_annotation2.context = "http://www.w3.org/ns/anno.jsonld"
        mock_annotation2.document_collection_id = 1
        mock_annotation2.document_id = 1
        mock_annotation2.document_element_id = 1
        mock_annotation2.creator_id = 1
        mock_annotation2.classroom_id = None
        mock_annotation2.type = "Annotation"
        mock_annotation2.motivation = "commenting"
        mock_annotation2.generator = "test-app"
        mock_annotation2.created = datetime.now()
        mock_annotation2.modified = datetime.now()
        mock_annotation2.generated = datetime.now()
        mock_annotation2.status = "active"
        mock_annotation2.annotation_type = "comment"
        mock_annotation2.body = {"id": 2, "type": "TextualBody", "value": "Test 2", "format": "text/plain", "language": "en"}
        mock_annotation2.target = [{"id": 2, "type": "TextTarget", "source": "doc/1", "selector": None}]
        mock_annotation2.creator = mock_creator
        
        mock_annotations = [mock_annotation1, mock_annotation2]
        mock_service.get_annotations.return_value = mock_annotations
        
        response = client.get(
            "/api/v1/elements/1/annotations",
            headers={"X-User-ID": str(mock_current_user.id)}
        )
        
        assert response.status_code == 200
        assert mock_service.get_annotations.called


class TestGetElementsByDocument:
    """Test GET /document/{document_id} endpoint."""
    
    @patch('routers.document_elements.get_db')
    @patch('routers.document_elements.document_element_service')
    def test_get_by_document_success(self, mock_service, mock_get_db, client, mock_db_session, mock_current_user):
        """Should return all elements for document."""
        mock_get_db.return_value = mock_db_session
        mock_elements = [Mock(id=1), Mock(id=2)]
        for elem in mock_elements:
            elem.document_id = 1
            elem.created = datetime.now()
            elem.modified = datetime.now()
            elem.hierarchy = {}
            elem.content = {}
        mock_service.get_by_document.return_value = mock_elements
        
        response = client.get(
            "/api/v1/elements/document/1",
            headers={"X-User-ID": str(mock_current_user.id)}
        )
        
        assert response.status_code == 200
        assert mock_service.get_by_document.called


class TestGetDocumentStats:
    """Test GET /document/{document_id}/stats endpoint."""
    
    @patch('routers.document_elements.get_db')
    @patch('routers.document_elements.document_element_service')
    def test_get_stats_success(self, mock_service, mock_get_db, client, mock_db_session, mock_current_user):
        """Should return element statistics."""
        mock_get_db.return_value = mock_db_session
        mock_service.get_document_stats.return_value = {"element_count": 5}
        
        response = client.get(
            "/api/v1/elements/document/1/stats",
            headers={"X-User-ID": str(mock_current_user.id)}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["element_count"] == 5


class TestDeleteAllByDocument:
    """Test DELETE /document/{document_id}/all-elements endpoint."""
    
    @patch('routers.document_elements.get_db')
    @patch('routers.document_elements.document_element_service')
    def test_delete_all_success(self, mock_service, mock_get_db, client, mock_db_session, mock_current_user):
        """Should delete all elements for document."""
        mock_get_db.return_value = mock_db_session
        mock_service.delete_all_by_document.return_value = None
        
        response = client.delete(
            "/api/v1/elements/document/1/all-elements",
            headers={"X-User-ID": str(mock_current_user.id)}
        )
        
        assert response.status_code == 204
        assert mock_service.delete_all_by_document.called
