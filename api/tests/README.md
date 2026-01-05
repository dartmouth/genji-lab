# Genji API Test Suite

This document describes the pytest testing framework for the Genji Document Annotation API.

## Quick Start

```bash
# Activate your virtual environment
cd api
.\env\Scripts\activate   # Windows
source env/bin/activate  # Linux/Mac

# Run all tests
python -m pytest

# Run with verbose output
python -m pytest -v

# Run with coverage report
python -m pytest tests/ --cov=tests --cov-report=term-missing
```

## Files Overview

| File | Purpose |
|------|---------|
| `tests/__init__.py` | Package documentation and usage instructions |
| `tests/conftest.py` | Test fixtures, in-memory database setup, SQLite-compatible models |
| `tests/test_users.py` | 38 tests for user and role management operations |
| `tests/test_documents.py` | 38 tests for document operations |
| `tests/test_document_collections.py` | 16 tests for collection operations |
| `tests/test_document_elements.py` | 32 tests for document element operations |
| `tests/test_word_import.py` | 31 tests for Word document import (with mocking) |
| `pytest.ini` | Pytest configuration |

**Total: 155 tests** running in under 4 seconds

## Test Dependencies

These packages are required for testing (included in `requirements.txt`):

```
pytest>=7.4.0
pytest-cov>=4.1.0
```

Install them with:
```bash
pip install pytest pytest-cov
```

---

## Architecture Decisions

### Why In-Memory SQLite Instead of PostgreSQL?

Our production models use PostgreSQL-specific features:
- `JSONB` column types
- Schema-qualified tables (`schema="app"`)

To avoid needing a real database connection during testing, we created **SQLite-compatible test models** in `conftest.py` that mirror our production models but use:
- `JSON` instead of `JSONB`
- No schema qualification

This allows tests to run without any external database.

### Test Approach: Unit Tests

The tests verify the data layer logic directly (CRUD operations, relationships, cascade deletes, etc.) without going through the full HTTP API. This approach:

| Benefit | Description |
|---------|-------------|
| **Fast** | Runs ~117 tests in ~1 second |
| **No Dependencies** | Requires no external services (no PostgreSQL, no Docker) |
| **Isolated** | Each test gets a fresh database (tables recreated per test) |
| **Reliable** | No flaky tests due to network or database issues |

---

## Understanding Test Coverage

### What is Code Coverage?

**Code coverage** measures how much of your code is executed when your tests run. It answers the question: "What percentage of my code is actually being tested?"

### Coverage Metrics

| Metric | Description |
|--------|-------------|
| **Statement Coverage** | What % of code statements (lines) were executed |
| **Branch Coverage** | What % of conditional branches (if/else) were taken |
| **Missing** | Which specific lines were NOT executed during tests |

### Reading a Coverage Report

When you run `pytest --cov=tests --cov-report=term-missing`, you get output like:

```
Name                                 Stmts   Miss  Cover   Missing
------------------------------------------------------------------
tests\__init__.py                        0      0   100%
tests\conftest.py                      147      0   100%
tests\test_document_collections.py      92      0   100%
tests\test_document_elements.py        265      0   100%
tests\test_documents.py                208      0   100%
tests\test_word_import.py              195      0   100%
------------------------------------------------------------------
TOTAL                                  907      0   100%
```

**Column Meanings:**
- **Stmts**: Total number of statements (executable lines) in the file
- **Miss**: Number of statements NOT executed by any test
- **Cover**: Percentage of statements that WERE executed (Stmts - Miss) / Stmts
- **Missing**: Line numbers that were not covered (if any)

### Why Coverage Matters

| Coverage Level | What It Means |
|----------------|---------------|
| **100%** | Every line of code ran during tests (ideal for test files) |
| **80-90%** | Good coverage for production code |
| **< 70%** | May have significant untested code paths |

### Coverage Report Types

```bash
# Terminal report (quick view)
pytest --cov=tests --cov-report=term-missing

# HTML report (detailed, interactive)
pytest --cov=tests --cov-report=html
# Opens htmlcov/index.html in your browser

# XML report (for CI/CD tools like GitHub Actions)
pytest --cov=tests --cov-report=xml
```

### Important Note

High coverage ≠ high quality tests. Coverage tells you what code *ran*, not whether it was *tested correctly*. You still need meaningful assertions!

---

## Running Tests

### Basic Commands

```bash
# Run all tests
python -m pytest

# Run with verbose output (see each test name)
python -m pytest -v

# Run with extra verbose (see test output)
python -m pytest -vv

# Run and stop on first failure
python -m pytest -x

# Run last failed tests only
python -m pytest --lf
```

### Running Specific Tests

```bash
# Run a specific test file
python -m pytest tests/test_documents.py
python -m pytest tests/test_users.py

# Run a specific test class
python -m pytest tests/test_documents.py::TestCreateDocument
python -m pytest tests/test_users.py::TestUserRoleAssignment

# Run a specific test method
python -m pytest tests/test_documents.py::TestCreateDocument::test_create_document_success
python -m pytest tests/test_users.py::TestUserRoleAssignment::test_assign_single_role_to_user

# Run tests matching a keyword
python -m pytest -k "delete"  # Runs all tests with "delete" in the name
python -m pytest -k "role"    # Runs all tests with "role" in the name
```

### Coverage Commands

```bash
# Coverage for test files only
python -m pytest tests/ --cov=tests --cov-report=term-missing

# Generate HTML coverage report (creates tests/htmlcov/ folder)
python -m pytest tests/ --cov=tests --cov-report=html:tests/htmlcov

# Multiple coverage reports at once
python -m pytest tests/ --cov=tests --cov-report=term-missing --cov-report=html:tests/htmlcov
```

---

## What's Tested

### Users & Roles (38 tests)

| Category | Tests |
|----------|-------|
| **Create User** | Success, with metadata, with role, duplicate email/username validation |
| **Read Users** | Empty list, list, single user, not found, with roles (eager loading), filter by first/last name, name search, pagination |
| **Update User** | Full update, partial update, metadata, viewed_tutorial flag, is_active (deactivation) |
| **Delete User** | Single delete, delete user with roles (verifies roles persist) |
| **Role Assignment** | Assign single role, assign multiple roles, remove role, replace all roles, clear all roles, update roles by ID list (API endpoint pattern), prevent duplicate assignments |
| **Role Operations** | Create role, read all roles, read role with users, duplicate role name validation |
| **Role Queries** | Find users with specific role, find users without roles, count users per role, filter users with multiple roles |
| **Relationships** | User-collection relationships (owned/created) |

### Documents (38 tests)

| Category | Tests |
|----------|-------|
| **Create** | Success, collection validation, duplicate name detection (case-insensitive) |
| **Read** | List, pagination, filter by collection/title, single document, element count |
| **Update** | Full update, partial update (title/description), duplicate name detection, empty description, rename to same name, case change, modified timestamp, move to different collection |
| **Delete** | Single delete, cascade to elements, bulk delete |
| **Elements** | CRUD operations, pagination |
| **Stats** | Annotation counts |
| **Relationships** | Document-collection relationships, cascade deletes |

### Document Elements (32 tests)

| Category | Tests |
|----------|-------|
| **Create** | Success, validation, complex content, hierarchy, multiple elements |
| **Read** | List, pagination, single element, with document info, content filtering |
| **Update** | Content, hierarchy, partial updates, modified timestamp, move to different document |
| **Delete** | Single, with annotations cascade, force parameter, bulk delete |
| **Annotations** | Get annotations, empty, pagination, count by motivation |
| **Hierarchy** | Ordering, section grouping |
| **Delete Content** | Delete elements keeping document, delete annotations keeping elements, cascading deletes |

### Word Import (31 tests)

| Category | Tests |
|----------|-------|
| **Validation** | File extension (.docx, .txt, .pdf, .doc), case sensitivity |
| **Collection** | Exists, not found |
| **Paragraph Extraction** | Simple paragraphs, empty lines, hierarchy |
| **Document Creation** | Create document, create elements |
| **Transaction** | Successful commit, rollback on failure |
| **Link Extraction** | With links, without links, various formats |
| **Text Formatting** | Plain, bold, italic, empty paragraph |
| **Paragraph Format** | Defaults, indent processing |
| **Edge Cases** | Empty document, whitespace only, very long text, special characters, duplicate titles |

### Collections (16 tests)

| Category | Tests |
|----------|-------|
| **Create** | Success, duplicate name detection (case-insensitive) |
| **Read** | List, filter by visibility/title, single collection, document count |
| **Update** | Full and partial updates |
| **Delete** | Single delete, cascade to documents |
| **Relationships** | Owner/creator relationships |

---

## Test Data Patterns

### Naming Conventions
Tests use consistent naming for easy identification:
- Users: `sample_user`, `user_with_admin_role`, `user_with_multiple_roles`
- Roles: `admin_role`, `editor_role`, `viewer_role`
- Collections: `sample_collection`
- Documents: `sample_document`, `sample_document_with_elements`

### Test User Defaults
- **Email**: `test@example.com`
- **Username**: `testuser`
- **Names**: "Test User"
- **Active**: `True`
- **Tutorial viewed**: `False`

### Test Roles
| Role | Description |
|------|-------------|
| **admin** | Administrator role with full permissions |
| **editor** | Editor role with content modification permissions |
| **viewer** | Viewer role with read-only permissions |

---

## Test Fixtures

Fixtures are reusable test setup components defined in `conftest.py`. They're automatically injected into tests that need them.

### Available Fixtures

| Fixture | Description |
|---------|-------------|
| `db_session` | Fresh SQLite database session (recreated per test) |
| `sample_user` | A test user with basic properties |
| `admin_role` | Admin role for testing |
| `editor_role` | Editor role for testing |
| `viewer_role` | Viewer role for testing |
| `sample_roles` | List of all three roles (admin, editor, viewer) |
| `user_with_admin_role` | User with admin role assigned |
| `user_with_multiple_roles` | User with both admin and editor roles |
| `sample_collection` | A test document collection (requires `sample_user`) |
| `sample_document` | A test document (requires `sample_collection`) |
| `sample_document_with_elements` | Document with 3 paragraph elements |
| `multiple_documents` | 5 documents for bulk operation testing |

### Using Fixtures in Tests

```python
def test_example(db_session, sample_document):
    """Fixtures are automatically passed as parameters."""
    assert sample_document.title == "Test Document"

    # db_session is a real SQLAlchemy session
    result = db_session.execute(select(Document)).scalars().all()
    assert len(result) == 1

def test_user_with_roles(db_session, user_with_admin_role):
    """Test fixtures for users with roles."""
    assert len(user_with_admin_role.roles) == 1
    assert user_with_admin_role.roles[0].name == "admin"
```

---

## Common Test Patterns

### Testing CRUD Operations

```python
class TestCreateUser:
    """Group related tests in a class."""

    def test_create_user_success(self, db_session):
        """Test the happy path first."""
        user = User(
            first_name="John",
            last_name="Doe",
            email="john@example.com",
            username="johndoe"
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        assert user.id is not None
        assert user.first_name == "John"

    def test_create_user_duplicate_email(self, db_session, sample_user):
        """Test validation and error cases."""
        duplicate = User(
            first_name="Duplicate",
            last_name="User",
            email=sample_user.email,  # Same email as existing user
            username="differentuser"
        )
        db_session.add(duplicate)

        with pytest.raises(Exception):  # SQLAlchemy will raise integrity error
            db_session.commit()
```

### Testing Relationships

```python
def test_user_role_relationship(self, db_session, user_with_admin_role):
    """Test eager loading with joinedload."""
    user = db_session.execute(
        select(User)
        .options(joinedload(User.roles))
        .where(User.id == user_with_admin_role.id)
    ).unique().scalar_one()  # Note: .unique() needed with eager loading

    assert len(user.roles) == 1
    assert user.roles[0].name == "admin"
```

### Testing Many-to-Many Updates

```python
from tests.conftest import user_roles

def test_update_user_roles(self, db_session, sample_user, admin_role):
    """Use association table directly for complex relationships."""
    # Clear existing roles
    db_session.execute(
        user_roles.delete().where(user_roles.c.user_id == sample_user.id)
    )

    # Add new role
    db_session.execute(
        user_roles.insert().values(user_id=sample_user.id, role_id=admin_role.id)
    )

    db_session.commit()
    db_session.refresh(sample_user)

    assert len(sample_user.roles) == 1
```

### Testing Queries and Filters

```python
def test_filter_users_by_name(self, db_session):
    """Test filtering and searching."""
    # Create test data
    user1 = User(first_name="Alice", last_name="Smith", email="alice@example.com", username="alice")
    user2 = User(first_name="Bob", last_name="Smith", email="bob@example.com", username="bob")
    db_session.add_all([user1, user2])
    db_session.commit()

    # Test filter
    users = db_session.execute(
        select(User).where(User.last_name == "Smith")
    ).scalars().all()

    assert len(users) == 2
```

---

## Testing Best Practices

### Do's ✅

| Practice | Example |
|----------|---------|
| **One concept per test** | Each test verifies one specific behavior |
| **Clear test names** | `test_create_user_with_duplicate_email_fails` not `test_user_2` |
| **Use fixtures** | Don't repeat setup code across tests |
| **Test edge cases** | Empty strings, None values, maximum lengths |
| **Test failure paths** | Not just success cases |
| **Keep tests independent** | Each test should run in isolation |
| **Descriptive assertions** | `assert user.is_active is True` not `assert user.is_active` |

### Don'ts ❌

| Anti-Pattern | Why It's Bad |
|--------------|--------------|
| **Testing SQLAlchemy itself** | Assume the ORM works correctly |
| **Testing multiple things** | Split into separate, focused tests |
| **Using production database** | Use the in-memory SQLite fixture |
| **Sharing state between tests** | Each test gets a fresh database |
| **Making external API calls** | Mock them (see `test_word_import.py`) |
| **Testing implementation details** | Test behavior, not internals |

### Test Organization

```python
class TestFeature:
    """Group related tests together."""

    def test_happy_path(self):
        """Start with the success case."""
        pass

    def test_validation_error(self):
        """Then test error cases."""
        pass

    def test_edge_case(self):
        """Finally test edge cases."""
        pass
```

### Assertion Best Practices

```python
# ✅ Good - Explicit and clear
assert user.is_active is True
assert len(user.roles) == 2
assert user.email == "test@example.com"

# ❌ Bad - Implicit or unclear
assert user.is_active
assert user.roles
assert user.email
```

---

## SQLAlchemy Testing Gotchas

### Issue 1: Detached Instance Error

**Problem**: Accessing relationships after session closes fails.

```python
# ❌ This will fail
def test_bad(db_session, sample_user):
    user = User(first_name="Test", ...)
    db_session.add(user)
    db_session.commit()
    # user is now "detached" from session
    print(user.owned_collections)  # ERROR!
```

**Solution**: Always refresh objects after commit:

```python
# ✅ This works
def test_good(db_session):
    user = User(first_name="Test", ...)
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)  # Reattach to session
    print(user.owned_collections)  # Works!
```

### Issue 2: "The unique() method must be invoked"

**Problem**: Using `scalar_one()` with `joinedload()` fails.

```python
# ❌ This will fail
user = db_session.execute(
    select(User).options(joinedload(User.roles))
).scalar_one()  # ERROR: InvalidRequestError
```

**Solution**: Call `.unique()` before `scalar_one()`:

```python
# ✅ This works
user = db_session.execute(
    select(User).options(joinedload(User.roles))
).unique().scalar_one()  # Note .unique()
```

**Why?** `joinedload()` creates duplicate rows (one per related item), and SQLAlchemy needs to deduplicate them.

### Issue 3: Many-to-Many FlushError

**Problem**: Directly appending to relationship collection fails in tests.

```python
# ❌ This may fail in tests
user.roles.append(role)
db_session.commit()  # ERROR: FlushError
```

**Solution**: Use the association table directly:

```python
# ✅ This works
from tests.conftest import user_roles

db_session.execute(
    user_roles.insert().values(user_id=user.id, role_id=role.id)
)
db_session.commit()
```

### Issue 4: Comparing Objects Across Sessions

**Problem**: `assert user in users` fails even when user exists.

```python
# ❌ This may fail
def test_bad(db_session, sample_user):
    users = db_session.execute(select(User)).scalars().all()
    assert sample_user in users  # May fail due to object identity
```

**Solution**: Compare IDs instead:

```python
# ✅ This works
def test_good(db_session, sample_user):
    users = db_session.execute(select(User)).scalars().all()
    user_ids = [u.id for u in users]
    assert sample_user.id in user_ids
```

---

## API Coverage Map

This shows which backend API endpoints in `api/routers/` have corresponding tests:

### Users (`/api/v1/users`) - ✅ Fully Covered

| Endpoint | Test Coverage |
|----------|---------------|
| `POST /` | `test_create_user_success`, `test_create_user_with_metadata` |
| `GET /` | `test_read_users_list`, `test_read_users_filter_by_first_name`, `test_read_users_filter_by_last_name`, `test_read_users_name_search_first_name`, `test_read_users_pagination` |
| `GET /{user_id}` | `test_read_single_user`, `test_read_user_not_found`, `test_read_user_with_roles` |
| `PUT /{user_id}` | `test_update_user_full` |
| `PATCH /{user_id}` | `test_partial_update_user`, `test_update_user_metadata`, `test_update_roles_by_id_list` |
| `DELETE /{user_id}` | `test_delete_user`, `test_delete_user_with_roles` |

### Documents (`/api/v1/documents`) - ✅ Fully Covered

| Endpoint | Test Coverage |
|----------|---------------|
| Full CRUD operations | 38 tests covering create, read, update, delete, filtering, pagination, relationships |

### Document Collections (`/api/v1/collections`) - ✅ Fully Covered

| Endpoint | Test Coverage |
|----------|---------------|
| Full CRUD operations | 16 tests covering create, read, update, delete, filtering, relationships |

### Document Elements (`/api/v1/elements`) - ✅ Fully Covered

| Endpoint | Test Coverage |
|----------|---------------|
| Full CRUD operations | 32 tests covering create, read, update, delete, annotations, hierarchy |

### Word Import (`/api/v1/import`) - ✅ Fully Covered (with mocking)

| Endpoint | Test Coverage |
|----------|---------------|
| Import workflow | 31 tests covering validation, extraction, transaction handling, edge cases |

### Not Yet Covered - 🔴 Needs Tests

| Area | Priority | Notes |
|------|----------|-------|
| Authentication (`/api/v1/auth`) | High | Login, logout, token refresh, CAS integration |
| Permissions | Medium | Role-based access control enforcement |
| Annotations | Medium | CRUD operations for annotations |
| Groups | Low | Group management if implemented |

---

## Test Performance

### Current Metrics
- **155 tests** run in **~3.6 seconds**
- Average: **~23ms per test**
- Uses in-memory SQLite (no I/O overhead)
- All tests run in parallel-safe isolation

### Slow Test Investigation

If tests become slow, investigate with:

```bash
# Show slowest 10 tests
python -m pytest --durations=10

# Show all test durations
python -m pytest --durations=0

# Profile a specific test
python -m pytest tests/test_users.py::TestCreateUser::test_create_user_success -vv
```

### Performance Optimization Tips

| Strategy | Impact | When to Use |
|----------|--------|-------------|
| Use `flush()` instead of `commit()` | Small | When you don't need to refresh relationships |
| Minimize fixture dependencies | Medium | Fewer fixtures = faster setup |
| Mock external services | High | File I/O, API calls, email sending |
| Use `scope="module"` or `scope="session"` | High | For expensive, read-only fixtures (use carefully!) |
| Batch database operations | Medium | When creating many test records |

### Example: Fast Fixture with Module Scope

```python
# For read-only data that doesn't change
@pytest.fixture(scope="module")
def static_roles(db_session):
    """Create roles once per module, not per test."""
    roles = [
        Role(name="admin", description="Admin"),
        Role(name="editor", description="Editor"),
    ]
    db_session.add_all(roles)
    db_session.commit()
    return roles
```

**Warning**: Be careful with scopes beyond `function` - they can cause test interdependencies!

---

## Future Enhancements

### Integration Tests

For full API integration tests (testing the HTTP endpoints with a real PostgreSQL database):

1. **Docker-based approach**: Use `docker-compose.yml` to spin up a test database
2. **Testcontainers**: Use the `testcontainers-python` library
3. **Separate folder**: Create `tests/integration/` for these tests

### Example Integration Test Setup

```python
# tests/integration/conftest.py (future)
import pytest
from testcontainers.postgres import PostgresContainer

@pytest.fixture(scope="session")
def postgres_container():
    with PostgresContainer("postgres:15") as postgres:
        yield postgres.get_connection_url()
```

### CI/CD Integration

Add to `.github/workflows/test.yml`:

```yaml
- name: Run tests
  run: |
    cd api
    pip install -r requirements.txt
    pytest --cov=routers --cov-report=xml

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./api/coverage.xml
```

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| `ModuleNotFoundError: No module named 'pytest'` | Run `pip install pytest pytest-cov` |
| `ModuleNotFoundError: No module named 'sqlalchemy'` | Activate virtual environment first |
| Tests not discovered | Ensure files are named `test_*.py` |
| Fixture not found | Check it's defined in `conftest.py` |

### Debugging Tips

```bash
# See print statements in tests
python -m pytest -v -s

# Drop into debugger on failure
python -m pytest --pdb

# Show local variables on failure
python -m pytest -l
```

---

## Contributing

When adding new tests:

1. **Follow naming conventions**: `test_*.py` files, `Test*` classes, `test_*` methods
2. **Use fixtures**: Don't duplicate setup code
3. **One assertion focus**: Each test should verify one thing
4. **Descriptive names**: `test_create_document_duplicate_name_fails` not `test_create_2`
5. **Run coverage**: Ensure new code has tests

```bash
# Before committing, run the full test suite
python -m pytest -v tests/ --cov=tests --cov-report=term-missing
```

---

## Quick Reference Card

### Most Common Commands

```bash
# Running Tests
pytest                           # Run all tests
pytest -v                        # Verbose output (show test names)
pytest -vv                       # Extra verbose (show more details)
pytest -x                        # Stop on first failure
pytest -k "user"                # Run tests matching "user"
pytest tests/test_users.py      # Run one file
pytest --lf                      # Re-run last failures
pytest --ff                      # Run failures first, then rest

# Debugging
pytest -s                        # Show print statements
pytest --pdb                     # Drop into debugger on failure
pytest -l                        # Show local variables on failure
pytest --tb=short                # Shorter traceback format
pytest --tb=line                 # One line per failure

# Coverage
pytest --cov=tests --cov-report=term-missing    # Terminal report
pytest --cov=tests --cov-report=html            # HTML report (opens in browser)
pytest --cov=tests --cov-report=xml             # XML for CI/CD

# Performance
pytest --durations=10            # Show 10 slowest tests
pytest --durations=0             # Show all test durations
```

### Test File Structure

```
api/tests/
├── conftest.py                      # Fixtures & test models (Role, User, etc.)
├── test_users.py                    # User & role tests (38 tests)
├── test_documents.py                # Document tests (38 tests)
├── test_document_collections.py     # Collection tests (16 tests)
├── test_document_elements.py        # Element tests (32 tests)
├── test_word_import.py              # Import tests (31 tests)
└── README.md                        # This file
```

### Running Specific Tests

```bash
# By file
pytest tests/test_users.py

# By class
pytest tests/test_users.py::TestUserRoleAssignment

# By method
pytest tests/test_users.py::TestUserRoleAssignment::test_assign_single_role_to_user

# By keyword (runs all tests with matching name)
pytest -k "delete"
pytest -k "role"
pytest -k "create and user"
```

### Common Fixtures

| Fixture | What It Provides |
|---------|------------------|
| `db_session` | Fresh SQLite database session |
| `sample_user` | Test user: test@example.com |
| `admin_role` | Admin role |
| `user_with_admin_role` | User with admin role assigned |
| `sample_collection` | Test document collection |
| `sample_document` | Test document |

### Quick Test Template

```python
from tests.conftest import User

class TestYourFeature:
    """Test your feature."""

    def test_success_case(self, db_session):
        """Test the happy path."""
        # Arrange
        user = User(first_name="Test", last_name="User")

        # Act
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        # Assert
        assert user.id is not None

    def test_error_case(self, db_session):
        """Test error handling."""
        with pytest.raises(Exception):
            # Your error-inducing code here
            pass
```

### SQLAlchemy Quick Tips

```python
# ✅ Always refresh after commit
db_session.commit()
db_session.refresh(user)

# ✅ Use .unique() with joinedload()
user = db_session.execute(
    select(User).options(joinedload(User.roles))
).unique().scalar_one()

# ✅ Compare IDs, not objects
user_ids = [u.id for u in users]
assert user.id in user_ids

# ✅ Use association table for many-to-many
from tests.conftest import user_roles
db_session.execute(
    user_roles.insert().values(user_id=1, role_id=2)
)
```

### Before Committing

```bash
# 1. Run all tests
pytest -v

# 2. Check coverage
pytest --cov=tests --cov-report=term-missing

# 3. Check for slow tests
pytest --durations=10

# 4. Ensure no print statements left
pytest -v | grep "print"
```

---

**Happy Testing! 🧪**
