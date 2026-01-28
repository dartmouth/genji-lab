# services/document_collection_service.py

from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, func, delete

from models.models import (
    DocumentCollection as DocumentCollectionModel,
    Document,
    DocumentElement,
    Annotation as AnnotationModel,
    User
)
from schemas.document_collections import (
    DocumentCollectionCreate,
    DocumentCollectionUpdate,
    DocumentCollectionPartialUpdate
)
from services.base_service import BaseService


class DocumentCollectionService(BaseService[DocumentCollectionModel]):
    """Service for document collection CRUD operations."""
    
    def __init__(self):
        super().__init__(DocumentCollectionModel)
    
    # ==================== Helper Methods ====================
    
    def _verify_user_exists(self, db: Session, user_id: int) -> User:
        """
        Verify a user exists by ID.
        
        Raises HTTPException 404 if not found.
        """
        user = db.execute(
            select(User).filter(User.id == user_id)
        ).scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {user_id} not found"
            )
        return user
    
    def _check_duplicate_title(
        self, 
        db: Session, 
        title: str, 
        exclude_id: Optional[int] = None
    ) -> None:
        """
        Check if a collection with the given title already exists.
        
        Raises HTTPException 400 if duplicate found.
        """
        query = select(self.model).filter(
            func.lower(self.model.title) == title.lower().strip()
        )
        
        if exclude_id is not None:
            query = query.filter(self.model.id != exclude_id)
        
        existing = db.execute(query).scalar_one_or_none()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Collection name already exists"
            )
    
    def _get_collection_by_id(
        self, 
        db: Session, 
        collection_id: int,
        with_users: bool = False
    ) -> DocumentCollectionModel:
        """
        Get a collection by ID.
        
        Raises HTTPException 404 if not found.
        """
        query = select(self.model).filter(
            self.model.id == collection_id
        )
        
        if with_users:
            query = query.options(
                joinedload(self.model.created_by),
                joinedload(self.model.modified_by)
            )
        
        collection = db.execute(query).scalar_one_or_none()
        
        if collection is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document collection not found"
            )
        
        return collection
    
    def _get_document_count(self, db: Session, collection_id: int) -> int:
        """Get the count of documents in a collection."""
        return db.execute(
            select(func.count())
            .select_from(Document)
            .filter(Document.document_collection_id == collection_id)
        ).scalar_one()
    
    def _get_element_count(self, db: Session, collection_id: int) -> int:
        """Get the count of elements across all documents in a collection."""
        return db.execute(
            select(func.count())
            .select_from(DocumentElement)
            .join(Document, DocumentElement.document_id == Document.id)
            .filter(Document.document_collection_id == collection_id)
        ).scalar_one()
    
    def _get_scholarly_annotation_count(self, db: Session, collection_id: int) -> int:
        """Get the count of scholarly annotations in a collection."""
        return db.execute(
            select(func.count())
            .select_from(AnnotationModel)
            .join(DocumentElement, AnnotationModel.document_element_id == DocumentElement.id)
            .join(Document, DocumentElement.document_id == Document.id)
            .filter(
                Document.document_collection_id == collection_id,
                AnnotationModel.motivation.in_(['scholarly', 'highlighting', 'bookmarking', 'classifying'])
            )
        ).scalar_one()
    
    def _get_comment_count(self, db: Session, collection_id: int) -> int:
        """Get the count of comments in a collection."""
        return db.execute(
            select(func.count())
            .select_from(AnnotationModel)
            .join(DocumentElement, AnnotationModel.document_element_id == DocumentElement.id)
            .join(Document, DocumentElement.document_id == Document.id)
            .filter(
                Document.document_collection_id == collection_id,
                AnnotationModel.motivation == 'commenting'
            )
        ).scalar_one()
    
    def _cascade_delete_collection_content(
        self, 
        db: Session, 
        document_ids: List[int]
    ) -> None:
        """Delete all elements and annotations for the given document IDs."""
        if not document_ids:
            return
        
        # Get all element IDs for the documents
        element_ids = db.execute(
            select(DocumentElement.id).filter(
                DocumentElement.document_id.in_(document_ids)
            )
        ).scalars().all()
        
        if element_ids:
            # Delete all annotations for these elements
            db.execute(
                delete(AnnotationModel).where(
                    AnnotationModel.document_element_id.in_(element_ids)
                )
            )
            
            # Delete all elements for these documents
            db.execute(
                delete(DocumentElement).where(
                    DocumentElement.document_id.in_(document_ids)
                )
            )
        
        # Delete all documents
        db.execute(
            delete(Document).where(Document.id.in_(document_ids))
        )

# ==================== Collection Metadata Schema Operations ====================

    def get_metadata_schema(self, db: Session) -> List[Dict[str, Any]]:
        """
        Get the collection metadata schema from site settings.
        
        Returns an empty list if no schema is configured.
        Raises HTTPException 404 if site settings not found.
        """
        from models.models import SiteSettings
        
        site_settings = db.execute(
            select(SiteSettings).limit(1)
        ).scalar_one_or_none()
        
        if not site_settings:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Site settings not found"
            )
        
        return site_settings.collection_metadata_schema or []


    def validate_collection_metadata(
        self,
        db: Session,
        metadata: Dict[str, Any]
    ) -> None:
        """
        Validate collection metadata against the schema.
        
        Raises HTTPException 400 if validation fails.
        """
        schema = self.get_metadata_schema(db)
        
        # Check required fields
        for field in schema:
            if field.get('required') and not metadata.get(field.get('key')):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Required metadata field '{field.get('label', field.get('key'))}' is missing"
                )


    # ==================== CRUD Operations ====================
    
    def create(
        self,
        db: Session,
        collection: DocumentCollectionCreate
    ) -> DocumentCollectionModel:
        """
        Create a new document collection.
        
        Raises HTTPException 400 if title already exists.
        Raises HTTPException 404 if user not found.
        """
        # Check for duplicate title
        self._check_duplicate_title(db, collection.title)
        
        # Verify user exists
        self._verify_user_exists(db, collection.created_by_id)

        if collection.collection_metadata:
            self.validate_collection_metadata(db, collection.collection_metadata)
        
        # Create the collection
        db_collection = self.model(**collection.model_dump())
        db_collection.modified_by_id = collection.created_by_id
        
        db.add(db_collection)
        db.commit()
        db.refresh(db_collection)
        
        return db_collection
    
    def get_by_id(
        self,
        db: Session,
        collection_id: int
    ) -> DocumentCollectionModel:
        """
        Get a specific collection by ID with full statistics.
        
        Raises HTTPException 404 if not found.
        """
        collection = self._get_collection_by_id(db, collection_id, with_users=True)
        
        # Add statistics
        setattr(collection, "document_count", self._get_document_count(db, collection_id))
        setattr(collection, "element_count", self._get_element_count(db, collection_id))
        setattr(collection, "scholarly_annotation_count", self._get_scholarly_annotation_count(db, collection_id))
        setattr(collection, "comment_count", self._get_comment_count(db, collection_id))
        
        return collection
    
    def list(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        title: Optional[str] = None,
        visibility: Optional[str] = None,
        language: Optional[str] = None,
        created_by_id: Optional[int] = None,
        include_users: bool = False
    ) -> List[DocumentCollectionModel]:
        """Get collections with optional filtering and pagination."""
        query = select(self.model)
        
        # Optionally include user relationships
        if include_users:
            query = query.options(
                joinedload(self.model.created_by),
                joinedload(self.model.modified_by)
            )
        
        # Apply filters
        if title:
            query = query.filter(self.model.title.ilike(f"%{title}%"))
        if visibility:
            query = query.filter(self.model.visibility == visibility)
        if language:
            query = query.filter(self.model.language == language)
        if created_by_id:
            query = query.filter(self.model.created_by_id == created_by_id)
        
        # Apply pagination
        query = query.offset(skip).limit(limit)

        return db.execute(query).scalars().all()
    
    def update(
        self,
        db: Session,
        collection_id: int,
        collection: DocumentCollectionUpdate
    ) -> DocumentCollectionModel:
        """
        Full update of a document collection.
        
        Raises HTTPException 404 if collection or user not found.
        Raises HTTPException 400 if title already exists.
        """
        db_collection = self._get_collection_by_id(db, collection_id)
        
        # Verify users exist if provided
        if collection.created_by_id:
            self._verify_user_exists(db, collection.created_by_id)
        if collection.modified_by_id:
            self._verify_user_exists(db, collection.modified_by_id)
        
        # Check for duplicate title if being updated
        if collection.title:
            self._check_duplicate_title(db, collection.title, exclude_id=collection_id)
        
        # Update attributes
        update_data = collection.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_collection, key, value)
        
        db_collection.modified = datetime.now()
        
        db.commit()
        db.refresh(db_collection)
        
        return db_collection
    
    def partial_update(
        self,
        db: Session,
        collection_id: int,
        collection: DocumentCollectionPartialUpdate
    ) -> DocumentCollectionModel:
        """
        Partial update of a document collection.
        
        Raises HTTPException 404 if collection or user not found.
        Raises HTTPException 400 if title already exists.
        """
        db_collection = self._get_collection_by_id(db, collection_id)
        
        # Verify user exists if provided
        if collection.modified_by_id:
            self._verify_user_exists(db, collection.modified_by_id)
        
        # Check for duplicate title if being updated
        if collection.title:
            self._check_duplicate_title(db, collection.title, exclude_id=collection_id)
        
        # Update only provided fields
        update_data = collection.model_dump(exclude_unset=True, exclude_none=True)
        for key, value in update_data.items():
            setattr(db_collection, key, value)
        
        db_collection.modified = datetime.now()
        
        db.commit()
        db.refresh(db_collection)
        
        return db_collection
    
    def delete(
        self,
        db: Session,
        collection_id: int,
        force: bool = True
    ) -> None:
        """
        Delete a document collection.
        
        If force=False, only deletes if no documents exist.
        If force=True, cascades delete through documents, elements, and annotations.
        
        Raises HTTPException 404 if not found.
        Raises HTTPException 400 if has documents and force=False.
        """
        db_collection = self._get_collection_by_id(db, collection_id)
        
        document_count = self._get_document_count(db, collection_id)
        
        if document_count > 0 and not force:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete collection with {document_count} documents. Use force=True to delete anyway."
            )
        
        # Cascade delete if needed
        if force and document_count > 0:
            document_ids = db.execute(
                select(Document.id).filter(Document.document_collection_id == collection_id)
            ).scalars().all()
            
            self._cascade_delete_collection_content(db, list(document_ids))
        
        db.delete(db_collection)
        db.commit()
    
    # ==================== Document Operations ====================
    
    def get_documents(
        self,
        db: Session,
        collection_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get all documents for a specific collection.
        
        Raises HTTPException 404 if collection not found.
        """
        # Verify collection exists
        self._get_collection_by_id(db, collection_id)
        
        documents = db.execute(
            select(Document)
            .filter(Document.document_collection_id == collection_id)
            .offset(skip)
            .limit(limit)
        ).scalars().all()
        
        return [
            {
                "id": doc.id,
                "title": doc.title,
                "description": doc.description,
                "created": doc.created,
                "modified": doc.modified
            }
            for doc in documents
        ]
    
    def delete_all_documents(
        self,
        db: Session,
        collection_id: int,
        force: bool = True
    ) -> None:
        """
        Delete all documents in a collection.
        
        Raises HTTPException 404 if collection not found.
        """
        # Verify collection exists
        self._get_collection_by_id(db, collection_id)
        
        document_ids = db.execute(
            select(Document.id).filter(Document.document_collection_id == collection_id)
        ).scalars().all()
        
        if not document_ids:
            return
        
        if force:
            self._cascade_delete_collection_content(db, list(document_ids))
        else:
            db.execute(
                delete(Document).where(Document.document_collection_id == collection_id)
            )
        
        db.commit()


# Singleton instance for easy importing
document_collection_service = DocumentCollectionService()