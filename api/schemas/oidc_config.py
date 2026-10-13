from typing import Optional
from pydantic import BaseModel, Field, field_validator, ConfigDict


class OIDCConfigUpdate(BaseModel):
    enabled: bool
    button_label: str = Field(
        default="Sign in with Dartmouth", min_length=1, max_length=100
    )

    @field_validator("button_label")
    @classmethod
    def validate_button_label(cls, v):
        if not v or not v.strip():
            raise ValueError("Button label must not be empty")
        return v


class OIDCConfigResponse(BaseModel):
    id: Optional[int]
    enabled: bool
    button_label: str
    updated_at: Optional[str]
    updated_by_id: Optional[int]

    model_config = ConfigDict(from_attributes=True)
