from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx
import re
import xml.etree.ElementTree as ET
from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import datetime, timedelta
from database import get_db
from models import models
from fastapi import Depends
from typing import Optional, Dict, Any, List  # Add List to the import
import logging
from schemas.auth import TicketValidation, UserResponse

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')

stream_handler = logging.StreamHandler()
stream_handler.setFormatter(formatter)
logger.addHandler(stream_handler)

router = APIRouter(
    prefix="/api/v1",
    tags=["authentication"]
)

def extract_and_format_email(xml_string):
    
    # Parse the XML

    root = ET.fromstring(xml_string)
    
    # Find the user element (which contains the email)
    # Using namespace with findall
    namespace = {'cas': 'http://www.yale.edu/tp/cas'}
    user_element = root.find('.//cas:user', namespace)
    
    if user_element is not None:
        email = user_element.text
        
        # Convert to lowercase
        email = email.lower()
        
        # Replace spaces with periods
        email = email.replace(' ', '.')
        
        return email
    else:
        return "Email not found in XML"

def extract_name_parts(xml_string):
    # Parse the XML
    root = ET.fromstring(xml_string)
    
    # Find the name element
    namespace = {'cas': 'http://www.yale.edu/tp/cas'}
    name_element = root.find('.//cas:name', namespace)
    
    if name_element is not None:
        full_name = name_element.text
        
        # Split the name into parts
        name_parts = full_name.split()
        
        # Handle cases with middle names or multiple last names
        if len(name_parts) == 2:
            first_name, last_name = name_parts
        elif len(name_parts) > 2:
            first_name = name_parts[0]
            # Join all remaining parts as the last name
            last_name = ' '.join(name_parts[1:])
        else:
            # If there's only one part
            first_name = name_parts[0]
            last_name = ""
        
        return {
            'first_name': first_name,
            'last_name': last_name,
            'full_name': full_name
        }
    else:
        return {
            'first_name': "",
            'last_name': "",
            'full_name': ""
        }

def extract_cas_metadata(xml_string):
    """Extract all relevant metadata from CAS response"""
    root = ET.fromstring(xml_string)
    namespace = {'cas': 'http://www.yale.edu/tp/cas'}
    
    metadata = {}
    
    # Extract common attributes
    for attr_name in ['uid', 'netid', 'did', 'affil']:
        element = root.find(f'.//cas:{attr_name}', namespace)
        if element is not None and element.text:
            metadata[attr_name] = element.text
    
    # Also extract the netid from attributes if present
    netid_attr = root.find('.//cas:attribute[@name="netid"]', namespace)
    if netid_attr is not None and 'value' in netid_attr.attrib:
        metadata['netid'] = netid_attr.attrib['value']
    
    return metadata

def assign_default_role_to_user(db_session: Session, user: models.User, role_name: str = "general_user"):
    """
    Assign a default role to a user if they don't already have it.
    
    Args:
        db_session: SQLAlchemy database session
        user: User object
        role_name: Name of the role to assign (default: "general_user")
    """
    # Check if user already has this role
    existing_role = db_session.query(models.Role).filter(
        models.Role.name == role_name,
        models.Role.users.contains(user)
    ).first()
    
    if not existing_role:
        # Get the role
        role = db_session.query(models.Role).filter(models.Role.name == role_name).first()
        if role:
            # Assign role to user
            user.roles.append(role)
            db_session.commit()
            logger.info(f"Assigned role '{role_name}' to user {user.id}")
        else:
            logger.warning(f"Role '{role_name}' not found in database")

def get_user_roles(user: models.User) -> List[str]:
    """
    Get list of role names for a user.
    
    Args:
        user: User object with roles already loaded
        
    Returns:
        List of role names
    """
    return [role.name for role in user.roles]

from sqlalchemy.orm import joinedload
from sqlalchemy import select

def get_or_create_user_from_cas(db_session: Session, cas_xml_string: str):
    """
    Process CAS response and either retrieve an existing user or create a new one.
    Also ensures user has the default 'general_user' role.
    Returns user with roles loaded (same structure as GET endpoints).
    
    Args:
        db_session: SQLAlchemy database session
        cas_xml_string: XML string from CAS response
        
    Returns:
        User object with roles loaded (either existing or newly created)
    """
    # Extract email and name from CAS response
    email = extract_and_format_email(cas_xml_string)
    name_parts = extract_name_parts(cas_xml_string)
    first_name = name_parts['first_name']
    last_name = name_parts['last_name']
    
    # Extract additional metadata from CAS for storage
    cas_metadata = extract_cas_metadata(cas_xml_string)
    netid = cas_metadata.get('netid')
    
    # Look for existing user by netid first, then by name and email
    existing_user = None
    
    if netid:
        # Try to find by netid in metadata first (with roles loaded)
        query = select(models.User).options(joinedload(models.User.roles)).filter(
            models.User.user_metadata.has_key('cas_data'),
            models.User.user_metadata['cas_data']['netid'].astext == netid
        )
        result = db_session.execute(query)
        existing_user = result.scalars().unique().first()
    
    if not existing_user:
        # Try to find by name and email (with roles loaded)
        query = select(models.User).options(joinedload(models.User.roles)).filter(
            models.User.first_name == first_name,
            models.User.last_name == last_name,
            or_(
                models.User.user_metadata.has_key('email'),
                models.User.user_metadata['email'].astext == email
            )
        )
        result = db_session.execute(query)
        existing_user = result.scalars().unique().first()
    
    if existing_user:
        # User exists, update metadata if needed
        current_metadata = existing_user.user_metadata or {}
        # Update metadata with new login info or other details
        current_metadata.update({
            'last_login': datetime.now().isoformat(),
            'email': email,
            'cas_data': cas_metadata
        })
        existing_user.user_metadata = current_metadata
        db_session.commit()
        
        # Ensure user has default role
        assign_default_role_to_user(db_session, existing_user)
        
        # Reload user with fresh roles after potential role assignment
        query = select(models.User).options(joinedload(models.User.roles)).filter(
            models.User.id == existing_user.id
        )
        result = db_session.execute(query)
        return result.scalars().unique().first()
        
    else:
        # Create new user
        new_user = models.User(
            first_name=first_name,
            last_name=last_name,
            user_metadata={
                'email': email,
                'created_at': datetime.now().isoformat(),
                'last_login': datetime.now().isoformat(),
                'cas_data': cas_metadata
            }
        )
        db_session.add(new_user)
        db_session.commit()
        
        # Assign default role to new user
        assign_default_role_to_user(db_session, new_user)
        
        # Reload user with roles loaded (same structure as GET endpoints)
        query = select(models.User).options(joinedload(models.User.roles)).filter(
            models.User.id == new_user.id
        )
        result = db_session.execute(query)
        return result.scalars().unique().first()

@router.post("/validate-cas-ticket", response_model=UserResponse)
async def validate_cas_ticket(data: TicketValidation, db: Session = Depends(get_db)):
    """
    Validates a CAS ticket with Dartmouth's CAS server and returns user information.
    Automatically assigns 'general_user' role to new users and returns user roles.
    Includes a TTL (time to live) value set to one week from now.
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
            
            # Extract netid from CAS response
            netid_match = re.search(r'<cas:attribute name="netid" value="([^"]+)"', xml)
            if not netid_match:
                raise HTTPException(status_code=401, detail="CAS validation failed: netid not found")
            
            netid = netid_match.group(1).strip()
            
            # Create or get user from database (now returns user with roles loaded)
            user = get_or_create_user_from_cas(db, xml)
            
            # Get user roles (simplified since roles are already loaded)
            user_roles = get_user_roles(user)
            
            # Calculate TTL (1 week from now)
            ttl = (datetime.now() + timedelta(weeks=1)).isoformat()
            
            # Extract email from user metadata
            email = user.user_metadata.get('email') if user.user_metadata else None
            logger.info(f"CAS success for user {user.id} with roles: {user_roles}")
            
            # Return user information with roles and TTL
            return UserResponse(
                id=user.id,
                first_name=user.first_name,
                last_name=user.last_name,
                netid=netid,
                email=email,
                user_metadata=user.user_metadata,
                roles=user_roles,
                ttl=ttl
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