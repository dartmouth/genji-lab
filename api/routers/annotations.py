from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete, select, func, update
from sqlalchemy.orm import joinedload
from datetime import datetime

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.models import DocumentCollection as DocumentCollectionModel
from models.models import Document, User
from schemas.schemas import (
    Annotation,
    AnnotationCreate
)

router = APIRouter(
    prefix="/annotations",
    tags=["annotations"],
    responses={404: {"description": "Annotation not found"}},
)

async def generate_body_id(db: AsyncSession) -> str:
    """Generate a unique body ID using the sequence"""
    result = await db.execute(text("SELECT nextval('app.annotation_body_id_seq')"))
    id_num = result.scalar_one()
    return f"body-{id_num}"

async def generate_target_id(db: AsyncSession, content_id: str) -> str:
    """Generate a unique target ID using the sequence"""
    result = await db.execute(text("SELECT nextval('app.annotation_target_id_seq')"))
    id_num = result.scalar_one()
    return f"target-{content_id}-{id_num}"

@router.post("/", response_model=Annotation, status_code=status.HTTP_201_CREATED)
async def create_annotation(annotation: AnnotationCreate, db: AsyncSession = Depends(get_db)):
    # Generate IDs for body and targets
    body_id = await generate_body_id(db)
    
    target_ids = []
    for target in annotation.target:
        target_id = await generate_target_id(db, annotation.document_element_id)
        target_ids.append(target_id)
        
    # Convert targets to include ids
    for i, target in enumerate(annotation.target):
        target.id = target_ids[i]
    
    # Create an instance of the annotation ORM model
    db_annotation = Annotation(
        document_collection_id=annotation.document_collection_id,
        document_id=annotation.document_id,
        document_element_id=annotation.document_element_id,
        creator_id=annotation.creator_id,
        type=annotation.type,
        body=annotation.body.model_dump(),  # Convert Pydantic model to dict
        target=[t.dimodel_dumpct() for t in annotation.target],  # Convert targets to dicts
        status=annotation.status,
        annotation_type=annotation.annotation_type,
        context=annotation.context,
        created=datetime.now(),  # Set created timestamp
        modified=datetime.now()   # Set modified timestamp
    )
    
    db.add(db_annotation)
    await db.commit()
    await db.refresh(db_annotation)  # Refresh to get generated values like id

    return db_annotation