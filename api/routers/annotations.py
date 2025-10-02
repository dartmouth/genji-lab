from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, text, and_, or_
from datetime import datetime
from collections import defaultdict
from typing import Dict, List
from dotenv import load_dotenv, find_dotenv
import os

from database import get_db
from models.models import Annotation as AnnotationModel, User
from schemas.annotations import (
    Annotation,
    AnnotationCreate,
    AnnotationPatch
)
from dependencies.classroom import get_classroom_context, get_current_user_sync, get_user_classrooms

load_dotenv(find_dotenv())

router = APIRouter(
    prefix="/api/v1/annotations",
    tags=["annotations"],
    responses={404: {"description": "Annotation not found"}},
)

def generate_body_id(db: Session, schema: str) -> str:
    """Generate a unique body ID using the sequence"""
    result = db.execute(text(f"SELECT nextval('{schema}.annotation_body_id_seq')"))
    id_num = result.scalar_one()
    return id_num

def generate_target_id(db: Session, schema: str) -> str:
    """Generate a unique target ID using the sequence"""
    result = db.execute(text(f"SELECT nextval('{schema}.annotation_target_id_seq')"))
    id_num = result.scalar_one()
    return id_num

@router.post("/", response_model=Annotation, status_code=status.HTTP_201_CREATED)
def create_annotation(
    annotation: AnnotationCreate,
    classroom_id: Optional[int] = Depends(get_classroom_context),
    current_user: User = Depends(get_current_user_sync),
    db: Session = Depends(get_db)
):
    """Create a new annotation in the current classroom context."""
    
    # Generate IDs for body and targets
    annotation.body.id = generate_body_id(db, os.environ.get("DB_SCHEMA"))
    
    for target in annotation.target:
        target.id = generate_target_id(db, os.environ.get("DB_SCHEMA"))
    
    # Set the creator to current user and classroom
    annotation.creator_id = current_user.id
    
    # Create annotation with classroom context
    db_annotation = AnnotationModel(
        document_collection_id=annotation.document_collection_id,
        document_id=annotation.document_id,
        document_element_id=annotation.document_element_id,
        creator_id=current_user.id,
        classroom_id=classroom_id,
        type=annotation.type,
        motivation=annotation.motivation,
        generator=annotation.generator,
        generated=datetime.now(),
        body=annotation.body.model_dump(by_alias=True),
        target=[t.model_dump(by_alias=True) for t in annotation.target],
        status=annotation.status,
        annotation_type=annotation.annotation_type,
        context=annotation.context,
        created=datetime.now(),
        modified=datetime.now()
    )
    
    db.add(db_annotation)
    db.commit()
    db.refresh(db_annotation)
    
    return db_annotation

@router.get("/", response_model=List[Annotation], status_code=status.HTTP_200_OK)
def read_annotations(
    motivation: str = None,
    document_element_id: int = None,
    skip: int = 0,
    limit: int = 100,
    classroom_id: Optional[int] = Depends(get_classroom_context),
    current_user: User = Depends(get_current_user_sync),
    db: Session = Depends(get_db)
):
    """Get annotations filtered by classroom context."""
    
    query = db.query(AnnotationModel).options(joinedload(AnnotationModel.creator))
    
    # Apply classroom filtering BEFORE offset/limit
    if classroom_id is not None:
        query = query.filter(AnnotationModel.classroom_id == classroom_id)
    else:
        query = query.filter(AnnotationModel.classroom_id.is_(None))
    
    if motivation:
        query = query.filter(AnnotationModel.motivation == motivation)
    
    if document_element_id:
        query = query.filter(AnnotationModel.document_element_id == document_element_id)
    
    # Apply pagination AFTER all filters
    query = query.offset(skip).limit(limit)
    
    return query.all()
    

@router.get("/{annotation_id}", response_model=Annotation, status_code=status.HTTP_200_OK)
def read_annotation(
    annotation_id: int,
    classroom_id: Optional[int] = Depends(get_classroom_context),
    current_user: User = Depends(get_current_user_sync),
    db: Session = Depends(get_db)
):
    """Get a specific annotation by ID, respecting classroom context."""
    
    query = db.query(AnnotationModel).options(joinedload(AnnotationModel.creator)).filter(AnnotationModel.id == annotation_id)
    
    # Apply classroom filtering
    if classroom_id is not None:
        query = query.filter(AnnotationModel.classroom_id == classroom_id)
    else:
        query = query.filter(AnnotationModel.classroom_id.is_(None))
    
    annotation = query.first()
    
    if annotation is None:
        raise HTTPException(status_code=404, detail="Annotation not found")
    
    return annotation


@router.delete("/{annotation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_annotation(
    annotation_id: int,
    classroom_id: Optional[int] = Depends(get_classroom_context),
    current_user: User = Depends(get_current_user_sync),
    db: Session = Depends(get_db)
):
    """Delete an annotation, respecting classroom context."""
    
    query = db.query(AnnotationModel).filter(AnnotationModel.id == annotation_id)
    
    # Apply classroom filtering
    if classroom_id is not None:
        query = query.filter(AnnotationModel.classroom_id == classroom_id)
    else:
        query = query.filter(AnnotationModel.classroom_id.is_(None))
    
    db_annotation = query.first()
    
    if not db_annotation:
        raise HTTPException(status_code=404, detail="Annotation not found")
    
    db.delete(db_annotation)
    db.commit()
    
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.patch("/{annotation_id}", response_model=Annotation, status_code=status.HTTP_200_OK)
def update_annotation(
    annotation_id: int,
    payload: AnnotationPatch,
    classroom_id: Optional[int] = Depends(get_classroom_context),
    current_user: User = Depends(get_current_user_sync),
    db: Session = Depends(get_db)
):
    """Update an annotation, respecting classroom context."""
    
    query = db.query(AnnotationModel).filter(AnnotationModel.id == annotation_id)
    
    # Apply classroom filtering
    if classroom_id is not None:
        query = query.filter(AnnotationModel.classroom_id == classroom_id)
    else:
        query = query.filter(AnnotationModel.classroom_id.is_(None))
    
    db_annotation = query.first()
    
    if not db_annotation:
        raise HTTPException(status_code=404, detail="Annotation not found")

    if payload.body:
        current_body = dict(db_annotation.body)
        current_body["value"] = payload.body
        db_annotation.body = current_body
        db_annotation.modified = datetime.now()

    if payload.motivation:
        db_annotation.motivation = payload.motivation
        db_annotation.modified = datetime.now()

    db.commit()
    db.refresh(db_annotation)

    return db_annotation


@router.get("/by-motivation/{document_element_id}", response_model=Dict[str, List[Annotation]], status_code=status.HTTP_200_OK)
def read_annotations_by_motivation(
    document_element_id: int,
    classroom_id: Optional[int] = Depends(get_classroom_context),
    current_user: User = Depends(get_current_user_sync),
    db: Session = Depends(get_db)
):
    """Get annotations grouped by motivation for a document element."""
    
    query = db.query(AnnotationModel).options(
        joinedload(AnnotationModel.creator)
    ).filter(AnnotationModel.document_element_id == document_element_id)
    
    # Apply classroom filtering
    if classroom_id is not None:
            query = query.filter(
        or_(
            and_(AnnotationModel.motivation == 'commenting', 
                 AnnotationModel.group_id == classroom_id),
            AnnotationModel.motivation != 'commenting'
        )
    )
    else:
        query = query.filter(AnnotationModel.group_id.is_(None))
    
    annotations = query.all()
    
    # Group by motivation
    grouped_annotations = defaultdict(list)
    for annotation in annotations:
        grouped_annotations[annotation.motivation].append(annotation)
    
    return dict(grouped_annotations)

@router.get("/links/{document_element_id}", response_model=List[Annotation], status_code=status.HTTP_200_OK)
def fetch_links(
    document_element_id: int,
    classroom_id: Optional[int] = Depends(get_classroom_context),
    current_user: User = Depends(get_current_user_sync),
    db: Session = Depends(get_db)
):
    """Get linking annotations that reference a specific document element."""
    
    query = db.query(AnnotationModel).options(
        joinedload(AnnotationModel.creator)
    ).filter(AnnotationModel.motivation == "linking")
    
    # Apply classroom filtering
    if classroom_id is not None:
        query = query.filter(AnnotationModel.classroom_id == classroom_id)
    else:
        query = query.filter(AnnotationModel.classroom_id.is_(None))
    
    all_linking_annotations = query.all()
    
    # Filter annotations that have our document_element_id in their target sources
    target_sources = [
        f"DocumentElements/{document_element_id}",
        f"DocumentElements/DocumentElements/{document_element_id}"  # Handle both formats
    ]
    
    matching_annotations = []
    for annotation in all_linking_annotations:
        if annotation.target:  # target is stored as JSON
            for target in annotation.target:
                if target.get("source") in target_sources:
                    matching_annotations.append(annotation)
                    break  # Found a match, no need to check other targets
    
    return matching_annotations


@router.get("/classrooms", response_model=List[dict], status_code=status.HTTP_200_OK)
def get_my_classrooms(
    current_user: User = Depends(get_current_user_sync),
    db: Session = Depends(get_db)
):
    """Get all classrooms the current user is a member of."""
    
    classrooms = get_user_classrooms(current_user, db)
    return [
        {
            "id": classroom.id,
            "name": classroom.name,
            "description": classroom.description,
            "created_at": classroom.created_at
        }
        for classroom in classrooms
    ]