# tests/unit/test_annotation_service.py
import pytest
from datetime import datetime
from fastapi import HTTPException

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
    
    def test_service_instantiation(self, annotation_service):
        """Should instantiate service without errors."""
        assert annotation_service is not None
    
    def test_service_has_model(self, annotation_service, AnnotationModel):
        """Should have correct model bound."""
        assert annotation_service.model == AnnotationModel


class TestAnnotationServiceHelpers:
    """Test helper methods."""
    
    def test_dump_targets_flat_list(self, annotation_service):
        """Should serialize flat list of targets."""
        targets = [
            TextTarget(
                type="TextTarget",
                source="doc/1",
                selector=None
            ),
            ObjectTarget(
                type="ObjectTarget",
                source="image/1"
            )
        ]
        
        result = annotation_service._dump_targets(targets)
        
        assert len(result) == 2
        assert result[0]["type"] == "TextTarget"
        assert result[1]["type"] == "ObjectTarget"
    
    def test_dump_targets_nested_list(self, annotation_service):
        """Should serialize nested target lists."""
        targets = [[
            TextTarget(type="TextTarget", source="doc/1", selector=None),
            TextTarget(type="TextTarget", source="doc/2", selector=None)
        ]]
        
        result = annotation_service._dump_targets(targets)
        
        assert len(result) == 1
        assert isinstance(result[0], list)
        assert len(result[0]) == 2
    
    def test_dump_targets_mixed_list(self, annotation_service):
        """Should handle mixed flat and nested targets."""
        targets = [
            TextTarget(type="TextTarget", source="doc/1", selector=None),
            [
                TextTarget(type="TextTarget", source="doc/2", selector=None),
                TextTarget(type="TextTarget", source="doc/3", selector=None)
            ]
        ]
        
        result = annotation_service._dump_targets(targets)
        
        assert len(result) == 2
        assert isinstance(result[0], dict)
        assert isinstance(result[1], list)


class TestAnnotationServiceIDGeneration:
    """Test ID generation methods."""
    
    def test_generate_body_id_increments(self, annotation_service, db_session):
        """Should generate sequential body IDs."""
        id1 = annotation_service.generate_body_id(db_session)
        id2 = annotation_service.generate_body_id(db_session)
        
        assert id2 == id1 + 1
    
    def test_generate_target_id_increments(self, annotation_service, db_session):
        """Should generate sequential target IDs."""
        id1 = annotation_service.generate_target_id(db_session)
        id2 = annotation_service.generate_target_id(db_session)
        
        assert id2 == id1 + 1


class TestAnnotationServiceCreate:
    """Test annotation creation."""
    
    def test_create_annotation_success(
        self,
        annotation_service,
        db_session,
        test_user
    ):
        """Should create annotation in database."""
        annotation_data = AnnotationCreate(
            context="http://www.w3.org/ns/anno.jsonld",
            document_collection_id=1,
            document_id=1,
            document_element_id=1,
            creator_id=test_user.id,
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
                    selector=None
                )
            ]
        )
        
        result = annotation_service.create(
            db=db_session,
            annotation=annotation_data,
            user=test_user,
            classroom_id=None
        )
        
        assert result.id is not None
        assert result.creator_id == test_user.id
        assert result.body["value"] == "Test comment"
        assert len(result.target) == 1
    
    def test_create_annotation_generates_body_id(
        self,
        annotation_service,
        db_session,
        test_user
    ):
        """Should assign ID to body."""
        annotation_data = AnnotationCreate(
            context="http://www.w3.org/ns/anno.jsonld",
            document_collection_id=1,
            document_id=1,
            document_element_id=1,
            creator_id=test_user.id,
            type="Annotation",
            motivation="commenting",
            generator="test-app",
            body=Body(
                type="TextualBody",
                value="Test",
                format="text/plain",
                language="en"
            ),
            target=[TextTarget(type="TextTarget", source="doc/1", selector=None)]
        )
        
        result = annotation_service.create(
            db=db_session,
            annotation=annotation_data,
            user=test_user,
            classroom_id=None
        )
        
        assert result.body["id"] is not None
        assert isinstance(result.body["id"], int)
    
    def test_create_annotation_generates_target_ids(
        self,
        annotation_service,
        db_session,
        test_user
    ):
        """Should assign IDs to all targets."""
        annotation_data = AnnotationCreate(
            context="http://www.w3.org/ns/anno.jsonld",
            document_collection_id=1,
            document_id=1,
            document_element_id=1,
            creator_id=test_user.id,
            type="Annotation",
            motivation="commenting",
            generator="test-app",
            body=Body(
                type="TextualBody",
                value="Test",
                format="text/plain",
                language="en"
            ),
            target=[
                TextTarget(type="TextTarget", source="doc/1", selector=None),
                TextTarget(type="TextTarget", source="doc/2", selector=None)
            ]
        )
        
        result = annotation_service.create(
            db=db_session,
            annotation=annotation_data,
            user=test_user,
            classroom_id=None
        )
        
        assert result.target[0]["id"] is not None
        assert result.target[1]["id"] is not None
        assert result.target[0]["id"] != result.target[1]["id"]
    
    def test_create_annotation_persists_to_database(
        self,
        annotation_service,
        db_session,
        test_user,
        AnnotationModel
    ):
        """Should persist annotation to database."""
        annotation_data = AnnotationCreate(
            context="http://www.w3.org/ns/anno.jsonld",
            document_collection_id=1,
            document_id=1,
            document_element_id=1,
            creator_id=test_user.id,
            type="Annotation",
            motivation="commenting",
            generator="test-app",
            body=Body(
                type="TextualBody",
                value="Test",
                format="text/plain",
                language="en"
            ),
            target=[TextTarget(type="TextTarget", source="doc/1", selector=None)]
        )
        
        result = annotation_service.create(
            db=db_session,
            annotation=annotation_data,
            user=test_user,
            classroom_id=None
        )
        
        # Query database directly to verify persistence
        db_annotation = db_session.query(AnnotationModel).filter(
            AnnotationModel.id == result.id
        ).first()
        
        assert db_annotation is not None
        assert db_annotation.creator_id == test_user.id
    
    def test_create_annotation_sets_timestamps(
        self,
        annotation_service,
        db_session,
        test_user
    ):
        """Should set created and modified timestamps."""
        annotation_data = AnnotationCreate(
            context="http://www.w3.org/ns/anno.jsonld",
            document_collection_id=1,
            document_id=1,
            document_element_id=1,
            creator_id=test_user.id,
            type="Annotation",
            motivation="commenting",
            generator="test-app",
            body=Body(
                type="TextualBody",
                value="Test",
                format="text/plain",
                language="en"
            ),
            target=[TextTarget(type="TextTarget", source="doc/1", selector=None)]
        )
        
        result = annotation_service.create(
            db=db_session,
            annotation=annotation_data,
            user=test_user,
            classroom_id=None
        )
        
        assert result.created is not None
        assert result.modified is not None
        assert result.generated is not None
    
    def test_create_annotation_with_classroom(
        self,
        annotation_service,
        db_session,
        test_user,
        test_classroom
    ):
        """Should assign classroom_id when provided."""
        annotation_data = AnnotationCreate(
            context="http://www.w3.org/ns/anno.jsonld",
            document_collection_id=1,
            document_id=1,
            document_element_id=1,
            creator_id=test_user.id,
            type="Annotation",
            motivation="commenting",
            generator="test-app",
            body=Body(
                type="TextualBody",
                value="Test",
                format="text/plain",
                language="en"
            ),
            target=[TextTarget(type="TextTarget", source="doc/1", selector=None)]
        )
        
        result = annotation_service.create(
            db=db_session,
            annotation=annotation_data,
            user=test_user,
            classroom_id=test_classroom.id
        )
        
        assert result.classroom_id == test_classroom.id


class TestAnnotationServiceGetById:
    """Test get_by_id method."""
    
    def test_get_by_id_returns_annotation(
        self,
        annotation_service,
        db_session,
        test_annotation
    ):
        """Should retrieve annotation by ID."""
        result = annotation_service.get_by_id(
            db=db_session,
            annotation_id=test_annotation.id,
            classroom_id=None
        )
        
        assert result is not None
        assert result.id == test_annotation.id
        assert result.body["value"] == test_annotation.body["value"]
    
    def test_get_by_id_not_found_raises_404(
        self,
        annotation_service,
        db_session
    ):
        """Should raise 404 when annotation not found."""
        with pytest.raises(HTTPException) as exc_info:
            annotation_service.get_by_id(
                db=db_session,
                annotation_id=9999,
                classroom_id=None
            )
        
        assert exc_info.value.status_code == 404
    
    def test_get_by_id_with_classroom_filter(
        self,
        annotation_service,
        db_session,
        test_annotation_with_classroom
    ):
        """Should filter by classroom_id when provided."""
        # Should find annotation in correct classroom
        result = annotation_service.get_by_id(
            db=db_session,
            annotation_id=test_annotation_with_classroom.id,
            classroom_id=test_annotation_with_classroom.classroom_id
        )
        
        assert result is not None
        assert result.classroom_id == test_annotation_with_classroom.classroom_id
        
        # Should NOT find annotation when filtering by wrong classroom
        with pytest.raises(HTTPException) as exc_info:
            annotation_service.get_by_id(
                db=db_session,
                annotation_id=test_annotation_with_classroom.id,
                classroom_id=999
            )
        
        assert exc_info.value.status_code == 404


class TestAnnotationServiceList:
    """Test list method with filtering and pagination."""
    
    def test_list_returns_annotations(
        self,
        annotation_service,
        db_session,
        multiple_test_annotations
    ):
        """Should return list of annotations."""
        result = annotation_service.list(
            db=db_session,
            classroom_id=None
        )
        
        assert len(result) >= len(multiple_test_annotations)
    
    def test_list_applies_motivation_filter(
        self,
        annotation_service,
        db_session,
        multiple_test_annotations
    ):
        """Should filter by motivation."""
        result = annotation_service.list(
            db=db_session,
            classroom_id=None,
            motivation="commenting"
        )
        
        assert all(ann.motivation == "commenting" for ann in result)
    
    def test_list_applies_document_element_filter(
        self,
        annotation_service,
        db_session,
        multiple_test_annotations
    ):
        """Should filter by document_element_id."""
        result = annotation_service.list(
            db=db_session,
            classroom_id=None,
            document_element_id=1
        )
        
        assert all(ann.document_element_id == 1 for ann in result)
    
    def test_list_applies_pagination_skip(
        self,
        annotation_service,
        db_session,
        multiple_test_annotations
    ):
        """Should skip specified number of records."""
        all_results = annotation_service.list(
            db=db_session,
            classroom_id=None,
            skip=0,
            limit=100
        )
        
        skipped_results = annotation_service.list(
            db=db_session,
            classroom_id=None,
            skip=1,
            limit=100
        )
        
        assert len(skipped_results) == len(all_results) - 1
    
    def test_list_applies_pagination_limit(
        self,
        annotation_service,
        db_session,
        multiple_test_annotations
    ):
        """Should limit number of returned records."""
        result = annotation_service.list(
            db=db_session,
            classroom_id=None,
            skip=0,
            limit=2
        )
        
        assert len(result) == 2
    
    def test_list_default_pagination(
        self,
        annotation_service,
        db_session,
        multiple_test_annotations
    ):
        """Should use default pagination values."""
        result = annotation_service.list(
            db=db_session,
            classroom_id=None
        )
        
        assert len(result) <= 100  # Default limit


class TestAnnotationServiceUpdate:
    """Test update method."""
    
    def test_update_body_success(
        self,
        annotation_service,
        db_session,
        test_annotation
    ):
        """Should update annotation body value."""
        payload = AnnotationPatch(body="Updated comment text")
        
        result = annotation_service.update(
            db=db_session,
            annotation_id=test_annotation.id,
            payload=payload,
            classroom_id=None
        )
        
        assert result.body["value"] == "Updated comment text"
    
    def test_update_body_preserves_other_fields(
        self,
        annotation_service,
        db_session,
        test_annotation
    ):
        """Should preserve other body fields when updating value."""
        original_type = test_annotation.body["type"]
        original_format = test_annotation.body["format"]
        
        payload = AnnotationPatch(body="Updated text")
        
        result = annotation_service.update(
            db=db_session,
            annotation_id=test_annotation.id,
            payload=payload,
            classroom_id=None
        )
        
        assert result.body["type"] == original_type
        assert result.body["format"] == original_format
    
    def test_update_motivation_success(
        self,
        annotation_service,
        db_session,
        test_annotation
    ):
        """Should update motivation field."""
        payload = AnnotationPatch(motivation="highlighting")
        
        result = annotation_service.update(
            db=db_session,
            annotation_id=test_annotation.id,
            payload=payload,
            classroom_id=None
        )
        
        assert result.motivation == "highlighting"
    
    def test_update_sets_modified_timestamp(
        self,
        annotation_service,
        db_session,
        test_annotation
    ):
        """Should update modified timestamp."""
        from datetime import timedelta
        
        # Set modified to a time in the past to ensure the new timestamp is greater
        test_annotation.modified = datetime.now() - timedelta(seconds=1)
        db_session.commit()
        
        original_modified = test_annotation.modified
        
        payload = AnnotationPatch(body="Updated")
        
        result = annotation_service.update(
            db=db_session,
            annotation_id=test_annotation.id,
            payload=payload,
            classroom_id=None
        )
        
        assert result.modified > original_modified
    
    def test_update_persists_to_database(
        self,
        annotation_service,
        db_session,
        test_annotation,
        AnnotationModel
    ):
        """Should persist updates to database."""
        payload = AnnotationPatch(body="Persisted update")
        
        annotation_service.update(
            db=db_session,
            annotation_id=test_annotation.id,
            payload=payload,
            classroom_id=None
        )
        
        # Query database directly to verify persistence
        db_annotation = db_session.query(AnnotationModel).filter(
            AnnotationModel.id == test_annotation.id
        ).first()
        
        assert db_annotation.body["value"] == "Persisted update"
    
    def test_update_not_found_raises_404(
        self,
        annotation_service,
        db_session
    ):
        """Should raise 404 when annotation not found."""
        payload = AnnotationPatch(body="Test")
        
        with pytest.raises(HTTPException) as exc_info:
            annotation_service.update(
                db=db_session,
                annotation_id=9999,
                payload=payload,
                classroom_id=None
            )
        
        assert exc_info.value.status_code == 404


class TestAnnotationServiceDelete:
    """Test delete method."""
    
    def test_delete_success(
        self,
        annotation_service,
        db_session,
        test_annotation,
        AnnotationModel
    ):
        """Should delete annotation from database."""
        annotation_id = test_annotation.id
        
        annotation_service.delete(
            db=db_session,
            annotation_id=annotation_id,
            classroom_id=None
        )
        
        # Verify deletion from database
        db_annotation = db_session.query(AnnotationModel).filter(
            AnnotationModel.id == annotation_id
        ).first()
        
        assert db_annotation is None
    
    def test_delete_commits_transaction(
        self,
        annotation_service,
        db_session,
        test_annotation,
        AnnotationModel
    ):
        """Should commit deletion transaction."""
        annotation_id = test_annotation.id
        
        annotation_service.delete(
            db=db_session,
            annotation_id=annotation_id,
            classroom_id=None
        )
        
        # Start new transaction to verify commit
        db_session.rollback()
        db_session.expire_all()
        
        db_annotation = db_session.query(AnnotationModel).filter(
            AnnotationModel.id == annotation_id
        ).first()
        
        assert db_annotation is None
    
    def test_delete_not_found_raises_404(
        self,
        annotation_service,
        db_session
    ):
        """Should raise 404 when annotation not found."""
        with pytest.raises(HTTPException) as exc_info:
            annotation_service.delete(
                db=db_session,
                annotation_id=9999,
                classroom_id=None
            )
        
        assert exc_info.value.status_code == 404
    
    def test_delete_with_classroom_filter(
        self,
        annotation_service,
        db_session,
        test_annotation_with_classroom,
        AnnotationModel
    ):
        """Should apply classroom filter when deleting."""
        annotation_id = test_annotation_with_classroom.id
        classroom_id = test_annotation_with_classroom.classroom_id
        
        # Should delete when correct classroom provided
        annotation_service.delete(
            db=db_session,
            annotation_id=annotation_id,
            classroom_id=classroom_id
        )
        
        db_annotation = db_session.query(AnnotationModel).filter(
            AnnotationModel.id == annotation_id
        ).first()
        
        assert db_annotation is None


class TestAnnotationServiceAddTarget:
    """Test add_target method."""
    
    def test_add_target_success(
        self,
        annotation_service,
        db_session,
        test_annotation,
        test_user
    ):
        """Should add target to annotation."""
        original_target_count = len(test_annotation.target)
        
        payload = AnnotationAddTarget(
            target=TextTarget(
                type="TextTarget",
                source="doc/2",
                selector=None
            )
        )
        
        result = annotation_service.add_target(
            db=db_session,
            annotation_id=test_annotation.id,
            payload=payload,
            user=test_user
        )
        
        assert len(result.target) == original_target_count + 1
    
    def test_add_target_generates_id(
        self,
        annotation_service,
        db_session,
        test_annotation,
        test_user
    ):
        """Should generate ID for new target."""
        payload = AnnotationAddTarget(
            target=TextTarget(
                type="TextTarget",
                source="doc/new",
                selector=None
            )
        )
        
        result = annotation_service.add_target(
            db=db_session,
            annotation_id=test_annotation.id,
            payload=payload,
            user=test_user
        )
        
        new_target = result.target[-1]
        assert new_target["id"] is not None
    
    def test_add_target_updates_modified_timestamp(
        self,
        annotation_service,
        db_session,
        test_annotation,
        test_user
    ):
        """Should update modified timestamp."""
        from datetime import timedelta
        
        # Set modified to a time in the past to ensure the new timestamp is greater
        test_annotation.modified = datetime.now() - timedelta(seconds=1)
        db_session.commit()
        
        original_modified = test_annotation.modified
        
        payload = AnnotationAddTarget(
            target=TextTarget(type="TextTarget", source="doc/2", selector=None)
        )
        
        result = annotation_service.add_target(
            db=db_session,
            annotation_id=test_annotation.id,
            payload=payload,
            user=test_user
        )
        
        assert result.modified > original_modified
    
    def test_add_target_persists_to_database(
        self,
        annotation_service,
        db_session,
        test_annotation,
        test_user,
        AnnotationModel
    ):
        """Should persist new target to database."""
        payload = AnnotationAddTarget(
            target=TextTarget(type="TextTarget", source="doc/persist", selector=None)
        )
        
        annotation_service.add_target(
            db=db_session,
            annotation_id=test_annotation.id,
            payload=payload,
            user=test_user
        )
        
        # Query database directly to verify persistence
        db_annotation = db_session.query(AnnotationModel).filter(
            AnnotationModel.id == test_annotation.id
        ).first()
        
        assert any(t["source"] == "doc/persist" for t in db_annotation.target)
    
    def test_add_target_not_found_raises_404(
        self,
        annotation_service,
        db_session,
        test_user
    ):
        """Should raise 404 when annotation not found."""
        payload = AnnotationAddTarget(
            target=TextTarget(type="TextTarget", source="doc/2", selector=None)
        )
        
        with pytest.raises(HTTPException) as exc_info:
            annotation_service.add_target(
                db=db_session,
                annotation_id=9999,
                payload=payload,
                user=test_user
            )
        
        assert exc_info.value.status_code == 404
    
    def test_add_multiple_targets(
        self,
        annotation_service,
        db_session,
        test_annotation,
        test_user
    ):
        """Should add multiple targets at once."""
        original_count = len(test_annotation.target)
        
        payload = AnnotationAddTarget(
            target=[
                TextTarget(type="TextTarget", source="doc/2", selector=None),
                TextTarget(type="TextTarget", source="doc/3", selector=None)
            ]
        )
        
        result = annotation_service.add_target(
            db=db_session,
            annotation_id=test_annotation.id,
            payload=payload,
            user=test_user
        )
        
        assert len(result.target) == original_count + 2


class TestAnnotationServiceRemoveTarget:
    """Test remove_target method."""
    
    def test_remove_target_success(
        self,
        annotation_service,
        db_session,
        annotation_with_multiple_targets,
        test_user
    ):
        """Should remove target from annotation."""
        annotation = annotation_with_multiple_targets
        target_id = annotation.target[0]["id"]
        original_count = len(annotation.target)
        
        # Set user as creator for permission
        annotation.creator_id = test_user.id
        db_session.commit()
        
        result = annotation_service.remove_target(
            db=db_session,
            annotation_id=annotation.id,
            target_id=target_id,
            user=test_user
        )
        
        assert result is not None
        assert len(result.target) == original_count - 1
    
    def test_remove_target_updates_modified_timestamp(
        self,
        annotation_service,
        db_session,
        annotation_with_multiple_targets,
        test_user
    ):
        """Should update modified timestamp."""
        from datetime import datetime, timedelta
        
        annotation = annotation_with_multiple_targets
        annotation.creator_id = test_user.id
        # Set modified to a time in the past to ensure the new timestamp is greater
        annotation.modified = datetime.now() - timedelta(seconds=1)
        db_session.commit()
        
        original_modified = annotation.modified
        target_id = annotation.target[0]["id"]
        
        result = annotation_service.remove_target(
            db=db_session,
            annotation_id=annotation.id,
            target_id=target_id,
            user=test_user
        )
        
        assert result.modified > original_modified
    
    def test_remove_last_target_deletes_annotation(
        self,
        annotation_service,
        db_session,
        test_annotation,
        test_user,
        AnnotationModel
    ):
        """Should delete annotation when last target is removed."""
        annotation = test_annotation
        annotation.creator_id = test_user.id
        db_session.commit()
        
        target_id = annotation.target[0]["id"]
        annotation_id = annotation.id
        
        result = annotation_service.remove_target(
            db=db_session,
            annotation_id=annotation_id,
            target_id=target_id,
            user=test_user
        )
        
        assert result is None
        
        # Verify annotation was deleted from database
        db_annotation = db_session.query(AnnotationModel).filter(
            AnnotationModel.id == annotation_id
        ).first()
        
        assert db_annotation is None
    
    def test_remove_target_annotation_not_found_raises_404(
        self,
        annotation_service,
        db_session,
        test_user
    ):
        """Should raise 404 when annotation not found."""
        with pytest.raises(HTTPException) as exc_info:
            annotation_service.remove_target(
                db=db_session,
                annotation_id=9999,
                target_id=1,
                user=test_user
            )
        
        assert exc_info.value.status_code == 404
    
    def test_remove_target_target_not_found_raises_404(
        self,
        annotation_service,
        db_session,
        test_annotation,
        test_user
    ):
        """Should raise 404 when target not found."""
        annotation = test_annotation
        annotation.creator_id = test_user.id
        db_session.commit()
        
        with pytest.raises(HTTPException) as exc_info:
            annotation_service.remove_target(
                db=db_session,
                annotation_id=annotation.id,
                target_id=9999,
                user=test_user
            )
        
        assert exc_info.value.status_code == 404
    
    def test_remove_target_permission_denied_for_non_creator(
        self,
        annotation_service,
        db_session,
        test_annotation,
        test_user
    ):
        """Should raise 403 when user is not creator, admin, or verified scholar."""
        annotation = test_annotation
        # Set different creator
        annotation.creator_id = 999
        db_session.commit()
        
        # Regular user without special roles
        test_user.roles = ["user"]
        
        target_id = annotation.target[0]["id"]
        
        with pytest.raises(HTTPException) as exc_info:
            annotation_service.remove_target(
                db=db_session,
                annotation_id=annotation.id,
                target_id=target_id,
                user=test_user
            )
        
        assert exc_info.value.status_code == 403
    
    def test_remove_target_allowed_for_admin(
        self,
        annotation_service,
        db_session,
        annotation_with_multiple_targets,
        admin_user
    ):
        """Should allow admin to remove target from any annotation."""
        annotation = annotation_with_multiple_targets
        annotation.creator_id = 999  # Different creator
        db_session.commit()
        
        target_id = annotation.target[0]["id"]
        
        result = annotation_service.remove_target(
            db=db_session,
            annotation_id=annotation.id,
            target_id=target_id,
            user=admin_user
        )
        
        assert result is not None
    
    def test_remove_target_allowed_for_verified_scholar(
        self,
        annotation_service,
        db_session,
        annotation_with_multiple_targets,
        verified_scholar_user
    ):
        """Should allow verified scholar to remove target from any annotation."""
        annotation = annotation_with_multiple_targets
        annotation.creator_id = 999  # Different creator
        db_session.commit()
        
        target_id = annotation.target[0]["id"]
        
        result = annotation_service.remove_target(
            db=db_session,
            annotation_id=annotation.id,
            target_id=target_id,
            user=verified_scholar_user
        )
        
        assert result is not None
