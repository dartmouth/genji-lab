# tests/unit/test_annotation_service.py
import pytest
from unittest.mock import patch, Mock, MagicMock
from datetime import datetime
from fastapi import HTTPException

from services.annotation_service import AnnotationService
from schemas.annotations import (
    AnnotationCreate,
    AnnotationPatch,
    AnnotationAddTarget,
    Body,
    TextTarget,
    ObjectTarget,
    TextQuoteSelector,
    TextPositionSelector
)


class TestAnnotationServiceInit:
    """Test service initialization."""
    
    def test_service_instantiation(self):
        """Should create service instance."""
        service = AnnotationService()
        assert service is not None
    
    def test_service_has_model(self):
        """Service should be initialized with AnnotationModel."""
        from models.models import Annotation as AnnotationModel
        service = AnnotationService()
        assert service.model == AnnotationModel


class TestAnnotationServiceHelpers:
    """Test helper methods."""
    
    def test_dump_targets_flat_list(self, annotation_service):
        """Should serialize flat target list."""
        target = TextTarget(
            id=1,
            type="TextTarget",
            source="doc/1",
            selector=None
        )
        
        result = annotation_service._dump_targets([target])
        
        assert len(result) == 1
        assert result[0]["type"] == "TextTarget"
        assert result[0]["source"] == "doc/1"
    
    def test_dump_targets_nested_list(self, annotation_service):
        """Should serialize nested target lists."""
        target1 = TextTarget(id=1, type="TextTarget", source="doc/1", selector=None)
        target2 = TextTarget(id=2, type="TextTarget", source="doc/2", selector=None)
        
        result = annotation_service._dump_targets([[target1, target2]])
        
        assert len(result) == 1
        assert isinstance(result[0], list)
        assert len(result[0]) == 2
    
    def test_dump_targets_mixed_list(self, annotation_service):
        """Should serialize mixed flat and nested targets."""
        target1 = TextTarget(id=1, type="TextTarget", source="doc/1", selector=None)
        target2 = ObjectTarget(id=2, type="ObjectTarget", source="img/1")
        target3 = TextTarget(id=3, type="TextTarget", source="doc/2", selector=None)
        
        result = annotation_service._dump_targets([target1, [target2, target3]])
        
        assert len(result) == 2
        assert result[0]["type"] == "TextTarget"
        assert isinstance(result[1], list)

class TestAnnotationServiceIDGeneration:
    """Test ID generation methods."""
    
    def test_generate_body_id_calls_sequence(self, annotation_service):
        """Should call database sequence for body ID generation."""
        mock_db = MagicMock()
        mock_result = Mock()
        mock_result.scalar_one.return_value = 42
        mock_db.execute.return_value = mock_result
        
        with patch.dict('os.environ', {'DB_SCHEMA': 'test_schema'}):
            result = annotation_service.generate_body_id(mock_db)
        
        assert result == 42
        mock_db.execute.assert_called_once()
    
    def test_generate_target_id_calls_sequence(self, annotation_service):
        """Should call database sequence for target ID generation."""
        mock_db = MagicMock()
        mock_result = Mock()
        mock_result.scalar_one.return_value = 99
        mock_db.execute.return_value = mock_result
        
        with patch.dict('os.environ', {'DB_SCHEMA': 'test_schema'}):
            result = annotation_service.generate_target_id(mock_db)
        
        assert result == 99
        mock_db.execute.assert_called_once()


class TestAnnotationServiceCreate:
    """Test annotation creation."""
    
    @pytest.fixture
    def mock_db(self):
        """Create mock database session."""
        db = MagicMock()
        db.add = Mock()
        db.commit = Mock()
        db.refresh = Mock()
        return db
    
    @pytest.fixture
    def mock_user(self):
        """Create mock user."""
        user = Mock()
        user.id = 1
        user.roles = ["user"]
        return user
    
    @pytest.fixture
    def create_annotation_data(self):
        """Create valid annotation data for creation tests."""
        return AnnotationCreate(
            context="http://www.w3.org/ns/anno.jsonld",
            document_collection_id=1,
            document_id=1,
            document_element_id=1,
            creator_id=1,
            type="Annotation",
            motivation="commenting",
            generator="test-app",
            body=Body(
                type="TextualBody",
                value="Test comment",
                format="text/plain",
                language="en"
            ),
            target=[
                TextTarget(
                    type="TextTarget",
                    source="doc/1",
                    selector=TextQuoteSelector(
                        type="TextQuoteSelector",
                        value="selected text",
                        refined_by=TextPositionSelector(
                            type="TextPositionSelector",
                            start=0,
                            end=13
                        )
                    )
                )
            ]
        )
    
    def test_create_annotation_generates_body_id(
        self,
        annotation_service,
        mock_db,
        mock_user,
        create_annotation_data
    ):
        """Should generate body ID."""
        with patch.object(annotation_service, 'generate_body_id', return_value=100) as mock_body_id:
            with patch.object(annotation_service, 'generate_target_id', return_value=200):
                annotation_service.create(
                    db=mock_db,
                    annotation=create_annotation_data,
                    user=mock_user,
                    classroom_id=None
                )
        
        mock_body_id.assert_called_once_with(mock_db)
    
    def test_create_annotation_generates_target_ids(
        self,
        annotation_service,
        mock_db,
        mock_user,
        create_annotation_data
    ):
        """Should generate target IDs."""
        with patch.object(annotation_service, 'generate_body_id', return_value=100):
            with patch.object(annotation_service, 'generate_target_id', return_value=200) as mock_target_id:
                annotation_service.create(
                    db=mock_db,
                    annotation=create_annotation_data,
                    user=mock_user,
                    classroom_id=None
                )
        
        mock_target_id.assert_called()
    
    def test_create_annotation_adds_to_session(
        self,
        annotation_service,
        mock_db,
        mock_user,
        create_annotation_data
    ):
        """Should add annotation to database session."""
        with patch.object(annotation_service, 'generate_body_id', return_value=100):
            with patch.object(annotation_service, 'generate_target_id', return_value=200):
                annotation_service.create(
                    db=mock_db,
                    annotation=create_annotation_data,
                    user=mock_user,
                    classroom_id=None
                )
        
        mock_db.add.assert_called_once()
    
    def test_create_annotation_commits_session(
        self,
        annotation_service,
        mock_db,
        mock_user,
        create_annotation_data
    ):
        """Should commit database session."""
        with patch.object(annotation_service, 'generate_body_id', return_value=100):
            with patch.object(annotation_service, 'generate_target_id', return_value=200):
                annotation_service.create(
                    db=mock_db,
                    annotation=create_annotation_data,
                    user=mock_user,
                    classroom_id=None
                )
        
        mock_db.commit.assert_called_once()
    
    def test_create_annotation_refreshes_instance(
        self,
        annotation_service,
        mock_db,
        mock_user,
        create_annotation_data
    ):
        """Should refresh annotation instance after commit."""
        with patch.object(annotation_service, 'generate_body_id', return_value=100):
            with patch.object(annotation_service, 'generate_target_id', return_value=200):
                annotation_service.create(
                    db=mock_db,
                    annotation=create_annotation_data,
                    user=mock_user,
                    classroom_id=None
                )
        
        mock_db.refresh.assert_called_once()
    
    def test_create_annotation_with_classroom(
        self,
        annotation_service,
        mock_db,
        mock_user,
        create_annotation_data
    ):
        """Should pass classroom_id to annotation model."""
        with patch.object(annotation_service, 'generate_body_id', return_value=100):
            with patch.object(annotation_service, 'generate_target_id', return_value=200):
                annotation_service.create(
                    db=mock_db,
                    annotation=create_annotation_data,
                    user=mock_user,
                    classroom_id=5
                )
        
        # Verify add was called with an annotation that has the classroom_id
        call_args = mock_db.add.call_args
        added_annotation = call_args[0][0]
        assert added_annotation.classroom_id == 5

class TestAnnotationServiceGetById:
    """Test get_by_id method."""
    
    @pytest.fixture
    def mock_db(self):
        """Create mock database session."""
        return MagicMock()
    
    def test_get_by_id_returns_annotation(self, annotation_service, mock_db):
        """Should return annotation when found."""
        mock_annotation = Mock()
        mock_annotation.id = 1
        mock_annotation.motivation = "commenting"
        
        mock_query = MagicMock()
        mock_query.options.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.first.return_value = mock_annotation
        
        with patch.object(annotation_service, 'get_base_query', return_value=mock_query):
            with patch.object(annotation_service, 'apply_classroom_filter', return_value=mock_query):
                result = annotation_service.get_by_id(
                    db=mock_db,
                    annotation_id=1,
                    classroom_id=None
                )
        
        assert result == mock_annotation
    
    def test_get_by_id_not_found_raises_404(self, annotation_service, mock_db):
        """Should raise 404 when annotation not found."""
        mock_query = MagicMock()
        mock_query.options.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.first.return_value = None
        
        with patch.object(annotation_service, 'get_base_query', return_value=mock_query):
            with patch.object(annotation_service, 'apply_classroom_filter', return_value=mock_query):
                with pytest.raises(HTTPException) as exc_info:
                    annotation_service.get_by_id(
                        db=mock_db,
                        annotation_id=99999,
                        classroom_id=None
                    )
        
        assert exc_info.value.status_code == 404
        assert "not found" in exc_info.value.detail.lower()
    
    def test_get_by_id_with_classroom_filter(self, annotation_service, mock_db):
        """Should apply classroom filter when provided."""
        mock_annotation = Mock()
        mock_annotation.id = 1
        
        mock_query = MagicMock()
        mock_query.options.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.first.return_value = mock_annotation
        
        with patch.object(annotation_service, 'get_base_query', return_value=mock_query):
            with patch.object(annotation_service, 'apply_classroom_filter', return_value=mock_query) as mock_filter:
                annotation_service.get_by_id(
                    db=mock_db,
                    annotation_id=1,
                    classroom_id=5
                )
        
        mock_filter.assert_called_once_with(mock_query, 5)


class TestAnnotationServiceList:
    """Test list method with filtering and pagination."""
    
    @pytest.fixture
    def mock_db(self):
        """Create mock database session."""
        db = MagicMock()
        # Mock the Group query for classroom member filtering
        mock_group = Mock()
        mock_group.members = []
        db.query.return_value.filter.return_value.first.return_value = None
        return db
    
    def test_list_returns_annotations(self, annotation_service, mock_db):
        """Should return list of annotations."""
        mock_annotation1 = Mock()
        mock_annotation2 = Mock()
        
        mock_query = MagicMock()
        mock_query.options.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.offset.return_value = mock_query
        mock_query.limit.return_value = mock_query
        mock_query.all.return_value = [mock_annotation1, mock_annotation2]
        
        with patch.object(annotation_service, 'get_base_query', return_value=mock_query):
            with patch.object(annotation_service, 'apply_classroom_filter', return_value=mock_query):
                result = annotation_service.list(
                    db=mock_db,
                    classroom_id=None
                )
        
        assert len(result) == 2
    
    def test_list_applies_motivation_filter(self, annotation_service, mock_db):
        """Should filter by motivation."""
        mock_query = MagicMock()
        mock_query.options.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.offset.return_value = mock_query
        mock_query.limit.return_value = mock_query
        mock_query.all.return_value = []
        
        with patch.object(annotation_service, 'get_base_query', return_value=mock_query):
            with patch.object(annotation_service, 'apply_classroom_filter', return_value=mock_query):
                annotation_service.list(
                    db=mock_db,
                    classroom_id=None,
                    motivation="commenting"
                )
        
        # Verify filter was called (motivation filter)
        assert mock_query.filter.called
    
    def test_list_applies_document_element_filter(self, annotation_service, mock_db):
        """Should filter by document_element_id."""
        mock_query = MagicMock()
        mock_query.options.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.offset.return_value = mock_query
        mock_query.limit.return_value = mock_query
        mock_query.all.return_value = []
        
        with patch.object(annotation_service, 'get_base_query', return_value=mock_query):
            with patch.object(annotation_service, 'apply_classroom_filter', return_value=mock_query):
                annotation_service.list(
                    db=mock_db,
                    classroom_id=None,
                    document_element_id=42
                )
        
        assert mock_query.filter.called
    
    def test_list_applies_pagination_skip(self, annotation_service, mock_db):
        """Should apply skip parameter."""
        mock_query = MagicMock()
        mock_query.options.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.offset.return_value = mock_query
        mock_query.limit.return_value = mock_query
        mock_query.all.return_value = []
        
        with patch.object(annotation_service, 'get_base_query', return_value=mock_query):
            with patch.object(annotation_service, 'apply_classroom_filter', return_value=mock_query):
                annotation_service.list(
                    db=mock_db,
                    classroom_id=None,
                    skip=10
                )
        
        mock_query.offset.assert_called_with(10)
    
    def test_list_applies_pagination_limit(self, annotation_service, mock_db):
        """Should apply limit parameter."""
        mock_query = MagicMock()
        mock_query.options.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.offset.return_value = mock_query
        mock_query.limit.return_value = mock_query
        mock_query.all.return_value = []
        
        with patch.object(annotation_service, 'get_base_query', return_value=mock_query):
            with patch.object(annotation_service, 'apply_classroom_filter', return_value=mock_query):
                annotation_service.list(
                    db=mock_db,
                    classroom_id=None,
                    limit=25
                )
        
        mock_query.limit.assert_called_with(25)
    
    def test_list_default_pagination(self, annotation_service, mock_db):
        """Should use default skip=0 and limit=100."""
        mock_query = MagicMock()
        mock_query.options.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.offset.return_value = mock_query
        mock_query.limit.return_value = mock_query
        mock_query.all.return_value = []
        
        with patch.object(annotation_service, 'get_base_query', return_value=mock_query):
            with patch.object(annotation_service, 'apply_classroom_filter', return_value=mock_query):
                annotation_service.list(
                    db=mock_db,
                    classroom_id=None
                )
        
        mock_query.offset.assert_called_with(0)
        mock_query.limit.assert_called_with(100)

class TestAnnotationServiceUpdate:
    """Test update method."""
    
    @pytest.fixture
    def mock_db(self):
        """Create mock database session."""
        db = MagicMock()
        db.commit = Mock()
        db.refresh = Mock()
        return db
    
    def test_update_body_success(self, annotation_service, mock_db):
        """Should update annotation body value."""
        mock_annotation = Mock()
        mock_annotation.body = {
            "id": 1,
            "type": "TextualBody",
            "value": "Old value",
            "format": "text/plain",
            "language": "en"
        }
        
        mock_query = MagicMock()
        mock_query.filter.return_value = mock_query
        mock_query.first.return_value = mock_annotation
        
        patch_data = AnnotationPatch(body="New value")
        
        with patch.object(annotation_service, 'get_base_query', return_value=mock_query):
            with patch.object(annotation_service, 'apply_classroom_filter', return_value=mock_query):
                result = annotation_service.update(
                    db=mock_db,
                    annotation_id=1,
                    payload=patch_data,
                    classroom_id=None
                )
        
        assert result.body["value"] == "New value"
    
    def test_update_body_preserves_other_fields(self, annotation_service, mock_db):
        """Should preserve other body fields when updating value."""
        mock_annotation = Mock()
        mock_annotation.body = {
            "id": 1,
            "type": "TextualBody",
            "value": "Old value",
            "format": "text/plain",
            "language": "en"
        }
        
        mock_query = MagicMock()
        mock_query.filter.return_value = mock_query
        mock_query.first.return_value = mock_annotation
        
        patch_data = AnnotationPatch(body="New value")
        
        with patch.object(annotation_service, 'get_base_query', return_value=mock_query):
            with patch.object(annotation_service, 'apply_classroom_filter', return_value=mock_query):
                result = annotation_service.update(
                    db=mock_db,
                    annotation_id=1,
                    payload=patch_data,
                    classroom_id=None
                )
        
        assert result.body["type"] == "TextualBody"
        assert result.body["format"] == "text/plain"
        assert result.body["language"] == "en"
    
    def test_update_motivation_success(self, annotation_service, mock_db):
        """Should update annotation motivation."""
        mock_annotation = Mock()
        mock_annotation.body = {"value": "Test"}
        mock_annotation.motivation = "commenting"
        
        mock_query = MagicMock()
        mock_query.filter.return_value = mock_query
        mock_query.first.return_value = mock_annotation
        
        patch_data = AnnotationPatch(motivation="highlighting")
        
        with patch.object(annotation_service, 'get_base_query', return_value=mock_query):
            with patch.object(annotation_service, 'apply_classroom_filter', return_value=mock_query):
                result = annotation_service.update(
                    db=mock_db,
                    annotation_id=1,
                    payload=patch_data,
                    classroom_id=None
                )
        
        assert result.motivation == "highlighting"
    
    def test_update_sets_modified_timestamp(self, annotation_service, mock_db):
        """Should update modified timestamp."""
        mock_annotation = Mock()
        mock_annotation.body = {"value": "Test"}
        mock_annotation.modified = None
        
        mock_query = MagicMock()
        mock_query.filter.return_value = mock_query
        mock_query.first.return_value = mock_annotation
        
        patch_data = AnnotationPatch(body="Changed")
        
        with patch.object(annotation_service, 'get_base_query', return_value=mock_query):
            with patch.object(annotation_service, 'apply_classroom_filter', return_value=mock_query):
                annotation_service.update(
                    db=mock_db,
                    annotation_id=1,
                    payload=patch_data,
                    classroom_id=None
                )
        
        assert mock_annotation.modified is not None
    
    def test_update_commits_session(self, annotation_service, mock_db):
        """Should commit database session."""
        mock_annotation = Mock()
        mock_annotation.body = {"value": "Test"}
        
        mock_query = MagicMock()
        mock_query.filter.return_value = mock_query
        mock_query.first.return_value = mock_annotation
        
        patch_data = AnnotationPatch(body="New")
        
        with patch.object(annotation_service, 'get_base_query', return_value=mock_query):
            with patch.object(annotation_service, 'apply_classroom_filter', return_value=mock_query):
                annotation_service.update(
                    db=mock_db,
                    annotation_id=1,
                    payload=patch_data,
                    classroom_id=None
                )
        
        mock_db.commit.assert_called()
    
    def test_update_not_found_raises_404(self, annotation_service, mock_db):
        """Should raise 404 when annotation not found."""
        mock_query = MagicMock()
        mock_query.filter.return_value = mock_query
        mock_query.first.return_value = None
        
        patch_data = AnnotationPatch(body="Content")
        
        with patch.object(annotation_service, 'get_base_query', return_value=mock_query):
            with patch.object(annotation_service, 'apply_classroom_filter', return_value=mock_query):
                with pytest.raises(HTTPException) as exc_info:
                    annotation_service.update(
                        db=mock_db,
                        annotation_id=99999,
                        payload=patch_data,
                        classroom_id=None
                    )
        
        assert exc_info.value.status_code == 404
        assert "not found" in exc_info.value.detail.lower()


class TestAnnotationServiceDelete:
    """Test delete method."""
    
    @pytest.fixture
    def mock_db(self):
        """Create mock database session."""
        db = MagicMock()
        db.delete = Mock()
        db.commit = Mock()
        return db
    
    def test_delete_success(self, annotation_service, mock_db):
        """Should delete annotation."""
        mock_annotation = Mock()
        mock_annotation.id = 1
        
        mock_query = MagicMock()
        mock_query.filter.return_value = mock_query
        mock_query.first.return_value = mock_annotation
        
        with patch.object(annotation_service, 'get_base_query', return_value=mock_query):
            with patch.object(annotation_service, 'apply_classroom_filter', return_value=mock_query):
                annotation_service.delete(
                    db=mock_db,
                    annotation_id=1,
                    classroom_id=None
                )
        
        mock_db.delete.assert_called_once_with(mock_annotation)
    
    def test_delete_commits_session(self, annotation_service, mock_db):
        """Should commit database session after delete."""
        mock_annotation = Mock()
        mock_annotation.id = 1
        
        mock_query = MagicMock()
        mock_query.filter.return_value = mock_query
        mock_query.first.return_value = mock_annotation
        
        with patch.object(annotation_service, 'get_base_query', return_value=mock_query):
            with patch.object(annotation_service, 'apply_classroom_filter', return_value=mock_query):
                annotation_service.delete(
                    db=mock_db,
                    annotation_id=1,
                    classroom_id=None
                )
        
        mock_db.commit.assert_called_once()
    
    def test_delete_not_found_raises_404(self, annotation_service, mock_db):
        """Should raise 404 when annotation not found."""
        mock_query = MagicMock()
        mock_query.filter.return_value = mock_query
        mock_query.first.return_value = None
        
        with patch.object(annotation_service, 'get_base_query', return_value=mock_query):
            with patch.object(annotation_service, 'apply_classroom_filter', return_value=mock_query):
                with pytest.raises(HTTPException) as exc_info:
                    annotation_service.delete(
                        db=mock_db,
                        annotation_id=99999,
                        classroom_id=None
                    )
        
        assert exc_info.value.status_code == 404
        assert "not found" in exc_info.value.detail.lower()
    
    def test_delete_with_classroom_filter(self, annotation_service, mock_db):
        """Should apply classroom filter when deleting."""
        mock_annotation = Mock()
        
        mock_query = MagicMock()
        mock_query.filter.return_value = mock_query
        mock_query.first.return_value = mock_annotation
        
        with patch.object(annotation_service, 'get_base_query', return_value=mock_query):
            with patch.object(annotation_service, 'apply_classroom_filter', return_value=mock_query) as mock_filter:
                annotation_service.delete(
                    db=mock_db,
                    annotation_id=1,
                    classroom_id=5
                )
        
        mock_filter.assert_called_once_with(mock_query, 5)

class TestAnnotationServiceAddTarget:
    """Test add_target method."""
    
    @pytest.fixture
    def mock_db(self):
        """Create mock database session."""
        db = MagicMock()
        db.commit = Mock()
        db.refresh = Mock()
        return db
    
    @pytest.fixture
    def mock_user(self):
        """Create mock user."""
        user = Mock()
        user.id = 1
        user.roles = ["user"]
        return user
    
    def test_add_target_success(self, annotation_service, mock_db, mock_user):
        """Should add target to annotation."""
        mock_annotation = Mock()
        mock_annotation.id = 1
        mock_annotation.target = [{"id": 1, "type": "TextTarget", "source": "doc/1"}]
        
        mock_db.query.return_value.filter.return_value.first.return_value = mock_annotation
        
        new_target = AnnotationAddTarget(
            target=[TextTarget(type="TextTarget", source="doc/2", selector=None)]
        )
        
        with patch.object(annotation_service, 'generate_target_id', return_value=999):
            result = annotation_service.add_target(
                db=mock_db,
                annotation_id=1,
                payload=new_target,
                user=mock_user
            )
        
        assert result == mock_annotation
        assert len(mock_annotation.target) == 2
    
    def test_add_target_generates_id(self, annotation_service, mock_db, mock_user):
        """Should generate ID for new target."""
        mock_annotation = Mock()
        mock_annotation.id = 1
        mock_annotation.target = []
        
        mock_db.query.return_value.filter.return_value.first.return_value = mock_annotation
        
        new_target = AnnotationAddTarget(
            target=[TextTarget(type="TextTarget", source="doc/1", selector=None)]
        )
        
        with patch.object(annotation_service, 'generate_target_id', return_value=888) as mock_gen:
            annotation_service.add_target(
                db=mock_db,
                annotation_id=1,
                payload=new_target,
                user=mock_user
            )
        
        mock_gen.assert_called()
    
    def test_add_target_updates_modified_timestamp(self, annotation_service, mock_db, mock_user):
        """Should update modified timestamp."""
        mock_annotation = Mock()
        mock_annotation.id = 1
        mock_annotation.target = []
        mock_annotation.modified = None
        
        mock_db.query.return_value.filter.return_value.first.return_value = mock_annotation
        
        new_target = AnnotationAddTarget(
            target=[TextTarget(type="TextTarget", source="doc/1", selector=None)]
        )
        
        with patch.object(annotation_service, 'generate_target_id', return_value=999):
            annotation_service.add_target(
                db=mock_db,
                annotation_id=1,
                payload=new_target,
                user=mock_user
            )
        
        assert mock_annotation.modified is not None
    
    def test_add_target_commits_session(self, annotation_service, mock_db, mock_user):
        """Should commit database session."""
        mock_annotation = Mock()
        mock_annotation.id = 1
        mock_annotation.target = []
        
        mock_db.query.return_value.filter.return_value.first.return_value = mock_annotation
        
        new_target = AnnotationAddTarget(
            target=[TextTarget(type="TextTarget", source="doc/1", selector=None)]
        )
        
        with patch.object(annotation_service, 'generate_target_id', return_value=999):
            annotation_service.add_target(
                db=mock_db,
                annotation_id=1,
                payload=new_target,
                user=mock_user
            )
        
        mock_db.commit.assert_called()
    
    def test_add_target_not_found_raises_404(self, annotation_service, mock_db, mock_user):
        """Should raise 404 when annotation not found."""
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        new_target = AnnotationAddTarget(
            target=[TextTarget(type="TextTarget", source="doc/1", selector=None)]
        )
        
        with pytest.raises(HTTPException) as exc_info:
            annotation_service.add_target(
                db=mock_db,
                annotation_id=99999,
                payload=new_target,
                user=mock_user
            )
        
        assert exc_info.value.status_code == 404
        assert "not found" in exc_info.value.detail.lower()
    
    def test_add_multiple_targets(self, annotation_service, mock_db, mock_user):
        """Should add multiple targets at once."""
        mock_annotation = Mock()
        mock_annotation.id = 1
        mock_annotation.target = []
        
        mock_db.query.return_value.filter.return_value.first.return_value = mock_annotation
        
        new_targets = AnnotationAddTarget(
            target=[
                TextTarget(type="TextTarget", source="doc/1", selector=None),
                ObjectTarget(type="ObjectTarget", source="img/1")
            ]
        )
        
        with patch.object(annotation_service, 'generate_target_id', side_effect=[111, 222]):
            annotation_service.add_target(
                db=mock_db,
                annotation_id=1,
                payload=new_targets,
                user=mock_user
            )
        
        assert len(mock_annotation.target) == 2

class TestAnnotationServiceRemoveTarget:
    """Test remove_target method."""
    
    @pytest.fixture
    def mock_db(self):
        """Create mock database session."""
        db = MagicMock()
        db.delete = Mock()
        db.commit = Mock()
        db.refresh = Mock()
        return db
    
    @pytest.fixture
    def mock_user_creator(self):
        """Create mock user who is the annotation creator."""
        user = Mock()
        user.id = 1
        user.roles = ["user"]
        return user
    
    @pytest.fixture
    def mock_user_admin(self):
        """Create mock admin user."""
        user = Mock()
        user.id = 2
        user.roles = ["admin", "user"]
        return user
    
    @pytest.fixture
    def mock_user_verified_scholar(self):
        """Create mock verified scholar user."""
        user = Mock()
        user.id = 3
        user.roles = ["verified_scholar", "user"]
        return user
    
    @pytest.fixture
    def mock_user_other(self):
        """Create mock user who is not the creator."""
        user = Mock()
        user.id = 99
        user.roles = ["user"]
        return user
    
    def test_remove_target_success(self, annotation_service, mock_db, mock_user_creator):
        """Should remove target from annotation."""
        mock_annotation = Mock()
        mock_annotation.id = 1
        mock_annotation.creator_id = 1
        mock_annotation.target = [
            {"id": 1, "type": "TextTarget", "source": "doc/1"},
            {"id": 2, "type": "TextTarget", "source": "doc/2"}
        ]
        
        mock_db.query.return_value.filter.return_value.first.return_value = mock_annotation
        
        result = annotation_service.remove_target(
            db=mock_db,
            annotation_id=1,
            target_id=1,
            user=mock_user_creator
        )
        
        assert result == mock_annotation
        assert len(mock_annotation.target) == 1
        assert mock_annotation.target[0]["id"] == 2
    
    def test_remove_target_updates_modified_timestamp(
        self, annotation_service, mock_db, mock_user_creator
    ):
        """Should update modified timestamp."""
        mock_annotation = Mock()
        mock_annotation.id = 1
        mock_annotation.creator_id = 1
        mock_annotation.modified = None
        mock_annotation.target = [
            {"id": 1, "type": "TextTarget", "source": "doc/1"},
            {"id": 2, "type": "TextTarget", "source": "doc/2"}
        ]
        
        mock_db.query.return_value.filter.return_value.first.return_value = mock_annotation
        
        annotation_service.remove_target(
            db=mock_db,
            annotation_id=1,
            target_id=1,
            user=mock_user_creator
        )
        
        assert mock_annotation.modified is not None
    
    def test_remove_last_target_deletes_annotation(
        self, annotation_service, mock_db, mock_user_creator
    ):
        """Should delete annotation when last target is removed."""
        mock_annotation = Mock()
        mock_annotation.id = 1
        mock_annotation.creator_id = 1
        mock_annotation.target = [{"id": 1, "type": "TextTarget", "source": "doc/1"}]
        
        mock_db.query.return_value.filter.return_value.first.return_value = mock_annotation
        
        result = annotation_service.remove_target(
            db=mock_db,
            annotation_id=1,
            target_id=1,
            user=mock_user_creator
        )
        
        assert result is None
        mock_db.delete.assert_called_once_with(mock_annotation)
    
    def test_remove_target_annotation_not_found_raises_404(
        self, annotation_service, mock_db, mock_user_creator
    ):
        """Should raise 404 when annotation not found."""
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        with pytest.raises(HTTPException) as exc_info:
            annotation_service.remove_target(
                db=mock_db,
                annotation_id=99999,
                target_id=1,
                user=mock_user_creator
            )
        
        assert exc_info.value.status_code == 404
        assert "annotation not found" in exc_info.value.detail.lower()
    
    def test_remove_target_target_not_found_raises_404(
        self, annotation_service, mock_db, mock_user_creator
    ):
        """Should raise 404 when target not found in annotation."""
        mock_annotation = Mock()
        mock_annotation.id = 1
        mock_annotation.creator_id = 1
        mock_annotation.target = [{"id": 1, "type": "TextTarget", "source": "doc/1"}]
        
        mock_db.query.return_value.filter.return_value.first.return_value = mock_annotation
        
        with pytest.raises(HTTPException) as exc_info:
            annotation_service.remove_target(
                db=mock_db,
                annotation_id=1,
                target_id=99999,
                user=mock_user_creator
            )
        
        assert exc_info.value.status_code == 404
        assert "target not found" in exc_info.value.detail.lower()
    
    def test_remove_target_permission_denied_for_non_creator(
        self, annotation_service, mock_db, mock_user_other
    ):
        """Should raise 403 when user is not creator, admin, or verified scholar."""
        mock_annotation = Mock()
        mock_annotation.id = 1
        mock_annotation.creator_id = 1  # Different from mock_user_other.id
        mock_annotation.target = [{"id": 1, "type": "TextTarget", "source": "doc/1"}]
        
        mock_db.query.return_value.filter.return_value.first.return_value = mock_annotation
        
        with pytest.raises(HTTPException) as exc_info:
            annotation_service.remove_target(
                db=mock_db,
                annotation_id=1,
                target_id=1,
                user=mock_user_other
            )
        
        assert exc_info.value.status_code == 403
        assert "permission" in exc_info.value.detail.lower()
    
    def test_remove_target_allowed_for_admin(
        self, annotation_service, mock_db, mock_user_admin
    ):
        """Should allow admin to remove target."""
        mock_annotation = Mock()
        mock_annotation.id = 1
        mock_annotation.creator_id = 1  # Different from admin user
        mock_annotation.target = [
            {"id": 1, "type": "TextTarget", "source": "doc/1"},
            {"id": 2, "type": "TextTarget", "source": "doc/2"}
        ]
        
        mock_db.query.return_value.filter.return_value.first.return_value = mock_annotation
        
        result = annotation_service.remove_target(
            db=mock_db,
            annotation_id=1,
            target_id=1,
            user=mock_user_admin
        )
        
        assert result is not None
    
    def test_remove_target_allowed_for_verified_scholar(
        self, annotation_service, mock_db, mock_user_verified_scholar
    ):
        """Should allow verified scholar to remove target."""
        mock_annotation = Mock()
        mock_annotation.id = 1
        mock_annotation.creator_id = 1  # Different from verified scholar user
        mock_annotation.target = [
            {"id": 1, "type": "TextTarget", "source": "doc/1"},
            {"id": 2, "type": "TextTarget", "source": "doc/2"}
        ]
        
        mock_db.query.return_value.filter.return_value.first.return_value = mock_annotation
        
        result = annotation_service.remove_target(
            db=mock_db,
            annotation_id=1,
            target_id=1,
            user=mock_user_verified_scholar
        )
        
        assert result is not None
