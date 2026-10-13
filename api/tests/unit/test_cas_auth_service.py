# tests/unit/test_cas_auth_service.py
import pytest
from datetime import datetime
from unittest.mock import Mock, patch, AsyncMock
from fastapi import HTTPException

from services.cas_auth_service import CASAuthService
import sys
import os

# Add tests directory to path to import conftest
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from conftest import CASConfigurationModel


# ==================== Sample CAS XML Responses ====================


@pytest.fixture
def sample_cas_success_xml():
    """Sample successful CAS authentication response."""
    return """<?xml version="1.0" encoding="UTF-8"?>
<cas:serviceResponse xmlns:cas="http://www.yale.edu/tp/cas">
    <cas:authenticationSuccess>
        <cas:user>d12345x</cas:user>
        <cas:attributes>
            <cas:netid>d12345x</cas:netid>
            <cas:email>john.doe@dartmouth.edu</cas:email>
            <cas:givenName>John</cas:givenName>
            <cas:sn>Doe</cas:sn>
            <cas:name>John Doe</cas:name>
            <cas:uid>12345</cas:uid>
            <cas:did>67890</cas:did>
            <cas:affil>student</cas:affil>
        </cas:attributes>
    </cas:authenticationSuccess>
</cas:serviceResponse>"""


@pytest.fixture
def sample_cas_failure_xml():
    """Sample failed CAS authentication response."""
    return """<?xml version="1.0" encoding="UTF-8"?>
<cas:serviceResponse xmlns:cas="http://www.yale.edu/tp/cas">
    <cas:authenticationFailure code="INVALID_TICKET">
        Ticket ST-1234-abc not recognized
    </cas:authenticationFailure>
</cas:serviceResponse>"""


@pytest.fixture
def sample_cas_attribute_format_xml():
    """Sample CAS response with attribute name/value format."""
    return """<?xml version="1.0" encoding="UTF-8"?>
<cas:serviceResponse xmlns:cas="http://www.yale.edu/tp/cas">
    <cas:authenticationSuccess>
        <cas:user>testuser</cas:user>
        <cas:attributes>
            <cas:attribute name="netid" value="testuser"/>
            <cas:attribute name="email" value="test@example.com"/>
        </cas:attributes>
    </cas:authenticationSuccess>
</cas:serviceResponse>"""


@pytest.fixture
def cas_config():
    """Sample CAS configuration."""
    config = CASConfigurationModel(
        id=1,
        enabled=True,
        server_url="https://login.example.edu/cas",
        validation_endpoint="/serviceValidate",
        protocol_version="2.0",
        xml_namespace="http://www.yale.edu/tp/cas",
        attribute_mapping={
            "username": "netid",
            "email": "email",
            "first_name": "givenName",
            "last_name": "sn",
            "full_name": "name",
        },
        username_patterns=[
            '<cas:attribute name="{attr}" value="([^"]+)"',
            "<cas:{attr}>([^<]+)</cas:{attr}>",
            "<cas:user>([^<]+)</cas:user>",
        ],
        metadata_attributes=["uid", "netid", "did", "affil"],
        email_domain="dartmouth.edu",
        email_format="from_cas",
        display_name="CAS Login"
    )
    return config


# ==================== XML Parsing Utilities Tests ====================


class TestExtractAttributeFromCAS:
    """Test extract_attribute_from_cas utility."""

    def test_extract_direct_element(self, sample_cas_success_xml, cas_config):
        """Should extract attribute from direct element."""
        service = CASAuthService()
        
        result = service.extract_attribute_from_cas(
            sample_cas_success_xml, "netid", cas_config
        )
        
        assert result == "d12345x"

    def test_extract_attribute_format(self, sample_cas_attribute_format_xml, cas_config):
        """Should extract attribute from name/value format."""
        service = CASAuthService()
        
        result = service.extract_attribute_from_cas(
            sample_cas_attribute_format_xml, "email", cas_config
        )
        
        assert result == "test@example.com"

    def test_extract_not_found(self, sample_cas_success_xml, cas_config):
        """Should return empty string when attribute not found."""
        service = CASAuthService()
        
        result = service.extract_attribute_from_cas(
            sample_cas_success_xml, "nonexistent", cas_config
        )
        
        assert result == ""

    def test_extract_invalid_xml(self, cas_config):
        """Should return empty string for invalid XML."""
        service = CASAuthService()
        
        result = service.extract_attribute_from_cas(
            "not valid xml", "netid", cas_config
        )
        
        assert result == ""


class TestExtractAndFormatEmail:
    """Test extract_and_format_email utility."""

    def test_extract_from_cas(self, sample_cas_success_xml, cas_config):
        """Should extract email from CAS response."""
        service = CASAuthService()
        
        result = service.extract_and_format_email(
            sample_cas_success_xml, cas_config
        )
        
        assert result == "john.doe@dartmouth.edu"

    def test_construct_email(self, sample_cas_success_xml, cas_config):
        """Should construct email when format is 'construct'."""
        cas_config.email_format = "construct"
        cas_config.email_domain = "example.edu"
        service = CASAuthService()
        
        result = service.extract_and_format_email(
            sample_cas_success_xml, cas_config, username="testuser"
        )
        
        assert result == "testuser@example.edu"

    def test_fallback_to_user_element(self, cas_config):
        """Should fall back to user element when email not in attributes."""
        xml = """<?xml version="1.0" encoding="UTF-8"?>
<cas:serviceResponse xmlns:cas="http://www.yale.edu/tp/cas">
    <cas:authenticationSuccess>
        <cas:user>user@example.com</cas:user>
    </cas:authenticationSuccess>
</cas:serviceResponse>"""
        
        service = CASAuthService()
        result = service.extract_and_format_email(xml, cas_config)
        
        assert result == "user@example.com"

    def test_email_formatting(self, cas_config):
        """Should format email by lowercasing and replacing spaces."""
        xml = """<?xml version="1.0" encoding="UTF-8"?>
<cas:serviceResponse xmlns:cas="http://www.yale.edu/tp/cas">
    <cas:authenticationSuccess>
        <cas:email>John Doe@Example.COM</cas:email>
    </cas:authenticationSuccess>
</cas:serviceResponse>"""
        
        service = CASAuthService()
        result = service.extract_and_format_email(xml, cas_config)
        
        assert result == "john.doe@example.com"


class TestExtractNameParts:
    """Test extract_name_parts utility."""

    def test_extract_full_name_two_parts(self, sample_cas_success_xml, cas_config):
        """Should split full name into first and last (2 parts)."""
        service = CASAuthService()
        
        result = service.extract_name_parts(sample_cas_success_xml, cas_config)
        
        assert result["first_name"] == "John"
        assert result["last_name"] == "Doe"
        assert result["full_name"] == "John Doe"

    def test_extract_full_name_multiple_parts(self, cas_config):
        """Should split full name into first and last (multiple parts)."""
        xml = """<?xml version="1.0" encoding="UTF-8"?>
<cas:serviceResponse xmlns:cas="http://www.yale.edu/tp/cas">
    <cas:authenticationSuccess>
        <cas:name>John Michael Doe</cas:name>
    </cas:authenticationSuccess>
</cas:serviceResponse>"""
        
        service = CASAuthService()
        result = service.extract_name_parts(xml, cas_config)
        
        assert result["first_name"] == "John"
        assert result["last_name"] == "Michael Doe"
        assert result["full_name"] == "John Michael Doe"

    def test_extract_separate_name_fields(self, cas_config):
        """Should extract first and last name separately."""
        xml = """<?xml version="1.0" encoding="UTF-8"?>
<cas:serviceResponse xmlns:cas="http://www.yale.edu/tp/cas">
    <cas:authenticationSuccess>
        <cas:givenName>Jane</cas:givenName>
        <cas:sn>Smith</cas:sn>
    </cas:authenticationSuccess>
</cas:serviceResponse>"""
        
        service = CASAuthService()
        result = service.extract_name_parts(xml, cas_config)
        
        assert result["first_name"] == "Jane"
        assert result["last_name"] == "Smith"
        assert result["full_name"] == "Jane Smith"

    def test_extract_name_not_found(self, cas_config):
        """Should return empty strings when name not found."""
        xml = """<?xml version="1.0" encoding="UTF-8"?>
<cas:serviceResponse xmlns:cas="http://www.yale.edu/tp/cas">
    <cas:authenticationSuccess>
        <cas:user>testuser</cas:user>
    </cas:authenticationSuccess>
</cas:serviceResponse>"""
        
        service = CASAuthService()
        result = service.extract_name_parts(xml, cas_config)
        
        assert result["first_name"] == ""
        assert result["last_name"] == ""
        assert result["full_name"] == ""


class TestExtractCASMetadata:
    """Test extract_cas_metadata utility."""

    def test_extract_multiple_attributes(self, sample_cas_success_xml, cas_config):
        """Should extract all configured metadata attributes."""
        service = CASAuthService()
        
        result = service.extract_cas_metadata(sample_cas_success_xml, cas_config)
        
        assert result["uid"] == "12345"
        assert result["netid"] == "d12345x"
        assert result["did"] == "67890"
        assert result["affil"] == "student"

    def test_extract_missing_attributes(self, cas_config):
        """Should skip missing attributes."""
        xml = """<?xml version="1.0" encoding="UTF-8"?>
<cas:serviceResponse xmlns:cas="http://www.yale.edu/tp/cas">
    <cas:authenticationSuccess>
        <cas:uid>12345</cas:uid>
    </cas:authenticationSuccess>
</cas:serviceResponse>"""
        
        service = CASAuthService()
        result = service.extract_cas_metadata(xml, cas_config)
        
        assert result["uid"] == "12345"
        assert "netid" not in result
        assert "did" not in result


class TestExtractUsernameFromCAS:
    """Test _extract_username_from_cas helper."""

    def test_extract_username_success(self, sample_cas_success_xml, cas_config):
        """Should extract username from CAS response."""
        service = CASAuthService()
        
        result = service._extract_username_from_cas(sample_cas_success_xml, cas_config)
        
        assert result == "d12345x"

    def test_extract_username_attribute_format(self, sample_cas_attribute_format_xml, cas_config):
        """Should extract username from attribute format."""
        service = CASAuthService()
        
        result = service._extract_username_from_cas(sample_cas_attribute_format_xml, cas_config)
        
        assert result == "testuser"

    def test_extract_username_failure(self, cas_config):
        """Should raise 400 when username cannot be extracted."""
        xml = """<?xml version="1.0" encoding="UTF-8"?>
<cas:serviceResponse xmlns:cas="http://www.yale.edu/tp/cas">
    <cas:authenticationSuccess>
    </cas:authenticationSuccess>
</cas:serviceResponse>"""
        
        service = CASAuthService()
        
        with pytest.raises(HTTPException) as exc_info:
            service._extract_username_from_cas(xml, cas_config)
        
        assert exc_info.value.status_code == 400
        assert "Could not extract netid" in exc_info.value.detail


# ==================== Helper Methods Tests ====================


class TestFindExistingUser:
    """Test _find_existing_user helper."""

    @patch.object(CASAuthService, '_find_existing_user')
    def test_find_existing_user_found(self, mock_find, test_user, db_session):
        """Should find existing user by name and email."""
        # Mock the method to return test_user
        mock_find.return_value = test_user
        
        service = CASAuthService()
        result = service._find_existing_user(
            db_session, test_user.first_name, test_user.last_name, "test@example.com"
        )
        
        assert result is not None
        assert result.id == test_user.id
        mock_find.assert_called_once_with(
            db_session, test_user.first_name, test_user.last_name, "test@example.com"
        )

    @patch.object(CASAuthService, '_find_existing_user')
    def test_find_existing_user_not_found(self, mock_find, db_session, test_user):
        """Should return None when user not found."""
        # Mock the method to return None
        mock_find.return_value = None
        
        service = CASAuthService()
        result = service._find_existing_user(
            db_session, "Nonexistent", "User", "nonexistent@example.com"
        )
        
        assert result is None
        mock_find.assert_called_once()

    @patch.object(CASAuthService, '_find_existing_user')
    def test_find_existing_user_no_email(self, mock_find, db_session, test_user):
        """Should return None when email is empty."""
        # Mock the method to return None for empty email
        mock_find.return_value = None
        
        service = CASAuthService()
        result = service._find_existing_user(
            db_session, test_user.first_name, test_user.last_name, ""
        )
        
        assert result is None
        mock_find.assert_called_once_with(
            db_session, test_user.first_name, test_user.last_name, ""
        )


class TestUpdateExistingUser:
    """Test _update_existing_user helper."""

    @patch('services.cas_auth_service.assign_default_role_to_user')
    @patch('services.cas_auth_service.load_user_with_relations')
    def test_update_user_metadata(
        self, mock_load_user, mock_assign_role, test_user, db_session
    ):
        """Should update user metadata with CAS data."""
        test_user.user_metadata = {"existing": "data"}
        db_session.commit()
        
        mock_load_user.return_value = test_user
        
        service = CASAuthService()
        cas_metadata = {"uid": "12345", "affil": "student"}
        
        result = service._update_existing_user(
            db_session, test_user, "new@example.com", cas_metadata
        )
        
        # Check metadata was updated
        db_session.refresh(test_user)
        assert test_user.user_metadata["email"] == "new@example.com"
        assert test_user.user_metadata["cas_data"] == cas_metadata
        assert test_user.user_metadata["auth_method"] == "cas"
        assert "last_login" in test_user.user_metadata
        assert "existing" in test_user.user_metadata
        
        # Check role assignment was called
        mock_assign_role.assert_called_once_with(db_session, test_user)
        mock_load_user.assert_called_once_with(db_session, test_user.id)

    @patch('services.cas_auth_service.assign_default_role_to_user')
    @patch('services.cas_auth_service.load_user_with_relations')
    def test_update_user_ensures_role(
        self, mock_load_user, mock_assign_role, test_user, db_session
    ):
        """Should ensure user has default role."""
        mock_load_user.return_value = test_user
        
        service = CASAuthService()
        service._update_existing_user(db_session, test_user, "email@test.com", {})
        
        mock_assign_role.assert_called_once()


class TestCreateNewUser:
    """Test _create_new_user helper."""

    @patch('services.cas_auth_service.assign_default_role_to_user')
    @patch('services.cas_auth_service.load_user_with_relations')
    def test_create_new_user(
        self, mock_load_user, mock_assign_role, test_user, db_session, monkeypatch
    ):
        """Should create new user with CAS data."""
        TestUser = type(test_user)
        
        # Patch models
        import services.cas_auth_service as cas_module
        monkeypatch.setattr(cas_module.models, 'User', TestUser)
        
        mock_load_user.return_value = test_user
        
        service = CASAuthService()
        cas_metadata = {"uid": "12345", "affil": "student"}
        
        result = service._create_new_user(
            db_session,
            "newuser",
            "New",
            "User",
            "new@example.com",
            cas_metadata
        )
        
        # Check user was created
        new_user = db_session.query(TestUser).filter_by(username="newuser").first()
        assert new_user is not None
        assert new_user.first_name == "New"
        assert new_user.last_name == "User"
        assert new_user.email == "new@example.com"
        assert new_user.is_active is True
        assert new_user.user_metadata["email"] == "new@example.com"
        assert new_user.user_metadata["cas_data"] == cas_metadata
        assert new_user.user_metadata["auth_method"] == "cas"
        
        # Check role assignment was called
        mock_assign_role.assert_called_once()


class TestBuildUserResponseData:
    """Test _build_user_response_data helper."""

    def test_build_complete_response(self, test_user, test_role_user, db_session):
        """Should build complete user response with all fields."""
        test_user.roles.append(test_role_user)
        test_user.user_metadata = {"custom": "data"}
        db_session.commit()
        db_session.refresh(test_user)
        
        service = CASAuthService()
        result = service._build_user_response_data(test_user)
        
        assert result["id"] == test_user.id
        assert result["first_name"] == test_user.first_name
        assert result["last_name"] == test_user.last_name
        assert result["email"] == test_user.email
        assert result["username"] == test_user.username
        assert result["is_active"] is True
        assert result["viewed_tutorial"] is False
        assert result["roles"] == ["user"]
        assert result["groups"] == []
        assert result["user_metadata"] == {"custom": "data"}
        assert "ttl" in result
        assert isinstance(result["ttl"], str)


# ==================== User Management Tests ====================


class TestGetOrCreateUserFromCAS:
    """Test get_or_create_user_from_cas method."""

    @patch.object(CASAuthService, '_update_existing_user')
    @patch.object(CASAuthService, '_find_existing_user')
    def test_existing_user_updated(
        self, mock_find, mock_update, test_user, sample_cas_success_xml, cas_config
    ):
        """Should update existing user when found."""
        mock_find.return_value = test_user
        mock_update.return_value = test_user
        
        service = CASAuthService()
        result = service.get_or_create_user_from_cas(
            Mock(), sample_cas_success_xml, cas_config
        )
        
        assert result == test_user
        mock_find.assert_called_once()
        mock_update.assert_called_once()

    @patch.object(CASAuthService, '_create_new_user')
    @patch.object(CASAuthService, '_find_existing_user')
    def test_new_user_created(
        self, mock_find, mock_create, test_user, sample_cas_success_xml, cas_config
    ):
        """Should create new user when not found."""
        mock_find.return_value = None
        mock_create.return_value = test_user
        
        service = CASAuthService()
        result = service.get_or_create_user_from_cas(
            Mock(), sample_cas_success_xml, cas_config
        )
        
        assert result == test_user
        mock_find.assert_called_once()
        mock_create.assert_called_once()


# ==================== Authentication Operations Tests ====================


class TestValidateCASTicket:
    """Test validate_cas_ticket method."""

    @pytest.mark.asyncio
    @patch('services.cas_auth_service.create_session')
    @patch.object(CASAuthService, 'get_or_create_user_from_cas')
    async def test_validate_ticket_success(
        self, mock_get_or_create, mock_create_session, test_user, sample_cas_success_xml, cas_config, db_session, monkeypatch
    ):
        """Should validate ticket and return user data."""
        CASConfig = type(cas_config)
        
        # Patch models
        import services.cas_auth_service as cas_module
        monkeypatch.setattr(cas_module.models, 'CASConfiguration', CASConfig)
        
        # Setup db to return cas_config
        db_session.add(cas_config)
        db_session.commit()
        
        mock_get_or_create.return_value = test_user
        
        # Mock httpx.AsyncClient
        mock_response = Mock()
        mock_response.text = sample_cas_success_xml
        mock_response.raise_for_status = Mock()
        
        mock_client = AsyncMock()
        mock_client.__aenter__.return_value.get.return_value = mock_response
        
        with patch('httpx.AsyncClient', return_value=mock_client):
            from schemas.auth import TicketValidation
            service = CASAuthService()
            
            data = TicketValidation(ticket="ST-12345", service="http://example.com")
            mock_request = Mock()
            
            result = await service.validate_cas_ticket(db_session, data, mock_request)
            
            # Check session was created
            mock_create_session.assert_called_once_with(mock_request, test_user.id, test_user.username)
            
            # Check response
            assert result["id"] == test_user.id
            assert result["username"] == test_user.username

    @pytest.mark.asyncio
    async def test_validate_ticket_cas_disabled(self, db_session, cas_config, monkeypatch):
        """Should raise 400 when CAS is disabled."""
        CASConfig = type(cas_config)
        
        # Patch models
        import services.cas_auth_service as cas_module
        monkeypatch.setattr(cas_module.models, 'CASConfiguration', CASConfig)
        
        cas_config.enabled = False
        db_session.add(cas_config)
        db_session.commit()
        
        service = CASAuthService()
        from schemas.auth import TicketValidation
        data = TicketValidation(ticket="ST-12345", service="http://example.com")
        
        with pytest.raises(HTTPException) as exc_info:
            await service.validate_cas_ticket(db_session, data, Mock())
        
        assert exc_info.value.status_code == 400
        assert "not enabled" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_validate_ticket_no_config(self, db_session, monkeypatch):
        """Should raise 400 when CAS config not found."""
        # Patch models but don't add config
        import services.cas_auth_service as cas_module
        from conftest import CASConfigurationModel
        monkeypatch.setattr(cas_module.models, 'CASConfiguration', CASConfigurationModel)
        
        service = CASAuthService()
        from schemas.auth import TicketValidation
        data = TicketValidation(ticket="ST-12345", service="http://example.com")
        
        with pytest.raises(HTTPException) as exc_info:
            await service.validate_cas_ticket(db_session, data, Mock())
        
        assert exc_info.value.status_code == 400

    @pytest.mark.asyncio
    async def test_validate_ticket_missing_ticket(self, db_session, cas_config, monkeypatch):
        """Should raise 400 when ticket is missing."""
        CASConfig = type(cas_config)
        
        # Patch models
        import services.cas_auth_service as cas_module
        monkeypatch.setattr(cas_module.models, 'CASConfiguration', CASConfig)
        
        db_session.add(cas_config)
        db_session.commit()
        
        service = CASAuthService()
        from schemas.auth import TicketValidation
        data = TicketValidation(ticket="", service="http://example.com")
        
        with pytest.raises(HTTPException) as exc_info:
            await service.validate_cas_ticket(db_session, data, Mock())
        
        assert exc_info.value.status_code == 400
        assert "Missing CAS ticket" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_validate_ticket_auth_failed(self, db_session, cas_config, sample_cas_failure_xml, monkeypatch):
        """Should raise 401 when CAS authentication fails."""
        CASConfig = type(cas_config)
        
        # Patch models
        import services.cas_auth_service as cas_module
        monkeypatch.setattr(cas_module.models, 'CASConfiguration', CASConfig)
        
        db_session.add(cas_config)
        db_session.commit()
        
        # Mock httpx.AsyncClient with failure response
        mock_response = Mock()
        mock_response.text = sample_cas_failure_xml
        mock_response.raise_for_status = Mock()
        
        mock_client = AsyncMock()
        mock_client.__aenter__.return_value.get.return_value = mock_response
        
        with patch('httpx.AsyncClient', return_value=mock_client):
            service = CASAuthService()
            from schemas.auth import TicketValidation
            data = TicketValidation(ticket="ST-invalid", service="http://example.com")
            
            with pytest.raises(HTTPException) as exc_info:
                await service.validate_cas_ticket(db_session, data, Mock())
            
            assert exc_info.value.status_code == 401
            assert "authentication failed" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_validate_ticket_server_error(self, db_session, cas_config, monkeypatch):
        """Should raise 500 when CAS server returns error."""
        CASConfig = type(cas_config)
        
        # Patch models
        import services.cas_auth_service as cas_module
        monkeypatch.setattr(cas_module.models, 'CASConfiguration', CASConfig)
        
        db_session.add(cas_config)
        db_session.commit()
        
        # Mock httpx.AsyncClient with server error
        import httpx
        mock_response = Mock()
        mock_response.status_code = 500
        
        def raise_status_error():
            raise httpx.HTTPStatusError("Server error", request=Mock(), response=mock_response)
        
        mock_response.raise_for_status = raise_status_error
        
        mock_client = AsyncMock()
        mock_client.__aenter__.return_value.get.return_value = mock_response
        
        with patch('httpx.AsyncClient', return_value=mock_client):
            service = CASAuthService()
            from schemas.auth import TicketValidation
            data = TicketValidation(ticket="ST-12345", service="http://example.com")
            
            with pytest.raises(HTTPException) as exc_info:
                await service.validate_cas_ticket(db_session, data, Mock())
            
            assert exc_info.value.status_code == 500
            assert "CAS server returned error" in exc_info.value.detail
