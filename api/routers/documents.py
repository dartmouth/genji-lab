from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import joinedload

from database import get_db
from models.models import Document as DocumentModel, DocumentCollection, DocumentElement
from schemas.documents import (
    Document, 
    DocumentCreate, 
    DocumentUpdate, 
    DocumentPartialUpdate, 
    DocumentWithDetails
    )

router = APIRouter(
    prefix="/api/v1/documents",
    tags=["documents"],
    responses={404: {"description": "Document not found"}},
)

@router.post("/", response_model=Document, status_code=status.HTTP_201_CREATED)
def create_document(document: DocumentCreate, db: AsyncSession = Depends(get_db)):
    """
    Create a new document
    """
    # Verify the document collection exists
    collection = db.execute(
        select(DocumentCollection).filter(DocumentCollection.id == document.document_collection_id)
    ).scalar_one_or_none()
    
    if not collection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document collection with ID {document.document_collection_id} not found"
        )
    
    # Create the document
    db_document = DocumentModel(**document.dict())
    db.add(db_document)
    db.commit()
    db.refresh(db_document)
    return db_document

@router.get("/", response_model=List[Document])
def read_documents(
    skip: int = 0,
    limit: int = 100,
    title: Optional[str] = None,
    collection_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve documents with optional filtering
    """
    query = select(DocumentModel)
    
    # Apply filters if provided
    if title:
        query = query.filter(DocumentModel.title.ilike(f"%{title}%"))
    if collection_id:
        query = query.filter(DocumentModel.document_collection_id == collection_id)
    
    # Apply pagination
    query = query.offset(skip).limit(limit)
    
    result = db.execute(query)
    documents = result.scalars().all()
    return documents

@router.get("/{document_id}", response_model=DocumentWithDetails)
def read_document(document_id: int, db: AsyncSession = Depends(get_db)):
    """
    Get a specific document by ID with detailed information
    """
    # Query for document with joined collection
    query = (
        select(DocumentModel)
        .options(joinedload(DocumentModel.collection))
        .filter(DocumentModel.id == document_id)
    )
    
    document = db.execute(query).scalar_one_or_none()
    
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Get the count of document elements
    elements_count = db.execute(
        select(func.count())
        .select_from(DocumentElement)
        .filter(DocumentElement.document_id == document_id)
    ).scalar_one()
    
    # Add the count to the document object
    setattr(document, "elements_count", elements_count)
    
    return document

@router.put("/{document_id}", response_model=Document)
def update_document(document_id: int, document: DocumentUpdate, db: AsyncSession = Depends(get_db)):
    """
    Update a document (full update)
    """
    db_document = db.execute(
        select(DocumentModel).filter(DocumentModel.id == document_id)
    ).scalar_one_or_none()
    
    if db_document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Verify the document collection exists if it's being updated
    if document.document_collection_id:
        collection = db.execute(
            select(DocumentCollection).filter(DocumentCollection.id == document.document_collection_id)
        ).scalar_one_or_none()
        
        if not collection:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document collection with ID {document.document_collection_id} not found"
            )
    
    # Update document attributes
    update_data = document.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_document, key, value)
    
    db.commit()
    db.refresh(db_document)
    return db_document

@router.patch("/{document_id}", response_model=Document)
def partial_update_document(
    document_id: int,
    document: DocumentPartialUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Partially update a document
    """
    db_document = db.execute(
        select(DocumentModel).filter(DocumentModel.id == document_id)
    ).scalar_one_or_none()
    
    if db_document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Verify the document collection exists if it's being updated
    if document.document_collection_id:
        collection = db.execute(
            select(DocumentCollection).filter(DocumentCollection.id == document.document_collection_id)
        ).scalar_one_or_none()
        
        if not collection:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document collection with ID {document.document_collection_id} not found"
            )
    
    # Update only provided fields
    update_data = document.dict(exclude_unset=True, exclude_none=True)
    for key, value in update_data.items():
        setattr(db_document, key, value)
    
    db.commit()
    db.refresh(db_document)
    return db_document

@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(document_id: int, db: AsyncSession = Depends(get_db)):
    """
    Delete a document
    """
    db_document = db.execute(
        select(DocumentModel).filter(DocumentModel.id == document_id)
    ).scalar_one_or_none()
    
    if db_document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Check if document has elements
    elements_count = db.execute(
        select(func.count())
        .select_from(DocumentElement)
        .filter(DocumentElement.document_id == document_id)
    ).scalar_one()
    
    if elements_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete document with {elements_count} elements. Delete elements first."
        )
    
    db.delete(db_document)
    db.commit()
    return None

@router.get("/{document_id}/elements", response_model=List[Dict[str, Any]])
def get_document_elements(
    document_id: int,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """
    Get all elements for a specific document
    """
    # First check if document exists
    document = db.execute(
        select(DocumentModel).filter(DocumentModel.id == document_id)
    ).scalar_one_or_none()
    
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Get document elements
    elements = db.execute(
        select(DocumentElement)
        .filter(DocumentElement.document_id == document_id)
        .offset(skip)
        .limit(limit)
    ).scalars().all()
    
    # Convert elements to dict with JSONB fields properly handled
    result = []
    for element in elements:
        element_dict = {
            "id": element.id,
            "document_id": element.document_id,
            "created": element.created,
            "modified": element.modified,
            "hierarchy": element.hierarchy,
            "content": element.content
        }
        result.append(element_dict)
    
    return result