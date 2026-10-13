# tests/unit/test_document_collections_schemas.py
import pytest
from pydantic import ValidationError
from datetime import datetime

from schemas.document_collections import (
    DocumentCollectionBase,
    DocumentCollectionCreate,
    DocumentCollectionUpdate,
    DocumentCollectionPartialUpdate,
    DocumentCollection,
    DocumentCollectionWithUsers,
    DocumentCollectionWithStats,
    CollectionDisplayOrderItem,
    CollectionDisplayOrderBatchUpdate
)


class TestDocumentCollectionBase:
    """Test DocumentCollectionBase schema validation."""
    
    def test_all_fields_optional(self):
        """Should accept empty schema with all fields optional."""
        collection = DocumentCollectionBase()
        assert collection.title is None
        assert collection.visibility is None
        assert collection.text_direction is None
        assert collection.language is None
        assert collection.hierarchy is None
        assert collection.collection_metadata is None
    
    def test_with_all_fields(self):
        """Should accept all fields when provided."""
        collection = DocumentCollectionBase(
            title="Test Collection",
            visibility="public",
            text_direction="ltr",
            language="en",
            hierarchy={"type": "sequence"},
            collection_metadata={"description": "Test"}
        )
        assert collection.title == "Test Collection"
        assert collection.visibility == "public"
        assert collection.text_direction == "ltr"
        assert collection.language == "en"
        assert collection.hierarchy == {"type": "sequence"}
        assert collection.collection_metadata == {"description": "Test"}
    
    def test_with_partial_fields(self):
        """Should accept partial fields."""
        collection = DocumentCollectionBase(
            title="Test",
            visibility="private"
        )
        assert collection.title == "Test"
        assert collection.visibility == "private"
        assert collection.text_direction is None


class TestDocumentCollectionCreate:
    """Test DocumentCollectionCreate schema validation."""
    
    def test_valid_create_with_required_field(self):
        """Should accept valid creation data with required created_by_id."""
        collection = DocumentCollectionCreate(
            created_by_id=1,
            title="New Collection"
        )
        assert collection.created_by_id == 1
        assert collection.title == "New Collection"
    
    def test_missing_created_by_id_raises_error(self):
        """Should reject missing required created_by_id."""
        with pytest.raises(ValidationError) as exc_info:
            DocumentCollectionCreate(title="Test")
        
        errors = exc_info.value.errors()
        error_fields = [e["loc"][0] for e in errors]
        assert "created_by_id" in error_fields
    
    def test_with_all_optional_fields(self):
        """Should accept all optional fields."""
        collection = DocumentCollectionCreate(
            created_by_id=1,
            title="Test",
            visibility="public",
            text_direction="rtl",
            language="ar",
            hierarchy={"type": "tree"},
            collection_metadata={"author": "Test Author"}
        )
        assert collection.title == "Test"
        assert collection.visibility == "public"
        assert collection.text_direction == "rtl"
        assert collection.language == "ar"
    
    def test_created_by_id_must_be_integer(self):
        """Should reject non-integer created_by_id."""
        with pytest.raises(ValidationError):
            DocumentCollectionCreate(created_by_id="not_an_int")
    
    def test_empty_hierarchy_dict_accepted(self):
        """Should accept empty hierarchy dictionary."""
        collection = DocumentCollectionCreate(
            created_by_id=1,
            hierarchy={}
        )
        assert collection.hierarchy == {}


class TestDocumentCollectionUpdate:
    """Test DocumentCollectionUpdate schema validation."""
    
    def test_all_fields_optional(self):
        """Should accept empty update schema."""
        collection = DocumentCollectionUpdate()
        assert collection.title is None
        assert collection.created_by_id is None
        assert collection.modified_by_id is None
    
    def test_with_title_only(self):
        """Should accept title only update."""
        collection = DocumentCollectionUpdate(title="Updated Title")
        assert collection.title == "Updated Title"
    
    def test_with_modified_by_id(self):
        """Should accept modified_by_id."""
        collection = DocumentCollectionUpdate(modified_by_id=5)
        assert collection.modified_by_id == 5
    
    def test_with_all_fields(self):
        """Should accept all fields."""
        collection = DocumentCollectionUpdate(
            title="Updated",
            visibility="private",
            text_direction="rtl",
            language="es",
            hierarchy={"updated": True},
            collection_metadata={"version": "2"},
            created_by_id=1,
            modified_by_id=2
        )
        assert collection.title == "Updated"
        assert collection.modified_by_id == 2


class TestDocumentCollectionPartialUpdate:
    """Test DocumentCollectionPartialUpdate schema validation."""
    
    def test_all_fields_optional(self):
        """Should accept empty partial update."""
        update = DocumentCollectionPartialUpdate()
        assert update.title is None
        assert update.modified_by_id is None
    
    def test_with_single_field(self):
        """Should accept single field update."""
        update = DocumentCollectionPartialUpdate(visibility="private")
        assert update.visibility == "private"
    
    def test_with_multiple_fields(self):
        """Should accept multiple fields."""
        update = DocumentCollectionPartialUpdate(
            title="Partial Update",
            language="fr",
            modified_by_id=3
        )
        assert update.title == "Partial Update"
        assert update.language == "fr"
        assert update.modified_by_id == 3
    
    def test_does_not_have_created_by_id(self):
        """Should not have created_by_id field."""
        update = DocumentCollectionPartialUpdate(title="Test")
        assert not hasattr(update, 'created_by_id')


class TestDocumentCollection:
    """Test DocumentCollection schema validation (response model)."""
    
    def test_requires_id(self):
        """Should require id field."""
        with pytest.raises(ValidationError) as exc_info:
            DocumentCollection(
                created=datetime.now(),
                modified=datetime.now(),
                created_by_id=1
            )
        
        errors = exc_info.value.errors()
        error_fields = [e["loc"][0] for e in errors]
        assert "id" in error_fields
    
    def test_requires_timestamps(self):
        """Should require created and modified timestamps."""
        with pytest.raises(ValidationError) as exc_info:
            DocumentCollection(
                id=1,
                created_by_id=1
            )
        
        errors = exc_info.value.errors()
        error_fields = [e["loc"][0] for e in errors]
        assert "created" in error_fields or "modified" in error_fields
    
    def test_requires_created_by_id(self):
        """Should require created_by_id."""
        with pytest.raises(ValidationError) as exc_info:
            DocumentCollection(
                id=1,
                created=datetime.now(),
                modified=datetime.now()
            )
        
        errors = exc_info.value.errors()
        error_fields = [e["loc"][0] for e in errors]
        assert "created_by_id" in error_fields
    
    def test_modified_by_id_is_optional(self):
        """Should allow None for modified_by_id."""
        collection = DocumentCollection(
            id=1,
            created=datetime.now(),
            modified=datetime.now(),
            created_by_id=1,
            display_order=0,
            modified_by_id=None
        )
        assert collection.modified_by_id is None
    
    def test_valid_collection_response(self):
        """Should accept valid response data."""
        now = datetime.now()
        collection = DocumentCollection(
            id=1,
            title="Test Collection",
            visibility="public",
            text_direction="ltr",
            language="en",
            hierarchy={"type": "sequence"},
            collection_metadata={"description": "Test"},
            created=now,
            modified=now,
            created_by_id=1,
            modified_by_id=2,
            display_order=5
        )
        assert collection.id == 1
        assert collection.title == "Test Collection"
        assert collection.created_by_id == 1
        assert collection.modified_by_id == 2
        assert collection.display_order == 5
    
    def test_id_must_be_integer(self):
        """Should reject non-integer id."""
        with pytest.raises(ValidationError):
            DocumentCollection(
                id="not_an_int",
                created=datetime.now(),
                modified=datetime.now(),
                created_by_id=1,
                display_order=0
            )


class TestDocumentCollectionWithUsers:
    """Test DocumentCollectionWithUsers schema validation."""
    
    def test_includes_user_relationships(self):
        """Should include created_by and modified_by user fields."""
        from schemas.users import User
        
        now = datetime.now()
        collection = DocumentCollectionWithUsers(
            id=1,
            created=now,
            modified=now,
            created_by_id=1,
            modified_by_id=2,
            display_order=0,
            created_by=None,
            modified_by=None
        )
        assert collection.created_by is None
        assert collection.modified_by is None
    
    def test_user_fields_are_optional(self):
        """Should allow None for user relationship fields."""
        now = datetime.now()
        collection = DocumentCollectionWithUsers(
            id=1,
            created=now,
            modified=now,
            created_by_id=1,
            display_order=0
        )
        assert collection.created_by is None
        assert collection.modified_by is None
    
    def test_inherits_from_document_collection(self):
        """Should include all DocumentCollection fields."""
        now = datetime.now()
        collection = DocumentCollectionWithUsers(
            id=1,
            title="With Users",
            visibility="public",
            created=now,
            modified=now,
            created_by_id=1,
            display_order=0
        )
        assert collection.title == "With Users"
        assert collection.visibility == "public"


class TestDocumentCollectionWithStats:
    """Test DocumentCollectionWithStats schema validation."""
    
    def test_includes_count_fields(self):
        """Should include document_count, element_count, and annotation count fields."""
        now = datetime.now()
        collection = DocumentCollectionWithStats(
            id=1,
            created=now,
            modified=now,
            created_by_id=1,
            display_order=0,
            document_count=5,
            element_count=20,
            scholarly_annotation_count=10
        )
        assert collection.document_count == 5
        assert collection.element_count == 20
        assert collection.scholarly_annotation_count == 10
    
    def test_count_fields_default_to_zero(self):
        """Should default count fields to 0."""
        now = datetime.now()
        collection = DocumentCollectionWithStats(
            id=1,
            created=now,
            modified=now,
            created_by_id=1,
            display_order=0
        )
        assert collection.document_count == 0
        assert collection.element_count == 0
        assert collection.scholarly_annotation_count == 0
    
    def test_inherits_from_document_collection(self):
        """Should include all DocumentCollection fields."""
        now = datetime.now()
        collection = DocumentCollectionWithStats(
            id=1,
            title="With Stats",
            visibility="private",
            created=now,
            modified=now,
            created_by_id=1,
            display_order=0,
            document_count=3
        )
        assert collection.title == "With Stats"
        assert collection.visibility == "private"
        assert collection.document_count == 3
    
    def test_count_fields_must_be_integers(self):
        """Should reject non-integer count values."""
        now = datetime.now()
        with pytest.raises(ValidationError):
            DocumentCollectionWithStats(
                id=1,
                created=now,
                modified=now,
                created_by_id=1,
                display_order=0,
                document_count="not_an_int"
            )


class TestCollectionDisplayOrderItem:
    """Test CollectionDisplayOrderItem schema validation."""
    
    def test_valid_display_order_item(self):
        """Should accept valid collection_id and display_order."""
        item = CollectionDisplayOrderItem(
            collection_id=1,
            display_order=10
        )
        assert item.collection_id == 1
        assert item.display_order == 10
    
    def test_missing_required_fields(self):
        """Should reject missing required fields."""
        with pytest.raises(ValidationError) as exc_info:
            CollectionDisplayOrderItem(collection_id=1)
        
        errors = exc_info.value.errors()
        error_fields = [e["loc"][0] for e in errors]
        assert "display_order" in error_fields
    
    def test_fields_must_be_integers(self):
        """Should reject non-integer values."""
        with pytest.raises(ValidationError):
            CollectionDisplayOrderItem(
                collection_id="not_an_int",
                display_order=10
            )
        
        with pytest.raises(ValidationError):
            CollectionDisplayOrderItem(
                collection_id=1,
                display_order="not_an_int"
            )
    
    def test_display_order_can_be_zero(self):
        """Should accept zero as valid display_order."""
        item = CollectionDisplayOrderItem(
            collection_id=1,
            display_order=0
        )
        assert item.display_order == 0


class TestCollectionDisplayOrderBatchUpdate:
    """Test CollectionDisplayOrderBatchUpdate schema validation."""
    
    def test_valid_batch_update(self):
        """Should accept valid list of display order items."""
        batch = CollectionDisplayOrderBatchUpdate(
            collections=[
                CollectionDisplayOrderItem(collection_id=1, display_order=10),
                CollectionDisplayOrderItem(collection_id=2, display_order=20),
                CollectionDisplayOrderItem(collection_id=3, display_order=30)
            ]
        )
        assert len(batch.collections) == 3
        assert batch.collections[0].collection_id == 1
        assert batch.collections[0].display_order == 10
    
    def test_empty_list(self):
        """Should accept empty list."""
        batch = CollectionDisplayOrderBatchUpdate(collections=[])
        assert batch.collections == []
    
    def test_missing_collections_field(self):
        """Should reject missing collections field."""
        with pytest.raises(ValidationError) as exc_info:
            CollectionDisplayOrderBatchUpdate()
        
        errors = exc_info.value.errors()
        error_fields = [e["loc"][0] for e in errors]
        assert "collections" in error_fields
    
    def test_single_item(self):
        """Should accept single item in list."""
        batch = CollectionDisplayOrderBatchUpdate(
            collections=[
                CollectionDisplayOrderItem(collection_id=1, display_order=5)
            ]
        )
        assert len(batch.collections) == 1
