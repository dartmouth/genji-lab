from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from datetime import datetime

from database import get_db
from models.models import Annotation as AnnotationModel, User
from schemas.annotations import Annotation
from dependencies.classroom import get_classroom_context, get_current_user_sync

router = APIRouter(
    prefix="/api/v1/flags",
    tags=["flags"],
)


@router.get("/count", response_model=Dict[str, int])
def get_flags_count(
    classroom_id: Optional[int] = Depends(get_classroom_context),
    current_user: User = Depends(get_current_user_sync),
    db: Session = Depends(get_db),
):
    """Get count of pending flags (admin only)."""
    # Check admin role
    if not current_user.roles or "admin" not in [r.name for r in current_user.roles]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    query = db.query(AnnotationModel).filter(
        AnnotationModel.motivation == "flagging"
    )
    
    # Apply classroom filtering
    if classroom_id is not None:
        query = query.filter(AnnotationModel.classroom_id == classroom_id)
    else:
        query = query.filter(AnnotationModel.classroom_id.is_(None))
    
    count = query.count()
    return {"count": count}


@router.get("", response_model=List[Dict[str, Any]])
def get_flags(
    classroom_id: Optional[int] = Depends(get_classroom_context),
    current_user: User = Depends(get_current_user_sync),
    db: Session = Depends(get_db),
):
    """
    Get all flags with enriched data (admin only).
    Returns flags with the flagged annotation data.
    """
    # Check admin role
    if not current_user.roles or "admin" not in [r.name for r in current_user.roles]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get all flagging annotations
    query = (
        db.query(AnnotationModel)
        .options(joinedload(AnnotationModel.creator))
        .filter(AnnotationModel.motivation == "flagging")
    )
    
    # Apply classroom filtering
    if classroom_id is not None:
        query = query.filter(AnnotationModel.classroom_id == classroom_id)
    else:
        query = query.filter(AnnotationModel.classroom_id.is_(None))
    
    # Sort by most recent flags first
    query = query.order_by(AnnotationModel.created.desc())
    
    flags = query.all()
    
    # Enrich with flagged annotation data
    result = []
    for flag in flags:
        target_source = flag.target[0].get('source') if flag.target else None
        flagged_annotation = None
        
        if target_source and target_source.startswith('Annotation/'):
            flagged_id = int(target_source.split('/')[-1])
            flagged_annotation = (
                db.query(AnnotationModel)
                .options(joinedload(AnnotationModel.creator))
                .filter(AnnotationModel.id == flagged_id)
                .first()
            )
        
        result.append({
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
        })
    
    return result


@router.delete("/{flag_id}/unflag", status_code=status.HTTP_200_OK)
def unflag(
    flag_id: int,
    classroom_id: Optional[int] = Depends(get_classroom_context),
    current_user: User = Depends(get_current_user_sync),
    db: Session = Depends(get_db),
):
    """Delete flag annotation only (admin only)."""
    # Check admin role
    if not current_user.roles or "admin" not in [r.name for r in current_user.roles]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    flag = db.query(AnnotationModel).filter(
        AnnotationModel.id == flag_id,
        AnnotationModel.motivation == "flagging"
    ).first()
    
    if not flag:
        raise HTTPException(status_code=404, detail="Flag not found")
    
    db.delete(flag)
    db.commit()
    
    return {"success": True, "message": "Flag removed"}


@router.delete("/{flag_id}/remove-comment", status_code=status.HTTP_200_OK)
def remove_comment(
    flag_id: int,
    classroom_id: Optional[int] = Depends(get_classroom_context),
    current_user: User = Depends(get_current_user_sync),
    db: Session = Depends(get_db),
):
    """Delete flag, flagged comment, and all other flags pointing to the same comment (admin only)."""
    # Check admin role
    if not current_user.roles or "admin" not in [r.name for r in current_user.roles]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    flag = db.query(AnnotationModel).filter(
        AnnotationModel.id == flag_id,
        AnnotationModel.motivation == "flagging"
    ).first()
    
    if not flag:
        raise HTTPException(status_code=404, detail="Flag not found")
    
    # Get flagged annotation
    target_source = flag.target[0].get('source') if flag.target else None
    if not target_source or not target_source.startswith('Annotation/'):
        raise HTTPException(status_code=400, detail="Invalid flag target")
    
    flagged_id = int(target_source.split('/')[-1])
    flagged_annotation = db.query(AnnotationModel).filter(
        AnnotationModel.id == flagged_id
    ).first()
    
    if not flagged_annotation:
        raise HTTPException(status_code=404, detail="Flagged comment not found")
    
    # Find ALL flags that point to this same comment (cascade delete)
    all_flags_for_comment = db.query(AnnotationModel).filter(
        AnnotationModel.motivation == "flagging"
    ).all()
    
    flags_to_delete = []
    target_annotation_ref = f"Annotation/{flagged_id}"
    
    for f in all_flags_for_comment:
        if f.target and len(f.target) > 0:
            flag_target_source = f.target[0].get('source', '')
            if flag_target_source == target_annotation_ref:
                flags_to_delete.append(f)
    
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



