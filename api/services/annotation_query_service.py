# services/annotation_query_service.py

from typing import List, Dict, Any, Optional
from collections import defaultdict
from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, or_

from models.models import (
    Annotation as AnnotationModel,
    DocumentElement as DocumentElementModel,
    Document,
)
from services.base_service import BaseService


class AnnotationQueryService(BaseService[AnnotationModel]):
    """Service for complex annotation queries."""
    
    def __init__(self):
        super().__init__(AnnotationModel)
    
    # ==================== Helper Methods ====================
    
    def _build_source_uri(self, document_element_id: int) -> str:
        """Build the source URI for a document element."""
        return f"DocumentElements/{document_element_id}"
    
    def _build_jsonb_path_expr(self, uri: str) -> str:
        """
        Build JSONB path expression for finding targets.
        Handles both flat targets and nested (one level deep).
        """
        return f'$[*] ? ((@.source == "{uri}") || (@[*].source == "{uri}"))'
    
    def _extract_element_id_from_source(self, source: str) -> Optional[int]:
        """
        Extract element ID from source URI.
        Expected format: 'DocumentElements/{id}'
        
        Returns None if extraction fails.
        """
        if not source:
            return None
        
        try:
            match = source.split("/")[-1]
            return int(match)
        except (ValueError, IndexError, AttributeError):
            return None
    
    # ==================== Query Methods ====================
    
    def get_links_for_element(
        self,
        db: Session,
        document_element_id: int,
        classroom_id: Optional[int]
    ) -> List[AnnotationModel]:
        """Get linking annotations that reference a specific document element."""
        uri = self._build_source_uri(document_element_id)
        path_expr = self._build_jsonb_path_expr(uri)
        
        query = (
            self.get_base_query(db)
            .options(joinedload(AnnotationModel.creator))
            .filter(AnnotationModel.motivation == "linking")
        )
        
        query = self.apply_classroom_filter(query, classroom_id)
        query = query.filter(func.jsonb_path_exists(AnnotationModel.target, path_expr))
        
        return query.all()
    
    def get_by_motivation(
        self,
        db: Session,
        document_element_id: int,
        classroom_id: Optional[int]
    ) -> Dict[str, List[AnnotationModel]]:
        """Get annotations grouped by motivation for a document element."""
        uri = self._build_source_uri(document_element_id)
        path_expr = self._build_jsonb_path_expr(uri)
        
        query = (
            self.get_base_query(db)
            .options(joinedload(AnnotationModel.creator))
            .filter(func.jsonb_path_exists(AnnotationModel.target, path_expr))
        )
        
        # Special classroom filtering for comments vs other motivations
        if classroom_id is not None:
            query = query.filter(
                or_(
                    and_(
                        AnnotationModel.motivation == "commenting",
                        AnnotationModel.classroom_id == classroom_id,
                    ),
                    AnnotationModel.motivation != "commenting",
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
    
    def get_linked_text_info(
        self,
        db: Session,
        document_element_id: int
    ) -> Dict[str, Any]:
        """
        Returns only the specific documents and elements that are linked.
        """
        uri = self._build_source_uri(document_element_id)
        path_expr = self._build_jsonb_path_expr(uri)
        
        # Query for linking annotations that reference this element
        query = (
            self.get_base_query(db)
            .options(joinedload(AnnotationModel.creator))
            .filter(AnnotationModel.motivation == "linking")
            .filter(func.jsonb_path_exists(AnnotationModel.target, path_expr))
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
                    if isinstance(target, list):
                        for sub_target in target:
                            element_id = self._extract_element_id_from_source(
                                sub_target.get("source", "")
                            )
                            if element_id and element_id != document_element_id:
                                element_ids.add(element_id)
                    else:
                        element_id = self._extract_element_id_from_source(
                            target.get("source", "")
                        )
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
                targets_to_process = target if isinstance(target, list) else [target]
                
                for single_target in targets_to_process:
                    source = single_target.get("source", "")
                    target_element_id = self._extract_element_id_from_source(source)
                    
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
                        targets_list = t if isinstance(t, list) else [t]
                        for single_t in targets_list:
                            t_source = single_t.get("source", "")
                            t_selector = single_t.get("selector", {})
                            t_refined = t_selector.get("refined_by", {})
                            
                            all_targets.append(
                                {
                                    "sourceURI": t_source,
                                    "start": t_refined.get("start", 0),
                                    "end": t_refined.get("end", 0),
                                    "text": t_selector.get("value", ""),
                                }
                            )
                    
                    # Add this as a linked text option
                    linked_documents[doc_id]["linkedTextOptions"].append(
                        {
                            "linkedText": text_value,
                            "linkingAnnotationId": annotation.id,
                            "targetInfo": target_info,
                            "allTargets": all_targets,
                        }
                    )
        
        return {
            "source_element_id": document_element_id,
            "linked_documents": list(linked_documents.values()),
            "total_links": len(linked_documents),
        }


# Singleton instance for easy importing
annotation_query_service = AnnotationQueryService()