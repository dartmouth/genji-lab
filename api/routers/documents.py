# routers/documents.py

from typing import List, Optional, Dict, Any
from fastapi import (
    APIRouter,
    Depends,
    status,
    Response,
    UploadFile,
    File,
)
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from schemas.documents import (
    Document,
    DocumentCreate,
    DocumentUpdate,
    DocumentPartialUpdate,
    DocumentWithDetails,
)
from schemas.document_elements import DocumentElement as DocumentElementSchema
from services.document_service import document_service


class BulkDeleteRequest(BaseModel):
    document_ids: List[int]


router = APIRouter(
    prefix="/api/v1/documents",
    tags=["documents"],
    responses={404: {"description": "Document not found"}},
)


@router.post("/", response_model=Document, status_code=status.HTTP_201_CREATED)
def create_document(
    document: DocumentCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new document
    """
    return document_service.create(db, document)


@router.get("/", response_model=List[Document])
def read_documents(
    skip: int = 0,
    limit: int = 100,
    title: Optional[str] = None,
    collection_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """
    Retrieve documents with optional filtering
    """
    return document_service.list(
        db,
        skip=skip,
        limit=limit,
        title=title,
        collection_id=collection_id
    )


@router.delete("/bulk-delete", status_code=status.HTTP_204_NO_CONTENT)
def bulk_delete_documents(
    request: BulkDeleteRequest,
    force: bool = True,
    db: Session = Depends(get_db),
):
    """
    Bulk delete multiple documents with cascading delete

    - force=True (default): Delete documents and all associated elements/annotations
    - This operation cascades through: Documents -> Elements -> Annotations
    """
    document_service.bulk_delete(db, request.document_ids, force=force)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{document_id}", response_model=DocumentWithDetails)
def read_document(
    document_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific document by ID with detailed information
    """
    return document_service.get_by_id(db, document_id)


@router.put("/{document_id}", response_model=Document)
def update_document(
    document_id: int,
    document: DocumentUpdate,
    db: Session = Depends(get_db)
):
    """
    Update a document (full update)
    """
    return document_service.update(db, document_id, document)


@router.patch("/{document_id}", response_model=Document)
def partial_update_document(
    document_id: int,
    document: DocumentPartialUpdate,
    db: Session = Depends(get_db),
):
    """
    Partially update a document
    """
    return document_service.partial_update(db, document_id, document)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: int,
    force: bool = True,
    db: Session = Depends(get_db)
):
    """
    Delete a document with cascading delete

    - force=True (default): Delete the document and all associated elements/annotations
    """
    document_service.delete(db, document_id, force=force)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{document_id}/elements/", response_model=List[DocumentElementSchema])
def get_document_elements(
    document_id: int,
    skip: int = 0,
    limit: int = 10000,  # Increased to support large documents
    db: AsyncSession = Depends(get_db),
):
    """
    Get all elements for a specific document
    """
    return document_service.get_elements(db, document_id, skip=skip, limit=limit)


@router.get("/collection/{collection_id}/with-stats", response_model=List[Dict[str, Any]])
def get_documents_with_annotation_stats(
    collection_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """
    Get documents in a collection with annotation statistics for delete operations
    """
    return document_service.get_by_collection_with_stats(
        db,
        collection_id,
        skip=skip,
        limit=limit
    )


@router.post("/import-word-doc", status_code=status.HTTP_201_CREATED)
def import_word_document(
    document_collection_id: int,
    title: str,
    description: str = "",
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Create a new document and import Word document content in one operation
    """
    contents = file.file.read()
    result = document_service.import_word_document(
        db,
        collection_id=document_collection_id,
        title=title,
        description=description,
        file_content=contents,
        filename=file.filename
    )
    return JSONResponse(content=result, status_code=status.HTTP_201_CREATED)
