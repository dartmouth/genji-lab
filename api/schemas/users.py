from pydantic import BaseModel
from typing import List, Optional, Dict, Any


class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None


class Role(RoleBase):
    id: int

    class Config:
        from_attributes = True


class UserBase(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    username: Optional[str] = None
    user_metadata: Optional[Dict[str, Any]] = None
    viewed_tutorial: Optional[bool] = None


class UserCreate(UserBase):
    pass


class UserUpdate(UserBase):
    pass


class User(UserBase):
    id: int
    is_active: bool = True
    viewed_tutorial: bool = False
    roles: List[Role] = []

    class Config:
        from_attributes = True
