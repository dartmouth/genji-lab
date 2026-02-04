# tests/integration/test_annotation_endpoints.py
import pytest
from unittest.mock import Mock, patch, MagicMock
from fastapi.testclient import TestClient
from fastapi import status, HTTPException


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
    user.user_metadata = {"role": "user", "affiliation": "test"}
    return user


@pytest.fixture
def mock_admin_user():
    """Create a mock admin user."""
    user = Mock()
    user.id = 2
    user.first_name = "Admin"
    user.last_name = "User"
    user.email = "admin@example.com"
    user.username = "adminuser"
    user.is_active = True
    user.roles = ["admin", "user"]
    user.user_metadata = {"role": "admin", "affiliation": "test"}
    return user


@pytest.fixture
def mock_db_session():
    """Create a mock database session."""
    return MagicMock()


@pytest.fixture
def sample_annotation_response():
    """Sample annotation data as returned by the service."""
    # Create a properly structured creator mock
    mock_creator = Mock()
    mock_creator.id = 1
    mock_creator.first_name = "Test"
    mock_creator.last_name = "User"
    mock_creator.email = "test@example.com"
    mock_creator.username = "testuser"
    mock_creator.is_active = True
    mock_creator.viewed_tutorial = False
    mock_creator.roles = []
    mock_creator.user_metadata = {"role": "user", "affiliation": "test"}
    
    # Create the annotation mock
    mock_annotation = Mock()
    mock_annotation.id = 1
    mock_annotation.context = "http://www.w3.org/ns/anno.jsonld"
    mock_annotation.document_collection_id = 1
    mock_annotation.document_id = 1
    mock_annotation.document_element_id = 1
    mock_annotation.creator_id = 1
    mock_annotation.classroom_id = None
    mock_annotation.type = "Annotation"
    mock_annotation.motivation = "commenting"
    mock_annotation.generator = "test-app"
    mock_annotation.generated = "2024-01-15T10:30:00"
    mock_annotation.created = "2024-01-15T10:30:00"
    mock_annotation.modified = "2024-01-15T10:30:00"
    mock_annotation.status = "active"
    mock_annotation.annotation_type = "comment"
    mock_annotation.body = {
        "id": 1,
        "type": "TextualBody",
        "value": "Test annotation",
        "format": "text/plain",
        "language": "en"
    }
    mock_annotation.target = [
        {
            "id": 1,
            "type": "TextTarget",
            "source": "doc/1",
            "selector": None
        }
    ]
    mock_annotation.creator = mock_creator
    
    return mock_annotation


@pytest.fixture
def sample_annotation_create_payload():
    """Sample payload for creating an annotation."""
    return {
        "context": "http://www.w3.org/ns/anno.jsonld",
        "document_collection_id": 1,
        "document_id": 1,
        "document_element_id": 1,
        "creator_id": 1,
        "type": "Annotation",
        "motivation": "commenting",
        "generator": "test-app",
        "body": {
            "type": "TextualBody",
            "value": "Test annotation",
            "format": "text/plain",
            "language": "en"
        },
        "target": [
            {
                "type": "TextTarget",
                "source": "doc/1",
                "selector": {
                    "type": "TextQuoteSelector",
                    "value": "selected text",
                    "refined_by": {
                        "type": "TextPositionSelector",
                        "start": 0,
                        "end": 13
                    }
                }
            }
        ]
    }


@pytest.fixture
def client(mock_current_user, mock_db_session):
    """Create test client with mocked dependencies."""
    # Mock database connection before importing app
    with patch('database.engine'):
        with patch('models.models.Base.metadata.create_all'):
            from main import app
            from dependencies.classroom import get_current_user_sync, get_classroom_context
            from database import get_db
            
            # Override dependencies
            app.dependency_overrides[get_current_user_sync] = lambda: mock_current_user
            app.dependency_overrides[get_classroom_context] = lambda: None
            app.dependency_overrides[get_db] = lambda: mock_db_session
            
            with TestClient(app) as test_client:
                yield test_client
            
            # Clear overrides after test
            app.dependency_overrides.clear()


@pytest.fixture
def client_with_classroom(mock_current_user, mock_db_session):
    """Create test client with classroom context."""
    with patch('database.engine'):
        with patch('models.models.Base.metadata.create_all'):
            from main import app
            from dependencies.classroom import get_current_user_sync, get_classroom_context
            from database import get_db
            
            app.dependency_overrides[get_current_user_sync] = lambda: mock_current_user
            app.dependency_overrides[get_classroom_context] = lambda: 1  # Classroom ID = 1
            app.dependency_overrides[get_db] = lambda: mock_db_session
            
            with TestClient(app) as test_client:
                yield test_client
            
            app.dependency_overrides.clear()

class TestCreateAnnotationEndpoint:
    """Test POST /api/v1/annotations endpoint."""
    
    def test_create_annotation_success(
        self, client, sample_annotation_create_payload, sample_annotation_response
    ):
        """Should create annotation and return 201."""
        with patch(
            'routers.annotations.annotation_service.create',
            return_value=sample_annotation_response
        ):
            response = client.post(
                "/api/v1/annotations/",
                json=sample_annotation_create_payload
            )
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["motivation"] == "commenting"
    
    def test_create_annotation_missing_required_field(self, client):
        """Should return 422 when required field is missing."""
        invalid_payload = {
            "document_collection_id": 1,
            "body": {
                "type": "TextualBody",
                "value": "Test"
            }
            # Missing creator_id and other required fields
        }
        
        response = client.post(
            "/api/v1/annotations/",
            json=invalid_payload
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT
    
    def test_create_annotation_invalid_body_format(self, client):
        """Should return 422 when body format is invalid."""
        invalid_payload = {
            "creator_id": 1,
            "motivation": "commenting",
            "body": "This should be an object, not a string",
            "target": []
        }
        
        response = client.post(
            "/api/v1/annotations/",
            json=invalid_payload
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT
    
    def test_create_annotation_with_classroom_context(
        self, 
        client_with_classroom, 
        sample_annotation_create_payload, 
        sample_annotation_response
    ):
        """Should create annotation with classroom context."""
        sample_annotation_response.classroom_id = 1
        
        with patch(
            'routers.annotations.annotation_service.create',
            return_value=sample_annotation_response
        ) as mock_create:
            response = client_with_classroom.post(
                "/api/v1/annotations/",
                json=sample_annotation_create_payload
            )
        
        assert response.status_code == status.HTTP_201_CREATED
        # Verify classroom_id was passed to service
        mock_create.assert_called_once()
        call_args = mock_create.call_args
        assert call_args[0][3] == 1  # classroom_id argument


class TestListAnnotationsEndpoint:
    """Test GET /api/v1/annotations endpoint."""
    
    def test_list_annotations_success(self, client, sample_annotation_response):
        """Should return list of annotations."""
        with patch(
            'routers.annotations.annotation_service.list',
            return_value=[sample_annotation_response]
        ):
            response = client.get("/api/v1/annotations/")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 1
    
    def test_list_annotations_empty(self, client):
        """Should return empty list when no annotations exist."""
        with patch(
            'routers.annotations.annotation_service.list',
            return_value=[]
        ):
            response = client.get("/api/v1/annotations/")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data == []
    
    def test_list_annotations_with_motivation_filter(
        self, client, sample_annotation_response
    ):
        """Should filter by motivation query parameter."""
        with patch(
            'routers.annotations.annotation_service.list',
            return_value=[sample_annotation_response]
        ) as mock_list:
            response = client.get(
                "/api/v1/annotations/",
                params={"motivation": "commenting"}
            )
        
        assert response.status_code == status.HTTP_200_OK
        mock_list.assert_called_once()
        call_kwargs = mock_list.call_args
        assert call_kwargs[1]["motivation"] == "commenting"
    
    def test_list_annotations_with_document_element_filter(
        self, client, sample_annotation_response
    ):
        """Should filter by document_element_id query parameter."""
        with patch(
            'routers.annotations.annotation_service.list',
            return_value=[sample_annotation_response]
        ) as mock_list:
            response = client.get(
                "/api/v1/annotations/",
                params={"document_element_id": 42}
            )
        
        assert response.status_code == status.HTTP_200_OK
        mock_list.assert_called_once()
        call_kwargs = mock_list.call_args
        assert call_kwargs[1]["document_element_id"] == 42
    
    def test_list_annotations_with_pagination(
        self, client, sample_annotation_response
    ):
        """Should apply skip and limit parameters."""
        with patch(
            'routers.annotations.annotation_service.list',
            return_value=[sample_annotation_response]
        ) as mock_list:
            response = client.get(
                "/api/v1/annotations/",
                params={"skip": 10, "limit": 25}
            )
        
        assert response.status_code == status.HTTP_200_OK
        mock_list.assert_called_once()
        call_kwargs = mock_list.call_args
        assert call_kwargs[1]["skip"] == 10
        assert call_kwargs[1]["limit"] == 25
    
    def test_list_annotations_default_pagination(
        self, client, sample_annotation_response
    ):
        """Should use default pagination values."""
        with patch(
            'routers.annotations.annotation_service.list',
            return_value=[sample_annotation_response]
        ) as mock_list:
            response = client.get("/api/v1/annotations/")
        
        assert response.status_code == status.HTTP_200_OK
        mock_list.assert_called_once()
        call_kwargs = mock_list.call_args
        assert call_kwargs[1]["skip"] == 0
        assert call_kwargs[1]["limit"] == 100

class TestGetAnnotationByIdEndpoint:
    """Test GET /api/v1/annotations/{annotation_id} endpoint."""
    
    def test_get_annotation_success(self, client, sample_annotation_response):
        """Should return annotation when found."""
        with patch(
            'routers.annotations.annotation_service.get_by_id',
            return_value=sample_annotation_response
        ):
            response = client.get("/api/v1/annotations/1")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == 1
        assert data["motivation"] == "commenting"
    
    def test_get_annotation_not_found(self, client):
        """Should return 404 when annotation not found."""
        with patch(
            'routers.annotations.annotation_service.get_by_id',
            side_effect=HTTPException(status_code=404, detail="Annotation not found")
        ):
            response = client.get("/api/v1/annotations/99999")
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_get_annotation_with_classroom_context(
        self, client_with_classroom, sample_annotation_response
    ):
        """Should pass classroom_id to service."""
        with patch(
            'routers.annotations.annotation_service.get_by_id',
            return_value=sample_annotation_response
        ) as mock_get:
            response = client_with_classroom.get("/api/v1/annotations/1")
        
        assert response.status_code == status.HTTP_200_OK
        mock_get.assert_called_once()
        call_args = mock_get.call_args
        assert call_args[0][2] == 1  # classroom_id argument


class TestUpdateAnnotationEndpoint:
    """Test PATCH /api/v1/annotations/{annotation_id} endpoint."""
    
    def test_update_annotation_body_success(self, client, sample_annotation_response):
        """Should update annotation body."""
        sample_annotation_response.body["value"] = "Updated content"
        
        with patch(
            'routers.annotations.annotation_service.update',
            return_value=sample_annotation_response
        ):
            response = client.patch(
                "/api/v1/annotations/1",
                json={"body": "Updated content"}
            )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["body"]["value"] == "Updated content"
    
    def test_update_annotation_motivation_success(
        self, client, sample_annotation_response
    ):
        """Should update annotation motivation."""
        sample_annotation_response.motivation = "highlighting"
        
        with patch(
            'routers.annotations.annotation_service.update',
            return_value=sample_annotation_response
        ):
            response = client.patch(
                "/api/v1/annotations/1",
                json={"motivation": "highlighting"}
            )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["motivation"] == "highlighting"
    
    def test_update_annotation_not_found(self, client):
        """Should return 404 when annotation not found."""
        with patch(
            'routers.annotations.annotation_service.update',
            side_effect=HTTPException(status_code=404, detail="Annotation not found")
        ):
            response = client.patch(
                "/api/v1/annotations/99999",
                json={"body": "Content"}
            )
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_update_annotation_empty_payload(self, client, sample_annotation_response):
        """Should accept empty payload (no changes)."""
        with patch(
            'routers.annotations.annotation_service.update',
            return_value=sample_annotation_response
        ):
            response = client.patch(
                "/api/v1/annotations/1",
                json={}
            )
        
        assert response.status_code == status.HTTP_200_OK


class TestDeleteAnnotationEndpoint:
    """Test DELETE /api/v1/annotations/{annotation_id} endpoint."""
    
    def test_delete_annotation_success(self, client):
        """Should delete annotation and return 204."""
        with patch(
            'routers.annotations.annotation_service.delete',
            return_value=None
        ):
            response = client.delete("/api/v1/annotations/1")
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
    
    def test_delete_annotation_not_found(self, client):
        """Should return 404 when annotation not found."""
        with patch(
            'routers.annotations.annotation_service.delete',
            side_effect=HTTPException(status_code=404, detail="Annotation not found")
        ):
            response = client.delete("/api/v1/annotations/99999")
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_delete_annotation_with_classroom_context(self, client_with_classroom):
        """Should pass classroom_id to service."""
        with patch(
            'routers.annotations.annotation_service.delete',
            return_value=None
        ) as mock_delete:
            response = client_with_classroom.delete("/api/v1/annotations/1")
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
        mock_delete.assert_called_once()
        call_args = mock_delete.call_args
        assert call_args[0][2] == 1  # classroom_id argument

class TestAddTargetEndpoint:
    """Test PATCH /api/v1/annotations/add-target/{annotation_id} endpoint."""
    
    def test_add_target_success(self, client, sample_annotation_response):
        """Should add target and return updated annotation."""
        sample_annotation_response.target.append({
            "id": 2,
            "type": "TextTarget",
            "source": "doc/2",
            "selector": None
        })
        
        with patch(
            'routers.annotations.annotation_service.add_target',
            return_value=sample_annotation_response
        ):
            response = client.patch(
                "/api/v1/annotations/add-target/1",
                json={
                    "target": [
                        {
                            "type": "TextTarget",
                            "source": "doc/2",
                            "selector": None
                        }
                    ]
                }
            )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["target"]) == 2
    
    def test_add_target_not_found(self, client):
        """Should return 404 when annotation not found."""
        with patch(
            'routers.annotations.annotation_service.add_target',
            side_effect=HTTPException(status_code=404, detail="Annotation not found")
        ):
            response = client.patch(
                "/api/v1/annotations/add-target/99999",
                json={
                    "target": [
                        {
                            "type": "TextTarget",
                            "source": "doc/1",
                            "selector": None
                        }
                    ]
                }
            )
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_add_multiple_targets(self, client, sample_annotation_response):
        """Should add multiple targets at once."""
        sample_annotation_response.target = [
            {"id": 1, "type": "TextTarget", "source": "doc/1"},
            {"id": 2, "type": "TextTarget", "source": "doc/2"},
            {"id": 3, "type": "ObjectTarget", "source": "img/1"}
        ]
        
        with patch(
            'routers.annotations.annotation_service.add_target',
            return_value=sample_annotation_response
        ):
            response = client.patch(
                "/api/v1/annotations/add-target/1",
                json={
                    "target": [
                        {"type": "TextTarget", "source": "doc/2", "selector": None},
                        {"type": "ObjectTarget", "source": "img/1"}
                    ]
                }
            )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["target"]) == 3
    
    def test_add_target_invalid_payload(self, client):
        """Should return 422 for invalid target payload."""
        response = client.patch(
            "/api/v1/annotations/add-target/1",
            json={
                "target": "invalid string instead of object"
            }
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT


class TestRemoveTargetEndpoint:
    """Test PATCH /api/v1/annotations/remove-target/{annotation_id} endpoint."""
    
    def test_remove_target_success(self, client, sample_annotation_response):
        """Should remove target and return updated annotation."""
        with patch(
            'routers.annotations.annotation_service.remove_target',
            return_value=sample_annotation_response
        ):
            response = client.patch(
                "/api/v1/annotations/remove-target/1",
                params={"target_id": 1}
            )
        
        assert response.status_code == status.HTTP_200_OK
    
    def test_remove_last_target_returns_204(self, client):
        """Should return 204 when last target is removed (annotation deleted)."""
        with patch(
            'routers.annotations.annotation_service.remove_target',
            return_value=None
        ):
            response = client.patch(
                "/api/v1/annotations/remove-target/1",
                params={"target_id": 1}
            )
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
    
    def test_remove_target_annotation_not_found(self, client):
        """Should return 404 when annotation not found."""
        with patch(
            'routers.annotations.annotation_service.remove_target',
            side_effect=HTTPException(status_code=404, detail="Annotation not found")
        ):
            response = client.patch(
                "/api/v1/annotations/remove-target/99999",
                params={"target_id": 1}
            )
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_remove_target_target_not_found(self, client):
        """Should return 404 when target not found in annotation."""
        with patch(
            'routers.annotations.annotation_service.remove_target',
            side_effect=HTTPException(status_code=404, detail="Target not found in annotation")
        ):
            response = client.patch(
                "/api/v1/annotations/remove-target/1",
                params={"target_id": 99999}
            )
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_remove_target_permission_denied(self, client):
        """Should return 403 when user lacks permission."""
        with patch(
            'routers.annotations.annotation_service.remove_target',
            side_effect=HTTPException(
                status_code=403, 
                detail="You don't have permission to delete this target"
            )
        ):
            response = client.patch(
                "/api/v1/annotations/remove-target/1",
                params={"target_id": 1}
            )
        
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_remove_target_missing_target_id(self, client):
        """Should return 422 when target_id query param is missing."""
        response = client.patch("/api/v1/annotations/remove-target/1")
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT