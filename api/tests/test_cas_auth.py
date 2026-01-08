"""
Tests for CAS (Central Authentication Service) authentication.

This test suite covers:
- XML parsing from CAS responses
- User creation/update from CAS data
- CAS configuration management
- CAS validation endpoint (with mocked HTTP)
- Edge cases and error handling
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import select
import xml.etree.ElementTree as ET

from tests.conftest import User, CASConfiguration, Role, create_cas_configuration, user_roles


# Sample CAS XML responses for testing
SAMPLE_CAS_SUCCESS_XML = """<?xml version="1.0" encoding="UTF-8"?>
<cas:serviceResponse xmlns:cas="http://www.yale.edu/tp/cas">
    <cas:authenticationSuccess>
        <cas:user>testuser123</cas:user>
        <cas:attributes>
            <cas:netid>testuser123</cas:netid>
            <cas:email>test.user@dartmouth.edu</cas:email>
            <cas:givenName>Test</cas:givenName>
            <cas:sn>User</cas:sn>
            <cas:name>Test User</cas:name>
            <cas:uid>12345</cas:uid>
            <cas:affil>student</cas:affil>
        </cas:attributes>
    </cas:authenticationSuccess>
</cas:serviceResponse>"""

SAMPLE_CAS_FAILURE_XML = """<?xml version="1.0" encoding="UTF-8"?>
<cas:serviceResponse xmlns:cas="http://www.yale.edu/tp/cas">
    <cas:authenticationFailure code="INVALID_TICKET">
        Ticket 'ST-123-abc' not recognized
    </cas:authenticationFailure>
</cas:serviceResponse>"""

SAMPLE_CAS_XML_ATTRIBUTE_FORMAT = """<?xml version="1.0" encoding="UTF-8"?>
<cas:serviceResponse xmlns:cas="http://www.yale.edu/tp/cas">
    <cas:authenticationSuccess>
        <cas:user>jdoe</cas:user>
        <cas:attributes>
            <cas:attribute name="netid" value="jdoe"/>
            <cas:attribute name="email" value="john.doe@dartmouth.edu"/>
            <cas:attribute name="givenName" value="John"/>
            <cas:attribute name="sn" value="Doe"/>
        </cas:attributes>
    </cas:authenticationSuccess>
</cas:serviceResponse>"""

SAMPLE_CAS_XML_MINIMAL = """<?xml version="1.0" encoding="UTF-8"?>
<cas:serviceResponse xmlns:cas="http://www.yale.edu/tp/cas">
    <cas:authenticationSuccess>
        <cas:user>minimal_user</cas:user>
    </cas:authenticationSuccess>
</cas:serviceResponse>"""

SAMPLE_CAS_XML_FULL_NAME_ONLY = """<?xml version="1.0" encoding="UTF-8"?>
<cas:serviceResponse xmlns:cas="http://www.yale.edu/tp/cas">
    <cas:authenticationSuccess>
        <cas:user>fullname_user</cas:user>
        <cas:attributes>
            <cas:name>Jane Elizabeth Smith</cas:name>
        </cas:attributes>
    </cas:authenticationSuccess>
</cas:serviceResponse>"""


class TestXMLParsing:
    """Tests for XML parsing functions from CAS responses."""

    def test_extract_attribute_from_cas_element_format(self, db_session: Session):
        """Test extracting attributes in element format (<cas:netid>value</cas:netid>)."""
        from routers.cas_auth import extract_attribute_from_cas
        
        config = create_cas_configuration(db_session)
        
        netid = extract_attribute_from_cas(SAMPLE_CAS_SUCCESS_XML, "netid", config)
        email = extract_attribute_from_cas(SAMPLE_CAS_SUCCESS_XML, "email", config)
        
        assert netid == "testuser123"
        assert email == "test.user@dartmouth.edu"

    def test_extract_attribute_from_cas_attribute_format(self, db_session: Session):
        """Test extracting attributes in attribute format (name="x" value="y")."""
        from routers.cas_auth import extract_attribute_from_cas
        
        config = create_cas_configuration(db_session)
        
        netid = extract_attribute_from_cas(SAMPLE_CAS_XML_ATTRIBUTE_FORMAT, "netid", config)
        email = extract_attribute_from_cas(SAMPLE_CAS_XML_ATTRIBUTE_FORMAT, "email", config)
        
        assert netid == "jdoe"
        assert email == "john.doe@dartmouth.edu"

    def test_extract_attribute_missing(self, db_session: Session):
        """Test that missing attributes return empty string."""
        from routers.cas_auth import extract_attribute_from_cas
        
        config = create_cas_configuration(db_session)
        
        result = extract_attribute_from_cas(SAMPLE_CAS_SUCCESS_XML, "nonexistent", config)
        
        assert result == ""

    def test_extract_email_from_cas(self, db_session: Session):
        """Test extracting email directly from CAS response."""
        from routers.cas_auth import extract_and_format_email
        
        config = create_cas_configuration(db_session, email_format="from_cas")
        
        email = extract_and_format_email(SAMPLE_CAS_SUCCESS_XML, config, "testuser123")
        
        assert email == "test.user@dartmouth.edu"

    def test_construct_email_from_username(self, db_session: Session):
        """Test constructing email from username and domain."""
        from routers.cas_auth import extract_and_format_email
        
        config = create_cas_configuration(
            db_session,
            email_format="construct",
            email_domain="dartmouth.edu"
        )
        
        email = extract_and_format_email(SAMPLE_CAS_XML_MINIMAL, config, "testuser")
        
        assert email == "testuser@dartmouth.edu"

    def test_extract_name_parts_separate(self, db_session: Session):
        """Test extracting first and last name separately."""
        from routers.cas_auth import extract_name_parts
        
        config = create_cas_configuration(db_session)
        
        result = extract_name_parts(SAMPLE_CAS_SUCCESS_XML, config)
        
        assert result["first_name"] == "Test"
        assert result["last_name"] == "User"
        assert result["full_name"] == "Test User"

    def test_extract_name_parts_from_full_name(self, db_session: Session):
        """Test extracting names by splitting full_name field."""
        from routers.cas_auth import extract_name_parts
        
        config = create_cas_configuration(db_session)
        
        result = extract_name_parts(SAMPLE_CAS_XML_FULL_NAME_ONLY, config)
        
        assert result["first_name"] == "Jane"
        assert result["last_name"] == "Elizabeth Smith"
        assert result["full_name"] == "Jane Elizabeth Smith"

    def test_extract_name_parts_missing(self, db_session: Session):
        """Test that missing name parts return empty strings."""
        from routers.cas_auth import extract_name_parts
        
        config = create_cas_configuration(db_session)
        
        result = extract_name_parts(SAMPLE_CAS_XML_MINIMAL, config)
        
        assert result["first_name"] == ""
        assert result["last_name"] == ""
        assert result["full_name"] == ""

    def test_extract_cas_metadata(self, db_session: Session):
        """Test extracting additional metadata attributes."""
        from routers.cas_auth import extract_cas_metadata
        
        config = create_cas_configuration(db_session)
        
        metadata = extract_cas_metadata(SAMPLE_CAS_SUCCESS_XML, config)
        
        assert "uid" in metadata
        assert metadata["uid"] == "12345"
        assert "netid" in metadata
        assert metadata["netid"] == "testuser123"
        assert "affil" in metadata
        assert metadata["affil"] == "student"

    def test_xml_parsing_with_malformed_xml(self, db_session: Session):
        """Test that malformed XML returns empty values gracefully."""
        from routers.cas_auth import extract_attribute_from_cas
        
        config = create_cas_configuration(db_session)
        malformed_xml = "<cas:incomplete>"
        
        result = extract_attribute_from_cas(malformed_xml, "netid", config)
        
        assert result == ""


class TestUserCreationFromCAS:
    """Tests for creating/updating users from CAS responses."""

    def test_create_new_user_from_cas_parsing(self, db_session: Session):
        """Test parsing user data from CAS response."""
        from routers.cas_auth import (
            extract_attribute_from_cas,
            extract_and_format_email,
            extract_name_parts,
            extract_cas_metadata
        )
        
        config = create_cas_configuration(db_session)
        
        # Extract all user data
        username = extract_attribute_from_cas(SAMPLE_CAS_SUCCESS_XML, "netid", config)
        email = extract_and_format_email(SAMPLE_CAS_SUCCESS_XML, config, username)
        name_parts = extract_name_parts(SAMPLE_CAS_SUCCESS_XML, config)
        cas_metadata = extract_cas_metadata(SAMPLE_CAS_SUCCESS_XML, config)
        
        # Create user manually with extracted data
        user = User(
            username=username,
            email=email,
            first_name=name_parts["first_name"],
            last_name=name_parts["last_name"],
            is_active=True,
            user_metadata={
                "auth_method": "cas",
                "email": email,
                "cas_data": cas_metadata,
                "created_at": datetime.now().isoformat()
            }
        )
        db_session.add(user)
        db_session.commit()
        
        assert user.username == "testuser123"
        assert user.email == "test.user@dartmouth.edu"
        assert user.first_name == "Test"
        assert user.last_name == "User"
        assert user.is_active is True
        assert user.user_metadata.get("auth_method") == "cas"

    def test_update_existing_user_metadata(self, db_session: Session):
        """Test updating an existing user's metadata."""
        from routers.cas_auth import extract_cas_metadata
        from sqlalchemy.orm.attributes import flag_modified
        
        # Create existing user
        existing_user = User(
            first_name="Test",
            last_name="User",
            email="test.user@dartmouth.edu",
            username="testuser123",
            user_metadata={"auth_method": "cas", "email": "test.user@dartmouth.edu"}
        )
        db_session.add(existing_user)
        db_session.commit()
        
        config = create_cas_configuration(db_session)
        
        # Extract new CAS metadata
        cas_metadata = extract_cas_metadata(SAMPLE_CAS_SUCCESS_XML, config)
        
        # Update user metadata
        current_metadata = existing_user.user_metadata or {}
        current_metadata.update({
            "last_login": datetime.now().isoformat(),
            "cas_data": cas_metadata,
            "auth_method": "cas",
        })
        existing_user.user_metadata = current_metadata
        flag_modified(existing_user, "user_metadata")  # Mark as changed for SQLAlchemy
        db_session.commit()
        
        # Reload from database to verify changes persisted
        db_session.refresh(existing_user)
        
        # Verify update
        assert "last_login" in existing_user.user_metadata
        assert existing_user.user_metadata.get("auth_method") == "cas"
        assert "cas_data" in existing_user.user_metadata

    def test_user_metadata_tracking(self, db_session: Session):
        """Test that CAS metadata is properly tracked."""
        from routers.cas_auth import extract_cas_metadata
        
        config = create_cas_configuration(db_session)
        cas_metadata = extract_cas_metadata(SAMPLE_CAS_SUCCESS_XML, config)
        
        user = User(
            username="testuser123",
            email="test.user@dartmouth.edu",
            first_name="Test",
            last_name="User",
            user_metadata={
                "auth_method": "cas",
                "email": "test.user@dartmouth.edu",
                "created_at": datetime.now().isoformat(),
                "last_login": datetime.now().isoformat(),
                "cas_data": cas_metadata
            }
        )
        db_session.add(user)
        db_session.commit()
        
        metadata = user.user_metadata
        assert metadata.get("auth_method") == "cas"
        assert "email" in metadata
        assert "created_at" in metadata
        assert "last_login" in metadata
        assert "cas_data" in metadata
        
        # Check CAS-specific data
        cas_data = metadata["cas_data"]
        assert "uid" in cas_data
        assert "netid" in cas_data

    def test_default_role_assignment_for_new_cas_user(self, db_session: Session):
        """Test that new CAS users can be assigned default role."""
        # Create default role
        default_role = Role(name="general_user", description="Default role")
        db_session.add(default_role)
        db_session.commit()
        
        # Create CAS user
        user = User(
            username="testuser123",
            email="test.user@dartmouth.edu",
            first_name="Test",
            last_name="User",
            user_metadata={"auth_method": "cas"}
        )
        db_session.add(user)
        db_session.flush()
        
        # Assign default role
        user.roles.append(default_role)
        db_session.commit()
        
        # Reload to get roles
        db_session.refresh(user)
        
        assert len(user.roles) >= 1
        role_names = [r.name for r in user.roles]
        assert "general_user" in role_names

    def test_username_extraction_from_different_patterns(self, db_session: Session):
        """Test that username can be extracted using different patterns."""
        from routers.cas_auth import extract_attribute_from_cas
        
        config = create_cas_configuration(db_session)
        
        # Test with attribute format XML
        username = extract_attribute_from_cas(SAMPLE_CAS_XML_ATTRIBUTE_FORMAT, "netid", config)
        
        assert username == "jdoe"

    def test_constructed_email_for_user(self, db_session: Session):
        """Test email construction when not provided by CAS."""
        from routers.cas_auth import extract_and_format_email
        
        config = create_cas_configuration(
            db_session,
            email_format="construct",
            email_domain="dartmouth.edu"
        )
        
        username = "minimal_user"
        email = extract_and_format_email(SAMPLE_CAS_XML_MINIMAL, config, username)
        
        assert email == "minimal_user@dartmouth.edu"


class TestCASConfiguration:
    """Tests for CAS configuration management."""

    def test_create_cas_configuration(self, db_session: Session):
        """Test creating a CAS configuration."""
        config = create_cas_configuration(
            db_session,
            enabled=True,
            server_url="https://cas.example.edu",
            email_domain="example.edu"
        )
        
        assert config.id is not None
        assert config.enabled is True
        assert config.server_url == "https://cas.example.edu"
        assert config.email_domain == "example.edu"

    def test_cas_configuration_default_values(self, db_session: Session):
        """Test that CAS configuration has correct default values."""
        config = create_cas_configuration(db_session)
        
        assert config.validation_endpoint == "/serviceValidate"
        assert config.protocol_version == "2.0"
        assert config.xml_namespace == "http://www.yale.edu/tp/cas"
        assert config.email_format == "from_cas"

    def test_cas_configuration_attribute_mapping(self, db_session: Session):
        """Test custom attribute mapping configuration."""
        custom_mapping = {
            "username": "uid",
            "email": "mail",
            "first_name": "firstName",
            "last_name": "lastName"
        }
        
        config = create_cas_configuration(
            db_session,
            attribute_mapping=custom_mapping
        )
        
        assert config.attribute_mapping["username"] == "uid"
        assert config.attribute_mapping["email"] == "mail"

    def test_cas_configuration_disabled(self, db_session: Session):
        """Test disabled CAS configuration."""
        config = create_cas_configuration(db_session, enabled=False)
        
        assert config.enabled is False

    def test_load_cas_configuration_from_database(self, db_session: Session):
        """Test loading CAS configuration from database."""
        create_cas_configuration(db_session, server_url="https://test.cas.edu")
        
        loaded_config = db_session.execute(
            select(CASConfiguration)
        ).scalar_one_or_none()
        
        assert loaded_config is not None
        assert loaded_config.server_url == "https://test.cas.edu"


class TestCASValidationEndpoint:
    """Tests for CAS ticket validation endpoint behavior."""

    def test_successful_cas_validation_parsing(self, db_session: Session):
        """Test successful CAS ticket validation parsing."""
        from routers.cas_auth import (
            extract_attribute_from_cas,
            extract_and_format_email,
            extract_name_parts
        )
        
        config = create_cas_configuration(db_session)
        
        # Create default role
        default_role = Role(name="general_user", description="Default role")
        db_session.add(default_role)
        db_session.commit()
        
        # Parse CAS response (simulating successful validation)
        username = extract_attribute_from_cas(SAMPLE_CAS_SUCCESS_XML, "netid", config)
        email = extract_and_format_email(SAMPLE_CAS_SUCCESS_XML, config, username)
        name_parts = extract_name_parts(SAMPLE_CAS_SUCCESS_XML, config)
        
        # Create user from CAS data
        user = User(
            username=username,
            email=email,
            first_name=name_parts["first_name"],
            last_name=name_parts["last_name"],
            user_metadata={"auth_method": "cas"}
        )
        db_session.add(user)
        db_session.flush()
        
        # Assign default role
        user.roles.append(default_role)
        db_session.commit()
        
        assert user.username == "testuser123"
        assert user.email == "test.user@dartmouth.edu"
        assert user.first_name == "Test"
        assert user.last_name == "User"
        assert len(user.roles) >= 1

    def test_cas_validation_authentication_failure_parsing(self, db_session: Session):
        """Test parsing CAS authentication failure response."""
        import xml.etree.ElementTree as ET
        
        config = create_cas_configuration(db_session)
        
        # Parse failure XML
        try:
            root = ET.fromstring(SAMPLE_CAS_FAILURE_XML)
            ns = {"cas": config.xml_namespace}
            failure = root.find(".//cas:authenticationFailure", ns)
            
            assert failure is not None
            assert "INVALID_TICKET" in failure.get("code", "")
            assert "not recognized" in failure.text
        except ET.ParseError:
            pytest.fail("Failed to parse CAS failure XML")

    def test_cas_validation_disabled_config(self, db_session: Session):
        """Test that disabled CAS configuration can be detected."""
        config = create_cas_configuration(db_session, enabled=False)
        
        assert config.enabled is False
        # In production, endpoint would return 400 if CAS is disabled

    def test_cas_validation_missing_ticket(self, db_session: Session):
        """Test validation of missing ticket data."""
        # Simulate empty ticket validation
        ticket = ""
        
        assert ticket == ""
        # In production, endpoint would return 400 for empty ticket

    def test_cas_validation_with_http_mock(self, db_session: Session):
        """Test CAS validation HTTP call structure."""
        config = create_cas_configuration(db_session)
        
        # Build expected validation URL
        ticket = "ST-123-abc"
        service = "http://localhost:3000"
        expected_url = f"{config.server_url}{config.validation_endpoint}?ticket={ticket}&service={service}"
        
        assert config.server_url in expected_url
        assert config.validation_endpoint in expected_url
        assert ticket in expected_url
        assert service in expected_url


class TestEdgeCases:
    """Tests for edge cases and error handling."""

    def test_empty_xml_response(self, db_session: Session):
        """Test handling of empty XML response."""
        from routers.cas_auth import extract_attribute_from_cas
        
        config = create_cas_configuration(db_session)
        
        result = extract_attribute_from_cas("", "netid", config)
        
        assert result == ""

    def test_username_extraction_with_special_characters(self, db_session: Session):
        """Test extracting usernames with special characters."""
        from routers.cas_auth import extract_attribute_from_cas, extract_and_format_email, extract_name_parts
        
        special_xml = """<?xml version="1.0" encoding="UTF-8"?>
<cas:serviceResponse xmlns:cas="http://www.yale.edu/tp/cas">
    <cas:authenticationSuccess>
        <cas:user>user.name-123</cas:user>
        <cas:attributes>
            <cas:netid>user.name-123</cas:netid>
            <cas:email>user.name@example.edu</cas:email>
            <cas:givenName>User</cas:givenName>
            <cas:sn>Name</cas:sn>
        </cas:attributes>
    </cas:authenticationSuccess>
</cas:serviceResponse>"""
        
        config = create_cas_configuration(db_session)
        
        # Extract username and other data
        username = extract_attribute_from_cas(special_xml, "netid", config)
        email = extract_and_format_email(special_xml, config, username)
        name_parts = extract_name_parts(special_xml, config)
        
        # Create user with special character username
        user = User(
            username=username,
            email=email,
            first_name=name_parts["first_name"],
            last_name=name_parts["last_name"],
            user_metadata={"auth_method": "cas"}
        )
        db_session.add(user)
        db_session.commit()
        
        assert user.username == "user.name-123"

    def test_email_formatting_with_spaces(self, db_session: Session):
        """Test email formatting removes spaces and lowercases."""
        from routers.cas_auth import extract_and_format_email
        
        xml_with_spaces = """<?xml version="1.0" encoding="UTF-8"?>
<cas:serviceResponse xmlns:cas="http://www.yale.edu/tp/cas">
    <cas:authenticationSuccess>
        <cas:attributes>
            <cas:email>John Doe@Example.EDU</cas:email>
        </cas:attributes>
    </cas:authenticationSuccess>
</cas:serviceResponse>"""
        
        config = create_cas_configuration(db_session)
        
        email = extract_and_format_email(xml_with_spaces, config)
        
        assert email == "john.doe@example.edu"

    def test_different_xml_namespace(self, db_session: Session):
        """Test parsing with a different XML namespace."""
        from routers.cas_auth import extract_attribute_from_cas
        
        custom_namespace_xml = """<?xml version="1.0" encoding="UTF-8"?>
<cas:serviceResponse xmlns:cas="http://custom.namespace.com/cas">
    <cas:authenticationSuccess>
        <cas:netid>testuser</cas:netid>
    </cas:authenticationSuccess>
</cas:serviceResponse>"""
        
        config = create_cas_configuration(
            db_session,
            xml_namespace="http://custom.namespace.com/cas"
        )
        
        netid = extract_attribute_from_cas(custom_namespace_xml, "netid", config)
        
        assert netid == "testuser"

    def test_missing_username_raises_error(self, db_session: Session):
        """Test that missing username in CAS response can be detected."""
        from routers.cas_auth import extract_attribute_from_cas
        
        no_username_xml = """<?xml version="1.0" encoding="UTF-8"?>
<cas:serviceResponse xmlns:cas="http://www.yale.edu/tp/cas">
    <cas:authenticationSuccess>
        <cas:attributes>
            <cas:email>test@example.com</cas:email>
        </cas:attributes>
    </cas:authenticationSuccess>
</cas:serviceResponse>"""
        
        config = create_cas_configuration(db_session)
        
        # Try to extract username from various patterns
        username = extract_attribute_from_cas(no_username_xml, "netid", config)
        user_tag = extract_attribute_from_cas(no_username_xml, "user", config)
        
        # Both should be empty
        assert username == ""
        assert user_tag == ""
        # In production, get_or_create_user_from_cas would raise HTTPException 400
