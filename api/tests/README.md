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
| `tests/test_documents.py` | 38 tests for document operations |
| `tests/test_document_collections.py` | 16 tests for collection operations |
| `tests/test_document_elements.py` | 32 tests for document element operations |
| `tests/test_word_import.py` | 31 tests for Word document import (with mocking) |
| `pytest.ini` | Pytest configuration |

**Total: 117 tests** running in under 1 second

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

# Run a specific test class
python -m pytest tests/test_documents.py::TestCreateDocument

# Run a specific test method
python -m pytest tests/test_documents.py::TestCreateDocument::test_create_document_success

# Run tests matching a keyword
python -m pytest -k "delete"  # Runs all tests with "delete" in the name
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

## Test Fixtures

Fixtures are reusable test setup components defined in `conftest.py`. They're automatically injected into tests that need them.

### Available Fixtures

| Fixture | Description |
|---------|-------------|
| `db_session` | Fresh SQLite database session (recreated per test) |
| `sample_user` | A test user with basic properties |
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
```

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
