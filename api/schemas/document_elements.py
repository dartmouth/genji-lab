from typing import Optional, Dict, Any, List
from pydantic import BaseModel
from datetime import datetime
from schemas.documents import Document
from schemas.annotations import Annotation

class DocumentElementBase(BaseModel):
    document_id: int
    hierarchy: Optional[Dict[str, Any]] = None
    content: Optional[Dict[str, Any]] = None
    # links: Optional[List[Dict[str, Any]]] = None

class DocumentElementCreate(DocumentElementBase):
    pass

class DocumentElementUpdate(DocumentElementBase):
    document_id: Optional[int] = None

class DocumentElementPartialUpdate(BaseModel):
    document_id: Optional[int] = None
    hierarchy: Optional[Dict[str, Any]] = None
    content: Optional[Dict[str, Any]] = None
    links: Optional[List[Dict[str, Any]]] = None

class DocumentElement(DocumentElementBase):
    id: int
    created: datetime
    modified: datetime
    
    class Config:
        from_attributes = True

class DocumentElementWithDocument(DocumentElement):
    document: Optional[Document] = None
    
    class Config:
        from_attributes = True



class DocumentElementWithAnnotations(DocumentElement):
    annotations: Optional[List[Annotation]]
    
    class Config:
        from_attributes = True