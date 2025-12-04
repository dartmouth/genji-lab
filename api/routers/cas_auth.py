"""
CAS (Central Authentication Service) authentication endpoints.
Uses shared utilities from auth_utils for consistency with basic auth.
"""

from fastapi import APIRouter, HTTPException, Request, Depends
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, or_
from datetime import datetime
import httpx
import re
import xml.etree.ElementTree as ET
import logging

from database import get_db
from models import models
from schemas.auth import TicketValidation, UserResponse

# Import shared utilities
from routers.auth_utils import (
    create_session,
    calculate_session_ttl,
    get_user_roles,
    get_user_groups,
    assign_default_role_to_user,
    load_user_with_relations,
    update_user_last_login,
)

# Logging setup
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
stream_handler = logging.StreamHandler()
stream_handler.setFormatter(formatter)
logger.addHandler(stream_handler)

router = APIRouter(prefix="/api/v1", tags=["authentication"])


# ==================== CAS XML Parsing Utilities ====================


def extract_attribute_from_cas(
    xml_string: str, attribute_name: str, cas_config: models.CASConfiguration
) -> str:
    """
    Generic function to extract any attribute from CAS XML response.

    Args:
        xml_string: XML response from CAS server
        attribute_name: Name of the attribute to extract
        cas_config: CAS configuration object

    Returns:
        Extracted attribute value or empty string if not found
    """
    try:
        root = ET.fromstring(xml_string)
        namespace = {"cas": cas_config.xml_namespace}

        # Try to find the element directly
        element = root.find(f".//cas:{attribute_name}", namespace)
        if element is not None and element.text:
            return element.text.strip()

        # Try as attribute with name/value pattern
        attr_element = root.find(
            f'.//cas:attribute[@name="{attribute_name}"]', namespace
        )
        if attr_element is not None and "value" in attr_element.attrib:
            return attr_element.attrib["value"].strip()

    except ET.ParseError as e:
        logger.error(f"XML parsing error in extract_attribute_from_cas: {e}")
    except Exception as e:
        logger.error(f"Unexpected error in extract_attribute_from_cas: {e}")

    return ""


def extract_and_format_email(
    xml_string: str, cas_config: models.CASConfiguration, username: str = None
) -> str:
    """
    Extract and format email from CAS XML response using configuration.

    Args:
        xml_string: XML response from CAS server
        cas_config: CAS configuration object
        username: Optional username for constructing email

    Returns:
        Formatted email address or empty string if not found
    """
    try:
        email_attr = cas_config.attribute_mapping.get("email", "email")

        if cas_config.email_format == "from_cas":
            # Extract from CAS response
            email = extract_attribute_from_cas(xml_string, email_attr, cas_config)
            if email:
                return email.lower().replace(" ", ".")

        # Construct email if format is "construct" or if extraction failed
        if (
            cas_config.email_format == "construct"
            and cas_config.email_domain
            and username
        ):
            return f"{username.lower().replace(' ', '.')}@{cas_config.email_domain}"

        # Fallback: try to extract from user element
        root = ET.fromstring(xml_string)
        namespace = {"cas": cas_config.xml_namespace}
        user_element = root.find(".//cas:user", namespace)

        if user_element is not None and user_element.text:
            return user_element.text.lower().replace(" ", ".")

    except ET.ParseError as e:
        logger.error(f"XML parsing error in extract_and_format_email: {e}")
    except Exception as e:
        logger.error(f"Unexpected error in extract_and_format_email: {e}")

    return ""


def extract_name_parts(xml_string: str, cas_config: models.CASConfiguration) -> dict:
    """
    Extract first and last name from CAS XML response using configuration.

    Args:
        xml_string: XML response from CAS server
        cas_config: CAS configuration object

    Returns:
        Dict with first_name, last_name, and full_name (empty strings if not found)
    """
    try:
        root = ET.fromstring(xml_string)
        namespace = {"cas": cas_config.xml_namespace}

        # Try to get full name first
        full_name_attr = cas_config.attribute_mapping.get("full_name", "name")
        name_element = root.find(f".//cas:{full_name_attr}", namespace)

        if name_element is not None and name_element.text:
            full_name = name_element.text
            name_parts = full_name.split()

            if len(name_parts) == 2:
                first_name, last_name = name_parts
            elif len(name_parts) > 2:
                first_name = name_parts[0]
                last_name = " ".join(name_parts[1:])
            else:
                first_name = name_parts[0] if name_parts else ""
                last_name = ""

            return {
                "first_name": first_name,
                "last_name": last_name,
                "full_name": full_name,
            }

        # Try to extract first and last name separately
        first_name_attr = cas_config.attribute_mapping.get("first_name", "givenName")
        last_name_attr = cas_config.attribute_mapping.get("last_name", "sn")

        first_name = extract_attribute_from_cas(xml_string, first_name_attr, cas_config)
        last_name = extract_attribute_from_cas(xml_string, last_name_attr, cas_config)

        if first_name or last_name:
            return {
                "first_name": first_name,
                "last_name": last_name,
                "full_name": f"{first_name} {last_name}".strip(),
            }

    except ET.ParseError as e:
        logger.error(f"XML parsing error in extract_name_parts: {e}")
    except Exception as e:
        logger.error(f"Unexpected error in extract_name_parts: {e}")

    return {"first_name": "", "last_name": "", "full_name": ""}


def extract_cas_metadata(xml_string: str, cas_config: models.CASConfiguration) -> dict:
    """
    Extract all relevant metadata from CAS response using configuration.

    Args:
        xml_string: XML response from CAS server
        cas_config: CAS configuration object

    Returns:
        Dict with CAS metadata based on config (empty dict if extraction fails)
    """
    metadata = {}

    try:
        # Extract attributes specified in config
        for attr_name in cas_config.metadata_attributes:
            value = extract_attribute_from_cas(xml_string, attr_name, cas_config)
            if value:
                metadata[attr_name] = value

    except Exception as e:
        logger.error(f"Unexpected error in extract_cas_metadata: {e}")

    return metadata


# ==================== CAS User Management ====================


def get_or_create_user_from_cas(
    db_session: Session, cas_xml_string: str, cas_config: models.CASConfiguration
) -> models.User:
    """
    Process CAS response and either retrieve an existing user or create a new one.
    Ensures user has the default 'general_user' role.
    Returns user with roles and groups loaded (consistent with basic auth).

    Args:
        db_session: SQLAlchemy database session
        cas_xml_string: XML string from CAS response
        cas_config: CAS configuration object

    Returns:
        User object with roles and groups loaded
    """
    # Use config to determine which attribute is the username
    username_attr = cas_config.attribute_mapping.get("username", "netid")

    # Try patterns from config
    username = None
    for pattern_template in cas_config.username_patterns:
        pattern = pattern_template.format(attr=username_attr)
        match = re.search(pattern, cas_xml_string)
        if match:
            username = match.group(1).strip()
            break

    if not username:
        raise HTTPException(
            status_code=400,
            detail=f"Could not extract {username_attr} from CAS response",
        )

    # Extract data from CAS response using config-driven helpers
    email = extract_and_format_email(cas_xml_string, cas_config, username)
    name_parts = extract_name_parts(cas_xml_string, cas_config)
    first_name = name_parts["first_name"]
    last_name = name_parts["last_name"]
    cas_metadata = extract_cas_metadata(cas_xml_string, cas_config)
    existing_user = None

    if not existing_user and email:
        # Try to find by name and email (with roles and groups loaded)
        query = (
            select(models.User)
            .options(joinedload(models.User.roles), joinedload(models.User.groups))
            .filter(
                models.User.first_name == first_name,
                models.User.last_name == last_name,
                or_(
                    models.User.user_metadata.has_key("email"),
                    models.User.user_metadata["email"].astext == email,
                ),
            )
        )
        result = db_session.execute(query)
        existing_user = result.scalars().unique().first()

    if existing_user:
        # User exists, update metadata and last login
        current_metadata = existing_user.user_metadata or {}
        current_metadata.update(
            {
                "last_login": datetime.now().isoformat(),
                "email": email,
                "cas_data": cas_metadata,
                "auth_method": "cas",
            }
        )
        existing_user.user_metadata = current_metadata
        db_session.commit()

        # Ensure user has default role
        assign_default_role_to_user(db_session, existing_user)

        # Reload user with fresh relations using shared utility
        return load_user_with_relations(db_session, existing_user.id)

    else:
        # Create new user
        new_user = models.User(
            first_name=first_name,
            last_name=last_name,
            username=username,
            email=email,
            is_active=True,
            user_metadata={
                "email": email,
                "cas_data": cas_metadata,
                "created_at": datetime.now().isoformat(),
                "last_login": datetime.now().isoformat(),
                "auth_method": "cas",
            },
        )
        db_session.add(new_user)
        db_session.commit()

        # Assign default role to new user
        assign_default_role_to_user(db_session, new_user)

        # Reload user with relations using shared utility
        return load_user_with_relations(db_session, new_user.id)


# ==================== CAS Authentication Endpoint ====================
@router.post("/validate-cas-ticket", response_model=UserResponse)
async def validate_cas_ticket(
    data: TicketValidation, request: Request, db: Session = Depends(get_db)
):
    """
    Validates a CAS ticket with Dartmouth's CAS server and returns user information.
    Automatically assigns 'general_user' role to new users.
    Returns consistent UserResponse with roles, groups, and TTL.
    """
    """
    Validates a CAS ticket using database-stored configuration.
    """
    # Load CAS configuration from database
    cas_config = db.query(models.CASConfiguration).first()

    if not cas_config or not cas_config.enabled:
        raise HTTPException(status_code=400, detail="CAS authentication is not enabled")

    if not data.ticket:
        raise HTTPException(status_code=400, detail="Missing CAS ticket")

    # Build validation URL from config
    validation_url = (
        f"{cas_config.server_url}{cas_config.validation_endpoint}"
        f"?ticket={data.ticket}&service={data.service}"
    )

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(validation_url)
            response.raise_for_status()
            xml = response.text

            if "<cas:authenticationSuccess>" not in xml:
                raise HTTPException(status_code=401, detail="CAS authentication failed")

            # Use config-driven extraction
            user = get_or_create_user_from_cas(db, xml, cas_config)

            # Create session using shared utility
            create_session(request, user.id, user.username)

            # Calculate TTL using shared utility
            ttl = calculate_session_ttl()

            # Return user information with consistent structure
            return UserResponse(
                id=user.id,
                first_name=user.first_name,
                last_name=user.last_name,
                username=user.username,
                email=user.email,
                is_active=user.is_active,
                viewed_tutorial=user.viewed_tutorial,
                user_metadata=user.user_metadata,
                roles=get_user_roles(user),
                groups=get_user_groups(user),
                ttl=ttl,
            )

    except httpx.HTTPStatusError as e:
        detail = f"CAS server returned error: {e.response.status_code}"
        logger.error(detail)
        raise HTTPException(status_code=500, detail=detail)
    except httpx.RequestError as e:
        detail = f"Error communicating with CAS server: {str(e)}"
        logger.error(detail)
        raise HTTPException(status_code=500, detail=detail)
    except Exception as e:
        detail = f"CAS validation failed: {str(e)}"
        logger.error(detail)
        raise HTTPException(status_code=500, detail=detail)


# @router.post("/validate-cas-ticket", response_model=UserResponse)
# async def validate_cas_ticket(
#     data: TicketValidation, request: Request, db: Session = Depends(get_db)
# ):
#     """
#     Validates a CAS ticket with Dartmouth's CAS server and returns user information.
#     Automatically assigns 'general_user' role to new users.
#     Returns consistent UserResponse with roles, groups, and TTL.
#     """
#     logger.debug("CAS endpoint accessed")

#     if not data.ticket:
#         raise HTTPException(status_code=400, detail="Missing CAS ticket")

#     validation_url = f"https://login.dartmouth.edu/cas/serviceValidate?ticket={data.ticket}&service={data.service}"

#     try:
#         async with httpx.AsyncClient() as client:
#             response = await client.get(validation_url)
#             response.raise_for_status()
#             xml = response.text

#             # Check if authentication was successful
#             if "<cas:authenticationSuccess>" not in xml:
#                 raise HTTPException(status_code=401, detail="CAS authentication failed")

#             logger.debug(f"CAS XML response: {xml}")

#             # Extract netid from CAS response - try multiple patterns
#             netid_match = re.search(r'<cas:attribute name="netid" value="([^"]+)"', xml)
#             if not netid_match:
#                 netid_match = re.search(r"<cas:netid>([^<]+)</cas:netid>", xml)
#             if not netid_match:
#                 netid_match = re.search(r"<cas:user>([^<]+)</cas:user>", xml)

#             if not netid_match:
#                 logger.error(f"Could not extract netid from CAS XML: {xml}")
#                 raise HTTPException(
#                     status_code=401, detail="CAS validation failed: netid not found"
#                 )

#             netid = netid_match.group(1).strip()

#             if not netid:
#                 logger.error(f"Extracted netid is empty from CAS XML: {xml}")
#                 raise HTTPException(
#                     status_code=401, detail="CAS validation failed: empty netid"
#                 )

#             logger.debug(f"Extracted netid: {netid}")

#             # Create or get user from database (returns user with roles and groups loaded)
#             user = get_or_create_user_from_cas(db, xml)

#             # Create session using shared utility
#             create_session(request, user.id, user.username)

#             # Calculate TTL using shared utility
#             ttl = calculate_session_ttl()

#             # Return user information with consistent structure
#             return UserResponse(
#                 id=user.id,
#                 first_name=user.first_name,
#                 last_name=user.last_name,
#                 username=user.username,
#                 email=user.email,
#                 is_active=user.is_active,
#                 user_metadata=user.user_metadata,
#                 roles=get_user_roles(user),
#                 groups=get_user_groups(user),
#                 ttl=ttl,
#             )

#     except httpx.HTTPStatusError as e:
#         detail = f"CAS server returned error: {e.response.status_code}"
#         logger.error(detail)
#         raise HTTPException(status_code=500, detail=detail)
#     except httpx.RequestError as e:
#         detail = f"Error communicating with CAS server: {str(e)}"
#         logger.error(detail)
#         raise HTTPException(status_code=500, detail=detail)
#     except Exception as e:
#         detail = f"CAS validation failed: {str(e)}"
#         logger.error(detail)
#         raise HTTPException(status_code=500, detail=detail)
