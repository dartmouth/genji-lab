from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from datetime import datetime

class UserBase(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    user_metadata: Optional[Dict[str, Any]] = Field(default=None)

class UserCreate(UserBase):
    pass

class UserUpdate(UserBase):
    pass

class User(UserBase):
    id: int
    
    class Config:
        from_attributes = True 