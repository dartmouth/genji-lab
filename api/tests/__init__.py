"""
Genji API Test Suite

This package contains unit tests for the Genji Document Annotation API.

Test Architecture:
==================
These tests use an in-memory SQLite database with SQLite-compatible model 
definitions. This approach:
1. Avoids hitting your production PostgreSQL database
2. Tests run quickly (in-memory database)
3. Each test is isolated (database tables recreated per test)
4. No external dependencies required

Test Structure:
==============
- conftest.py: Shared fixtures, test models, and database configuration
- test_documents.py: Tests for document CRUD operations
- test_document_collections.py: Tests for collection CRUD operations

Why Unit Tests (not Integration Tests):
======================================
Your production code uses PostgreSQL-specific features:
- JSONB columns
- Schema-qualified tables (schema='app')

Rather than mocking these or requiring a PostgreSQL test database, 
these tests verify the data layer logic directly using SQLite-compatible 
model definitions that mirror your production models.

For full API integration tests, you would need:
1. A PostgreSQL test database, OR
2. Docker-based test setup (using your existing docker-compose.yml)

Running Tests:
==============
    # Run all tests
    pytest

    # Run with verbose output
    pytest -v

    # Run with coverage
    pytest --cov=tests --cov-report=html

    # Run specific test file
    pytest tests/test_documents.py

    # Run specific test class
    pytest tests/test_documents.py::TestCreateDocument

    # Run specific test
    pytest tests/test_documents.py::TestCreateDocument::test_create_document_success

Test Markers (for future use):
=============================
    @pytest.mark.unit - Unit tests (default, fast)
    @pytest.mark.integration - Integration tests (require database)
    @pytest.mark.slow - Slow-running tests
"""
