# tests/unit/test_document_collections_service.py
import pytest
import time
from datetime import datetime, timedelta
from fastapi import HTTPException
from sqlalchemy import select

from schemas.document_collections import (
    DocumentCollectionCreate,
    DocumentCollectionUpdate,
    DocumentCollectionPartialUpdate,
    CollectionDisplayOrderItem
)


class TestDocumentCollectionServiceInit:
    """Test DocumentCollectionService initialization."""
    
    def test_service_instantiation(self, document_collection_service, DocumentCollectionModel):
        """Should instantiate service with correct model."""
        assert document_collection_service.model == DocumentCollectionModel


class TestVerifyUserExists:
    """Test _verify_user_exists helper method."""
    
    def test_verify_existing_user(self, document_collection_service, db_session, test_user):
        """Should return user when user exists."""
        user = document_collection_service._verify_user_exists(db_session, test_user.id)
        assert user.id == test_user.id
        assert user.email == test_user.email
    
    def test_verify_nonexistent_user_raises_404(self, document_collection_service, db_session):
        """Should raise 404 when user doesn't exist."""
        with pytest.raises(HTTPException) as exc_info:
            document_collection_service._verify_user_exists(db_session, 999)
        
        assert exc_info.value.status_code == 404
        assert "User with ID 999 not found" in exc_info.value.detail


class TestCheckDuplicateTitle:
    """Test _check_duplicate_title helper method."""
    
    def test_no_duplicate_title(self, document_collection_service, db_session, test_user):
        """Should not raise error when title is unique."""
        # Should not raise
        document_collection_service._check_duplicate_title(db_session, "Unique Title")
    
    def test_duplicate_title_raises_400(self, document_collection_service, db_session, test_document_collection):
        """Should raise 400 when duplicate title exists."""
        with pytest.raises(HTTPException) as exc_info:
            document_collection_service._check_duplicate_title(db_session, "Test Collection")
        
        assert exc_info.value.status_code == 400
        assert "Collection name already exists" in exc_info.value.detail
    
    def test_duplicate_title_case_insensitive(self, document_collection_service, db_session, test_document_collection):
        """Should detect duplicate regardless of case."""
        with pytest.raises(HTTPException) as exc_info:
            document_collection_service._check_duplicate_title(db_session, "TEST COLLECTION")
        
        assert exc_info.value.status_code == 400
    
    def test_duplicate_title_with_whitespace(self, document_collection_service, db_session, test_document_collection):
        """Should detect duplicate with extra whitespace."""
        with pytest.raises(HTTPException) as exc_info:
            document_collection_service._check_duplicate_title(db_session, "  Test Collection  ")
        
        assert exc_info.value.status_code == 400
    
    def test_duplicate_title_with_exclude_id(self, document_collection_service, db_session, test_document_collection):
        """Should allow same title when excluding specific ID (for updates)."""
        # Should not raise when excluding the collection's own ID
        document_collection_service._check_duplicate_title(
            db_session, 
            "Test Collection", 
            exclude_id=test_document_collection.id
        )


class TestGetCollectionById:
    """Test _get_collection_by_id helper method."""
    
    def test_get_existing_collection(self, document_collection_service, db_session, test_document_collection):
        """Should return collection when it exists."""
        collection = document_collection_service._get_collection_by_id(db_session, test_document_collection.id)
        assert collection.id == test_document_collection.id
        assert collection.title == "Test Collection"
    
    def test_get_nonexistent_collection_raises_404(self, document_collection_service, db_session):
        """Should raise 404 when collection doesn't exist."""
        with pytest.raises(HTTPException) as exc_info:
            document_collection_service._get_collection_by_id(db_session, 999)
        
        assert exc_info.value.status_code == 404
        assert "Document collection not found" in exc_info.value.detail
    
    def test_get_collection_with_users(self, document_collection_service, db_session, test_document_collection):
        """Should load user relationships when with_users=True."""
        collection = document_collection_service._get_collection_by_id(
            db_session, 
            test_document_collection.id,
            with_users=True
        )
        assert collection.id == test_document_collection.id
        # Note: created_by relationship should be loaded (test by accessing without triggering lazy load)


class TestCreateCollection:
    """Test create method."""
    
    def test_create_collection_minimal(self, document_collection_service, db_session, test_user, DocumentCollectionModel):
        """Should create collection with minimal required fields."""
        collection_data = DocumentCollectionCreate(
            title="New Collection",
            created_by_id=test_user.id
        )
        
        result = document_collection_service.create(db_session, collection_data)
        
        assert result.id is not None
        assert result.title == "New Collection"
        assert result.created_by_id == test_user.id
        assert result.modified_by_id == test_user.id  # Should be set to creator
        assert result.created is not None
        assert result.modified is not None
        
        # Verify in database
        db_collection = db_session.query(DocumentCollectionModel).filter(
            DocumentCollectionModel.id == result.id
        ).first()
        assert db_collection is not None
        assert db_collection.title == "New Collection"
    
    def test_create_collection_with_all_fields(self, document_collection_service, db_session, test_user, test_site_settings, DocumentCollectionModel):
        """Should create collection with all optional fields."""
        collection_data = DocumentCollectionCreate(
            title="Full Collection",
            visibility="private",
            text_direction="rtl",
            language="ar",
            hierarchy={"type": "tree", "levels": 3},
            collection_metadata={"author": "Test Author"},
            created_by_id=test_user.id
        )
        
        result = document_collection_service.create(db_session, collection_data)
        
        assert result.title == "Full Collection"
        assert result.visibility == "private"
        assert result.text_direction == "rtl"
        assert result.language == "ar"
        assert result.hierarchy == {"type": "tree", "levels": 3}
        assert result.collection_metadata == {"author": "Test Author"}
    
    def test_create_collection_duplicate_title_raises_400(self, document_collection_service, db_session, test_user, test_document_collection):
        """Should raise 400 when title already exists."""
        collection_data = DocumentCollectionCreate(
            title="Test Collection",
            created_by_id=test_user.id
        )
        
        with pytest.raises(HTTPException) as exc_info:
            document_collection_service.create(db_session, collection_data)
        
        assert exc_info.value.status_code == 400
        assert "Collection name already exists" in exc_info.value.detail
    
    def test_create_collection_nonexistent_user_raises_404(self, document_collection_service, db_session):
        """Should raise 404 when user doesn't exist."""
        collection_data = DocumentCollectionCreate(
            title="New Collection",
            created_by_id=999
        )
        
        with pytest.raises(HTTPException) as exc_info:
            document_collection_service.create(db_session, collection_data)
        
        assert exc_info.value.status_code == 404
        assert "User with ID 999 not found" in exc_info.value.detail
    
    def test_create_sets_timestamps(self, document_collection_service, db_session, test_user):
        """Should set created and modified timestamps."""
        before_create = datetime.now() - timedelta(seconds=1)
        
        collection_data = DocumentCollectionCreate(
            title="Timestamped Collection",
            created_by_id=test_user.id
        )
        
        result = document_collection_service.create(db_session, collection_data)
        
        after_create = datetime.now() + timedelta(seconds=1)
        
        assert result.created is not None
        assert result.modified is not None
        assert before_create <= result.created <= after_create
        assert before_create <= result.modified <= after_create


class TestGetById:
    """Test get_by_id method."""
    
    def test_get_by_id_returns_collection(self, document_collection_service, db_session, test_document_collection):
        """Should return collection with statistics."""
        result = document_collection_service.get_by_id(db_session, test_document_collection.id)
        
        assert result.id == test_document_collection.id
        assert result.title == "Test Collection"
        assert hasattr(result, 'document_count')
        assert hasattr(result, 'element_count')
        assert hasattr(result, 'scholarly_annotation_count')
        assert hasattr(result, 'comment_count')
        assert result.document_count == 0  # No documents created
    
    def test_get_by_id_nonexistent_raises_404(self, document_collection_service, db_session):
        """Should raise 404 when collection doesn't exist."""
        with pytest.raises(HTTPException) as exc_info:
            document_collection_service.get_by_id(db_session, 999)
        
        assert exc_info.value.status_code == 404


class TestList:
    """Test list method with filtering and pagination."""
    
    def test_list_all_collections(self, document_collection_service, db_session, multiple_test_document_collections):
        """Should return all collections."""
        results = document_collection_service.list(db_session)
        
        assert len(results) == 3
        titles = [c.title for c in results]
        assert "Collection 1" in titles
        assert "Collection 2" in titles
        assert "Collection 3" in titles
    
    def test_list_with_pagination(self, document_collection_service, db_session, multiple_test_document_collections):
        """Should paginate results."""
        results = document_collection_service.list(db_session, skip=1, limit=2)
        
        assert len(results) == 2
    
    def test_list_filter_by_title(self, document_collection_service, db_session, multiple_test_document_collections):
        """Should filter by title (case-insensitive substring match)."""
        results = document_collection_service.list(db_session, title="collection 2")
        
        assert len(results) == 1
        assert results[0].title == "Collection 2"
    
    def test_list_filter_by_visibility(self, document_collection_service, db_session, multiple_test_document_collections):
        """Should filter by visibility."""
        results = document_collection_service.list(db_session, visibility="private")
        
        assert len(results) == 1
        assert results[0].visibility == "private"
    
    def test_list_filter_by_language(self, document_collection_service, db_session, multiple_test_document_collections):
        """Should filter by language."""
        results = document_collection_service.list(db_session, language="ar")
        
        assert len(results) == 1
        assert results[0].language == "ar"
    
    def test_list_filter_by_created_by_id(self, document_collection_service, db_session, test_user, multiple_test_document_collections):
        """Should filter by created_by_id."""
        results = document_collection_service.list(db_session, created_by_id=test_user.id)
        
        assert len(results) == 3  # All created by test_user    
    def test_list_ordered_by_display_order(self, document_collection_service, db_session, multiple_test_document_collections):
        """Should return collections ordered by display_order ascending."""
        results = document_collection_service.list(db_session)
        
        # Expected order: Collection 2 (5), Collection 1 (10), Collection 3 (15)
        assert len(results) == 3
        assert results[0].title == "Collection 2"
        assert results[0].display_order == 5
        assert results[1].title == "Collection 1"
        assert results[1].display_order == 10
        assert results[2].title == "Collection 3"
        assert results[2].display_order == 15    
    def test_list_empty_database(self, document_collection_service, db_session):
        """Should return empty list when no collections exist."""
        results = document_collection_service.list(db_session)
        
        assert results == []
    
    def test_list_with_include_users(self, document_collection_service, db_session, multiple_test_document_collections):
        """Should include user relationships when include_users=True."""
        results = document_collection_service.list(db_session, include_users=True)
        
        assert len(results) == 3
        # User relationships should be loaded


class TestUpdate:
    """Test update method (full update)."""
    
    def test_update_title(self, document_collection_service, db_session, test_document_collection, DocumentCollectionModel):
        """Should update title."""
        update_data = DocumentCollectionUpdate(
            title="Updated Title"
        )
        
        result = document_collection_service.update(db_session, test_document_collection.id, update_data)
        
        assert result.title == "Updated Title"
        assert result.id == test_document_collection.id
        
        # Verify in database
        db_collection = db_session.query(DocumentCollectionModel).filter(
            DocumentCollectionModel.id == test_document_collection.id
        ).first()
        assert db_collection.title == "Updated Title"
    
    def test_update_all_fields(self, document_collection_service, db_session, test_document_collection):
        """Should update all fields."""
        update_data = DocumentCollectionUpdate(
            title="Fully Updated",
            visibility="private",
            text_direction="rtl",
            language="fr",
            hierarchy={"type": "updated"},
            collection_metadata={"updated": "true"}
        )
        
        result = document_collection_service.update(db_session, test_document_collection.id, update_data)
        
        assert result.title == "Fully Updated"
        assert result.visibility == "private"
        assert result.text_direction == "rtl"
        assert result.language == "fr"
        assert result.hierarchy == {"type": "updated"}
        assert result.collection_metadata == {"updated": "true"}
    
    def test_update_modified_timestamp(self, document_collection_service, db_session, test_document_collection):
        """Should update modified timestamp."""
        original_modified = test_document_collection.modified
        
        time.sleep(0.01)  # Ensure timestamp will be different
        update_data = DocumentCollectionUpdate(title="Updated")
        
        result = document_collection_service.update(db_session, test_document_collection.id, update_data)
        
        assert result.modified > original_modified
    
    def test_update_with_modified_by_id(self, document_collection_service, db_session, test_document_collection, admin_user):
        """Should update modified_by_id when provided."""
        update_data = DocumentCollectionUpdate(
            title="Modified by Admin",
            modified_by_id=admin_user.id
        )
        
        result = document_collection_service.update(db_session, test_document_collection.id, update_data)
        
        assert result.modified_by_id == admin_user.id
    
    def test_update_nonexistent_collection_raises_404(self, document_collection_service, db_session):
        """Should raise 404 when collection doesn't exist."""
        update_data = DocumentCollectionUpdate(title="Updated")
        
        with pytest.raises(HTTPException) as exc_info:
            document_collection_service.update(db_session, 999, update_data)
        
        assert exc_info.value.status_code == 404
    
    def test_update_duplicate_title_raises_400(self, document_collection_service, db_session, multiple_test_document_collections):
        """Should raise 400 when updating to duplicate title."""
        update_data = DocumentCollectionUpdate(title="Collection 2")
        
        with pytest.raises(HTTPException) as exc_info:
            document_collection_service.update(db_session, multiple_test_document_collections[0].id, update_data)
        
        assert exc_info.value.status_code == 400
        assert "Collection name already exists" in exc_info.value.detail
    
    def test_update_nonexistent_user_raises_404(self, document_collection_service, db_session, test_document_collection):
        """Should raise 404 when modified_by_id user doesn't exist."""
        update_data = DocumentCollectionUpdate(
            title="Updated",
            modified_by_id=999
        )
        
        with pytest.raises(HTTPException) as exc_info:
            document_collection_service.update(db_session, test_document_collection.id, update_data)
        
        assert exc_info.value.status_code == 404


class TestPartialUpdate:
    """Test partial_update method."""
    
    def test_partial_update_single_field(self, document_collection_service, db_session, test_document_collection):
        """Should update only specified field."""
        original_visibility = test_document_collection.visibility
        
        update_data = DocumentCollectionPartialUpdate(title="Partially Updated")
        
        result = document_collection_service.partial_update(db_session, test_document_collection.id, update_data)
        
        assert result.title == "Partially Updated"
        assert result.visibility == original_visibility  # Should remain unchanged
    
    def test_partial_update_multiple_fields(self, document_collection_service, db_session, test_document_collection):
        """Should update only specified fields."""
        update_data = DocumentCollectionPartialUpdate(
            visibility="private",
            language="es"
        )
        
        result = document_collection_service.partial_update(db_session, test_document_collection.id, update_data)
        
        assert result.title == "Test Collection"  # Unchanged
        assert result.visibility == "private"
        assert result.language == "es"
    
    def test_partial_update_with_modified_by_id(self, document_collection_service, db_session, test_document_collection, admin_user):
        """Should update modified_by_id."""
        update_data = DocumentCollectionPartialUpdate(modified_by_id=admin_user.id)
        
        result = document_collection_service.partial_update(db_session, test_document_collection.id, update_data)
        
        assert result.modified_by_id == admin_user.id
    
    def test_partial_update_modified_timestamp(self, document_collection_service, db_session, test_document_collection):
        """Should update modified timestamp."""
        original_modified = test_document_collection.modified
        
        time.sleep(0.01)  # Ensure timestamp will be different
        update_data = DocumentCollectionPartialUpdate(visibility="private")
        
        result = document_collection_service.partial_update(db_session, test_document_collection.id, update_data)
        
        assert result.modified > original_modified
    
    def test_partial_update_nonexistent_collection_raises_404(self, document_collection_service, db_session):
        """Should raise 404 when collection doesn't exist."""
        update_data = DocumentCollectionPartialUpdate(title="Updated")
        
        with pytest.raises(HTTPException) as exc_info:
            document_collection_service.partial_update(db_session, 999, update_data)
        
        assert exc_info.value.status_code == 404
    
    def test_partial_update_duplicate_title_raises_400(self, document_collection_service, db_session, multiple_test_document_collections):
        """Should raise 400 when updating to duplicate title."""
        update_data = DocumentCollectionPartialUpdate(title="Collection 2")
        
        with pytest.raises(HTTPException) as exc_info:
            document_collection_service.partial_update(db_session, multiple_test_document_collections[0].id, update_data)
        
        assert exc_info.value.status_code == 400
    
    def test_partial_update_nonexistent_user_raises_404(self, document_collection_service, db_session, test_document_collection):
        """Should raise 404 when modified_by_id user doesn't exist."""
        update_data = DocumentCollectionPartialUpdate(modified_by_id=999)
        
        with pytest.raises(HTTPException) as exc_info:
            document_collection_service.partial_update(db_session, test_document_collection.id, update_data)
        
        assert exc_info.value.status_code == 404


class TestDelete:
    """Test delete method."""
    
    def test_delete_empty_collection(self, document_collection_service, db_session, test_document_collection, DocumentCollectionModel):
        """Should delete collection with no documents."""
        collection_id = test_document_collection.id
        
        document_collection_service.delete(db_session, collection_id)
        
        # Verify deleted from database
        db_collection = db_session.query(DocumentCollectionModel).filter(
            DocumentCollectionModel.id == collection_id
        ).first()
        assert db_collection is None
    
    def test_delete_nonexistent_collection_raises_404(self, document_collection_service, db_session):
        """Should raise 404 when collection doesn't exist."""
        with pytest.raises(HTTPException) as exc_info:
            document_collection_service.delete(db_session, 999)
        
        assert exc_info.value.status_code == 404
    
    def test_delete_force_true_default(self, document_collection_service, db_session, test_document_collection):
        """Should default to force=True."""
        # Should not raise even if collection has documents (none in this test though)
        document_collection_service.delete(db_session, test_document_collection.id)


class TestBatchUpdateDisplayOrder:
    """Test batch_update_display_order method."""
    
    def test_batch_update_single_collection(self, document_collection_service, db_session, test_document_collection):
        """Should update display_order for a single collection."""
        updates = [
            CollectionDisplayOrderItem(collection_id=test_document_collection.id, display_order=100)
        ]
        
        document_collection_service.batch_update_display_order(db_session, updates)
        
        db_session.refresh(test_document_collection)
        assert test_document_collection.display_order == 100
    
    def test_batch_update_multiple_collections(self, document_collection_service, db_session, multiple_test_document_collections):
        """Should update display_order for multiple collections."""
        updates = [
            CollectionDisplayOrderItem(collection_id=10, display_order=30),
            CollectionDisplayOrderItem(collection_id=11, display_order=20),
            CollectionDisplayOrderItem(collection_id=12, display_order=10)
        ]
        
        document_collection_service.batch_update_display_order(db_session, updates)
        
        # Refresh and verify
        db_session.refresh(multiple_test_document_collections[0])
        db_session.refresh(multiple_test_document_collections[1])
        db_session.refresh(multiple_test_document_collections[2])
        
        assert multiple_test_document_collections[0].display_order == 30
        assert multiple_test_document_collections[1].display_order == 20
        assert multiple_test_document_collections[2].display_order == 10
    
    def test_batch_update_zero_display_order(self, document_collection_service, db_session, test_document_collection):
        """Should accept zero as valid display_order."""
        updates = [
            CollectionDisplayOrderItem(collection_id=test_document_collection.id, display_order=0)
        ]
        
        document_collection_service.batch_update_display_order(db_session, updates)
        
        db_session.refresh(test_document_collection)
        assert test_document_collection.display_order == 0
    
    def test_batch_update_updates_modified_timestamp(self, document_collection_service, db_session, test_document_collection):
        """Should update modified timestamp when updating display_order."""
        original_modified = test_document_collection.modified
        
        time.sleep(0.01)  # Ensure timestamp will be different
        updates = [
            CollectionDisplayOrderItem(collection_id=test_document_collection.id, display_order=50)
        ]
        
        document_collection_service.batch_update_display_order(db_session, updates)
        
        db_session.refresh(test_document_collection)
        assert test_document_collection.modified > original_modified
    
    def test_batch_update_empty_list_raises_400(self, document_collection_service, db_session):
        """Should raise 400 when updates list is empty."""
        with pytest.raises(HTTPException) as exc_info:
            document_collection_service.batch_update_display_order(db_session, [])
        
        assert exc_info.value.status_code == 400
        assert "No updates provided" in exc_info.value.detail
    
    def test_batch_update_nonexistent_collection_raises_404(self, document_collection_service, db_session):
        """Should raise 404 when collection doesn't exist."""
        updates = [
            CollectionDisplayOrderItem(collection_id=999, display_order=10)
        ]
        
        with pytest.raises(HTTPException) as exc_info:
            document_collection_service.batch_update_display_order(db_session, updates)
        
        assert exc_info.value.status_code == 404
        assert "Collections not found" in exc_info.value.detail
        assert "999" in exc_info.value.detail
    
    def test_batch_update_some_nonexistent_collections_raises_404(self, document_collection_service, db_session, test_document_collection):
        """Should raise 404 when some collections don't exist."""
        updates = [
            CollectionDisplayOrderItem(collection_id=test_document_collection.id, display_order=10),
            CollectionDisplayOrderItem(collection_id=999, display_order=20),
            CollectionDisplayOrderItem(collection_id=888, display_order=30)
        ]
        
        with pytest.raises(HTTPException) as exc_info:
            document_collection_service.batch_update_display_order(db_session, updates)
        
        assert exc_info.value.status_code == 404
        assert "888" in exc_info.value.detail
        assert "999" in exc_info.value.detail
    
    def test_batch_update_negative_display_order_raises_400(self, document_collection_service, db_session, test_document_collection):
        """Should raise 400 when display_order is negative."""
        updates = [
            CollectionDisplayOrderItem(collection_id=test_document_collection.id, display_order=-1)
        ]
        
        with pytest.raises(HTTPException) as exc_info:
            document_collection_service.batch_update_display_order(db_session, updates)
        
        assert exc_info.value.status_code == 400
        assert "must be non-negative" in exc_info.value.detail
    
    def test_batch_update_duplicate_collection_ids(self, document_collection_service, db_session, test_document_collection):
        """Should handle duplicate collection IDs (last one wins)."""
        updates = [
            CollectionDisplayOrderItem(collection_id=test_document_collection.id, display_order=10),
            CollectionDisplayOrderItem(collection_id=test_document_collection.id, display_order=50)
        ]
        
        document_collection_service.batch_update_display_order(db_session, updates)
        
        db_session.refresh(test_document_collection)
        assert test_document_collection.display_order == 50
