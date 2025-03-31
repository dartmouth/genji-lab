from typing import Optional, List, Dict, Union
from pydantic import BaseModel, RootModel
from datetime import datetime
from schemas.users import User

class TextPositionSelector(BaseModel):
    type: str = "TextPositionSelector"
    start: int
    end: int

class TextQuoteSelector(BaseModel):
    type: str = "TextQuoteSelector"
    value: str
    refined_by: TextPositionSelector

class TextTarget(BaseModel):
    id: Optional[int] = None
    type: str
    source: Union[int, str]
    selector: TextQuoteSelector

class ObjectTarget(BaseModel):
    id: Optional[int] = None
    type: str
    source: Union[int, str]

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
    motivation: str = None
    generator: Optional[str] = None
    
    body: Optional[Body] = None
    target: Optional[List[Union[TextTarget, ObjectTarget]]] = None
    
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
    creator: Optional[User]
    
    class Config:
        from_attributes = True

class DocumentElementAnnotationsResponse(RootModel):
    root: Dict[str, List[Annotation]]


class AnnotationPatch(BaseModel):
    body: Optional[str] = None
    motivation: Optional[str] = None