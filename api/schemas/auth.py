from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, Dict, Any, List
from datetime import datetime

class TicketValidation(BaseModel):
    ticket: str
    service: str

class UserResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    netid: str
    email: Optional[str] = None
    user_metadata: Optional[Dict[str, Any]] = None
    roles: List[str] = [] 
    ttl: str  

class UserRegister(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=255)
    last_name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)
    
    @validator('username')
    def validate_username(cls, v):
        if not v.replace('_', '').replace('-', '').replace('.', '').isalnum():
            raise ValueError('Username can only contain letters, numbers, underscores, hyphens, and periods')
        return v.lower()
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: Optional[str] = None
    username: str
    is_active: bool
    roles: List[str] = []
    user_metadata: Optional[Dict[str, Any]] = None
    ttl: str  # ISO format timestamp for when the authentication expires
    
    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds
    user: UserResponse


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)
    
    @validator('new_password')
    def validate_new_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v


class PasswordReset(BaseModel):
    email: EmailStr