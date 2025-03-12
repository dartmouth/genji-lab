from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete, select, func, update
from sqlalchemy.orm import joinedload
from datetime import datetime

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.models import Annotation as AnnotationModel
from schemas.annotations import (
    Annotation,
    AnnotationCreate
)

router = APIRouter(
    prefix="/api/v1/annotations",
    tags=["annotations"],
    responses={404: {"description": "Annotation not found"}},
)

def generate_body_id(db: AsyncSession) -> str:
    """Generate a unique body ID using the sequence"""
    result = db.execute(text("SELECT nextval('app.annotation_body_id_seq')"))
    id_num = result.scalar_one()
    return id_num

def generate_target_id(db: AsyncSession) -> str:
    """Generate a unique target ID using the sequence"""
    result = db.execute(text("SELECT nextval('app.annotation_target_id_seq')"))
    id_num = result.scalar_one()
    return id_num

@router.post("/", response_model=Annotation, status_code=status.HTTP_201_CREATED)
def create_annotation(annotation: AnnotationCreate, db: AsyncSession = Depends(get_db)):

    annotation.body.id = generate_body_id(db)

    for target in annotation.target:
        target.id = generate_target_id(db)

    db_annotation = AnnotationModel(
        document_collection_id=annotation.document_collection_id,
        document_id=annotation.document_id,
        document_element_id=annotation.document_element_id,
        creator_id=annotation.creator_id,
        type=annotation.type,
        motivation=annotation.motivation,
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
    db.refresh(db_annotation)  # Refresh to get generated values like id

    return db_annotation

@router.get("/", response_model=List[Annotation], status_code=status.HTTP_200_OK)
def read_annotations(skip: int = 0,
                     limit: int = 100,
                     db: AsyncSession = Depends(get_db)
                     ):
    query = select(AnnotationModel).options(joinedload(AnnotationModel.creator)).offset(skip).limit(limit)
    result = db.execute(query)
    return result.scalars().all()

@router.get("/{anno_id}", response_model=Annotation, status_code=status.HTTP_200_OK)
def read_annotation(anno_id: int,
                     db: AsyncSession = Depends(get_db)
                     ):
    query = select(AnnotationModel).options(joinedload(AnnotationModel.creator)).filter(AnnotationModel.id == anno_id)

    anno = db.execute(query).scalar_one_or_none()

    if anno is None:
        raise HTTPException(status_code=404, detail="Annotation not found")
    
    return anno