# services/flag_service.py

from typing import List, Optional, Dict, Any
from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from models.models import Annotation as AnnotationModel, User
from services.base_service import BaseService


class FlagService(BaseService[AnnotationModel]):
    """Service for flag-related operations on annotations."""
    
    def __init__(self):
        super().__init__(AnnotationModel)
    
    # ==================== Helper Methods ====================
    
    def _check_admin_permission(self, user: User) -> None:
        """
        Verify user has admin role.
        
        Raises HTTPException 403 if user is not an admin.
        """
        if not user.roles or "admin" not in [r.name for r in user.roles]:
            raise HTTPException(status_code=403, detail="Admin access required")
    
    def _get_flagged_annotation_id(self, flag: AnnotationModel) -> Optional[int]:
        """Extract the flagged annotation ID from a flag's target."""
        target_source = flag.target[0].get('source') if flag.target else None
        if target_source and target_source.startswith('Annotation/'):
            return int(target_source.split('/')[-1])
        return None
    
    def _get_flagged_annotation(
        self, 
        db: Session, 
        flag: AnnotationModel
    ) -> Optional[AnnotationModel]:
        """Get the annotation that a flag is pointing to."""
        flagged_id = self._get_flagged_annotation_id(flag)
        if flagged_id:
            return (
                db.query(AnnotationModel)
                .options(joinedload(AnnotationModel.creator))
                .filter(AnnotationModel.id == flagged_id)
                .first()
            )
        return None
    
    def _build_flag_response(
        self, 
        flag: AnnotationModel, 
        flagged_annotation: Optional[AnnotationModel]
    ) -> Dict[str, Any]:
        """Build the enriched flag response dictionary."""
        return {
            "flag_id": flag.id,
            "flag_reason": flag.body.get('value', '') if flag.body else '',
            "flagged_by": {
                "id": flag.creator.id,
                "name": f"{flag.creator.first_name} {flag.creator.last_name}",
            },
            "flagged_at": flag.created.isoformat() if flag.created else None,
            "flagged_annotation": {
                "id": flagged_annotation.id if flagged_annotation else None,
                "content": flagged_annotation.body.get('value', '') if flagged_annotation and flagged_annotation.body else None,
                "author": {
                    "id": flagged_annotation.creator.id if flagged_annotation else None,
                    "name": f"{flagged_annotation.creator.first_name} {flagged_annotation.creator.last_name}" if flagged_annotation else None,
                } if flagged_annotation else None,
                "document_element_id": flagged_annotation.document_element_id if flagged_annotation else None,
                "document_id": flagged_annotation.document_id if flagged_annotation else None,
                "document_collection_id": flagged_annotation.document_collection_id if flagged_annotation else None,
                "created": flagged_annotation.created.isoformat() if flagged_annotation and flagged_annotation.created else None,
            } if flagged_annotation else None,
        }
    
    # ==================== Query Operations ====================
    
    def get_count(
        self,
        db: Session,
        classroom_id: Optional[int],
        user: User
    ) -> int:
        """
        Get count of pending flags.
        
        Raises HTTPException 403 if user is not an admin.
        """
        self._check_admin_permission(user)
        
        query = db.query(AnnotationModel).filter(
            AnnotationModel.motivation == "flagging"
        )
        query = self.apply_classroom_filter(query, classroom_id)
        
        return query.count()
    
    def list(
        self,
        db: Session,
        classroom_id: Optional[int],
        user: User
    ) -> List[Dict[str, Any]]:
        """
        Get all flags with enriched data.
        
        Returns flags with the flagged annotation data.
        Raises HTTPException 403 if user is not an admin.
        """
        self._check_admin_permission(user)
        
        query = (
            self.get_base_query(db)
            .options(joinedload(AnnotationModel.creator))
            .filter(AnnotationModel.motivation == "flagging")
        )
        query = self.apply_classroom_filter(query, classroom_id)
        query = query.order_by(AnnotationModel.created.desc())
        
        flags = query.all()
        
        # Enrich with flagged annotation data
        result = []
        for flag in flags:
            flagged_annotation = self._get_flagged_annotation(db, flag)
            result.append(self._build_flag_response(flag, flagged_annotation))
        
        return result
    
    # ==================== Flag Operations ====================
    
    def get_flag_by_id(
        self,
        db: Session,
        flag_id: int
    ) -> AnnotationModel:
        """
        Get a flag annotation by ID.
        
        Raises HTTPException 404 if not found.
        """
        flag = db.query(AnnotationModel).filter(
            AnnotationModel.id == flag_id,
            AnnotationModel.motivation == "flagging"
        ).first()
        
        if not flag:
            raise HTTPException(status_code=404, detail="Flag not found")
        
        return flag
    
    def unflag(
        self,
        db: Session,
        flag_id: int,
        user: User
    ) -> Dict[str, Any]:
        """
        Delete flag annotation only.
        
        Raises HTTPException 403 if user is not an admin.
        Raises HTTPException 404 if flag not found.
        """
        self._check_admin_permission(user)
        
        flag = self.get_flag_by_id(db, flag_id)
        
        db.delete(flag)
        db.commit()
        
        return {"success": True, "message": "Flag removed"}
    
    def remove_comment(
        self,
        db: Session,
        flag_id: int,
        user: User
    ) -> Dict[str, Any]:
        """
        Delete flag, flagged comment, and all other flags pointing to the same comment.
        
        Raises HTTPException 403 if user is not an admin.
        Raises HTTPException 404 if flag or flagged comment not found.
        Raises HTTPException 400 if flag target is invalid.
        """
        self._check_admin_permission(user)
        
        flag = self.get_flag_by_id(db, flag_id)
        
        # Get flagged annotation ID
        flagged_id = self._get_flagged_annotation_id(flag)
        if not flagged_id:
            raise HTTPException(status_code=400, detail="Invalid flag target")
        
        # Get flagged annotation
        flagged_annotation = db.query(AnnotationModel).filter(
            AnnotationModel.id == flagged_id
        ).first()
        
        if not flagged_annotation:
            raise HTTPException(status_code=404, detail="Flagged comment not found")
        
        # Find ALL flags that point to this same comment
        flags_to_delete = self._find_flags_for_annotation(db, flagged_id)
        
        # Delete all flags pointing to this comment
        for f in flags_to_delete:
            db.delete(f)
        
        # Delete the flagged comment
        db.delete(flagged_annotation)
        db.commit()
        
        return {
            "success": True,
            "message": f"Comment and {len(flags_to_delete)} flag(s) removed"
        }
    
    def _find_flags_for_annotation(
        self,
        db: Session,
        annotation_id: int
    ) -> List[AnnotationModel]:
        """Find all flags that point to a specific annotation."""
        all_flags = db.query(AnnotationModel).filter(
            AnnotationModel.motivation == "flagging"
        ).all()
        
        target_annotation_ref = f"Annotation/{annotation_id}"
        flags_to_delete = []
        
        for f in all_flags:
            if f.target and len(f.target) > 0:
                flag_target_source = f.target[0].get('source', '')
                if flag_target_source == target_annotation_ref:
                    flags_to_delete.append(f)
        
        return flags_to_delete


# Singleton instance for easy importing
flag_service = FlagService()