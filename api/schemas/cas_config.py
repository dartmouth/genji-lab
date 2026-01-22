
from typing import Optional
from pydantic import BaseModel, Field, validator, ConfigDict

class AttributeMapping(BaseModel):
    username: str = Field(..., min_length=1)
    email: str = Field(..., min_length=1)
    first_name: str = Field(..., min_length=1)
    last_name: str = Field(..., min_length=1)
    full_name: Optional[str] = "name"


class CASConfigUpdate(BaseModel):
    enabled: bool
    server_url: Optional[str] = None
    validation_endpoint: str = "/serviceValidate"
    protocol_version: str = "2.0"
    xml_namespace: str = "http://www.yale.edu/tp/cas"
    attribute_mapping: Optional[AttributeMapping] = None
    username_patterns: list[str] = [
        '<cas:attribute name="{attr}" value="([^"]+)"',
        '<cas:{attr}>([^<]+)</cas:{attr}>',
        '<cas:user>([^<]+)</cas:user>'
    ]
    metadata_attributes: list[str] = ["uid", "netid", "did", "affil"]
    email_domain: Optional[str] = None
    email_format: str = "from_cas"
    display_name: str = "CAS Login"

    @validator('server_url')
    def validate_server_url(cls, v, values):
        if values.get('enabled') and not v:
            raise ValueError('Server URL is required when CAS is enabled')
        if v and not (v.startswith('http://') or v.startswith('https://')):
            raise ValueError('Server URL must start with http:// or https://')
        return v

    @validator('attribute_mapping')
    def validate_attribute_mapping(cls, v, values):
        if values.get('enabled') and not v:
            raise ValueError('Attribute mapping is required when CAS is enabled')
        return v

    @validator('protocol_version')
    def validate_protocol_version(cls, v):
        if v not in ['2.0', '3.0']:
            raise ValueError('Protocol version must be either "2.0" or "3.0"')
        return v

    @validator('email_format')
    def validate_email_format(cls, v):
        if v not in ['from_cas', 'construct']:
            raise ValueError('Email format must be either "from_cas" or "construct"')
        return v

    @validator('email_domain')
    def validate_email_domain(cls, v, values):
        if values.get('email_format') == 'construct' and not v:
            raise ValueError('Email domain is required when email format is "construct"')
        return v

    @validator('username_patterns')
    def validate_username_patterns(cls, v):
        if not v or len(v) == 0:
            raise ValueError('At least one username pattern is required')
        for pattern in v:
            if '{attr}' not in pattern:
                raise ValueError(f'Pattern must contain {{attr}} placeholder: {pattern}')
        return v


class CASConfigResponse(BaseModel):
    id: Optional[int]
    enabled: bool
    server_url: Optional[str]
    validation_endpoint: str
    protocol_version: str
    xml_namespace: str
    attribute_mapping: dict
    username_patterns: list[str]
    metadata_attributes: list[str]
    email_domain: Optional[str]
    email_format: str
    display_name: str
    updated_at: Optional[str]
    updated_by_id: Optional[int]

    model_config = ConfigDict(from_attributes=True)