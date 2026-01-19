from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from dotenv import load_dotenv, find_dotenv

from database import get_db
from models.models import User
from schemas.annotations import (
    Annotation,
    AnnotationCreate,
    AnnotationPatch,
    AnnotationAddTarget,
)
from dependencies.classroom import (
    get_classroom_context,
    get_current_user_sync,
    get_user_classrooms,
)
from services.annotation_service import annotation_service
from services.annotation_query_service import annotation_query_service

load_dotenv(find_dotenv())

router = APIRouter(
    prefix="/api/v1/annotations",
    tags=["annotations"],
    responses={404: {"description": "Annotation not found"}},
)


@router.post("/", response_model=Annotation, status_code=status.HTTP_201_CREATED)
def create_annotation(
    annotation: AnnotationCreate,
    classroom_id: Optional[int] = Depends(get_classroom_context),
    current_user: User = Depends(get_current_user_sync),
    db: Session = Depends(get_db),
):
    """Create a new annotation in the current classroom context."""
    return annotation_service.create(db, annotation, current_user, classroom_id)


@router.get("/", response_model=List[Annotation], status_code=status.HTTP_200_OK)
def read_annotations(
    motivation: str = None,
    document_element_id: int = None,
    skip: int = 0,
    limit: int = 100,
    classroom_id: Optional[int] = Depends(get_classroom_context),
    current_user: User = Depends(get_current_user_sync),
    db: Session = Depends(get_db),
):
    """Get annotations filtered by classroom context."""
    return annotation_service.list(
        db,
        classroom_id,
        motivation=motivation,
        document_element_id=document_element_id,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/{annotation_id}", response_model=Annotation, status_code=status.HTTP_200_OK
)
def read_annotation(
    annotation_id: int,
    classroom_id: Optional[int] = Depends(get_classroom_context),
    current_user: User = Depends(get_current_user_sync),
    db: Session = Depends(get_db),
):
    """Get a specific annotation by ID, respecting classroom context."""
    return annotation_service.get_by_id(db, annotation_id, classroom_id)


# TODO -- this should validate that the current user has delete privileges (i.e. owns the resource or is an admin)
@router.delete("/{annotation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_annotation(
    annotation_id: int,
    classroom_id: Optional[int] = Depends(get_classroom_context),
    current_user: User = Depends(get_current_user_sync),
    db: Session = Depends(get_db),
):
    """Delete an annotation, respecting classroom context."""
    annotation_service.delete(db, annotation_id, classroom_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch(
    "/{annotation_id}", response_model=Annotation, status_code=status.HTTP_200_OK
)
def update_annotation(
    annotation_id: int,
    payload: AnnotationPatch,
    classroom_id: Optional[int] = Depends(get_classroom_context),
    current_user: User = Depends(get_current_user_sync),
    db: Session = Depends(get_db),
):
    """Update an annotation, respecting classroom context."""
    return annotation_service.update(db, annotation_id, payload, classroom_id)


@router.patch(
    "/add-target/{annotation_id}",
    response_model=Annotation,
    status_code=status.HTTP_200_OK,
)
def add_target_to_annotation(
    annotation_id: int,
    payload: AnnotationAddTarget,
    current_user: User = Depends(get_current_user_sync),
    db: Session = Depends(get_db),
):
    """Add new targets to an existing linking annotation."""
    return annotation_service.add_target(db, annotation_id, payload, current_user)


@router.patch(
    "/remove-target/{annotation_id}",
    response_model=Annotation,
    status_code=status.HTTP_200_OK,
)
def remove_target_from_annotation(
    annotation_id: int,
    target_id: int,
    current_user: User = Depends(get_current_user_sync),
    db: Session = Depends(get_db),
):
    """Remove a specific target from a linking annotation."""
    result = annotation_service.remove_target(db, annotation_id, target_id, current_user)
    
    if result is None:
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    
    return result


@router.get(
    "/by-motivation/{document_element_id}",
    response_model=Dict[str, List[Annotation]],
    status_code=status.HTTP_200_OK,
)
def read_annotations_by_motivation(
    document_element_id: int,
    classroom_id: Optional[int] = Depends(get_classroom_context),
    current_user: User = Depends(get_current_user_sync),
    db: Session = Depends(get_db),
):
    """Get annotations grouped by motivation for a document element."""
    return annotation_query_service.get_by_motivation(db, document_element_id, classroom_id)


@router.get(
    "/links/{document_element_id}",
    response_model=List[Annotation],
    status_code=status.HTTP_200_OK,
)
def fetch_links(
    document_element_id: int,
    classroom_id: Optional[int] = Depends(get_classroom_context),
    current_user: User = Depends(get_current_user_sync),
    db: Session = Depends(get_db),
):
    """Get linking annotations that reference a specific document element."""
    return annotation_query_service.get_links_for_element(db, document_element_id, classroom_id)


@router.get(
    "/linked-text-info/{document_element_id}",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
)
def get_linked_text_info(
    document_element_id: int,
    current_user: User = Depends(get_current_user_sync),
    db: Session = Depends(get_db),
):
    """Returns only the specific documents and elements that are linked."""
    return annotation_query_service.get_linked_text_info(db, document_element_id)


@router.get("/classrooms", response_model=List[dict], status_code=status.HTTP_200_OK)
def get_my_classrooms(
    current_user: User = Depends(get_current_user_sync),
    db: Session = Depends(get_db),
):
    """Get all classrooms the current user is a member of."""
    classrooms = get_user_classrooms(current_user, db)
    return [
        {
            "id": classroom.id,
            "name": classroom.name,
            "description": classroom.description,
            "created_at": classroom.created_at,
        }
        for classroom in classrooms
    ]
