# Annotation API Tests

This directory contains unit and integration tests for the Annotation API.

---

## Test Environment Setup

### Prerequisites

- Python 3.12+
- Virtual environment (recommended)

### Installation

1. Create and activate a virtual environment
2. Install test dependencies: `pip install -r tests/requirements.txt`

### Test Dependencies

| Package | Purpose |
|---------|---------|
| pytest | Test framework |
| pytest-cov | Code coverage reporting |
| pytest-mock | Mocking utilities |
| pytest-dotenv | Environment variable management |

---

## Project Structure

    tests/
    ├── README.md                           # This file
    ├── pytest.ini                          # Pytest configuration
    ├── requirements.txt                    # Test dependencies
    ├── conftest.py                         # Shared fixtures
    ├── unit/
    │   ├── __init__.py
    │   ├── test_annotation_schemas.py      # Pydantic schema validation tests
    │   └── test_annotation_service.py      # Service layer tests
    └── integration/
        ├── __init__.py
        └── test_annotation_endpoints.py    # API endpoint tests

---

## Running Tests

All commands should be run from the tests/ directory.

| Command | Description |
|---------|-------------|
| `pytest` | Run all tests |
| `pytest -v` | Run with verbose output |
| `pytest unit/` | Run only unit tests |
| `pytest integration/` | Run only integration tests |
| `pytest unit/test_annotation_schemas.py` | Run specific test file |
| `pytest unit/test_annotation_schemas.py::TestBody` | Run specific test class |
| `pytest --cov=../schemas --cov=../services --cov-report=html` | Run with coverage report |

---

## Testing Strategy

### Why We Use Different Approaches for Different Test Types

Our test suite uses a deliberate strategy based on what each test type validates:

### Unit Tests - Schemas (No Database)

Schema tests validate Pydantic models directly without any database interaction. These tests ensure that:
- Required fields are enforced
- Optional fields have correct defaults
- Data types are validated correctly
- Nested objects are properly structured

### Unit Tests - Service (Mocks)

Service tests use mocks instead of a real database because the production models use PostgreSQL-specific features that SQLite cannot handle:
- Schema names (`schema="app"`)
- JSONB columns for body and target fields
- PostgreSQL sequences for ID generation
- GIN indices for JSONB fields

Mocking allows us to test service logic in isolation without requiring a PostgreSQL database.

### Integration Tests - Endpoints (Mocks)

Integration tests use mocks for the service layer because:
1. The HTTP layer (routing, serialization, dependency injection) is what we're testing
2. Service logic is already covered by unit tests
3. Avoids database connection issues in CI/CD pipelines
4. Tests run quickly without external dependencies

### End-to-End Tests (Future)

For full system testing with a real PostgreSQL database, end-to-end tests can be added that require:
- A PostgreSQL test database (Docker or local)
- Test fixtures that create the `app` schema
- Database cleanup between tests

---

## Test Coverage

### Schema Tests (test_annotation_schemas.py) - 58 Tests

Tests for Pydantic schema validation defined in schemas/annotations.py.

| Test Class | Description | Tests |
|------------|-------------|-------|
| TestTextPositionSelector | Validates start/end position fields | 5 |
| TestTextQuoteSelector | Validates quote value and refined_by | 5 |
| TestBody | Validates annotation body (type, value, format, language) | 9 |
| TestTextTarget | Validates text targets with optional selectors | 7 |
| TestObjectTarget | Validates object targets | 6 |
| TestAnnotationCreate | Validates annotation creation payloads | 12 |
| TestAnnotation | Validates annotation response model | 6 |
| TestAnnotationPatch | Validates partial update payloads | 5 |
| TestAnnotationAddTarget | Validates target addition payloads | 5 |

### Service Tests (test_annotation_service.py) - 46 Tests

Tests for the AnnotationService class defined in services/annotation_service.py.

| Test Class | Description | Tests |
|------------|-------------|-------|
| TestAnnotationServiceInit | Service initialization and model binding | 2 |
| TestAnnotationServiceHelpers | Helper methods (_dump_targets serialization) | 3 |
| TestAnnotationServiceIDGeneration | Body and target ID sequence generation | 2 |
| TestAnnotationServiceCreate | Creating annotations with ID generation | 6 |
| TestAnnotationServiceGetById | Retrieving annotations by ID | 3 |
| TestAnnotationServiceList | Listing with filters and pagination | 6 |
| TestAnnotationServiceUpdate | Updating body and motivation fields | 6 |
| TestAnnotationServiceDelete | Deleting annotations | 4 |
| TestAnnotationServiceAddTarget | Adding targets to annotations | 6 |
| TestAnnotationServiceRemoveTarget | Removing targets with permission checks | 8 |

### Integration Tests (test_annotation_endpoints.py) - 30 Tests

Tests for API endpoints defined in routers/annotations.py.

| Test Class | Description | Tests |
|------------|-------------|-------|
| TestCreateAnnotationEndpoint | POST /api/v1/annotations/ | 4 |
| TestListAnnotationsEndpoint | GET /api/v1/annotations/ | 6 |
| TestGetAnnotationByIdEndpoint | GET /api/v1/annotations/{id} | 3 |
| TestUpdateAnnotationEndpoint | PATCH /api/v1/annotations/{id} | 4 |
| TestDeleteAnnotationEndpoint | DELETE /api/v1/annotations/{id} | 3 |
| TestAddTargetEndpoint | PATCH /api/v1/annotations/add-target/{id} | 4 |
| TestRemoveTargetEndpoint | PATCH /api/v1/annotations/remove-target/{id} | 6 |

---

## What Each Test Type Validates

### Schema Tests
- Required fields are enforced
- Optional fields accept None or can be omitted
- Default values are applied correctly
- Nested objects (selectors, targets) are validated
- Union types (TextTarget or ObjectTarget) work correctly
- Nested target arrays are supported for linking annotations

### Service Tests
- Service instantiation and model binding
- ID generation using database sequences
- CRUD operations (Create, Read, Update, Delete)
- Body value updates preserve other body fields
- Motivation updates
- Modified timestamp updates on changes
- Target addition with ID generation
- Target removal with permission checks (creator, admin, verified_scholar)
- Annotation deletion when last target is removed
- 404 errors for not found resources
- 403 errors for permission denied
- Pagination (skip/limit) and filtering (motivation, document_element_id)
- Classroom filtering

### Integration Tests
- HTTP status codes (200, 201, 204, 403, 404, 422)
- Request routing and URL parameters
- Query parameter handling (filters, pagination)
- Request body validation
- Response serialization
- Dependency injection (authentication, database, classroom context)
- Error response formatting

---

## Shared Fixtures

Fixtures defined in conftest.py:

| Fixture | Description |
|---------|-------------|
| annotation_service | AnnotationService instance |
| valid_body_data | Valid body data dictionary |
| valid_text_target_data | Valid text target data dictionary |
| valid_object_target_data | Valid object target data dictionary |
| valid_annotation_create_data | Valid annotation creation data |

---

## Writing New Tests

### Naming Conventions

- Test files: test_*.py
- Test classes: Test*
- Test functions: test_*

### Test Organization

- Unit tests (tests/unit/): Test individual functions and classes in isolation using mocks
- Integration tests (tests/integration/): Test API endpoints with mocked service layer

### Example Unit Test

    class TestMyFeature:
        """Test description."""
        
        def test_something_works(self, annotation_service):
            """Should do something expected."""
            # Arrange
            mock_db = MagicMock()
            
            # Act
            result = annotation_service.some_method(mock_db)
            
            # Assert
            assert result is not None

### Example Integration Test

    class TestMyEndpoint:
        """Test API endpoint."""
        
        def test_endpoint_returns_200(self, client, sample_annotation_response):
            """Should return 200 OK."""
            with patch('routers.module.service.method', return_value=sample_annotation_response):
                response = client.get("/api/v1/endpoint")
            
            assert response.status_code == 200

---

## Continuous Integration

Run tests in CI/CD pipelines:

    cd tests
    pip install -r requirements.txt
    pytest --tb=short --no-header -q

For CI with coverage requirements:

    pytest --cov=../schemas --cov=../services --cov=../routers --cov-fail-under=80

---

## Troubleshooting

### ModuleNotFoundError: No module named 'models'

The project root is added to sys.path in conftest.py. Ensure you are running pytest from the tests/ directory.

### DB_SCHEMA not set

The DB_SCHEMA environment variable is set automatically in conftest.py. To override, create a .env.test file with: DB_SCHEMA=your_schema_name

### Database Connection Errors in Integration Tests

Integration tests mock the database connection to avoid requiring VPN or database access. If you see connection errors, ensure the client fixture properly patches the database engine before importing the app.

### SQLAlchemy Deprecation Warning

The warning about declarative_base() comes from database.py in the main application. Update the import from sqlalchemy.ext.declarative to sqlalchemy.orm.

### pytest-asyncio Warning

If you see a warning about asyncio_default_fixture_loop_scope, ensure your pytest.ini includes: asyncio_default_fixture_loop_scope = function