# tests/unit/test_cas_config_service.py
import pytest
from unittest.mock import Mock, patch
from fastapi import HTTPException
from datetime import datetime

from services.cas_config_service import CASConfigService
from schemas.cas_config import CASConfigUpdate, AttributeMapping
import sys
import os

# Add tests directory to path to import conftest
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from conftest import CASConfigurationModel


# ==================== Helper Methods Tests ====================


class TestDefaultValues:
    """Test default value helper methods."""

    def test_get_default_attribute_mapping(self):
        """Should return default attribute mapping."""
        service = CASConfigService()
        
        mapping = service._get_default_attribute_mapping()
        
        assert mapping["username"] == "netid"
        assert mapping["email"] == "email"
        assert mapping["first_name"] == "givenName"
        assert mapping["last_name"] == "sn"
        assert mapping["full_name"] == "name"

    def test_get_default_username_patterns(self):
        """Should return default username patterns."""
        service = CASConfigService()
        
        patterns = service._get_default_username_patterns()
        
        assert len(patterns) == 3
        assert '{attr}' in patterns[0]
        assert '{attr}' in patterns[1]
        assert '<cas:user>' in patterns[2]

    def test_get_default_config(self):
        """Should return complete default config."""
        service = CASConfigService()
        
        config = service._get_default_config()
        
        assert config["id"] is None
        assert config["enabled"] is False
        assert config["server_url"] is None
        assert config["validation_endpoint"] == "/serviceValidate"
        assert config["protocol_version"] == "2.0"
        assert isinstance(config["attribute_mapping"], dict)
        assert isinstance(config["username_patterns"], list)
        assert config["display_name"] == "CAS Login"


class TestBuildResponseDict:
    """Test _build_response_dict helper."""

    def test_build_response_with_all_fields(self):
        """Should build complete response dictionary."""
        service = CASConfigService()
        
        cas_config = CASConfigurationModel(
            id=1,
            enabled=True,
            server_url="https://login.example.edu/cas",
            validation_endpoint="/serviceValidate",
            protocol_version="2.0",
            xml_namespace="http://www.yale.edu/tp/cas",
            attribute_mapping={"username": "netid"},
            username_patterns=["pattern1"],
            metadata_attributes=["uid"],
            email_domain="example.edu",
            email_format="construct",
            display_name="CAS Login",
            updated_at=datetime(2026, 1, 29, 10, 0, 0),
            updated_by_id=1
        )
        
        result = service._build_response_dict(cas_config)
        
        assert result["id"] == 1
        assert result["enabled"] is True
        assert result["server_url"] == "https://login.example.edu/cas"
        assert result["updated_at"] == "2026-01-29T10:00:00"
        assert result["updated_by_id"] == 1

    def test_build_response_with_none_updated_at(self):
        """Should handle None updated_at."""
        service = CASConfigService()
        
        cas_config = CASConfigurationModel(
            id=1,
            enabled=False,
            validation_endpoint="/serviceValidate",
            protocol_version="2.0",
            xml_namespace="http://www.yale.edu/tp/cas",
            attribute_mapping={},
            username_patterns=[],
            metadata_attributes=[],
            display_name="CAS Login",
            updated_at=None,
            updated_by_id=None
        )
        
        result = service._build_response_dict(cas_config)
        
        assert result["updated_at"] is None
        assert result["updated_by_id"] is None


# ==================== CRUD Operations Tests ====================


class TestGet:
    """Test get method."""

    def test_get_returns_default_when_no_config(self, db_session, monkeypatch):
        """Should return default config when none exists."""
        # Patch models
        import services.cas_config_service as config_module
        monkeypatch.setattr(config_module, 'CASConfiguration', CASConfigurationModel)
        
        service = CASConfigService()
        result = service.get(db_session)
        
        assert result["id"] is None
        assert result["enabled"] is False
        assert result["server_url"] is None
        assert isinstance(result["attribute_mapping"], dict)

    def test_get_returns_existing_config(self, db_session, monkeypatch):
        """Should return existing config when present."""
        # Patch models
        import services.cas_config_service as config_module
        monkeypatch.setattr(config_module, 'CASConfiguration', CASConfigurationModel)
        
        # Create config
        config = CASConfigurationModel(
            id=1,
            enabled=True,
            server_url="https://login.example.edu/cas",
            validation_endpoint="/serviceValidate",
            protocol_version="2.0",
            xml_namespace="http://www.yale.edu/tp/cas",
            attribute_mapping={"username": "netid"},
            username_patterns=["pattern1"],
            metadata_attributes=["uid"],
            display_name="CAS Login"
        )
        db_session.add(config)
        db_session.commit()
        
        service = CASConfigService()
        result = service.get(db_session)
        
        assert result["id"] == 1
        assert result["enabled"] is True
        assert result["server_url"] == "https://login.example.edu/cas"


class TestGetPublic:
    """Test get_public method."""

    def test_get_public_returns_default_when_no_config(self, db_session, monkeypatch):
        """Should return default public config when none exists."""
        # Patch models
        import services.cas_config_service as config_module
        monkeypatch.setattr(config_module, 'CASConfiguration', CASConfigurationModel)
        
        service = CASConfigService()
        result = service.get_public(db_session)
        
        assert result["enabled"] is False
        assert result["display_name"] == "CAS Login"
        assert len(result) == 2  # Only enabled and display_name

    def test_get_public_returns_only_public_fields(self, db_session, monkeypatch):
        """Should return only enabled and display_name from existing config."""
        # Patch models
        import services.cas_config_service as config_module
        monkeypatch.setattr(config_module, 'CASConfiguration', CASConfigurationModel)
        
        # Create config with all fields
        config = CASConfigurationModel(
            id=1,
            enabled=True,
            server_url="https://login.example.edu/cas",
            validation_endpoint="/serviceValidate",
            protocol_version="2.0",
            xml_namespace="http://www.yale.edu/tp/cas",
            attribute_mapping={"username": "netid"},
            username_patterns=["pattern1"],
            metadata_attributes=["uid"],
            display_name="Custom CAS"
        )
        db_session.add(config)
        db_session.commit()
        
        service = CASConfigService()
        result = service.get_public(db_session)
        
        assert result["enabled"] is True
        assert result["display_name"] == "Custom CAS"
        assert "server_url" not in result
        assert "attribute_mapping" not in result


class TestCreateOrUpdate:
    """Test create_or_update method."""

    def test_create_new_config(self, db_session, test_user, monkeypatch):
        """Should create new config when none exists."""
        TestUser = type(test_user)
        
        # Patch models
        import services.cas_config_service as config_module
        monkeypatch.setattr(config_module, 'CASConfiguration', CASConfigurationModel)
        monkeypatch.setattr(config_module, 'User', TestUser)
        
        service = CASConfigService()
        
        config_update = CASConfigUpdate(
            enabled=True,
            server_url="https://login.example.edu/cas",
            attribute_mapping=AttributeMapping(
                username="netid",
                email="email",
                first_name="givenName",
                last_name="sn"
            )
        )
        
        result = service.create_or_update(db_session, config_update, test_user)
        
        assert result["enabled"] is True
        assert result["server_url"] == "https://login.example.edu/cas"
        assert result["updated_by_id"] == test_user.id
        
        # Verify in database
        saved_config = db_session.query(CASConfigurationModel).first()
        assert saved_config is not None
        assert saved_config.enabled is True

    def test_update_existing_config(self, db_session, test_user, monkeypatch):
        """Should update existing config."""
        TestUser = type(test_user)
        
        # Patch models
        import services.cas_config_service as config_module
        monkeypatch.setattr(config_module, 'CASConfiguration', CASConfigurationModel)
        monkeypatch.setattr(config_module, 'User', TestUser)
        
        # Create existing config
        existing_config = CASConfigurationModel(
            id=1,
            enabled=False,
            server_url="https://old.example.edu/cas",
            validation_endpoint="/serviceValidate",
            protocol_version="2.0",
            xml_namespace="http://www.yale.edu/tp/cas",
            attribute_mapping={"username": "old"},
            username_patterns=["pattern1"],
            metadata_attributes=["uid"],
            display_name="Old CAS"
        )
        db_session.add(existing_config)
        db_session.commit()
        
        service = CASConfigService()
        
        config_update = CASConfigUpdate(
            enabled=True,
            server_url="https://new.example.edu/cas",
            attribute_mapping=AttributeMapping(
                username="netid",
                email="email",
                first_name="givenName",
                last_name="sn"
            ),
            display_name="New CAS"
        )
        
        result = service.create_or_update(db_session, config_update, test_user)
        
        assert result["id"] == 1  # Same ID
        assert result["enabled"] is True
        assert result["server_url"] == "https://new.example.edu/cas"
        assert result["display_name"] == "New CAS"
        assert result["updated_by_id"] == test_user.id
        
        # Verify only one config exists
        config_count = db_session.query(CASConfigurationModel).count()
        assert config_count == 1

    def test_create_or_update_inactive_user(self, db_session, test_user, monkeypatch):
        """Should reject inactive user."""
        TestUser = type(test_user)
        
        # Patch models
        import services.cas_config_service as config_module
        monkeypatch.setattr(config_module, 'CASConfiguration', CASConfigurationModel)
        monkeypatch.setattr(config_module, 'User', TestUser)
        
        # Make user inactive
        test_user.is_active = False
        db_session.commit()
        
        service = CASConfigService()
        
        config_update = CASConfigUpdate(
            enabled=False
        )
        
        with pytest.raises(HTTPException) as exc_info:
            service.create_or_update(db_session, config_update, test_user)
        
        assert exc_info.value.status_code == 403
        assert "not active" in exc_info.value.detail

    def test_create_or_update_uses_default_mapping_when_none(self, db_session, test_user, monkeypatch):
        """Should use default attribute mapping when none provided."""
        TestUser = type(test_user)
        
        # Patch models
        import services.cas_config_service as config_module
        monkeypatch.setattr(config_module, 'CASConfiguration', CASConfigurationModel)
        monkeypatch.setattr(config_module, 'User', TestUser)
        
        service = CASConfigService()
        
        config_update = CASConfigUpdate(
            enabled=False,
            attribute_mapping=None
        )
        
        result = service.create_or_update(db_session, config_update, test_user)
        
        # Should have default mapping
        assert "username" in result["attribute_mapping"]
        assert result["attribute_mapping"]["username"] == "netid"
