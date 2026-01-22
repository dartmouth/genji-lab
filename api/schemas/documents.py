from typing import Optional, Dict, Any, List
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from schemas.document_collections import DocumentCollection


class DocumentBase(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    document_collection_id: int

class DocumentCreate(DocumentBase):
    pass

class DocumentUpdate(DocumentBase):
    document_collection_id: Optional[int] = None

class DocumentPartialUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    document_collection_id: Optional[int] = None

class Document(DocumentBase):
    id: int
    created: datetime
    modified: datetime
    
    model_config = ConfigDict(from_attributes=True)

class DocumentWithDetails(Document):
    collection: Optional[DocumentCollection] = None
    elements_count: Optional[int] = 0
    
    model_config = ConfigDict(from_attributes=True)