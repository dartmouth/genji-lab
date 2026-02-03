# services/annotation_service.py

import os
from typing import List, Optional
from datetime import datetime
from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import text

from models.models import Annotation as AnnotationModel, User, Group
from schemas.annotations import AnnotationCreate, AnnotationPatch, AnnotationAddTarget
from services.base_service import BaseService


class AnnotationService(BaseService[AnnotationModel]):
    """Service for annotation CRUD operations."""

    def __init__(self):
        super().__init__(AnnotationModel)

    # ==================== ID Generation ====================

    def generate_body_id(self, db: Session) -> int:
        """Generate a unique body ID using the sequence."""
        schema = os.environ.get("DB_SCHEMA")
        result = db.execute(text(f"SELECT nextval('{schema}.annotation_body_id_seq')"))
        return result.scalar_one()

    def generate_target_id(self, db: Session) -> int:
        """Generate a unique target ID using the sequence."""
        schema = os.environ.get("DB_SCHEMA")
        result = db.execute(
            text(f"SELECT nextval('{schema}.annotation_target_id_seq')")
        )
        return result.scalar_one()

    # ==================== Helper Methods ====================

    def _dump_targets(self, targets: List) -> List:
        """Serialize targets, handling nested structures."""
        result = []
        for target in targets:
            if isinstance(target, list):
                result.append(self._dump_targets(target))
            else:
                result.append(target.model_dump(by_alias=True, exclude_none=True))
        return result

    def _prepare_targets_for_create(
        self, db: Session, targets: List, user: User
    ) -> None:
        """Generate IDs and set creator for targets (mutates in place)."""
        for target in targets:
            if isinstance(target, list):
                for sub_target in target:
                    sub_target.id = self.generate_target_id(db)
            else:
                target.id = self.generate_target_id(db)

    # ==================== CRUD Operations ====================

    def create(
        self,
        db: Session,
        annotation: AnnotationCreate,
        user: User,
        classroom_id: Optional[int],
    ) -> AnnotationModel:
        """Create a new annotation."""

        # Only comments/replies/flags/tags/upvotes should have classroom_id
        if not classroom_id or classroom_id == 0:
            classroom_id = None

        # Generate IDs for body and targets
        annotation.body.id = self.generate_body_id(db)
        self._prepare_targets_for_create(db, annotation.target, user)
        annotation.creator_id = user.id

        db_annotation = AnnotationModel(
            document_collection_id=annotation.document_collection_id,
            document_id=annotation.document_id,
            document_element_id=annotation.document_element_id,
            creator_id=user.id,
            classroom_id=classroom_id,
            type=annotation.type,
            motivation=annotation.motivation,
            generator=annotation.generator,
            generated=datetime.now(),
            body=annotation.body.model_dump(by_alias=True),
            target=self._dump_targets(annotation.target),
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

    def get_by_id(
        self, db: Session, annotation_id: int, classroom_id: Optional[int]
    ) -> AnnotationModel:
        """
        Get a specific annotation by ID.

        Raises HTTPException 404 if not found.
        """
        query = (
            self.get_base_query(db)
            .options(joinedload(AnnotationModel.creator))
            .filter(AnnotationModel.id == annotation_id)
        )
        query = self.apply_classroom_filter(query, classroom_id)

        annotation = query.first()

        if annotation is None:
            raise HTTPException(status_code=404, detail="Annotation not found")

        return annotation

    def list(
        self,
        db: Session,
        classroom_id: Optional[int],
        motivation: Optional[str] = None,
        document_element_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[AnnotationModel]:
        """Get annotations with optional filtering and pagination."""
        query = self.get_base_query(db).options(joinedload(AnnotationModel.creator))

        # Apply motivation filter first
        if motivation:
            query = query.filter(AnnotationModel.motivation == motivation)

        # Apply classroom filtering ONLY for comments
        if motivation == "commenting":
            if classroom_id is None:
                # Show comments made OUTSIDE classrooms
                query = query.filter(AnnotationModel.classroom_id.is_(None))
            else:
                # Show comments made INSIDE this specific classroom
                query = query.filter(AnnotationModel.classroom_id == classroom_id)

                # For classroom context, only show annotations from classroom members
                classroom = db.query(Group).filter(Group.id == classroom_id).first()
                if classroom:
                    member_ids = [member.id for member in classroom.members]
                    query = query.filter(AnnotationModel.creator_id.in_(member_ids))
        # For non-comment annotations (scholarly, linking, external_reference)
        # Don't apply any classroom filtering - they're global

        # Apply optional document element filter
        if document_element_id:
            query = query.filter(
                AnnotationModel.document_element_id == document_element_id
            )

        # Apply pagination
        query = query.offset(skip).limit(limit)

        return query.all()

    def update(
        self,
        db: Session,
        annotation_id: int,
        payload: AnnotationPatch,
        classroom_id: Optional[int],
    ) -> AnnotationModel:
        """
        Update an annotation.

        Raises HTTPException 404 if not found.
        """
        query = self.get_base_query(db).filter(AnnotationModel.id == annotation_id)
        query = self.apply_classroom_filter(query, classroom_id)

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

    def delete(
        self, db: Session, annotation_id: int, classroom_id: Optional[int]
    ) -> None:
        """
        Delete an annotation.

        Raises HTTPException 404 if not found.
        """
        query = self.get_base_query(db).filter(AnnotationModel.id == annotation_id)
        query = self.apply_classroom_filter(query, classroom_id)

        db_annotation = query.first()

        if not db_annotation:
            raise HTTPException(status_code=404, detail="Annotation not found")

        db.delete(db_annotation)
        db.commit()

    # ==================== Target Operations ====================

    def add_target(
        self, db: Session, annotation_id: int, payload: AnnotationAddTarget, user: User
    ) -> AnnotationModel:
        """
        Add targets to an existing annotation.

        Raises HTTPException 404 if annotation not found.
        """
        db_annotation = (
            db.query(AnnotationModel)
            .filter(AnnotationModel.id == annotation_id)
            .first()
        )

        if not db_annotation:
            raise HTTPException(status_code=404, detail="Annotation not found")

        new_targ = payload.model_dump(exclude_none=True, mode="json")["target"]

        if isinstance(new_targ, list):
            targets_to_add = [
                t.model_dump(exclude_none=True) if hasattr(t, "model_dump") else t
                for t in new_targ
            ]
        else:
            targets_to_add = [new_targ.model_dump(exclude_none=True)]

        for target in targets_to_add:
            target["id"] = self.generate_target_id(db)

        db_annotation.target = [*db_annotation.target, *targets_to_add]
        db_annotation.modified = datetime.now()

        db.commit()
        db.refresh(db_annotation)

        return db_annotation

    def remove_target(
        self, db: Session, annotation_id: int, target_id: int, user: User
    ) -> Optional[AnnotationModel]:
        """
        Remove a target from an annotation.

        Returns None if the annotation was deleted (no targets remaining).
        Raises HTTPException 404 if annotation or target not found.
        Raises HTTPException 403 if user lacks permission.
        """
        db_annotation = (
            db.query(AnnotationModel)
            .filter(AnnotationModel.id == annotation_id)
            .first()
        )

        if not db_annotation:
            raise HTTPException(status_code=404, detail="Annotation not found")

        # Permission check
        is_admin = "admin" in (user.roles or [])
        is_verified_scholar = "verified_scholar" in (user.roles or [])
        is_annotation_creator = db_annotation.creator_id == user.id

        if not (is_admin or is_verified_scholar or is_annotation_creator):
            raise HTTPException(
                status_code=403,
                detail="You don't have permission to delete this target",
            )

        # Remove the target
        updated_targets = []
        found = False

        for target in db_annotation.target:
            if isinstance(target, list):
                filtered = [t for t in target if t.get("id") != target_id]
                if len(filtered) != len(target):
                    found = True
                if filtered:
                    updated_targets.append(filtered)
            else:
                if target.get("id") == target_id:
                    found = True
                else:
                    updated_targets.append(target)

        if not found:
            raise HTTPException(
                status_code=404, detail="Target not found in annotation"
            )

        # If no targets remain, delete the annotation
        if not updated_targets:
            db.delete(db_annotation)
            db.commit()
            return None

        db_annotation.target = updated_targets
        db_annotation.modified = datetime.now()

        db.commit()
        db.refresh(db_annotation)

        return db_annotation


# Singleton instance for easy importing
annotation_service = AnnotationService()
