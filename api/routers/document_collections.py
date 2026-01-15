# routers/document_collections.py

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, status, Response
from sqlalchemy.orm import Session

from database import get_db
from schemas.document_collections import (
    DocumentCollection,
    DocumentCollectionCreate,
    DocumentCollectionUpdate,
    DocumentCollectionPartialUpdate,
    DocumentCollectionWithStats,
    DocumentCollectionWithUsers
)
from services.document_collection_service import document_collection_service

router = APIRouter(
    prefix="/api/v1/collections",
    tags=["document collections"],
    responses={404: {"description": "Document collection not found"}},
)


@router.post("/", response_model=DocumentCollection, status_code=status.HTTP_201_CREATED)
def create_collection(
    collection: DocumentCollectionCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new document collection
    """
    return document_collection_service.create(db, collection)


@router.get("/", response_model=List[DocumentCollectionWithUsers])
def read_collections(
    skip: int = 0,
    limit: int = 100,
    title: Optional[str] = None,
    visibility: Optional[str] = None,
    language: Optional[str] = None,
    created_by_id: Optional[int] = None,
    include_users: bool = False,
    db: Session = Depends(get_db)
):
    """
    Retrieve document collections with optional filtering
    """
    return document_collection_service.list(
        db,
        skip=skip,
        limit=limit,
        title=title,
        visibility=visibility,
        language=language,
        created_by_id=created_by_id,
        include_users=include_users
    )


@router.get("/{collection_id}", response_model=DocumentCollectionWithStats)
def read_collection(
    collection_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific document collection by ID with detailed information including full statistics
    """
    return document_collection_service.get_by_id(db, collection_id)


@router.put("/{collection_id}", response_model=DocumentCollection)
def update_collection(
    collection_id: int,
    collection: DocumentCollectionUpdate,
    db: Session = Depends(get_db)
):
    """
    Update a document collection (full update)
    """
    return document_collection_service.update(db, collection_id, collection)


@router.patch("/{collection_id}", response_model=DocumentCollection)
def partial_update_collection(
    collection_id: int,
    collection: DocumentCollectionPartialUpdate,
    db: Session = Depends(get_db)
):
    """
    Partially update a document collection
    """
    return document_collection_service.partial_update(db, collection_id, collection)


@router.delete("/{collection_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_collection(
    collection_id: int,
    force: bool = True,
    db: Session = Depends(get_db)
):
    """
    Delete a document collection with cascading delete
    
    - If force=False, will only delete if no documents are associated
    - If force=True (default), will delete the collection and all associated documents, elements, and annotations
    """
    document_collection_service.delete(db, collection_id, force=force)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{collection_id}/documents", response_model=List[Dict[str, Any]])
def get_collection_documents(
    collection_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Get all documents for a specific collection
    """
    return document_collection_service.get_documents(db, collection_id, skip=skip, limit=limit)


@router.delete("/{collection_id}/documents", status_code=status.HTTP_204_NO_CONTENT)
def delete_all_collection_documents(
    collection_id: int,
    force: bool = True,
    db: Session = Depends(get_db)
):
    """
    Delete all documents in a collection with cascading delete
    
    - force=True (default): Delete documents and all associated elements/annotations
    - This operation cascades through: Collection -> Documents -> Elements -> Annotations
    """
    document_collection_service.delete_all_documents(db, collection_id, force=force)
    return Response(status_code=status.HTTP_204_NO_CONTENT)