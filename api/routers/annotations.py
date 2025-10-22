from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, text, and_, or_
from datetime import datetime
from collections import defaultdict
from typing import Dict, List, Any
from dotenv import load_dotenv, find_dotenv
import os
import json

from database import get_db
from models.models import Annotation as AnnotationModel, User
from schemas.annotations import Annotation, AnnotationCreate, AnnotationPatch, AnnotationAddTarget
from dependencies.classroom import (
    get_classroom_context,
    get_current_user_sync,
    get_user_classrooms,
)
from schemas.document_elements import DocumentElement as DocumentElementSchema

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


def dump_targets(targets: List):
    result = []
    for target in targets:
        if isinstance(target, list):
            result.append(dump_targets(target))
        else:
            result.append(target.model_dump(by_alias=True, exclude_none=True))
    return result
        
@router.post("/", response_model=Annotation, status_code=status.HTTP_201_CREATED)
def create_annotation(
    annotation: AnnotationCreate,
    classroom_id: Optional[int] = Depends(get_classroom_context),
    current_user: User = Depends(get_current_user_sync),
    db: Session = Depends(get_db),
):
    """Create a new annotation in the current classroom context."""

    # Generate IDs for body and targets
    annotation.body.id = generate_body_id(db, os.environ.get("DB_SCHEMA"))

    for target in annotation.target:
        if isinstance(target, list):
            for sub_targ in target:
                sub_targ.id = generate_target_id(db, os.environ.get("DB_SCHEMA"))
        else:
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
        target=dump_targets(annotation.target),
        status=annotation.status,
        annotation_type=annotation.annotation_type,
        context=annotation.context,
        created=datetime.now(),
        modified=datetime.now(),
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
    db: Session = Depends(get_db),
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

    query = (
        db.query(AnnotationModel)
        .options(joinedload(AnnotationModel.creator))
        .filter(AnnotationModel.id == annotation_id)
    )

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
    db: Session = Depends(get_db),
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

@router.patch(
    "/add-target/{annotation_id}", response_model=Annotation, status_code=status.HTTP_200_OK
)
def update_annotation(
    annotation_id: int,
    payload: AnnotationAddTarget,
    current_user: User = Depends(get_current_user_sync),
    db: Session = Depends(get_db),
):

    query = db.query(AnnotationModel).filter(AnnotationModel.id == annotation_id)

    db_annotation = query.first()

    if not db_annotation:
        raise HTTPException(status_code=404, detail="Annotation not found")
    
    new_targ = payload.model_dump(exclude_none=True, mode='json')['target'] 
    # print(new_targ)
    if isinstance(new_targ, list):
        targets_to_add = [t.model_dump(exclude_none=True) if hasattr(t, 'model_dump') else t for t in new_targ]
    else:
        targets_to_add = [new_targ.model_dump(exclude_none=True)]
    # print(targets_to_add)
    
    for target in targets_to_add:
        target['id'] = generate_target_id(db, os.environ.get("DB_SCHEMA"))
    
    db_annotation.target = [*db_annotation.target, targets_to_add]
    db_annotation.modified = datetime.now()

    db.commit()
    db.refresh(db_annotation)

    return db_annotation

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

    query = (
        db.query(AnnotationModel)
        .options(joinedload(AnnotationModel.creator))
        .filter(AnnotationModel.document_element_id == document_element_id)
    )

    # Apply classroom filtering
    if classroom_id is not None:
            query = query.filter(
        or_(
            and_(AnnotationModel.motivation == 'commenting', 
                 AnnotationModel.classroom_id == classroom_id),
            AnnotationModel.motivation != 'commenting'
        )
    )
    else:
        query = query.filter(AnnotationModel.classroom_id.is_(None))

    annotations = query.all()

    # Group by motivation
    grouped_annotations = defaultdict(list)
    for annotation in annotations:
        grouped_annotations[annotation.motivation].append(annotation)

    return dict(grouped_annotations)


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
    
    uri = f'DocumentElements/{document_element_id}'
    
    # Path expression: checks both flat targets and nested (one level deep)
    # $[*] - any element in the top-level array
    # @.source - if it's a target object with source field
    # @[*].source - if it's a nested array, check sources within it
    path_expr = f'$[*] ? ((@.source == "{uri}") || (@[*].source == "{uri}"))'
    
    query = (
        db.query(AnnotationModel)
        .options(joinedload(AnnotationModel.creator))
        .filter(AnnotationModel.motivation == "linking")
    )
    
    # Apply classroom filtering
    if classroom_id is not None:
        query = query.filter(AnnotationModel.classroom_id == classroom_id)
    else:
        query = query.filter(AnnotationModel.classroom_id.is_(None))
    
    # Apply JSONB path filter
    query = query.filter(
        func.jsonb_path_exists(
            AnnotationModel.target,
            path_expr
        )
    )
    
    return query.all()
# def fetch_links(
#     document_element_id: int,
#     classroom_id: Optional[int] = Depends(get_classroom_context),
#     current_user: User = Depends(get_current_user_sync),
#     db: Session = Depends(get_db),
# ):
#     """Get linking annotations that reference a specific document element."""

#     query = (
#         db.query(AnnotationModel)
#         .options(joinedload(AnnotationModel.creator))
#         .filter(AnnotationModel.motivation == "linking")
#     )

#     # Apply classroom filtering
#     if classroom_id is not None:
#         query = query.filter(AnnotationModel.classroom_id == classroom_id)
#     else:
#         query = query.filter(AnnotationModel.classroom_id.is_(None))

#     all_linking_annotations = query.all()

#     # Filter annotations that have our document_element_id in their target sources
#     target_sources = [
#         f"DocumentElements/{document_element_id}"
#     ]

#     matching_annotations = []
#     for annotation in all_linking_annotations:
#         if annotation.target:  # target is stored as JSON
#             for target in annotation.target:
#                 if isinstance(target, list):
#                     for sub_targ in target:
#                         if sub_targ.get("source") in target_sources:
#                             matching_annotations.append(annotation)
#                             break
#                 else:
#                     if target.get("source") in target_sources:
#                         matching_annotations.append(annotation)
#                         break  # Found a match, no need to check other targets

#     return matching_annotations


@router.get("/classrooms", response_model=List[dict], status_code=status.HTTP_200_OK)
def get_my_classrooms(
    current_user: User = Depends(get_current_user_sync), db: Session = Depends(get_db)
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


@router.get(
    "/linked-text-info/{document_element_id}",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
)
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
    """
    Returns only the specific documents and elements that are linked.
    """
    from models.models import DocumentElement as DocumentElementModel, Document

    # Build the JSONB path query to find matching annotations
    uri = f'DocumentElements/{document_element_id}'
    path_expr = f'$[*] ? ((@.source == "{uri}") || (@[*].source == "{uri}"))'
    
    # Query for linking annotations that reference this element - PUSHED TO DATABASE
    query = (
        db.query(AnnotationModel)
        .options(joinedload(AnnotationModel.creator))
        .filter(AnnotationModel.motivation == "linking")
        .filter(
            func.jsonb_path_exists(
                AnnotationModel.target,
                path_expr
            )
        )
    )

    matching_annotations = query.all()

    if not matching_annotations:
        return {
            "source_element_id": document_element_id,
            "linked_documents": [],
            "total_links": 0,
        }

    # Extract unique element IDs from all targets
    element_ids = set()
    for annotation in matching_annotations:
        if annotation.target:
            for target in annotation.target:
                # Handle nested lists (cross-element selections)
                if isinstance(target, list):
                    for sub_target in target:
                        element_id = _extract_element_id_from_source(sub_target.get("source", ""))
                        if element_id and element_id != document_element_id:
                            element_ids.add(element_id)
                else:
                    element_id = _extract_element_id_from_source(target.get("source", ""))
                    if element_id and element_id != document_element_id:
                        element_ids.add(element_id)

    # Fetch only the specific elements we need
    elements_query = (
        db.query(DocumentElementModel)
        .filter(DocumentElementModel.id.in_(list(element_ids)))
        .all()
    )

    # Get unique document IDs from these elements
    document_ids = set(el.document_id for el in elements_query)

    # Fetch only the specific documents we need
    documents_query = (
        db.query(Document).filter(Document.id.in_(list(document_ids))).all()
    )

    # Create lookup maps
    elements_map = {el.id: el for el in elements_query}
    documents_map = {doc.id: doc for doc in documents_query}

    # Build response with minimal data
    linked_documents = {}

    for annotation in matching_annotations:
        if not annotation.target:
            continue

        # Track which documents we've already added this annotation to
        processed_documents = set()

        for target in annotation.target:
            # Handle nested lists (cross-element selections)
            targets_to_process = target if isinstance(target, list) else [target]
            
            for single_target in targets_to_process:
                source = single_target.get("source", "")
                target_element_id = _extract_element_id_from_source(source)
                
                if not target_element_id:
                    continue
                    
                # Skip source element
                if target_element_id == document_element_id:
                    continue

                element = elements_map.get(target_element_id)
                if not element:
                    continue

                document = documents_map.get(element.document_id)
                if not document:
                    continue

                doc_id = document.id

                # Skip if we've already added this annotation for this document
                if doc_id in processed_documents:
                    continue

                processed_documents.add(doc_id)

                # Get selector info
                selector = single_target.get("selector", {})
                text_value = selector.get("value", "Linked text")
                refined_by = selector.get("refined_by", {})

                # Build target info
                target_info = {
                    "sourceURI": source,
                    "start": refined_by.get("start", 0),
                    "end": refined_by.get("end", 0),
                    "text": text_value,
                }

                # Group by document
                if doc_id not in linked_documents:
                    linked_documents[doc_id] = {
                        "documentId": doc_id,
                        "documentTitle": document.title,
                        "collectionId": document.document_collection_id,
                        "linkedTextOptions": [],
                    }

                # Build all targets info for this annotation
                all_targets = []
                for t in annotation.target:
                    # Handle nested targets
                    targets_list = t if isinstance(t, list) else [t]
                    for single_t in targets_list:
                        t_source = single_t.get("source", "")
                        t_selector = single_t.get("selector", {})
                        t_refined = t_selector.get("refined_by", {})
                        
                        all_targets.append({
                            "sourceURI": t_source,
                            "start": t_refined.get("start", 0),
                            "end": t_refined.get("end", 0),
                            "text": t_selector.get("value", ""),
                        })

                # Add this as a linked text option
                linked_documents[doc_id]["linkedTextOptions"].append(
                    {
                        "linkedText": text_value,
                        "linkingAnnotationId": annotation.id,
                        "targetInfo": target_info,
                        "allTargets": all_targets,
                    }
                )

    response = {
        "source_element_id": document_element_id,
        "linked_documents": list(linked_documents.values()),
        "total_links": len(linked_documents),
    }

    return response


def _extract_element_id_from_source(source: str) -> Optional[int]:
    """
    Extract element ID from source URI.
    Expected format: 'DocumentElements/{id}'
    
    Returns None if extraction fails.
    """
    if not source:
        return None
    
    try:
        # Handle 'DocumentElements/123' format
        match = source.split("/")[-1]
        return int(match)
    except (ValueError, IndexError, AttributeError):
        return None
