# tests/unit/test_cas_config_schemas.py
import pytest
from pydantic import ValidationError

from schemas.cas_config import AttributeMapping, CASConfigUpdate, CASConfigResponse


# ==================== AttributeMapping Tests ====================


class TestAttributeMapping:
    """Test AttributeMapping schema."""

    def test_valid_attribute_mapping(self):
        """Should create valid attribute mapping."""
        data = {
            "username": "netid",
            "email": "email",
            "first_name": "givenName",
            "last_name": "sn",
            "full_name": "name"
        }
        
        mapping = AttributeMapping(**data)
        
        assert mapping.username == "netid"
        assert mapping.email == "email"
        assert mapping.first_name == "givenName"
        assert mapping.last_name == "sn"
        assert mapping.full_name == "name"

    def test_attribute_mapping_without_full_name(self):
        """Should use default full_name when not provided."""
        data = {
            "username": "netid",
            "email": "email",
            "first_name": "givenName",
            "last_name": "sn"
        }
        
        mapping = AttributeMapping(**data)
        
        assert mapping.full_name == "name"

    def test_attribute_mapping_empty_field(self):
        """Should reject empty field values."""
        data = {
            "username": "",
            "email": "email",
            "first_name": "givenName",
            "last_name": "sn"
        }
        
        with pytest.raises(ValidationError) as exc_info:
            AttributeMapping(**data)
        
        assert "username" in str(exc_info.value)


# ==================== CASConfigUpdate Tests ====================


class TestCASConfigUpdate:
    """Test CASConfigUpdate schema with validators."""

    def test_valid_config_disabled(self):
        """Should create valid config when disabled."""
        data = {
            "enabled": False,
            "server_url": None,
            "attribute_mapping": None
        }
        
        config = CASConfigUpdate(**data)
        
        assert config.enabled is False
        assert config.server_url is None
        assert config.validation_endpoint == "/serviceValidate"
        assert config.protocol_version == "2.0"

    def test_valid_config_enabled(self):
        """Should create valid config when enabled with required fields."""
        data = {
            "enabled": True,
            "server_url": "https://login.example.edu/cas",
            "attribute_mapping": {
                "username": "netid",
                "email": "email",
                "first_name": "givenName",
                "last_name": "sn"
            }
        }
        
        config = CASConfigUpdate(**data)
        
        assert config.enabled is True
        assert config.server_url == "https://login.example.edu/cas"
        assert config.attribute_mapping is not None

    def test_enabled_requires_server_url(self):
        """Should reject enabled config without server_url."""
        data = {
            "enabled": True,
            "server_url": None,
            "attribute_mapping": {
                "username": "netid",
                "email": "email",
                "first_name": "givenName",
                "last_name": "sn"
            }
        }
        
        with pytest.raises(ValidationError) as exc_info:
            CASConfigUpdate(**data)
        
        assert "Server URL is required" in str(exc_info.value)

    def test_enabled_requires_attribute_mapping(self):
        """Should reject enabled config without attribute_mapping."""
        data = {
            "enabled": True,
            "server_url": "https://login.example.edu/cas",
            "attribute_mapping": None
        }
        
        with pytest.raises(ValidationError) as exc_info:
            CASConfigUpdate(**data)
        
        assert "Attribute mapping is required" in str(exc_info.value)

    def test_server_url_must_have_protocol(self):
        """Should reject server_url without http:// or https://."""
        data = {
            "enabled": True,
            "server_url": "login.example.edu/cas",
            "attribute_mapping": {
                "username": "netid",
                "email": "email",
                "first_name": "givenName",
                "last_name": "sn"
            }
        }
        
        with pytest.raises(ValidationError) as exc_info:
            CASConfigUpdate(**data)
        
        assert "must start with http://" in str(exc_info.value)

    def test_protocol_version_validation(self):
        """Should only accept valid protocol versions."""
        data = {
            "enabled": False,
            "protocol_version": "1.0"
        }
        
        with pytest.raises(ValidationError) as exc_info:
            CASConfigUpdate(**data)
        
        assert "Protocol version must be" in str(exc_info.value)

    def test_email_format_validation(self):
        """Should only accept valid email formats."""
        data = {
            "enabled": False,
            "email_format": "invalid"
        }
        
        with pytest.raises(ValidationError) as exc_info:
            CASConfigUpdate(**data)
        
        assert "Email format must be" in str(exc_info.value)

    def test_construct_email_requires_domain(self):
        """Should reject construct email format without domain."""
        data = {
            "enabled": False,
            "email_format": "construct",
            "email_domain": None
        }
        
        with pytest.raises(ValidationError) as exc_info:
            CASConfigUpdate(**data)
        
        assert "Email domain is required" in str(exc_info.value)

    def test_username_patterns_required(self):
        """Should reject empty username patterns."""
        data = {
            "enabled": False,
            "username_patterns": []
        }
        
        with pytest.raises(ValidationError) as exc_info:
            CASConfigUpdate(**data)
        
        assert "At least one username pattern is required" in str(exc_info.value)

    def test_username_patterns_must_have_placeholder(self):
        """Should reject patterns without {attr} placeholder."""
        data = {
            "enabled": False,
            "username_patterns": ["<cas:user>([^<]+)</cas:user>", "invalid pattern"]
        }
        
        with pytest.raises(ValidationError) as exc_info:
            CASConfigUpdate(**data)
        
        assert "{attr} placeholder" in str(exc_info.value)

    def test_default_values_applied(self):
        """Should apply default values when not provided."""
        data = {
            "enabled": False
        }
        
        config = CASConfigUpdate(**data)
        
        assert config.validation_endpoint == "/serviceValidate"
        assert config.protocol_version == "2.0"
        assert config.xml_namespace == "http://www.yale.edu/tp/cas"
        assert len(config.username_patterns) == 3
        assert config.metadata_attributes == ["uid", "netid", "did", "affil"]
        assert config.email_format == "from_cas"
        assert config.display_name == "CAS Login"


# ==================== CASConfigResponse Tests ====================


class TestCASConfigResponse:
    """Test CASConfigResponse schema."""

    def test_valid_response(self):
        """Should create valid response."""
        data = {
            "id": 1,
            "enabled": True,
            "server_url": "https://login.example.edu/cas",
            "validation_endpoint": "/serviceValidate",
            "protocol_version": "2.0",
            "xml_namespace": "http://www.yale.edu/tp/cas",
            "attribute_mapping": {"username": "netid", "email": "email"},
            "username_patterns": ['<cas:{attr}>([^<]+)</cas:{attr}>'],
            "metadata_attributes": ["uid", "netid"],
            "email_domain": "example.edu",
            "email_format": "construct",
            "display_name": "CAS Login",
            "updated_at": "2026-01-29T10:00:00",
            "updated_by_id": 1
        }
        
        response = CASConfigResponse(**data)
        
        assert response.id == 1
        assert response.enabled is True
        assert response.server_url == "https://login.example.edu/cas"
        assert response.updated_at == "2026-01-29T10:00:00"
        assert response.updated_by_id == 1

    def test_response_with_nulls(self):
        """Should accept null values for optional fields."""
        data = {
            "id": None,
            "enabled": False,
            "server_url": None,
            "validation_endpoint": "/serviceValidate",
            "protocol_version": "2.0",
            "xml_namespace": "http://www.yale.edu/tp/cas",
            "attribute_mapping": {},
            "username_patterns": [],
            "metadata_attributes": [],
            "email_domain": None,
            "email_format": "from_cas",
            "display_name": "CAS Login",
            "updated_at": None,
            "updated_by_id": None
        }
        
        response = CASConfigResponse(**data)
        
        assert response.id is None
        assert response.server_url is None
        assert response.updated_at is None
        assert response.updated_by_id is None
