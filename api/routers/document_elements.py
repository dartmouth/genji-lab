from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import String, delete, select, func
from sqlalchemy.orm import joinedload
from datetime import datetime

from database import get_db
from models.models import DocumentElement as DocumentElementModel
from models.models import Document
from models.models import Annotation as AnnotationModel
from schemas.document_elements import (
    DocumentElement, 
    DocumentElementCreate, 
    DocumentElementUpdate, 
    DocumentElementPartialUpdate,
    DocumentElementWithDocument
)

from schemas.annotations import (
    Annotation,
    DocumentElementAnnotationsResponse
)
router = APIRouter(
    prefix="/api/v1/elements",
    tags=["document elements"],
    responses={404: {"description": "Document element not found"}},
)

@router.post("/", response_model=DocumentElement, status_code=status.HTTP_201_CREATED)
def create_element(element: DocumentElementCreate, db: AsyncSession = Depends(get_db)):
    """
    Create a new document element
    """
    # Verify the document exists
    document = db.execute(
        select(Document).filter(Document.id == element.document_id)
    ).scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {element.document_id} not found"
        )
    
    # Create the document element
    db_element = DocumentElementModel(**element.dict())
    
    db.add(db_element)
    db.commit()
    db.refresh(db_element)
    return db_element

@router.get("/", response_model=List[DocumentElement])
def read_elements(
    skip: int = 0,
    limit: int = 100,
    document_id: Optional[int] = None,
    content_query: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve document elements with optional filtering
    
    - document_id: Filter by document ID
    - content_query: Search within the content JSONB field (requires PostgreSQL full-text search)
    """
    query = select(DocumentElementModel)
    
    # Apply filters if provided
    if document_id:
        query = query.filter(DocumentElementModel.document_id == document_id)
    
    # Content search (simplified - in a real app, you'd want more sophisticated JSONB querying)
    if content_query:
        # This is a simplified approach. For a real app, consider using PostgreSQL's 
        # full-text search capabilities or more specific JSONB operators
        query = query.filter(
            DocumentElementModel.content.cast(String).ilike(f"%{content_query}%")
        )
    
    # Apply pagination
    query = query.offset(skip).limit(limit)
    
    result = db.execute(query)
    elements = result.scalars().all()
    return elements

@router.get("/{element_id}", response_model=DocumentElementWithDocument)
def read_element(element_id: int, db: AsyncSession = Depends(get_db)):
    """
    Get a specific document element by ID with document information
    """
    # Query for element with joined document
    query = (
        select(DocumentElementModel)
        .options(joinedload(DocumentElementModel.document))
        .filter(DocumentElementModel.id == element_id)
    )
    
    element = db.execute(query).scalar_one_or_none()
    
    if element is None:
        raise HTTPException(status_code=404, detail="Document element not found")
    
    return element

@router.put("/{element_id}", response_model=DocumentElement)
def update_element(
    element_id: int, 
    element: DocumentElementUpdate, 
    db: AsyncSession = Depends(get_db)
):
    """
    Update a document element (full update)
    """
    db_element = db.execute(
        select(DocumentElementModel).filter(DocumentElementModel.id == element_id)
    ).scalar_one_or_none()
    
    if db_element is None:
        raise HTTPException(status_code=404, detail="Document element not found")
    
    # Verify the document exists if it's being updated
    if element.document_id:
        document = db.execute(
            select(Document).filter(Document.id == element.document_id)
        ).scalar_one_or_none()
        
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document with ID {element.document_id} not found"
            )
    
    # Update element attributes
    update_data = element.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_element, key, value)
    
    # Always update modified timestamp
    db_element.modified = datetime.now()
    
    db.commit()
    db.refresh(db_element)
    return db_element

@router.patch("/{element_id}", response_model=DocumentElement)
def partial_update_element(
    element_id: int,
    element: DocumentElementPartialUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Partially update a document element
    """
    db_element = db.execute(
        select(DocumentElementModel).filter(DocumentElementModel.id == element_id)
    ).scalar_one_or_none()
    
    if db_element is None:
        raise HTTPException(status_code=404, detail="Document element not found")
    
    # Verify the document exists if it's being updated
    if element.document_id:
        document = db.execute(
            select(Document).filter(Document.id == element.document_id)
        ).scalar_one_or_none()
        
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document with ID {element.document_id} not found"
            )
    
    # Update only provided fields
    update_data = element.dict(exclude_unset=True, exclude_none=True)
    for key, value in update_data.items():
        setattr(db_element, key, value)
    
    # Always update modified timestamp
    db_element.modified = datetime.now()
    
    db.commit()
    db.refresh(db_element)
    return db_element

@router.delete("/{element_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_element(element_id: int, force: bool = False, db: AsyncSession = Depends(get_db)):
    """
    Delete a document element
    
    - If force=False (default), will only delete if no annotations are associated
    - If force=True, will delete the element and all associated annotations
    """
    db_element = db.execute(
        select(DocumentElementModel).filter(DocumentElementModel.id == element_id)
    ).scalar_one_or_none()
    
    if db_element is None:
        raise HTTPException(status_code=404, detail="Document element not found")
    
    # Check if element has annotations
    annotation_count = db.execute(
        select(func.count())
        .select_from(AnnotationModel)
        .filter(AnnotationModel.document_element_id == element_id)
    ).scalar_one()
    
    if annotation_count > 0 and not force:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete element with {annotation_count} annotations. Use force=True to delete anyway."
        )
    
    # If force=True, delete all associated annotations first
    if force and annotation_count > 0:
        db.execute(
            delete(AnnotationModel).where(AnnotationModel.document_element_id == element_id)
        )
    
    db.delete(db_element)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.get("/{element_id}/annotations", response_model=List[Annotation])
def get_element_annotations(
    element_id: int,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """
    Get all annotations for a specific document element
    """
    # First check if element exists
    element = db.execute(
        select(DocumentElementModel).filter(DocumentElementModel.id == element_id)
    ).scalar_one_or_none()
    
    if element is None:
        raise HTTPException(status_code=404, detail="Document element not found")
    
    # Get annotations
    annotations = db.execute(
        select(AnnotationModel)
        .filter(AnnotationModel.document_element_id == element_id)
        .offset(skip)
        .limit(limit)
    ).scalars().all()
    
    return annotations

@router.patch("/{element_id}/content", response_model=DocumentElement)
def update_element_content(
    element_id: int,
    content: Dict[str, Any],
    db: AsyncSession = Depends(get_db)
):
    """
    Update only the content field of a document element
    """
    db_element = db.execute(
        select(DocumentElementModel).filter(DocumentElementModel.id == element_id)
    ).scalar_one_or_none()
    
    if db_element is None:
        raise HTTPException(status_code=404, detail="Document element not found")
    
    # Update content
    db_element.content = content
    
    # Always update modified timestamp
    db_element.modified = datetime.now()
    
    db.commit()
    db.refresh(db_element)
    return db_element

@router.patch("/{element_id}/hierarchy", response_model=DocumentElement)
def update_element_hierarchy(
    element_id: int,
    hierarchy: Dict[str, Any],
    db: AsyncSession = Depends(get_db)
):
    """
    Update only the hierarchy field of a document element
    """
    db_element = db.execute(
        select(DocumentElementModel).filter(DocumentElementModel.id == element_id)
    ).scalar_one_or_none()
    
    if db_element is None:
        raise HTTPException(status_code=404, detail="Document element not found")
    
    # Update hierarchy
    db_element.hierarchy = hierarchy
    
    # Always update modified timestamp
    db_element.modified = datetime.now()
    
    db.commit()
    db.refresh(db_element)
    return db_element

@router.get("/document/{document_id}", response_model=List[DocumentElement])
def get_elements_by_document(
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
        select(Document).filter(Document.id == document_id)
    ).scalar_one_or_none()
    
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Get document elements
    elements = db.execute(
        select(DocumentElementModel)
        .filter(DocumentElementModel.document_id == document_id)
        .offset(skip)
        .limit(limit)
    ).scalars().all()
    
    return elements