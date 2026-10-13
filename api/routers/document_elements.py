# routers/document_elements.py

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, status, Response, UploadFile, File
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from schemas.document_elements import (
    DocumentElement,
    DocumentElementCreate,
    DocumentElementUpdate,
    DocumentElementPartialUpdate,
    DocumentElementWithDocument,
)
from schemas.annotations import Annotation
from services.document_element_service import document_element_service

router = APIRouter(
    prefix="/api/v1/elements",
    tags=["document elements"],
    responses={404: {"description": "Document element not found"}},
)


@router.post("/", response_model=DocumentElement, status_code=status.HTTP_201_CREATED)
def create_element(
    element: DocumentElementCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new document element
    """
    return document_element_service.create(db, element)


@router.get("/", response_model=List[DocumentElement])
def read_elements(
    skip: int = 0,
    limit: int = 100,
    document_id: Optional[int] = None,
    content_query: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Retrieve document elements with optional filtering and sorting

    - document_id: Filter by document ID
    - content_query: Search within the content JSONB field
    - Results are sorted by hierarchy->element_order in ascending order
    """
    return document_element_service.list(
        db,
        skip=skip,
        limit=limit,
        document_id=document_id,
        content_query=content_query
    )


@router.get("/{element_id}", response_model=DocumentElementWithDocument)
def read_element(
    element_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific document element by ID with document information
    """
    return document_element_service.get_by_id(db, element_id)


@router.put("/{element_id}", response_model=DocumentElement)
def update_element(
    element_id: int,
    element: DocumentElementUpdate,
    db: Session = Depends(get_db)
):
    """
    Update a document element (full update)
    """
    return document_element_service.update(db, element_id, element)


@router.patch("/{element_id}", response_model=DocumentElement)
def partial_update_element(
    element_id: int,
    element: DocumentElementPartialUpdate,
    db: Session = Depends(get_db),
):
    """
    Partially update a document element
    """
    return document_element_service.partial_update(db, element_id, element)


@router.delete("/{element_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_element(
    element_id: int,
    force: bool = False,
    db: Session = Depends(get_db)
):
    """
    Delete a document element

    - If force=False (default), will only delete if no annotations are associated
    - If force=True, will delete the element and all associated annotations
    """
    document_element_service.delete(db, element_id, force=force)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/{element_id}/content", response_model=DocumentElement)
def update_element_content(
    element_id: int,
    content: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """
    Update only the content field of a document element
    """
    return document_element_service.update_content(db, element_id, content)


@router.patch("/{element_id}/hierarchy", response_model=DocumentElement)
def update_element_hierarchy(
    element_id: int,
    hierarchy: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """
    Update only the hierarchy field of a document element
    """
    return document_element_service.update_hierarchy(db, element_id, hierarchy)


@router.get("/{element_id}/annotations", response_model=List[Annotation])
def get_element_annotations(
    element_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Get all annotations for a specific document element
    """
    return document_element_service.get_annotations(db, element_id, skip=skip, limit=limit)


@router.get("/document/{document_id}", response_model=List[DocumentElement])
def get_elements_by_document(
    document_id: int,
    skip: int = 0,
    limit: int = 10000,  # Increased to support large documents
    db: Session = Depends(get_db),
):
    """
    Get all elements for a specific document
    """
    return document_element_service.get_by_document(db, document_id, skip=skip, limit=limit)


@router.get("/document/{document_id}/stats", response_model=Dict[str, Any])
def get_document_elements_stats(
    document_id: int,
    db: Session = Depends(get_db)
):
    """
    Get statistics about document elements for a specific document
    """
    return document_element_service.get_document_stats(db, document_id)


@router.delete("/document/{document_id}/all-elements", status_code=status.HTTP_204_NO_CONTENT)
def delete_all_document_elements(
    document_id: int,
    force: bool = True,
    db: Session = Depends(get_db)
):
    """
    Delete all elements for a specific document

    - force=True (default): Delete elements and all associated annotations
    """
    document_element_service.delete_all_by_document(db, document_id, force=force)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/upload-word-doc", status_code=status.HTTP_201_CREATED)
def upload_word_doc(
    document_collection_id: int,
    document_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Upload Word doc into document elements
    """
    contents = file.file.read()
    result = document_element_service.upload_word_document(
        db,
        document_collection_id=document_collection_id,
        document_id=document_id,
        file_content=contents,
        filename=file.filename
    )
    return JSONResponse(content=result, status_code=status.HTTP_201_CREATED)