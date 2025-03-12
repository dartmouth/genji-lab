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
    Get a specific document collection by ID with detailed information
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
    
    # Add the count to the collection object
    setattr(collection, "document_count", document_count)
    
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
def delete_collection(collection_id: int, force: bool = False, db: AsyncSession = Depends(get_db)):
    """
    Delete a document collection
    
    - If force=False (default), will only delete if no documents are associated
    - If force=True, will delete the collection and all associated documents
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
    
    # If force=True, delete all associated documents first
    if force and document_count > 0:
        # Note: This doesn't handle document elements and annotations
        # In a real application, you would need to handle those as well
        db.execute(
            delete(Document).where(Document.document_collection_id == collection_id)
        )
    
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
