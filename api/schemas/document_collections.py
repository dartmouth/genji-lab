from typing import Optional, Dict, Any, List, Union
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from schemas.users import User


class Base64Image(BaseModel):
    mime_type: str
    img_base64: str

class CollectionMetadata(BaseModel):
    title: Optional[str]
    content: Optional[Dict[str, Union[str, List[str], Base64Image]]]

class DocumentCollectionBase(BaseModel):
    title: Optional[str] = None
    visibility: Optional[str] = None
    text_direction: Optional[str] = None
    language: Optional[str] = None
    hierarchy: Optional[Dict[str, Any]] = None
    collection_metadata: Optional[Dict[str, Union[str, List[str], Base64Image]]] = None

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
    
    model_config = ConfigDict(from_attributes=True)

class DocumentCollectionWithUsers(DocumentCollection):
    created_by: Optional[User] = None
    modified_by: Optional[User] = None
    
    model_config = ConfigDict(from_attributes=True)

class DocumentCollectionWithStats(DocumentCollection):
    document_count: int = 0
    element_count: int = 0
    scholarly_annotation_count: int = 0
    comment_count: int = 0
    created_by: Optional[User] = None
    modified_by: Optional[User] = None
    
    model_config = ConfigDict(from_attributes=True)