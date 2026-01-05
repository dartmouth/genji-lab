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


class Role(TestBase):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True)
    description = Column(String(255))

    users = relationship("User", secondary=user_roles, back_populates="roles")


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

    type = Column(String(100))
    created = Column(DateTime)
    modified = Column(DateTime)
    motivation = Column(String(100))
    body = Column(JSON)
    target = Column(JSON)


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


# =============================================================================
# Fixtures
# =============================================================================

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
# Factory Fixtures
# =============================================================================

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


# =============================================================================
# Helper Functions
# =============================================================================

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
