# tests/conftest.py
import os
import sys

# Add project root to Python path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

# Set test environment variables
os.environ.setdefault("DB_SCHEMA", "test_schema")

import pytest
from datetime import datetime
from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    Text,
    ForeignKey,
    DateTime,
    Boolean,
    JSON,
    Table,
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker, Session
from sqlalchemy.pool import StaticPool


# ==================== Test-Specific Base and Models ====================

TestBase = declarative_base()

# Association table for group members (no schema)
test_group_members = Table(
    "group_members",
    TestBase.metadata,
    Column("group_id", Integer, ForeignKey("groups.id")),
    Column("user_id", Integer, ForeignKey("users.id")),
)


class TestUser(TestBase):
    """Test-specific User model without PostgreSQL-specific features."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(255))
    last_name = Column(String(255))
    email = Column(String(255), unique=True, index=True)
    username = Column(String(255), unique=True, index=True)
    is_active = Column(Boolean, default=True)
    viewed_tutorial = Column(Boolean, default=False)
    user_metadata = Column(JSON)

    # Relationships
    annotations = relationship(
        "TestAnnotation",
        foreign_keys="TestAnnotation.creator_id",
        back_populates="creator"
    )
    groups = relationship(
        "TestGroup",
        secondary=test_group_members,
        back_populates="members"
    )


class TestGroup(TestBase):
    """Test-specific Group model without PostgreSQL-specific features."""
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    description = Column(String(255))
    created_at = Column(DateTime, default=datetime.now)
    created_by_id = Column(Integer, ForeignKey("users.id"))

    # Relationships
    members = relationship(
        "TestUser",
        secondary=test_group_members,
        back_populates="groups"
    )
    created_by = relationship("TestUser", foreign_keys=[created_by_id])


class TestAnnotation(TestBase):
    """Test-specific Annotation model without PostgreSQL-specific features."""
    __tablename__ = "annotations"

    id = Column(Integer, primary_key=True, index=True)
    document_collection_id = Column(Integer)
    document_id = Column(Integer)
    document_element_id = Column(Integer)
    creator_id = Column(Integer, ForeignKey("users.id"))
    owner_id = Column(Integer, ForeignKey("users.id"))
    classroom_id = Column(Integer, ForeignKey("groups.id"), nullable=True)

    type = Column(String(100))
    created = Column(DateTime)
    modified = Column(DateTime)
    generator = Column(String(255))
    generated = Column(DateTime)
    motivation = Column(String(100))

    body = Column(JSON)  # JSON instead of JSONB
    target = Column(JSON)  # JSON instead of JSONB

    status = Column(String(50))
    annotation_type = Column(String(100))
    context = Column(String(255))

    # Relationships
    creator = relationship(
        "TestUser",
        foreign_keys=[creator_id],
        back_populates="annotations"
    )
    classroom = relationship("TestGroup", foreign_keys=[classroom_id])


# ==================== Database Fixtures ====================

@pytest.fixture(scope="function")
def engine():
    """Create an in-memory SQLite engine for each test."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    return engine


@pytest.fixture(scope="function")
def tables(engine):
    """Create all tables before each test, drop after."""
    TestBase.metadata.create_all(bind=engine)
    yield
    TestBase.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db_session(engine, tables) -> Session:
    """Create a new database session for each test."""
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()
    
    yield session
    
    session.rollback()
    session.close()


# ==================== Model Alias Fixtures ====================

@pytest.fixture
def User():
    """Provide TestUser as User for tests."""
    return TestUser


@pytest.fixture
def Group():
    """Provide TestGroup as Group for tests."""
    return TestGroup


@pytest.fixture
def AnnotationModel():
    """Provide TestAnnotation as AnnotationModel for tests."""
    return TestAnnotation


# ==================== User Fixtures ====================

@pytest.fixture
def test_user(db_session) -> TestUser:
    """Create a regular test user in the database."""
    user = TestUser(
        id=1,
        first_name="Test",
        last_name="User",
        email="test@example.com",
        username="testuser",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    
    # Add roles attribute for permission checks (not a DB column)
    user.roles = ["user"]
    return user


@pytest.fixture
def admin_user(db_session) -> TestUser:
    """Create an admin test user in the database."""
    user = TestUser(
        id=2,
        first_name="Admin",
        last_name="User",
        email="admin@example.com",
        username="adminuser",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    
    user.roles = ["admin", "user"]
    return user


@pytest.fixture
def verified_scholar_user(db_session) -> TestUser:
    """Create a verified scholar user in the database."""
    user = TestUser(
        id=3,
        first_name="Scholar",
        last_name="User",
        email="scholar@example.com",
        username="scholaruser",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    
    user.roles = ["verified_scholar", "user"]
    return user


# ==================== Classroom/Group Fixtures ====================

@pytest.fixture
def test_classroom(db_session, test_user) -> TestGroup:
    """Create a test classroom with the test user as a member."""
    classroom = TestGroup(
        id=1,
        name="Test Classroom",
        description="A test classroom",
        created_by_id=test_user.id,
    )
    db_session.add(classroom)
    db_session.commit()
    db_session.refresh(classroom)
    
    classroom.members.append(test_user)
    db_session.commit()
    
    return classroom


# ==================== Annotation Data Fixtures ====================

@pytest.fixture
def valid_body_data():
    """Valid body data matching the Pydantic Body schema."""
    return {
        "id": 1,
        "type": "TextualBody",
        "value": "This is a test annotation",
        "format": "text/plain",
        "language": "en"
    }


@pytest.fixture
def valid_text_target_data():
    """Valid text target with selector matching TextTarget schema."""
    return {
        "id": 1,
        "type": "TextTarget",
        "source": "document/element/1",
        "selector": {
            "type": "TextQuoteSelector",
            "value": "selected text",
            "refined_by": {
                "type": "TextPositionSelector",
                "start": 0,
                "end": 13
            }
        }
    }


@pytest.fixture
def valid_object_target_data():
    """Valid object target without selector matching ObjectTarget schema."""
    return {
        "id": 2,
        "type": "ObjectTarget",
        "source": "image/1"
    }


@pytest.fixture
def valid_annotation_create_data(valid_body_data, valid_text_target_data):
    """Valid annotation creation data matching AnnotationCreate schema."""
    return {
        "context": "http://www.w3.org/ns/anno.jsonld",
        "document_collection_id": 1,
        "document_id": 1,
        "document_element_id": 1,
        "creator_id": 1,
        "type": "Annotation",
        "motivation": "commenting",
        "generator": "test-app",
        "body": valid_body_data,
        "target": [valid_text_target_data]
    }


# ==================== Database Annotation Fixtures ====================

@pytest.fixture
def test_annotation(
    db_session, 
    test_user, 
    valid_body_data, 
    valid_text_target_data
) -> TestAnnotation:
    """Create a test annotation in the database."""
    annotation = TestAnnotation(
        id=1,
        context="http://www.w3.org/ns/anno.jsonld",
        document_collection_id=1,
        document_id=1,
        document_element_id=1,
        creator_id=test_user.id,
        classroom_id=None,
        type="Annotation",
        motivation="commenting",
        generator="test-app",
        generated=datetime.now(),
        body=valid_body_data,
        target=[valid_text_target_data],
        status="active",
        annotation_type="comment",
        created=datetime.now(),
        modified=datetime.now(),
    )
    db_session.add(annotation)
    db_session.commit()
    db_session.refresh(annotation)
    return annotation


@pytest.fixture
def test_annotation_with_classroom(
    db_session, 
    test_user, 
    test_classroom,
    valid_body_data, 
    valid_text_target_data
) -> TestAnnotation:
    """Create a test annotation associated with a classroom."""
    annotation = TestAnnotation(
        id=2,
        context="http://www.w3.org/ns/anno.jsonld",
        document_collection_id=1,
        document_id=1,
        document_element_id=1,
        creator_id=test_user.id,
        classroom_id=test_classroom.id,
        type="Annotation",
        motivation="commenting",
        generator="test-app",
        generated=datetime.now(),
        body=valid_body_data,
        target=[valid_text_target_data],
        status="active",
        annotation_type="comment",
        created=datetime.now(),
        modified=datetime.now(),
    )
    db_session.add(annotation)
    db_session.commit()
    db_session.refresh(annotation)
    return annotation


@pytest.fixture
def multiple_test_annotations(
    db_session, 
    test_user,
    valid_body_data,
    valid_text_target_data
) -> list[TestAnnotation]:
    """Create multiple test annotations for pagination and filtering tests."""
    annotations = []
    
    for i in range(5):
        body_data = valid_body_data.copy()
        body_data["id"] = i + 10
        body_data["value"] = f"Test annotation {i}"
        
        target_data = valid_text_target_data.copy()
        target_data["id"] = i + 10
        
        annotation = TestAnnotation(
            id=i + 10,
            context="http://www.w3.org/ns/anno.jsonld",
            document_collection_id=1,
            document_id=1,
            document_element_id=i + 1,
            creator_id=test_user.id,
            classroom_id=None,
            type="Annotation",
            motivation="commenting" if i % 2 == 0 else "highlighting",
            generator="test-app",
            generated=datetime.now(),
            body=body_data,
            target=[target_data],
            status="active",
            annotation_type="comment",
            created=datetime.now(),
            modified=datetime.now(),
        )
        db_session.add(annotation)
        annotations.append(annotation)
    
    db_session.commit()
    for ann in annotations:
        db_session.refresh(ann)
    
    return annotations


@pytest.fixture
def annotation_with_multiple_targets(
    db_session,
    test_user,
    valid_body_data,
    valid_text_target_data,
    valid_object_target_data
) -> TestAnnotation:
    """Create an annotation with multiple targets for target operation tests."""
    annotation = TestAnnotation(
        id=100,
        context="http://www.w3.org/ns/anno.jsonld",
        document_collection_id=1,
        document_id=1,
        document_element_id=1,
        creator_id=test_user.id,
        classroom_id=None,
        type="Annotation",
        motivation="linking",
        generator="test-app",
        generated=datetime.now(),
        body=valid_body_data,
        target=[valid_text_target_data, valid_object_target_data],
        status="active",
        annotation_type="link",
        created=datetime.now(),
        modified=datetime.now(),
    )
    db_session.add(annotation)
    db_session.commit()
    db_session.refresh(annotation)
    return annotation


@pytest.fixture
def annotation_with_nested_targets(
    db_session,
    test_user,
    valid_body_data
) -> TestAnnotation:
    """Create an annotation with nested target arrays."""
    nested_targets = [
        [
            {
                "id": 201,
                "type": "TextTarget",
                "source": "doc/1",
                "selector": None
            },
            {
                "id": 202,
                "type": "TextTarget",
                "source": "doc/2",
                "selector": None
            }
        ]
    ]
    
    annotation = TestAnnotation(
        id=200,
        context="http://www.w3.org/ns/anno.jsonld",
        document_collection_id=1,
        document_id=1,
        document_element_id=1,
        creator_id=test_user.id,
        classroom_id=None,
        type="Annotation",
        motivation="linking",
        generator="test-app",
        generated=datetime.now(),
        body=valid_body_data,
        target=nested_targets,
        status="active",
        annotation_type="link",
        created=datetime.now(),
        modified=datetime.now(),
    )
    db_session.add(annotation)
    db_session.commit()
    db_session.refresh(annotation)
    return annotation


# ==================== Service Fixtures ====================

@pytest.fixture
def annotation_service():
    """Create AnnotationService instance for testing."""
    from services.annotation_service import AnnotationService
    return AnnotationService()