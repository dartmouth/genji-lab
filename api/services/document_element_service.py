# services/document_element_service.py

from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, func, delete, String
from io import BytesIO
import docx

from models.models import (
    DocumentElement as DocumentElementModel,
    Document,
    Annotation as AnnotationModel
)
from schemas.document_elements import (
    DocumentElementCreate,
    DocumentElementUpdate,
    DocumentElementPartialUpdate
)
from services.base_service import BaseService


class DocumentElementService(BaseService[DocumentElementModel]):
    """Service for document element CRUD operations."""
    
    def __init__(self):
        super().__init__(DocumentElementModel)
    
    # ==================== Helper Methods ====================
    
    def _verify_document_exists(self, db: Session, document_id: int) -> Document:
        """
        Verify a document exists by ID.
        
        Raises HTTPException 404 if not found.
        """
        document = db.execute(
            select(Document).filter(Document.id == document_id)
        ).scalar_one_or_none()
        
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document with ID {document_id} not found"
            )
        return document
    
    def _get_element_by_id(
        self,
        db: Session,
        element_id: int,
        with_document: bool = False
    ) -> DocumentElementModel:
        """
        Get an element by ID.
        
        Raises HTTPException 404 if not found.
        """
        query = select(DocumentElementModel).filter(
            DocumentElementModel.id == element_id
        )
        
        if with_document:
            query = query.options(joinedload(DocumentElementModel.document))
        
        element = db.execute(query).scalar_one_or_none()
        
        if element is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document element not found"
            )
        
        return element
    
    def _get_annotation_count(self, db: Session, element_id: int) -> int:
        """Get the count of annotations for an element."""
        return db.execute(
            select(func.count())
            .select_from(AnnotationModel)
            .filter(AnnotationModel.document_element_id == element_id)
        ).scalar_one()
    
    # ==================== CRUD Operations ====================
    
    def create(
        self,
        db: Session,
        element: DocumentElementCreate
    ) -> DocumentElementModel:
        """
        Create a new document element.
        
        Raises HTTPException 404 if document not found.
        """
        self._verify_document_exists(db, element.document_id)
        
        db_element = DocumentElementModel(**element.model_dump())
        
        db.add(db_element)
        db.commit()
        db.refresh(db_element)
        
        return db_element
    
    def get_by_id(
        self,
        db: Session,
        element_id: int
    ) -> DocumentElementModel:
        """
        Get a specific element by ID with document information.
        
        Raises HTTPException 404 if not found.
        """
        return self._get_element_by_id(db, element_id, with_document=True)
    
    def list(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        document_id: Optional[int] = None,
        content_query: Optional[str] = None
    ) -> List[DocumentElementModel]:
        """Get elements with optional filtering and pagination."""
        query = select(DocumentElementModel)
        
        if document_id:
            query = query.filter(DocumentElementModel.document_id == document_id)
        
        if content_query:
            query = query.filter(
                DocumentElementModel.content.cast(String).ilike(f"%{content_query}%")
            )
        
        # Sort by element_order inside hierarchy JSONB field
        query = query.order_by(DocumentElementModel.hierarchy["element_order"].as_integer())
        
        query = query.offset(skip).limit(limit)
        
        return db.execute(query).scalars().all()
    
    def update(
        self,
        db: Session,
        element_id: int,
        element: DocumentElementUpdate
    ) -> DocumentElementModel:
        """
        Full update of a document element.
        
        Raises HTTPException 404 if element or document not found.
        """
        db_element = self._get_element_by_id(db, element_id)
        
        if element.document_id:
            self._verify_document_exists(db, element.document_id)
        
        update_data = element.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_element, key, value)
        
        db_element.modified = datetime.now()
        
        db.commit()
        db.refresh(db_element)
        
        return db_element
    
    def partial_update(
        self,
        db: Session,
        element_id: int,
        element: DocumentElementPartialUpdate
    ) -> DocumentElementModel:
        """
        Partial update of a document element.
        
        Raises HTTPException 404 if element or document not found.
        """
        db_element = self._get_element_by_id(db, element_id)
        
        if element.document_id:
            self._verify_document_exists(db, element.document_id)
        
        update_data = element.dict(exclude_unset=True, exclude_none=True)
        for key, value in update_data.items():
            setattr(db_element, key, value)
        
        db_element.modified = datetime.now()
        
        db.commit()
        db.refresh(db_element)
        
        return db_element
    
    def delete(
        self,
        db: Session,
        element_id: int,
        force: bool = False
    ) -> None:
        """
        Delete a document element.
        
        If force=False, only deletes if no annotations exist.
        If force=True, cascades delete through annotations.
        
        Raises HTTPException 404 if not found.
        Raises HTTPException 400 if has annotations and force=False.
        """
        db_element = self._get_element_by_id(db, element_id)
        
        annotation_count = self._get_annotation_count(db, element_id)
        
        if annotation_count > 0 and not force:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete element with {annotation_count} annotations. Use force=True to delete anyway."
            )
        
        if force and annotation_count > 0:
            db.execute(
                delete(AnnotationModel).where(
                    AnnotationModel.document_element_id == element_id
                )
            )
        
        db.delete(db_element)
        db.commit()
    
    # ==================== Content/Hierarchy Operations ====================
    
    def update_content(
        self,
        db: Session,
        element_id: int,
        content: Dict[str, Any]
    ) -> DocumentElementModel:
        """
        Update only the content field of a document element.
        
        Raises HTTPException 404 if not found.
        """
        db_element = self._get_element_by_id(db, element_id)
        
        db_element.content = content
        db_element.modified = datetime.now()
        
        db.commit()
        db.refresh(db_element)
        
        return db_element
    
    def update_hierarchy(
        self,
        db: Session,
        element_id: int,
        hierarchy: Dict[str, Any]
    ) -> DocumentElementModel:
        """
        Update only the hierarchy field of a document element.
        
        Raises HTTPException 404 if not found.
        """
        db_element = self._get_element_by_id(db, element_id)
        
        db_element.hierarchy = hierarchy
        db_element.modified = datetime.now()
        
        db.commit()
        db.refresh(db_element)
        
        return db_element
    
    # ==================== Document-Level Operations ====================
    
    def get_by_document(
        self,
        db: Session,
        document_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[DocumentElementModel]:
        """
        Get all elements for a specific document.
        
        Raises HTTPException 404 if document not found.
        """
        self._verify_document_exists(db, document_id)
        
        return db.execute(
            select(DocumentElementModel)
            .filter(DocumentElementModel.document_id == document_id)
            .offset(skip)
            .limit(limit)
        ).scalars().all()
    
    def get_document_stats(
        self,
        db: Session,
        document_id: int
    ) -> Dict[str, Any]:
        """
        Get statistics about document elements for a specific document.
        
        Raises HTTPException 404 if document not found.
        """
        self._verify_document_exists(db, document_id)
        
        element_count = db.execute(
            select(func.count())
            .select_from(DocumentElementModel)
            .filter(DocumentElementModel.document_id == document_id)
        ).scalar_one()
        
        annotation_count = db.execute(
            select(func.count())
            .select_from(AnnotationModel)
            .join(
                DocumentElementModel,
                AnnotationModel.document_element_id == DocumentElementModel.id
            )
            .filter(DocumentElementModel.document_id == document_id)
        ).scalar_one()
        
        return {
            "document_id": document_id,
            "element_count": element_count,
            "annotation_count": annotation_count
        }
    
    def delete_all_by_document(
        self,
        db: Session,
        document_id: int,
        force: bool = True
    ) -> None:
        """
        Delete all elements for a specific document.
        
        Raises HTTPException 404 if document not found.
        """
        self._verify_document_exists(db, document_id)
        
        element_ids = db.execute(
            select(DocumentElementModel.id).filter(
                DocumentElementModel.document_id == document_id
            )
        ).scalars().all()
        
        if not element_ids:
            return
        
        if force:
            db.execute(
                delete(AnnotationModel).where(
                    AnnotationModel.document_element_id.in_(element_ids)
                )
            )
        
        db.execute(
            delete(DocumentElementModel).where(
                DocumentElementModel.document_id == document_id
            )
        )
        
        db.commit()
    
    # ==================== Annotation Operations ====================
    
    def get_annotations(
        self,
        db: Session,
        element_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[AnnotationModel]:
        """
        Get all annotations for a specific document element.
        
        Raises HTTPException 404 if element not found.
        """
        self._get_element_by_id(db, element_id)
        
        return db.execute(
            select(AnnotationModel)
            .filter(AnnotationModel.document_element_id == element_id)
            .offset(skip)
            .limit(limit)
        ).scalars().all()
    
    # ==================== Word Document Import ====================
    
    def upload_word_document(
        self,
        db: Session,
        document_collection_id: int,
        document_id: int,
        file_content: bytes,
        filename: str,
        extract_paragraphs_func
    ) -> Dict[str, Any]:
        """
        Upload and process a Word document into document elements.
        
        Raises HTTPException 400 if file is not a .docx.
        Raises HTTPException 404 if document not found.
        Raises HTTPException 500 on processing errors.
        """
        if not filename.endswith(".docx"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must be a .docx document"
            )
        
        try:
            doc = docx.Document(BytesIO(file_content))
            paragraph_count = len(doc.paragraphs)
            
            paragraphs = extract_paragraphs_func(doc, document_collection_id, document_id)
            
            if document_id:
                self._verify_document_exists(db, document_id)
            
            created_elements = []
            try:
                for element_data in paragraphs:
                    db_element = DocumentElementModel(
                        document_id=document_id,
                        content=element_data.get("content", {}),
                        hierarchy=element_data.get("hierarchy", 0),
                        created=datetime.now(),
                        modified=datetime.now()
                    )
                    db.add(db_element)
                    created_elements.append(db_element)
                
                db.commit()
                
                for element in created_elements:
                    db.refresh(element)
                    
            except Exception as db_error:
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Database error: {str(db_error)}"
                )
            
            return {
                "filename": filename,
                "paragraph_count": paragraph_count,
                "elements_created": len(created_elements),
                "message": "File processed successfully",
                "document_collection_id": document_collection_id,
                "document_id": document_id
            }
            
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error processing file: {str(e)}"
            )


# Singleton instance for easy importing
document_element_service = DocumentElementService()