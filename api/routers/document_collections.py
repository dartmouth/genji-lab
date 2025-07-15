from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete, select, func, update
from sqlalchemy.orm import joinedload
from datetime import datetime

from database import get_db
from models.models import DocumentCollection as DocumentCollectionModel
from models.models import Document, User
from schemas.document_collections import (
    DocumentCollection, 
    DocumentCollectionCreate, 
    DocumentCollectionUpdate, 
    DocumentCollectionPartialUpdate,
    DocumentCollectionWithStats
)

router = APIRouter(
    prefix="/api/v1/collections",
    tags=["document collections"],
    responses={404: {"description": "Document collection not found"}},
)

@router.post("/", response_model=DocumentCollection, status_code=status.HTTP_201_CREATED)
def create_collection(collection: DocumentCollectionCreate, db: AsyncSession = Depends(get_db)):
    """
    Create a new document collection
    """
    # Verify the user exists
    user = db.execute(
        select(User).filter(User.id == collection.created_by_id)
    ).scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {collection.created_by_id} not found"
        )
    
    # Create the document collection
    db_collection = DocumentCollectionModel(**collection.model_dump())
    # Set modified_by_id to the same as created_by_id initially
    db_collection.modified_by_id = collection.created_by_id
    
    db.add(db_collection)
    db.commit()
    db.refresh(db_collection)
    return db_collection

@router.get("/", response_model=List[DocumentCollection])
def read_collections(
    skip: int = 0,
    limit: int = 100,
    title: Optional[str] = None,
    visibility: Optional[str] = None,
    language: Optional[str] = None,
    created_by_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve document collections with optional filtering
    """
    query = select(DocumentCollectionModel)
    
    # Apply filters if provided
    if title:
        query = query.filter(DocumentCollectionModel.title.ilike(f"%{title}%"))
    if visibility:
        query = query.filter(DocumentCollectionModel.visibility == visibility)
    if language:
        query = query.filter(DocumentCollectionModel.language == language)
    if created_by_id:
        query = query.filter(DocumentCollectionModel.created_by_id == created_by_id)
    
    # Apply pagination
    query = query.offset(skip).limit(limit)
    
    result = db.execute(query)
    collections = result.scalars().all()
    return collections

@router.get("/{collection_id}", response_model=DocumentCollectionWithStats)
def read_collection(collection_id: int, db: AsyncSession = Depends(get_db)):
    """
    Get a specific document collection by ID with detailed information including full statistics
    """
    # Query for collection with joined users
    query = (
        select(DocumentCollectionModel)
        .options(
            joinedload(DocumentCollectionModel.created_by),
            joinedload(DocumentCollectionModel.modified_by)
        )
        .filter(DocumentCollectionModel.id == collection_id)
    )
    
    collection = db.execute(query).scalar_one_or_none()
    
    if collection is None:
        raise HTTPException(status_code=404, detail="Document collection not found")
    
    # Get the count of documents in this collection
    document_count = db.execute(
        select(func.count())
        .select_from(Document)
        .filter(Document.document_collection_id == collection_id)
    ).scalar_one()
    
    # Get element count for all documents in this collection
    from models.models import DocumentElement
    element_count = db.execute(
        select(func.count())
        .select_from(DocumentElement)
        .join(Document, DocumentElement.document_id == Document.id)
        .filter(Document.document_collection_id == collection_id)
    ).scalar_one()
    
    # Get annotation count for all elements in this collection
    from models.models import Annotation as AnnotationModel
    
    # Count scholarly annotations (motivation = 'scholarly' or similar)
    scholarly_annotation_count = db.execute(
        select(func.count())
        .select_from(AnnotationModel)
        .join(DocumentElement, AnnotationModel.document_element_id == DocumentElement.id)
        .join(Document, DocumentElement.document_id == Document.id)
        .filter(
            Document.document_collection_id == collection_id,
            AnnotationModel.motivation.in_(['scholarly', 'highlighting', 'bookmarking', 'classifying'])
        )
    ).scalar_one()
    
    # Count comments (motivation = 'commenting')
    comment_count = db.execute(
        select(func.count())
        .select_from(AnnotationModel)
        .join(DocumentElement, AnnotationModel.document_element_id == DocumentElement.id)
        .join(Document, DocumentElement.document_id == Document.id)
        .filter(
            Document.document_collection_id == collection_id,
            AnnotationModel.motivation == 'commenting'
        )
    ).scalar_one()
    
    # Add the counts to the collection object
    setattr(collection, "document_count", document_count)
    setattr(collection, "element_count", element_count)
    setattr(collection, "scholarly_annotation_count", scholarly_annotation_count)
    setattr(collection, "comment_count", comment_count)
    
    return collection

@router.put("/{collection_id}", response_model=DocumentCollection)
def update_collection(
    collection_id: int, 
    collection: DocumentCollectionUpdate, 
    db: AsyncSession = Depends(get_db)
):
    """
    Update a document collection (full update)
    """
    db_collection = db.execute(
        select(DocumentCollectionModel).filter(DocumentCollectionModel.id == collection_id)
    ).scalar_one_or_none()
    
    if db_collection is None:
        raise HTTPException(status_code=404, detail="Document collection not found")
    
    # Verify users exist if they're being updated
    if collection.created_by_id:
        user = db.execute(
            select(User).filter(User.id == collection.created_by_id)
        ).scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {collection.created_by_id} not found"
            )
    
    if collection.modified_by_id:
        user = db.execute(
            select(User).filter(User.id == collection.modified_by_id)
        ).scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {collection.modified_by_id} not found"
            )
    
    # Update collection attributes
    update_data = collection.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_collection, key, value)
    
    # Always update modified timestamp
    db_collection.modified = datetime.now()
    
    db.commit()
    db.refresh(db_collection)
    return db_collection

@router.patch("/{collection_id}", response_model=DocumentCollection)
def partial_update_collection(
    collection_id: int,
    collection: DocumentCollectionPartialUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Partially update a document collection
    """
    db_collection = db.execute(
        select(DocumentCollectionModel).filter(DocumentCollectionModel.id == collection_id)
    ).scalar_one_or_none()
    
    if db_collection is None:
        raise HTTPException(status_code=404, detail="Document collection not found")
    
    # Verify modified_by user exists if it's being updated
    if collection.modified_by_id:
        user = db.execute(
            select(User).filter(User.id == collection.modified_by_id)
        ).scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {collection.modified_by_id} not found"
            )
    
    # Update only provided fields
    update_data = collection.dict(exclude_unset=True, exclude_none=True)
    for key, value in update_data.items():
        setattr(db_collection, key, value)
    
    # Always update modified timestamp
    db_collection.modified = datetime.now()
    
    db.commit()
    db.refresh(db_collection)
    return db_collection

@router.delete("/{collection_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_collection(collection_id: int, force: bool = True, db: AsyncSession = Depends(get_db)):
    """
    Delete a document collection with cascading delete
    
    - If force=False, will only delete if no documents are associated
    - If force=True (default), will delete the collection and all associated documents, elements, and annotations
    """
    db_collection = db.execute(
        select(DocumentCollectionModel).filter(DocumentCollectionModel.id == collection_id)
    ).scalar_one_or_none()
    
    if db_collection is None:
        raise HTTPException(status_code=404, detail="Document collection not found")
    
    # Check if collection has documents
    document_count = db.execute(
        select(func.count())
        .select_from(Document)
        .filter(Document.document_collection_id == collection_id)
    ).scalar_one()
    
    if document_count > 0 and not force:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete collection with {document_count} documents. Use force=True to delete anyway."
        )
    
    # If force=True, delete all associated content with proper cascading
    if force and document_count > 0:
        from models.models import Annotation as AnnotationModel, DocumentElement
        
        # Get all document IDs in this collection
        document_ids = db.execute(
            select(Document.id).filter(Document.document_collection_id == collection_id)
        ).scalars().all()
        
        if document_ids:
            # Get all element IDs for documents in this collection
            element_ids = db.execute(
                select(DocumentElement.id).filter(
                    DocumentElement.document_id.in_(document_ids)
                )
            ).scalars().all()
            
            if element_ids:
                # Delete all annotations for these elements
                db.execute(
                    delete(AnnotationModel).where(AnnotationModel.document_element_id.in_(element_ids))
                )
                
                # Delete all elements for these documents
                db.execute(
                    delete(DocumentElement).where(DocumentElement.document_id.in_(document_ids))
                )
            
            # Delete all documents in the collection
            db.execute(
                delete(Document).where(Document.id.in_(document_ids))
            )
    
    # Delete the collection
    db.delete(db_collection)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.get("/{collection_id}/documents", response_model=List[Dict[str, Any]])
def get_collection_documents(
    collection_id: int,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """
    Get all documents for a specific collection
    """
    # First check if collection exists
    collection = db.execute(
        select(DocumentCollectionModel).filter(DocumentCollectionModel.id == collection_id)
    ).scalar_one_or_none()
    
    if collection is None:
        raise HTTPException(status_code=404, detail="Document collection not found")
    
    # Get documents
    documents = db.execute(
        select(Document)
        .filter(Document.document_collection_id == collection_id)
        .offset(skip)
        .limit(limit)
    ).scalars().all()
    
    # Convert to dict
    result = []
    for document in documents:
        doc_dict = {
            "id": document.id,
            "title": document.title,
            "description": document.description,
            "created": document.created,
            "modified": document.modified
        }
        result.append(doc_dict)
    
    return result

@router.delete("/{collection_id}/documents", status_code=status.HTTP_204_NO_CONTENT)
def delete_all_collection_documents(
    collection_id: int, 
    force: bool = True,  # Default to True for collection-wide deletion
    db: AsyncSession = Depends(get_db)
):
    """
    Delete all documents in a collection with cascading delete
    
    - force=True (default): Delete documents and all associated elements/annotations
    - This operation cascades through: Collection -> Documents -> Elements -> Annotations
    """
    # Verify collection exists
    db_collection = db.execute(
        select(DocumentCollectionModel).filter(DocumentCollectionModel.id == collection_id)
    ).scalar_one_or_none()
    
    if db_collection is None:
        raise HTTPException(status_code=404, detail="Document collection not found")
    
    # Get all documents in this collection
    documents = db.execute(
        select(Document.id).filter(Document.document_collection_id == collection_id)
    ).scalars().all()
    
    if not documents:
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    
    # Cascading delete: Annotations -> Elements -> Documents
    if force:
        from models.models import Annotation as AnnotationModel, DocumentElement
        
        # Get all element IDs for documents in this collection
        element_ids = db.execute(
            select(DocumentElement.id).filter(
                DocumentElement.document_id.in_(documents)
            )
        ).scalars().all()
        
        if element_ids:
            # Delete all annotations for these elements
            db.execute(
                delete(AnnotationModel).where(AnnotationModel.document_element_id.in_(element_ids))
            )
            
            # Delete all elements for these documents
            db.execute(
                delete(DocumentElement).where(DocumentElement.document_id.in_(documents))
            )
    
    # Delete all documents in the collection
    db.execute(
        delete(Document).where(Document.document_collection_id == collection_id)
    )
    
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
