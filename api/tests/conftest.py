"""
Pytest configuration and fixtures for testing the Genji API.

This module provides:
- An in-memory SQLite database for testing (no external database required)
- Database session fixtures with automatic cleanup
- Test client fixture for FastAPI testing
- Sample data factories for creating test objects

APPROACH: Since the production models use PostgreSQL-specific features (JSONB, schemas),
we create test-specific models that are SQLite-compatible but maintain the same structure.
The tests use these models directly with the router functions.
"""

import pytest
from typing import Generator
from datetime import datetime
from unittest.mock import MagicMock, patch
import sys

from sqlalchemy import (
    create_engine, 
    event, 
    Column, 
    Integer, 
    String, 
    Text, 
    ForeignKey, 
    DateTime, 
    Date,
    Boolean,
    JSON,
    Table,
    func,
    select,
    delete,
)
from sqlalchemy.orm import sessionmaker, Session, relationship, declarative_base
from sqlalchemy.pool import StaticPool


# Create a test-specific Base for SQLite-compatible models
TestBase = declarative_base()


# =============================================================================
# Test-specific models (SQLite-compatible versions of production models)
# =============================================================================

# User-role association table
user_roles = Table(
    "user_roles",
    TestBase.metadata,
    Column("user_id", Integer, ForeignKey("users.id")),
    Column("role_id", Integer, ForeignKey("roles.id")),
)

# Group membership association table
group_members = Table(
    "group_members",
    TestBase.metadata,
    Column("group_id", Integer, ForeignKey("groups.id")),
    Column("user_id", Integer, ForeignKey("users.id")),
    Column("joined_at", DateTime, default=func.current_timestamp()),
)


class User(TestBase):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(255))
    last_name = Column(String(255))
    email = Column(String(255), unique=True, index=True)
    username = Column(String(255), unique=True, index=True)
    is_active = Column(Boolean, default=True)
    viewed_tutorial = Column(Boolean, default=False, nullable=False)
    user_metadata = Column(JSON)

    created_collections = relationship(
        "DocumentCollection",
        foreign_keys="DocumentCollection.created_by_id",
        back_populates="created_by",
    )
    modified_collections = relationship(
        "DocumentCollection",
        foreign_keys="DocumentCollection.modified_by_id",
        back_populates="modified_by",
    )
    owned_collections = relationship(
        "DocumentCollection",
        foreign_keys="DocumentCollection.owner_id",
        back_populates="owner",
    )
    owned_documents = relationship(
        "Document", foreign_keys="Document.owner_id", back_populates="owner"
    )
    roles = relationship("Role", secondary=user_roles, back_populates="users")
    groups = relationship("Group", secondary=group_members, back_populates="members")
    password_auth = relationship("UserPassword", back_populates="user", uselist=False)


class UserPassword(TestBase):
    __tablename__ = "user_passwords"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=func.current_timestamp())
    updated_at = Column(DateTime, default=func.current_timestamp(), onupdate=func.current_timestamp())

    # Relationships
    user = relationship("User", back_populates="password_auth")


class Role(TestBase):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True)
    description = Column(String(255))

    users = relationship("User", secondary=user_roles, back_populates="roles")


class Group(TestBase):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    description = Column(String(255))
    created_at = Column(DateTime, default=func.current_timestamp())
    created_by_id = Column(Integer, ForeignKey("users.id"))
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)

    # Relationships
    members = relationship("User", secondary=group_members, back_populates="groups")
    created_by = relationship("User", foreign_keys=[created_by_id])


class CASConfiguration(TestBase):
    __tablename__ = "cas_configuration"

    id = Column(Integer, primary_key=True, index=True)
    enabled = Column(Boolean, default=False)

    # Core CAS settings
    server_url = Column(String(255), nullable=False)
    validation_endpoint = Column(String(100), default="/serviceValidate")
    protocol_version = Column(String(10), default="2.0")

    # XML parsing configuration
    xml_namespace = Column(String(255), default="http://www.yale.edu/tp/cas")

    # Attribute mapping (using JSON for SQLite compatibility)
    attribute_mapping = Column(
        JSON,
        default={
            "username": "netid",
            "email": "email",
            "first_name": "givenName",
            "last_name": "sn",
            "full_name": "name",
        },
    )

    # Username extraction patterns (try in order)
    username_patterns = Column(
        JSON,
        default=[
            '<cas:attribute name="{attr}" value="([^"]+)"',
            "<cas:{attr}>([^<]+)</cas:{attr}>",
            "<cas:user>([^<]+)</cas:user>",
        ],
    )

    # Additional metadata fields to extract
    metadata_attributes = Column(JSON, default=["uid", "netid", "did", "affil"])

    # Email handling
    email_domain = Column(String(255), nullable=True)
    email_format = Column(String(50), default="from_cas")


class DocumentCollection(TestBase):
    __tablename__ = "document_collections"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255))
    visibility = Column(String(50))
    text_direction = Column(String(50))
    created = Column(DateTime, default=func.current_timestamp())
    modified = Column(DateTime, default=func.current_timestamp(), onupdate=func.current_timestamp())
    created_by_id = Column(Integer, ForeignKey("users.id"))
    modified_by_id = Column(Integer, ForeignKey("users.id"))
    owner_id = Column(Integer, ForeignKey("users.id"))
    language = Column(String(50))
    hierarchy = Column(JSON)
    collection_metadata = Column(JSON)

    created_by = relationship("User", foreign_keys=[created_by_id], back_populates="created_collections")
    modified_by = relationship("User", foreign_keys=[modified_by_id], back_populates="modified_collections")
    owner = relationship("User", foreign_keys=[owner_id], back_populates="owned_collections")
    documents = relationship("Document", back_populates="collection", cascade="all, delete-orphan")


class Document(TestBase):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    document_collection_id = Column(Integer, ForeignKey("document_collections.id"))
    owner_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String(255))
    description = Column(Text)
    created = Column(DateTime, default=func.current_timestamp())
    modified = Column(DateTime, default=func.current_timestamp(), onupdate=func.current_timestamp())

    collection = relationship("DocumentCollection", back_populates="documents")
    owner = relationship("User", foreign_keys=[owner_id], back_populates="owned_documents")
    elements = relationship("DocumentElement", back_populates="document", cascade="all, delete-orphan")


class DocumentElement(TestBase):
    __tablename__ = "document_elements"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"))
    created = Column(DateTime, default=func.current_timestamp())
    modified = Column(DateTime, default=func.current_timestamp(), onupdate=func.current_timestamp())
    hierarchy = Column(JSON)
    content = Column(JSON)

    document = relationship("Document", back_populates="elements")


class Annotation(TestBase):
    __tablename__ = "annotations"

    id = Column(Integer, primary_key=True, index=True)
    document_collection_id = Column(Integer, ForeignKey("document_collections.id"))
    document_id = Column(Integer, ForeignKey("documents.id"))
    document_element_id = Column(Integer, ForeignKey("document_elements.id"))
    creator_id = Column(Integer, ForeignKey("users.id"))
    owner_id = Column(Integer, ForeignKey("users.id"))
    classroom_id = Column(Integer, ForeignKey("groups.id"), nullable=True)

    type = Column(String(100))
    created = Column(DateTime)
    modified = Column(DateTime)
    generator = Column(String(255))
    generated = Column(DateTime)
    motivation = Column(String(100))
    body = Column(JSON)
    target = Column(JSON)
    
    status = Column(String(50))
    annotation_type = Column(String(100))
    context = Column(String(255))

    # Relationships
    creator = relationship("User", foreign_keys=[creator_id])
    owner = relationship("User", foreign_keys=[owner_id])


class SiteSettings(TestBase):
    __tablename__ = "site_settings"

    id = Column(Integer, primary_key=True, index=True)
    site_title = Column(String(50), nullable=False, default="Site Title")
    site_logo_enabled = Column(Boolean, nullable=False, default=False)
    updated_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    updated_at = Column(DateTime, default=func.current_timestamp(), onupdate=func.current_timestamp())

    # Logo and favicon storage
    site_logo_data = Column(Text, nullable=True)
    site_logo_mime_type = Column(String(50), nullable=True)
    site_favicon_data = Column(Text, nullable=True)
    site_favicon_mime_type = Column(String(50), nullable=True)

    # Relationships
    updated_by = relationship("User")


# =============================================================================
# Database engine and session setup
# =============================================================================

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)


@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session() -> Generator[Session, None, None]:
    """
    Create a fresh database session for each test.
    """
    TestBase.metadata.create_all(bind=engine)
    
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        TestBase.metadata.drop_all(bind=engine)


# =============================================================================
# Data Fixtures
# =============================================================================
# These fixtures return single instances of test objects.
# For creating multiple instances with custom parameters, use the helper
# functions at the bottom of this file (create_annotation, create_document, etc.)

@pytest.fixture
def sample_user(db_session: Session) -> User:
    """Create a sample user for testing."""
    user = User(
        first_name="Test",
        last_name="User",
        email="test@example.com",
        username="testuser",
        is_active=True,
        viewed_tutorial=False,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def admin_role(db_session: Session) -> Role:
    """Create an admin role for testing."""
    role = Role(
        name="admin",
        description="Administrator role with full permissions"
    )
    db_session.add(role)
    db_session.commit()
    db_session.refresh(role)
    return role


@pytest.fixture
def editor_role(db_session: Session) -> Role:
    """Create an editor role for testing."""
    role = Role(
        name="editor",
        description="Editor role with content modification permissions"
    )
    db_session.add(role)
    db_session.commit()
    db_session.refresh(role)
    return role


@pytest.fixture
def viewer_role(db_session: Session) -> Role:
    """Create a viewer role for testing."""
    role = Role(
        name="viewer",
        description="Viewer role with read-only permissions"
    )
    db_session.add(role)
    db_session.commit()
    db_session.refresh(role)
    return role


@pytest.fixture
def sample_roles(admin_role: Role, editor_role: Role, viewer_role: Role) -> list[Role]:
    """Create a list of sample roles for testing."""
    return [admin_role, editor_role, viewer_role]


@pytest.fixture
def user_with_admin_role(db_session: Session, admin_role: Role) -> User:
    """Create a user with admin role for testing."""
    user = User(
        first_name="Admin",
        last_name="User",
        email="admin@example.com",
        username="adminuser",
        is_active=True,
        viewed_tutorial=False,
    )
    user.roles.append(admin_role)
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def user_with_multiple_roles(db_session: Session, admin_role: Role, editor_role: Role) -> User:
    """Create a user with multiple roles for testing."""
    user = User(
        first_name="Multi",
        last_name="Role",
        email="multirole@example.com",
        username="multiroleuser",
        is_active=True,
        viewed_tutorial=False,
    )
    user.roles.extend([admin_role, editor_role])
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def sample_collection(db_session: Session, sample_user: User) -> DocumentCollection:
    """Create a sample document collection for testing."""
    collection = DocumentCollection(
        title="Test Collection",
        visibility="public",
        text_direction="ltr",
        created_by_id=sample_user.id,
        owner_id=sample_user.id,
        language="en",
    )
    db_session.add(collection)
    db_session.commit()
    db_session.refresh(collection)
    return collection


@pytest.fixture
def sample_document(db_session: Session, sample_collection: DocumentCollection) -> Document:
    """Create a sample document for testing."""
    document = Document(
        title="Test Document",
        description="A test document description",
        document_collection_id=sample_collection.id,
        created=datetime.now(),
        modified=datetime.now(),
    )
    db_session.add(document)
    db_session.commit()
    db_session.refresh(document)
    return document


@pytest.fixture
def sample_document_with_elements(
    db_session: Session, 
    sample_collection: DocumentCollection
) -> Document:
    """Create a sample document with document elements for testing."""
    document = Document(
        title="Document With Elements",
        description="A document with elements",
        document_collection_id=sample_collection.id,
        created=datetime.now(),
        modified=datetime.now(),
    )
    db_session.add(document)
    db_session.flush()
    
    for i in range(3):
        element = DocumentElement(
            document_id=document.id,
            content={"text": f"Paragraph {i + 1} content", "type": "paragraph"},
            hierarchy={"element_order": str(i)},
            created=datetime.now(),
            modified=datetime.now(),
        )
        db_session.add(element)
    
    db_session.commit()
    db_session.refresh(document)
    return document


@pytest.fixture
def multiple_documents(
    db_session: Session, 
    sample_collection: DocumentCollection
) -> list[Document]:
    """Create multiple documents for bulk operation testing."""
    documents = []
    for i in range(5):
        doc = Document(
            title=f"Test Document {i + 1}",
            description=f"Description for document {i + 1}",
            document_collection_id=sample_collection.id,
            created=datetime.now(),
            modified=datetime.now(),
        )
        db_session.add(doc)
        documents.append(doc)
    
    db_session.commit()
    for doc in documents:
        db_session.refresh(doc)
    
    return documents


@pytest.fixture
def sample_group(db_session: Session, sample_user: User) -> Group:
    """Create a sample group/classroom for testing."""
    from datetime import date, timedelta
    
    group = Group(
        name="Test Classroom",
        description="A test classroom for testing",
        created_at=datetime.now(),
        created_by_id=sample_user.id,
        start_date=date.today(),
        end_date=date.today() + timedelta(days=90),  # 3 months from now
    )
    db_session.add(group)
    db_session.flush()
    
    # Add creator as a member
    db_session.execute(
        group_members.insert().values(
            group_id=group.id,
            user_id=sample_user.id,
            joined_at=datetime.now()
        )
    )
    
    db_session.commit()
    db_session.refresh(group)
    return group


@pytest.fixture
def expired_group(db_session: Session, sample_user: User) -> Group:
    """Create a group with expired join link (>2 weeks after start)."""
    from datetime import date, timedelta
    
    group = Group(
        name="Expired Join Link Classroom",
        description="Join link has expired",
        created_at=datetime.now(),
        created_by_id=sample_user.id,
        start_date=date.today() - timedelta(days=30),  # Started 30 days ago
        end_date=date.today() + timedelta(days=60),    # Still active, but join expired
    )
    db_session.add(group)
    db_session.flush()
    
    # Add creator as a member
    db_session.execute(
        group_members.insert().values(
            group_id=group.id,
            user_id=sample_user.id,
            joined_at=datetime.now()
        )
    )
    
    db_session.commit()
    db_session.refresh(group)
    return group


@pytest.fixture
def ended_group(db_session: Session, sample_user: User) -> Group:
    """Create a group that has ended."""
    from datetime import date, timedelta
    
    group = Group(
        name="Ended Classroom",
        description="This classroom has ended",
        created_at=datetime.now(),
        created_by_id=sample_user.id,
        start_date=date.today() - timedelta(days=100),
        end_date=date.today() - timedelta(days=10),  # Ended 10 days ago
    )
    db_session.add(group)
    db_session.flush()
    
    # Add creator as a member
    db_session.execute(
        group_members.insert().values(
            group_id=group.id,
            user_id=sample_user.id,
            joined_at=datetime.now()
        )
    )
    
    db_session.commit()
    db_session.refresh(group)
    return group


@pytest.fixture
def group_with_members(db_session: Session, sample_group: Group) -> Group:
    """Create a group with multiple members."""
    # Create additional users
    users = []
    for i in range(3):
        user = User(
            first_name=f"Member{i+1}",
            last_name=f"Test{i+1}",
            email=f"member{i+1}@example.com",
            username=f"member{i+1}",
            is_active=True,
        )
        db_session.add(user)
        users.append(user)
    
    db_session.flush()
    
    # Add users as members
    for user in users:
        db_session.execute(
            group_members.insert().values(
                group_id=sample_group.id,
                user_id=user.id,
                joined_at=datetime.now()
            )
        )
    
    db_session.commit()
    db_session.refresh(sample_group)
    return sample_group


@pytest.fixture
def sample_annotation(db_session: Session, sample_user: User, sample_document: Document) -> Annotation:
    """Create a sample annotation (regular comment) for testing."""
    annotation = Annotation(
        document_collection_id=sample_document.document_collection_id,
        document_id=sample_document.id,
        document_element_id=None,
        creator_id=sample_user.id,
        owner_id=sample_user.id,
        motivation="commenting",
        body={"value": "This is a test comment"},
        target=[{"source": f"Document/{sample_document.id}"}],
        created=datetime.now(),
        modified=datetime.now(),
    )
    db_session.add(annotation)
    db_session.commit()
    db_session.refresh(annotation)
    return annotation


@pytest.fixture
def sample_flag(db_session: Session, sample_user: User, sample_annotation: Annotation) -> Annotation:
    """Create a sample flag annotation pointing to sample_annotation."""
    flag = Annotation(
        document_collection_id=sample_annotation.document_collection_id,
        document_id=sample_annotation.document_id,
        document_element_id=sample_annotation.document_element_id,
        creator_id=sample_user.id,
        owner_id=sample_user.id,
        motivation="flagging",
        body={"value": "Inappropriate content"},
        target=[{"source": f"Annotation/{sample_annotation.id}"}],
        created=datetime.now(),
        modified=datetime.now(),
    )
    db_session.add(flag)
    db_session.commit()
    db_session.refresh(flag)
    return flag


@pytest.fixture
def annotation_with_multiple_flags(
    db_session: Session, 
    sample_annotation: Annotation,
    sample_user: User
) -> tuple[Annotation, list[Annotation]]:
    """Create an annotation with multiple flags from different users."""
    flags = []
    
    # Create 3 additional users who will flag the annotation
    for i in range(3):
        user = User(
            first_name=f"Flagger{i+1}",
            last_name="User",
            email=f"flagger{i+1}@example.com",
            username=f"flagger{i+1}",
            is_active=True,
        )
        db_session.add(user)
        db_session.flush()
        
        # Create flag from this user
        flag = Annotation(
            document_collection_id=sample_annotation.document_collection_id,
            document_id=sample_annotation.document_id,
            document_element_id=sample_annotation.document_element_id,
            creator_id=user.id,
            owner_id=user.id,
            motivation="flagging",
            body={"value": f"Flag reason {i+1}"},
            target=[{"source": f"Annotation/{sample_annotation.id}"}],
            created=datetime.now(),
            modified=datetime.now(),
        )
        db_session.add(flag)
        flags.append(flag)
    
    db_session.commit()
    for flag in flags:
        db_session.refresh(flag)
    
    return sample_annotation, flags


@pytest.fixture
def sample_site_settings(db_session: Session, sample_admin: User) -> SiteSettings:
    """Create a sample site settings entry."""
    return create_site_settings(
        db_session=db_session,
        updated_by_id=sample_admin.id,
        site_title="Genji Test Site",
    )


# =============================================================================
# Helper Functions
# =============================================================================


def create_annotation(
    db_session: Session,
    creator_id: int,
    document_collection_id: int = None,
    document_id: int = None,
    document_element_id: int = None,
    motivation: str = "commenting",
    body: dict = None,
    target: list = None,
    classroom_id: int = None,
) -> Annotation:
    """Helper function to create an annotation."""
    annotation = Annotation(
        document_collection_id=document_collection_id,
        document_id=document_id,
        document_element_id=document_element_id,
        creator_id=creator_id,
        owner_id=creator_id,
        motivation=motivation,
        body=body or {"value": "Test annotation"},
        target=target or [{"source": "Document/1"}],
        classroom_id=classroom_id,
        created=datetime.now(),
        modified=datetime.now(),
    )
    db_session.add(annotation)
    db_session.commit()
    db_session.refresh(annotation)
    return annotation


def create_flag(
    db_session: Session,
    creator_id: int,
    flagged_annotation_id: int,
    reason: str = "Inappropriate content",
    classroom_id: int = None,
) -> Annotation:
    """Helper function to create a flag annotation pointing to another annotation."""
    flag = Annotation(
        creator_id=creator_id,
        owner_id=creator_id,
        motivation="flagging",
        body={"value": reason},
        target=[{"source": f"Annotation/{flagged_annotation_id}"}],
        classroom_id=classroom_id,
        created=datetime.now(),
        modified=datetime.now(),
    )
    db_session.add(flag)
    db_session.commit()
    db_session.refresh(flag)
    return flag


def create_document(
    db_session: Session,
    collection_id: int,
    title: str = "Test Document",
    description: str = "Test description",
) -> Document:
    """Helper function to create a document."""
    document = Document(
        title=title,
        description=description,
        document_collection_id=collection_id,
        created=datetime.now(),
        modified=datetime.now(),
    )
    db_session.add(document)
    db_session.commit()
    db_session.refresh(document)
    return document


def create_document_element(
    db_session: Session,
    document_id: int,
    content: dict = None,
    hierarchy: dict = None,
) -> DocumentElement:
    """Helper function to create a document element."""
    element = DocumentElement(
        document_id=document_id,
        content=content or {"text": "Sample content", "type": "paragraph"},
        hierarchy=hierarchy or {"element_order": "0"},
        created=datetime.now(),
        modified=datetime.now(),
    )
    db_session.add(element)
    db_session.commit()
    db_session.refresh(element)
    return element


def create_site_settings(
    db_session: Session,
    updated_by_id: int,
    site_title: str = "Test Site",
    site_logo_enabled: bool = False,
    site_logo_data: str = None,
    site_logo_mime_type: str = None,
    site_favicon_data: str = None,
    site_favicon_mime_type: str = None,
) -> SiteSettings:
    """Helper function to create site settings."""
    settings = SiteSettings(
        site_title=site_title,
        site_logo_enabled=site_logo_enabled,
        updated_by_id=updated_by_id,
        site_logo_data=site_logo_data,
        site_logo_mime_type=site_logo_mime_type,
        site_favicon_data=site_favicon_data,
        site_favicon_mime_type=site_favicon_mime_type,
    )
    db_session.add(settings)
    db_session.commit()
    db_session.refresh(settings)
    return settings


def create_user_password(
    db_session: Session,
    user_id: int,
    hashed_password: str
) -> UserPassword:
    """Helper function to create a password for a user."""
    user_password = UserPassword(
        user_id=user_id,
        hashed_password=hashed_password
    )
    db_session.add(user_password)
    db_session.commit()
    db_session.refresh(user_password)
    return user_password


def create_cas_configuration(
    db_session: Session,
    enabled: bool = True,
    server_url: str = "https://login.dartmouth.edu/cas",
    validation_endpoint: str = "/serviceValidate",
    xml_namespace: str = "http://www.yale.edu/tp/cas",
    email_format: str = "from_cas",
    email_domain: str = None,
    attribute_mapping: dict = None,
    username_patterns: list = None,
    metadata_attributes: list = None,
) -> CASConfiguration:
    """Helper function to create a CAS configuration."""
    if attribute_mapping is None:
        attribute_mapping = {
            "username": "netid",
            "email": "email",
            "first_name": "givenName",
            "last_name": "sn",
            "full_name": "name",
        }
    
    if username_patterns is None:
        username_patterns = [
            '<cas:attribute name="{attr}" value="([^"]+)"',
            "<cas:{attr}>([^<]+)</cas:{attr}>",
            "<cas:user>([^<]+)</cas:user>",
        ]
    
    if metadata_attributes is None:
        metadata_attributes = ["uid", "netid", "did", "affil"]
    
    config = CASConfiguration(
        enabled=enabled,
        server_url=server_url,
        validation_endpoint=validation_endpoint,
        xml_namespace=xml_namespace,
        email_format=email_format,
        email_domain=email_domain,
        attribute_mapping=attribute_mapping,
        username_patterns=username_patterns,
        metadata_attributes=metadata_attributes,
    )
    db_session.add(config)
    db_session.commit()
    db_session.refresh(config)
    return config


def create_annotation_body(
    body_id: int = 1,
    value: str = "Test annotation text",
    body_type: str = "TextualBody",
    format: str = "text/html",
) -> dict:
    """Helper function to create an annotation body structure."""
    return {
        "id": body_id,
        "type": body_type,
        "value": value,
        "format": format,
    }


def create_annotation_target(
    target_id: int = 1,
    element_id: int = 1,
    start: int = 0,
    end: int = 10,
    text: str = "selected text",
) -> dict:
    """Helper function to create an annotation target structure."""
    return {
        "id": target_id,
        "type": "SpecificResource",
        "source": f"DocumentElements/{element_id}",
        "selector": {
            "type": "TextQuoteSelector",
            "value": text,
            "refined_by": {
                "type": "TextPositionSelector",
                "start": start,
                "end": end,
            },
        },
    }


def create_full_annotation(
    db_session: Session,
    creator_id: int,
    document_collection_id: int,
    document_id: int,
    document_element_id: int,
    motivation: str = "commenting",
    body_value: str = "Test comment",
    target_element_ids: list = None,
    classroom_id: int = None,
) -> Annotation:
    """Helper function to create a complete annotation with proper structure."""
    if target_element_ids is None:
        target_element_ids = [document_element_id] if document_element_id else []
    
    body = create_annotation_body(body_id=1, value=body_value)
    
    targets = [
        create_annotation_target(
            target_id=i + 1,
            element_id=elem_id,
            start=0,
            end=len(body_value),
            text=body_value[:20] if len(body_value) > 20 else body_value,
        )
        for i, elem_id in enumerate(target_element_ids)
    ]
    
    annotation = Annotation(
        document_collection_id=document_collection_id,
        document_id=document_id,
        document_element_id=document_element_id,
        creator_id=creator_id,
        owner_id=creator_id,
        classroom_id=classroom_id,
        type="Annotation",
        motivation=motivation,
        body=body,
        target=targets,
        status="active",
        annotation_type="standard",
        created=datetime.now(),
        modified=datetime.now(),
        generated=datetime.now(),
        generator="Genji Test Suite",
    )
    db_session.add(annotation)
    db_session.commit()
    db_session.refresh(annotation)
    return annotation
