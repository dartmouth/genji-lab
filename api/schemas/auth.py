"""
Authentication schemas with consistent UserResponse for both basic and CAS auth.
"""

from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, Dict, Any, List


class TicketValidation(BaseModel):
    """Schema for CAS ticket validation request."""

    ticket: str
    service: str


class UserResponse(BaseModel):
    """
    Consistent user response for both basic auth and CAS auth.
    - username: stores username for basic auth, netid for CAS auth
    - groups: list of groups with name and id
    - roles: list of role names
    """

    id: int
    first_name: str
    last_name: str
    email: Optional[str] = None
    username: str
    is_active: bool
    viewed_tutorial: bool = False
    roles: List[str] = []
    groups: List[Dict[str, Any]] = []
    user_metadata: Optional[Dict[str, Any]] = None
    ttl: str  # ISO format timestamp for when the authentication expires

    class Config:
        from_attributes = True


class UserRegister(BaseModel):
    """Schema for user registration with username/password."""

    first_name: str = Field(..., min_length=1, max_length=255)
    last_name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)

    @validator("username")
    def validate_username(cls, v):
        if not v.replace("_", "").replace("-", "").replace(".", "").isalnum():
            raise ValueError(
                "Username can only contain letters, numbers, underscores, hyphens, and periods"
            )
        return v

    @validator("password")
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class UserLogin(BaseModel):
    """Schema for username/password login."""

    username: str
    password: str


class TokenResponse(BaseModel):
    """Schema for token-based authentication response (if needed in future)."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds
    user: UserResponse


class PasswordChange(BaseModel):
    """Schema for password change request."""

    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)

    @validator("new_password")
    def validate_new_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class PasswordReset(BaseModel):
    """Schema for password reset request."""

    email: EmailStr
