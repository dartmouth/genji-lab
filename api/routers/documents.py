from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from sqlalchemy.orm import joinedload
from pydantic import BaseModel

from database import get_db
from models.models import Document as DocumentModel, DocumentCollection, DocumentElement
from schemas.documents import (
    Document, 
    DocumentCreate, 
    DocumentUpdate, 
    DocumentPartialUpdate, 
    DocumentWithDetails
    )

from schemas.document_elements import DocumentElement as DocumentElementSchema

# Add this new schema for bulk delete
class BulkDeleteRequest(BaseModel):
    document_ids: List[int]

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

@router.delete("/bulk-delete", status_code=status.HTTP_204_NO_CONTENT)
def bulk_delete_documents(
    request: BulkDeleteRequest, 
    force: bool = True,  # Default to True for cascading delete
    db: AsyncSession = Depends(get_db)
):
    """
    Bulk delete multiple documents with cascading delete
    
    - force=True (default): Delete documents and all associated elements/annotations
    - This operation cascades through: Documents -> Elements -> Annotations
    """
    if not request.document_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No document IDs provided"
        )
    
    # Verify all documents exist
    existing_documents = db.execute(
        select(DocumentModel).filter(DocumentModel.id.in_(request.document_ids))
    ).scalars().all()
    
    existing_ids = [doc.id for doc in existing_documents]
    missing_ids = set(request.document_ids) - set(existing_ids)
    
    if missing_ids:
        raise HTTPException(
            status_code=404, 
            detail=f"Documents not found: {list(missing_ids)}"
        )
    
    # Cascading delete: Annotations -> Elements -> Documents
    if force:
        from models.models import Annotation as AnnotationModel
        
        # Get all element IDs for documents in these documents
        element_ids = db.execute(
            select(DocumentElement.id).filter(
                DocumentElement.document_id.in_(request.document_ids)
            )
        ).scalars().all()
        
        if element_ids:
            # Delete all annotations for these elements
            db.execute(
                delete(AnnotationModel).where(AnnotationModel.document_element_id.in_(element_ids))
            )
            
            # Delete all elements for these documents
            db.execute(
                delete(DocumentElement).where(DocumentElement.document_id.in_(request.document_ids))
            )
    
    # Delete the documents
    db.execute(
        delete(DocumentModel).where(DocumentModel.id.in_(request.document_ids))
    )
    
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(document_id: int, force: bool = True, db: AsyncSession = Depends(get_db)):
    """
    Delete a document with cascading delete
    
    - force=True (default): Delete the document and all associated elements/annotations
    """
    db_document = db.execute(
        select(DocumentModel).filter(DocumentModel.id == document_id)
    ).scalar_one_or_none()
    
    if db_document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Cascading delete: Annotations -> Elements -> Documents
    if force:
        from models.models import Annotation as AnnotationModel
        
        # Get all element IDs for this document
        element_ids = db.execute(
            select(DocumentElement.id).filter(DocumentElement.document_id == document_id)
        ).scalars().all()
        
        if element_ids:
            # Delete all annotations for these elements
            db.execute(
                delete(AnnotationModel).where(AnnotationModel.document_element_id.in_(element_ids))
            )
            
            # Delete all elements for this document
            db.execute(
                delete(DocumentElement).where(DocumentElement.document_id == document_id)
            )
    
    # Delete the document
    db.delete(db_document)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.get("/{document_id}/elements/", response_model=List[DocumentElementSchema])
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

@router.get("/collection/{collection_id}/with-stats", response_model=List[Dict[str, Any]])
def get_documents_with_annotation_stats(
    collection_id: int,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """
    Get documents in a collection with annotation statistics for delete operations
    """
    from models.models import Annotation as AnnotationModel
    
    # First verify collection exists
    collection = db.execute(
        select(DocumentCollection).filter(DocumentCollection.id == collection_id)
    ).scalar_one_or_none()
    
    if not collection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document collection with ID {collection_id} not found"
        )
    
    # Get documents in this collection
    documents = db.execute(
        select(DocumentModel)
        .filter(DocumentModel.document_collection_id == collection_id)
        .offset(skip)
        .limit(limit)
    ).scalars().all()
    
    result = []
    for document in documents:
        # Count scholarly annotations (motivation = 'scholarly' or similar)
        scholarly_count = db.execute(
            select(func.count())
            .select_from(AnnotationModel)
            .filter(
                AnnotationModel.document_id == document.id,
                AnnotationModel.motivation.in_(['scholarly', 'highlighting', 'bookmarking', 'classifying'])
            )
        ).scalar_one()
        
        # Count comments (motivation = 'commenting')
        comment_count = db.execute(
            select(func.count())
            .select_from(AnnotationModel)
            .filter(
                AnnotationModel.document_id == document.id,
                AnnotationModel.motivation == 'commenting'
            )
        ).scalar_one()
        
        # Count document elements
        element_count = db.execute(
            select(func.count())
            .select_from(DocumentElement)
            .filter(DocumentElement.document_id == document.id)
        ).scalar_one()
        
        doc_dict = {
            "id": document.id,
            "title": document.title,
            "description": document.description,
            "created": document.created,
            "modified": document.modified,
            "scholarly_annotation_count": scholarly_count,
            "comment_count": comment_count,
            "element_count": element_count,
            "total_annotation_count": scholarly_count + comment_count
        }
        result.append(doc_dict)
    
    return result
