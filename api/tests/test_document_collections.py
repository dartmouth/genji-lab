"""
Tests for Document Collection operations.

These are unit tests that test the document collection data operations directly,
without going through the HTTP layer.
"""

import pytest
from datetime import datetime
from sqlalchemy import select, func, delete
from sqlalchemy.orm import Session

from tests.conftest import (
    Document, 
    DocumentCollection, 
    DocumentElement, 
    User,
)


class TestCreateCollection:
    """Tests for document collection creation."""
    
    def test_create_collection_success(self, db_session, sample_user):
        """Test creating a collection with valid data."""
        collection = DocumentCollection(
            title="New Collection",
            visibility="public",
            text_direction="ltr",
            language="en",
            created_by_id=sample_user.id,
            owner_id=sample_user.id,
        )
        db_session.add(collection)
        db_session.commit()
        db_session.refresh(collection)
        
        assert collection.id is not None
        assert collection.title == "New Collection"
        assert collection.visibility == "public"
    
    def test_duplicate_collection_name_detection(
        self, db_session, sample_user, sample_collection
    ):
        """Test detecting duplicate collection names."""
        existing = db_session.execute(
            select(DocumentCollection).where(
                func.lower(DocumentCollection.title) == sample_collection.title.lower()
            )
        ).scalar_one_or_none()
        
        assert existing is not None
        assert existing.id == sample_collection.id
    
    def test_duplicate_name_case_insensitive(
        self, db_session, sample_user, sample_collection
    ):
        """Test duplicate name detection is case-insensitive."""
        upper_title = sample_collection.title.upper()
        
        existing = db_session.execute(
            select(DocumentCollection).where(
                func.lower(DocumentCollection.title) == upper_title.lower()
            )
        ).scalar_one_or_none()
        
        assert existing is not None


class TestReadCollections:
    """Tests for document collection retrieval."""
    
    def test_read_collections_empty(self, db_session):
        """Test reading collections when none exist."""
        collections = db_session.execute(
            select(DocumentCollection)
        ).scalars().all()
        
        assert collections == []
    
    def test_read_collections_list(self, db_session, sample_collection):
        """Test reading a list of collections."""
        collections = db_session.execute(
            select(DocumentCollection)
        ).scalars().all()
        
        assert len(collections) >= 1
    
    def test_read_collections_filter_by_visibility(
        self, db_session, sample_user
    ):
        """Test filtering collections by visibility."""
        # Create public and private collections
        public_collection = DocumentCollection(
            title="Public Collection",
            visibility="public",
            text_direction="ltr",
            owner_id=sample_user.id,
            language="en",
        )
        private_collection = DocumentCollection(
            title="Private Collection",
            visibility="private",
            text_direction="ltr",
            owner_id=sample_user.id,
            language="en",
        )
        db_session.add_all([public_collection, private_collection])
        db_session.commit()
        
        # Query only public
        public_collections = db_session.execute(
            select(DocumentCollection).where(
                DocumentCollection.visibility == "public"
            )
        ).scalars().all()
        
        for collection in public_collections:
            assert collection.visibility == "public"
    
    def test_read_collections_filter_by_title(self, db_session, sample_collection):
        """Test filtering collections by title."""
        search_term = sample_collection.title[:4]
        
        collections = db_session.execute(
            select(DocumentCollection).where(
                DocumentCollection.title.ilike(f"%{search_term}%")
            )
        ).scalars().all()
        
        assert len(collections) >= 1
    
    def test_read_single_collection(self, db_session, sample_collection):
        """Test reading a single collection by ID."""
        collection = db_session.execute(
            select(DocumentCollection).where(
                DocumentCollection.id == sample_collection.id
            )
        ).scalar_one_or_none()
        
        assert collection is not None
        assert collection.id == sample_collection.id
        assert collection.title == sample_collection.title
    
    def test_read_collection_not_found(self, db_session):
        """Test reading a non-existent collection."""
        collection = db_session.execute(
            select(DocumentCollection).where(DocumentCollection.id == 99999)
        ).scalar_one_or_none()
        
        assert collection is None
    
    def test_read_collection_with_document_count(
        self, db_session, sample_collection, sample_document
    ):
        """Test getting document count for collection."""
        document_count = db_session.execute(
            select(func.count()).select_from(Document).where(
                Document.document_collection_id == sample_collection.id
            )
        ).scalar_one()
        
        assert document_count == 1


class TestUpdateCollection:
    """Tests for document collection updates."""
    
    def test_update_collection_full(self, db_session, sample_collection):
        """Test full update of a collection."""
        sample_collection.title = "Updated Collection Title"
        sample_collection.visibility = "private"
        db_session.commit()
        db_session.refresh(sample_collection)
        
        assert sample_collection.title == "Updated Collection Title"
        assert sample_collection.visibility == "private"
    
    def test_partial_update_collection(self, db_session, sample_collection):
        """Test partial update of a collection."""
        original_visibility = sample_collection.visibility
        
        sample_collection.title = "Partially Updated Title"
        db_session.commit()
        db_session.refresh(sample_collection)
        
        assert sample_collection.title == "Partially Updated Title"
        assert sample_collection.visibility == original_visibility


class TestDeleteCollection:
    """Tests for document collection deletion."""
    
    def test_delete_collection(self, db_session, sample_collection):
        """Test deleting a collection."""
        collection_id = sample_collection.id
        
        db_session.delete(sample_collection)
        db_session.commit()
        
        deleted_collection = db_session.execute(
            select(DocumentCollection).where(DocumentCollection.id == collection_id)
        ).scalar_one_or_none()
        
        assert deleted_collection is None
    
    def test_delete_collection_cascades_documents(
        self, db_session, sample_collection, sample_document
    ):
        """Test that deleting collection also deletes its documents."""
        collection_id = sample_collection.id
        doc_id = sample_document.id
        
        # Verify document exists
        doc_before = db_session.execute(
            select(Document).where(Document.id == doc_id)
        ).scalar_one_or_none()
        assert doc_before is not None
        
        # Delete the collection
        db_session.delete(sample_collection)
        db_session.commit()
        
        # Verify document is also deleted
        doc_after = db_session.execute(
            select(Document).where(Document.id == doc_id)
        ).scalar_one_or_none()
        assert doc_after is None


class TestCollectionUserRelationships:
    """Tests for collection-user relationships."""
    
    def test_collection_has_owner(self, db_session, sample_collection, sample_user):
        """Test that collection correctly references its owner."""
        collection = db_session.execute(
            select(DocumentCollection).where(
                DocumentCollection.id == sample_collection.id
            )
        ).scalar_one()
        
        assert collection.owner is not None
        assert collection.owner.id == sample_user.id
    
    def test_collection_has_creator(self, db_session, sample_collection, sample_user):
        """Test that collection correctly references its creator."""
        collection = db_session.execute(
            select(DocumentCollection).where(
                DocumentCollection.id == sample_collection.id
            )
        ).scalar_one()
        
        assert collection.created_by is not None
        assert collection.created_by.id == sample_user.id
