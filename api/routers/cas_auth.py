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


def extract_and_format_email(xml_string: str) -> str:
    """
    Extract and format email from CAS XML response.

    Args:
        xml_string: XML response from CAS server

    Returns:
        Formatted email address
    """
    root = ET.fromstring(xml_string)
    namespace = {"cas": "http://www.yale.edu/tp/cas"}
    user_element = root.find(".//cas:user", namespace)

    if user_element is not None:
        email = user_element.text.lower().replace(" ", ".")
        return email

    return "Email not found in XML"


def extract_name_parts(xml_string: str) -> dict:
    """
    Extract first and last name from CAS XML response.

    Args:
        xml_string: XML response from CAS server

    Returns:
        Dict with first_name, last_name, and full_name
    """
    root = ET.fromstring(xml_string)
    namespace = {"cas": "http://www.yale.edu/tp/cas"}
    name_element = root.find(".//cas:name", namespace)

    if name_element is not None:
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

    return {"first_name": "", "last_name": "", "full_name": ""}


def extract_cas_metadata(xml_string: str) -> dict:
    """
    Extract all relevant metadata from CAS response.

    Args:
        xml_string: XML response from CAS server

    Returns:
        Dict with CAS metadata (uid, netid, did, affil)
    """
    root = ET.fromstring(xml_string)
    namespace = {"cas": "http://www.yale.edu/tp/cas"}

    metadata = {}

    # Extract common attributes
    for attr_name in ["uid", "netid", "did", "affil"]:
        element = root.find(f".//cas:{attr_name}", namespace)
        if element is not None and element.text:
            metadata[attr_name] = element.text

    # Also extract the netid from attributes if present
    netid_attr = root.find('.//cas:attribute[@name="netid"]', namespace)
    if netid_attr is not None and "value" in netid_attr.attrib:
        metadata["netid"] = netid_attr.attrib["value"]

    return metadata


# ==================== CAS User Management ====================


def get_or_create_user_from_cas(
    db_session: Session, cas_xml_string: str
) -> models.User:
    """
    Process CAS response and either retrieve an existing user or create a new one.
    Ensures user has the default 'general_user' role.
    Returns user with roles and groups loaded (consistent with basic auth).

    Args:
        db_session: SQLAlchemy database session
        cas_xml_string: XML string from CAS response

    Returns:
        User object with roles and groups loaded
    """
    # Extract data from CAS response
    email = extract_and_format_email(cas_xml_string)
    name_parts = extract_name_parts(cas_xml_string)
    first_name = name_parts["first_name"]
    last_name = name_parts["last_name"]
    cas_metadata = extract_cas_metadata(cas_xml_string)
    netid = cas_metadata.get("netid")

    # Look for existing user by netid first, then by name and email
    existing_user = None

    if netid:
        # Try to find by netid in metadata first (with roles and groups loaded)
        query = (
            select(models.User)
            .options(joinedload(models.User.roles), joinedload(models.User.groups))
            .filter(
                models.User.user_metadata.has_key("cas_data"),
                models.User.user_metadata["cas_data"]["netid"].astext == netid,
            )
        )
        result = db_session.execute(query)
        existing_user = result.scalars().unique().first()

    if not existing_user:
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
            username=netid,
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
    logger.debug("CAS endpoint accessed")

    if not data.ticket:
        raise HTTPException(status_code=400, detail="Missing CAS ticket")

    validation_url = f"https://login.dartmouth.edu/cas/serviceValidate?ticket={data.ticket}&service={data.service}"

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(validation_url)
            response.raise_for_status()
            xml = response.text

            # Check if authentication was successful
            if "<cas:authenticationSuccess>" not in xml:
                raise HTTPException(status_code=401, detail="CAS authentication failed")

            logger.debug(f"CAS XML response: {xml}")

            # Extract netid from CAS response - try multiple patterns
            netid_match = re.search(r'<cas:attribute name="netid" value="([^"]+)"', xml)
            if not netid_match:
                netid_match = re.search(r"<cas:netid>([^<]+)</cas:netid>", xml)
            if not netid_match:
                netid_match = re.search(r"<cas:user>([^<]+)</cas:user>", xml)

            if not netid_match:
                logger.error(f"Could not extract netid from CAS XML: {xml}")
                raise HTTPException(
                    status_code=401, detail="CAS validation failed: netid not found"
                )

            netid = netid_match.group(1).strip()

            if not netid:
                logger.error(f"Extracted netid is empty from CAS XML: {xml}")
                raise HTTPException(
                    status_code=401, detail="CAS validation failed: empty netid"
                )

            logger.debug(f"Extracted netid: {netid}")

            # Create or get user from database (returns user with roles and groups loaded)
            user = get_or_create_user_from_cas(db, xml)

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
