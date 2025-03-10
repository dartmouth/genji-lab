from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from datetime import datetime

class UserBase(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    user_metadata: Optional[Dict[str, Any]] = Field(default=None)  # Renamed from 'metadata' to 'user_metadata'

class UserCreate(UserBase):
    pass

class UserUpdate(UserBase):
    pass

class User(UserBase):
    id: int
    
    class Config:
        from_attributes = True  # For Pydantic v2 (use orm_mode = True for Pydantic v1)

class DocumentCollectionBase(BaseModel):
    title: Optional[str] = None
    visibility: Optional[str] = None
    text_direction: Optional[str] = None
    language: Optional[str] = None
    hierarchy: Optional[Dict[str, Any]] = None
    collection_metadata: Optional[Dict[str, Any]] = None

class DocumentCollectionCreate(DocumentCollectionBase):
    created_by_id: int

class DocumentCollectionUpdate(DocumentCollectionBase):
    created_by_id: Optional[int] = None
    modified_by_id: Optional[int] = None

class DocumentCollectionPartialUpdate(BaseModel):
    title: Optional[str] = None
    visibility: Optional[str] = None
    text_direction: Optional[str] = None
    language: Optional[str] = None
    hierarchy: Optional[Dict[str, Any]] = None
    collection_metadata: Optional[Dict[str, Any]] = None
    modified_by_id: Optional[int] = None

class DocumentCollection(DocumentCollectionBase):
    id: int
    created: datetime
    modified: datetime
    created_by_id: int
    modified_by_id: Optional[int] = None
    
    class Config:
        from_attributes = True

class DocumentCollectionWithStats(DocumentCollection):
    document_count: int = 0
    created_by: Optional[User] = None
    modified_by: Optional[User] = None
    
    class Config:
        from_attributes = True

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
    
    class Config:
        from_attributes = True

class DocumentWithDetails(Document):
    collection: Optional[DocumentCollection] = None
    elements_count: Optional[int] = 0
    
    class Config:
        from_attributes = True

class DocumentElementBase(BaseModel):
    document_id: int
    hierarchy: Optional[Dict[str, Any]] = None
    content: Optional[Dict[str, Any]] = None

class DocumentElementCreate(DocumentElementBase):
    pass

class DocumentElementUpdate(DocumentElementBase):
    document_id: Optional[int] = None

class DocumentElementPartialUpdate(BaseModel):
    document_id: Optional[int] = None
    hierarchy: Optional[Dict[str, Any]] = None
    content: Optional[Dict[str, Any]] = None

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

class TextPositionSelector(BaseModel):
    type: str = "TextPositionSelector"
    start: int
    end: int

class TextQuoteSelector(BaseModel):
    type: str = "TextQuoteSelector"
    value: str
    refinedBy: TextPositionSelector = Field(..., alias="refined_by")

class Target(BaseModel):
    id: Optional[int] = None
    type: str
    source: int
    selector: TextQuoteSelector

class Body(BaseModel):
    id: Optional[int] = None
    type: str
    value: str
    format: str
    language: str

class AnnotationBase(BaseModel):
    context: Optional[str] = None
    document_collection_id: Optional[int] = None
    document_id: Optional[int] = None
    document_element_id: Optional[int] = None
    creator_id: int
    
    type: Optional[str] = None
    motivation: Optional[str] = None
    generator: Optional[str] = None
    
    body: Optional[Body] = None
    target: Optional[List[Target]] = None
    
    status: Optional[str] = None
    annotation_type: Optional[str] = None
    context: Optional[str] = None


class AnnotationCreate(AnnotationBase):
    pass


class Annotation(AnnotationBase):
    id: int
    created: Optional[datetime] = None
    modified: Optional[datetime] = None
    generated: Optional[datetime] = None
    
    class Config:
        from_attributes = True
# class AnnotationPayload(BaseModel):
#     annotation_text: str
#     source_document_collection_id: int
#     source_document_id: int
#     source_document_element_id: List[int]
#     creating_user_id: int
#     motivation: str
#     quote_selector_value: str
#     position_selector_start: int
#     position_selector_end: int