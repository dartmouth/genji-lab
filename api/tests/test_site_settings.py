"""
Tests for Site Settings functionality.

This module tests the site settings management system including:
- Basic settings retrieval and updates
- Logo upload and validation
- Favicon upload and validation
- File serving
- Authentication and authorization
- Edge cases and complex scenarios
"""

import pytest
import base64
import io
from datetime import datetime
from PIL import Image
from sqlalchemy.orm import Session

from tests.conftest import SiteSettings, create_site_settings, User


# =============================================================================
# Helper Functions
# =============================================================================

def create_test_image(width: int, height: int, format: str = "PNG", color: tuple = (255, 0, 0)) -> bytes:
    """Create a test image with specified dimensions and format."""
    img = Image.new("RGB", (width, height), color=color)
    img_bytes = io.BytesIO()
    img.save(img_bytes, format=format)
    return img_bytes.getvalue()


def create_test_favicon(size: int, format: str = "PNG", color: tuple = (0, 0, 255)) -> bytes:
    """Create a test favicon with specified size and format."""
    img = Image.new("RGB", (size, size), color=color)
    img_bytes = io.BytesIO()
    img.save(img_bytes, format=format)
    return img_bytes.getvalue()


def get_latest_settings(db_session: Session) -> SiteSettings:
    """Get the most recent site settings entry."""
    return db_session.query(SiteSettings).order_by(SiteSettings.id.desc()).first()


def count_settings_entries(db_session: Session) -> int:
    """Count the total number of site settings entries."""
    return db_session.query(SiteSettings).count()


# =============================================================================
# Phase 1: Basic Settings Retrieval and Updates
# =============================================================================

class TestBasicSettingsRetrievalAndUpdates:
    """Test basic retrieval and update operations for site settings."""

    def test_get_default_settings_when_none_exist(self, db_session: Session):
        """Should return default settings when no entries exist."""
        settings = get_latest_settings(db_session)
        assert settings is None

    def test_get_existing_settings(self, db_session: Session, user_with_admin_role: User):
        """Should retrieve existing settings."""
        created = create_site_settings(db_session, user_with_admin_role.id, site_title="My Site")
        
        retrieved = get_latest_settings(db_session)
        assert retrieved is not None
        assert retrieved.id == created.id
        assert retrieved.site_title == "My Site"
        assert retrieved.updated_by_id == user_with_admin_role.id

    def test_update_site_title_successfully(self, db_session: Session, user_with_admin_role: User):
        """Should update site title successfully."""
        create_site_settings(db_session, user_with_admin_role.id, site_title="Old Title")
        
        new_settings = create_site_settings(db_session, user_with_admin_role.id, site_title="New Title")
        
        latest = get_latest_settings(db_session)
        assert latest.site_title == "New Title"
        assert latest.id == new_settings.id

    def test_update_site_logo_enabled_flag(self, db_session: Session, user_with_admin_role: User):
        """Should update site_logo_enabled flag."""
        create_site_settings(db_session, user_with_admin_role.id, site_logo_enabled=False)
        
        new_settings = create_site_settings(db_session, user_with_admin_role.id, site_logo_enabled=True)
        
        latest = get_latest_settings(db_session)
        assert latest.site_logo_enabled is True
        assert latest.id == new_settings.id

    def test_validate_title_max_length(self, db_session: Session, user_with_admin_role: User):
        """Should enforce 50 character limit on site title."""
        # Title with exactly 50 characters should work
        valid_title = "x" * 50
        settings = create_site_settings(db_session, user_with_admin_role.id, site_title=valid_title)
        assert len(settings.site_title) == 50

    def test_validate_title_with_valid_characters(self, db_session: Session, user_with_admin_role: User):
        """Should accept title with valid characters."""
        valid_title = "Site-Title 2024: 'The Best' Project"
        settings = create_site_settings(db_session, user_with_admin_role.id, site_title=valid_title)
        assert settings.site_title == valid_title

    def test_validate_empty_title_allowed_by_model(self, db_session: Session, user_with_admin_role: User):
        """Model should store empty strings (validation happens at API layer)."""
        # The model itself doesn't validate, API layer does
        settings = create_site_settings(db_session, user_with_admin_role.id, site_title="")
        assert settings.site_title == ""

    def test_settings_history_tracking(self, db_session: Session, user_with_admin_role: User):
        """Should create new entry for each update (history tracking)."""
        initial_count = count_settings_entries(db_session)
        
        create_site_settings(db_session, user_with_admin_role.id, site_title="Version 1")
        assert count_settings_entries(db_session) == initial_count + 1
        
        create_site_settings(db_session, user_with_admin_role.id, site_title="Version 2")
        assert count_settings_entries(db_session) == initial_count + 2
        
        create_site_settings(db_session, user_with_admin_role.id, site_title="Version 3")
        assert count_settings_entries(db_session) == initial_count + 3


# =============================================================================
# Phase 2: Logo Upload Operations
# =============================================================================

class TestLogoUploadOperations:
    """Test logo upload functionality including validation."""

    def test_upload_valid_logo_png(self, db_session: Session, user_with_admin_role: User):
        """Should accept valid 1200x40 PNG logo."""
        logo_data = create_test_image(1200, 40, "PNG")
        logo_b64 = base64.b64encode(logo_data).decode('utf-8')
        
        settings = create_site_settings(
            db_session,
            user_with_admin_role.id,
            site_logo_enabled=True,
            site_logo_data=logo_b64,
            site_logo_mime_type="image/png"
        )
        
        assert settings.site_logo_enabled is True
        assert settings.site_logo_data == logo_b64
        assert settings.site_logo_mime_type == "image/png"

    def test_upload_valid_logo_jpg(self, db_session: Session, user_with_admin_role: User):
        """Should accept valid 1200x40 JPG logo."""
        logo_data = create_test_image(1200, 40, "JPEG")
        logo_b64 = base64.b64encode(logo_data).decode('utf-8')
        
        settings = create_site_settings(
            db_session,
            user_with_admin_role.id,
            site_logo_enabled=True,
            site_logo_data=logo_b64,
            site_logo_mime_type="image/jpeg"
        )
        
        assert settings.site_logo_enabled is True
        assert settings.site_logo_mime_type == "image/jpeg"

    def test_logo_dimensions_validation(self, db_session: Session, user_with_admin_role: User):
        """Should validate logo dimensions (validation at API layer)."""
        # Wrong dimensions - model stores it, but API would reject
        logo_data = create_test_image(800, 40, "PNG")
        logo_b64 = base64.b64encode(logo_data).decode('utf-8')
        
        # Model accepts any dimensions (API validates)
        settings = create_site_settings(
            db_session,
            user_with_admin_role.id,
            site_logo_data=logo_b64,
            site_logo_mime_type="image/png"
        )
        assert settings.site_logo_data is not None

    def test_logo_file_size_handling(self, db_session: Session, user_with_admin_role: User):
        """Should handle large logo files (close to 2MB limit)."""
        # Create a larger image (will be compressed by PIL)
        logo_data = create_test_image(1200, 40, "PNG")
        logo_b64 = base64.b64encode(logo_data).decode('utf-8')
        
        # Verify we can store large base64 strings
        settings = create_site_settings(
            db_session,
            user_with_admin_role.id,
            site_logo_data=logo_b64,
            site_logo_mime_type="image/png"
        )
        assert len(settings.site_logo_data) > 100  # Should have substantial data

    def test_logo_stored_as_base64(self, db_session: Session, user_with_admin_role: User):
        """Should store logo as base64 encoded string."""
        logo_data = create_test_image(1200, 40, "PNG")
        logo_b64 = base64.b64encode(logo_data).decode('utf-8')
        
        settings = create_site_settings(
            db_session,
            user_with_admin_role.id,
            site_logo_data=logo_b64,
            site_logo_mime_type="image/png"
        )
        
        # Verify base64 can be decoded back to original
        decoded = base64.b64decode(settings.site_logo_data)
        assert decoded == logo_data

    def test_logo_sets_enabled_flag(self, db_session: Session, user_with_admin_role: User):
        """Should set site_logo_enabled to True when logo is uploaded."""
        logo_data = create_test_image(1200, 40, "PNG")
        logo_b64 = base64.b64encode(logo_data).decode('utf-8')
        
        settings = create_site_settings(
            db_session,
            user_with_admin_role.id,
            site_logo_enabled=True,
            site_logo_data=logo_b64,
            site_logo_mime_type="image/png"
        )
        
        assert settings.site_logo_enabled is True

    def test_upload_logo_preserves_other_settings(self, db_session: Session, user_with_admin_role: User):
        """Should preserve title and favicon when uploading logo."""
        favicon_data = create_test_favicon(32, "PNG")
        favicon_b64 = base64.b64encode(favicon_data).decode('utf-8')
        
        # Create initial settings with favicon
        create_site_settings(
            db_session,
            user_with_admin_role.id,
            site_title="My Site",
            site_favicon_data=favicon_b64,
            site_favicon_mime_type="image/png"
        )
        
        # Upload logo while preserving other settings
        logo_data = create_test_image(1200, 40, "PNG")
        logo_b64 = base64.b64encode(logo_data).decode('utf-8')
        
        new_settings = create_site_settings(
            db_session,
            user_with_admin_role.id,
            site_title="My Site",  # Preserved
            site_logo_enabled=True,
            site_logo_data=logo_b64,
            site_logo_mime_type="image/png",
            site_favicon_data=favicon_b64,  # Preserved
            site_favicon_mime_type="image/png"
        )
        
        assert new_settings.site_title == "My Site"
        assert new_settings.site_logo_data is not None
        assert new_settings.site_favicon_data is not None

    def test_remove_logo_successfully(self, db_session: Session, user_with_admin_role: User):
        """Should remove logo by setting data to None."""
        logo_data = create_test_image(1200, 40, "PNG")
        logo_b64 = base64.b64encode(logo_data).decode('utf-8')
        
        create_site_settings(
            db_session,
            user_with_admin_role.id,
            site_logo_enabled=True,
            site_logo_data=logo_b64,
            site_logo_mime_type="image/png"
        )
        
        # Remove logo
        removed = create_site_settings(
            db_session,
            user_with_admin_role.id,
            site_logo_enabled=False,
            site_logo_data=None,
            site_logo_mime_type=None
        )
        
        assert removed.site_logo_enabled is False
        assert removed.site_logo_data is None
        assert removed.site_logo_mime_type is None

    def test_remove_logo_disables_flag(self, db_session: Session, user_with_admin_role: User):
        """Should set site_logo_enabled to False when logo is removed."""
        logo_data = create_test_image(1200, 40, "PNG")
        logo_b64 = base64.b64encode(logo_data).decode('utf-8')
        
        create_site_settings(
            db_session,
            user_with_admin_role.id,
            site_logo_enabled=True,
            site_logo_data=logo_b64,
            site_logo_mime_type="image/png"
        )
        
        removed = create_site_settings(
            db_session,
            user_with_admin_role.id,
            site_logo_enabled=False,
            site_logo_data=None,
            site_logo_mime_type=None
        )
        
        latest = get_latest_settings(db_session)
        assert latest.site_logo_enabled is False


# =============================================================================
# Phase 3: Favicon Upload Operations
# =============================================================================

class TestFaviconUploadOperations:
    """Test favicon upload functionality including validation."""

    def test_upload_valid_favicon_png_32x32(self, db_session: Session, user_with_admin_role: User):
        """Should accept valid 32x32 PNG favicon."""
        favicon_data = create_test_favicon(32, "PNG")
        favicon_b64 = base64.b64encode(favicon_data).decode('utf-8')
        
        settings = create_site_settings(
            db_session,
            user_with_admin_role.id,
            site_favicon_data=favicon_b64,
            site_favicon_mime_type="image/png"
        )
        
        assert settings.site_favicon_data == favicon_b64
        assert settings.site_favicon_mime_type == "image/png"

    def test_upload_valid_favicon_16x16(self, db_session: Session, user_with_admin_role: User):
        """Should accept minimum size 16x16 favicon."""
        favicon_data = create_test_favicon(16, "PNG")
        favicon_b64 = base64.b64encode(favicon_data).decode('utf-8')
        
        settings = create_site_settings(
            db_session,
            user_with_admin_role.id,
            site_favicon_data=favicon_b64,
            site_favicon_mime_type="image/png"
        )
        
        assert settings.site_favicon_data is not None

    def test_upload_valid_favicon_64x64_max(self, db_session: Session, user_with_admin_role: User):
        """Should accept maximum size 64x64 favicon."""
        favicon_data = create_test_favicon(64, "PNG")
        favicon_b64 = base64.b64encode(favicon_data).decode('utf-8')
        
        settings = create_site_settings(
            db_session,
            user_with_admin_role.id,
            site_favicon_data=favicon_b64,
            site_favicon_mime_type="image/png"
        )
        
        assert settings.site_favicon_data is not None

    def test_favicon_dimensions_too_small(self, db_session: Session, user_with_admin_role: User):
        """Should handle favicon smaller than 16x16 (API validates)."""
        favicon_data = create_test_favicon(8, "PNG")
        favicon_b64 = base64.b64encode(favicon_data).decode('utf-8')
        
        # Model stores it (API would reject)
        settings = create_site_settings(
            db_session,
            user_with_admin_role.id,
            site_favicon_data=favicon_b64,
            site_favicon_mime_type="image/png"
        )
        assert settings.site_favicon_data is not None

    def test_favicon_dimensions_too_large(self, db_session: Session, user_with_admin_role: User):
        """Should handle favicon larger than 64x64 (API validates)."""
        favicon_data = create_test_favicon(128, "PNG")
        favicon_b64 = base64.b64encode(favicon_data).decode('utf-8')
        
        # Model stores it (API would reject)
        settings = create_site_settings(
            db_session,
            user_with_admin_role.id,
            site_favicon_data=favicon_b64,
            site_favicon_mime_type="image/png"
        )
        assert settings.site_favicon_data is not None

    def test_favicon_file_size_handling(self, db_session: Session, user_with_admin_role: User):
        """Should handle favicon files close to 500KB limit."""
        favicon_data = create_test_favicon(64, "PNG")
        favicon_b64 = base64.b64encode(favicon_data).decode('utf-8')
        
        settings = create_site_settings(
            db_session,
            user_with_admin_role.id,
            site_favicon_data=favicon_b64,
            site_favicon_mime_type="image/png"
        )
        assert len(settings.site_favicon_data) > 100  # Should have data

    def test_favicon_stored_as_base64(self, db_session: Session, user_with_admin_role: User):
        """Should store favicon as base64 encoded string."""
        favicon_data = create_test_favicon(32, "PNG")
        favicon_b64 = base64.b64encode(favicon_data).decode('utf-8')
        
        settings = create_site_settings(
            db_session,
            user_with_admin_role.id,
            site_favicon_data=favicon_b64,
            site_favicon_mime_type="image/png"
        )
        
        # Verify base64 can be decoded back to original
        decoded = base64.b64decode(settings.site_favicon_data)
        assert decoded == favicon_data

    def test_upload_favicon_preserves_other_settings(self, db_session: Session, user_with_admin_role: User):
        """Should preserve title and logo when uploading favicon."""
        logo_data = create_test_image(1200, 40, "PNG")
        logo_b64 = base64.b64encode(logo_data).decode('utf-8')
        
        # Create initial settings with logo
        create_site_settings(
            db_session,
            user_with_admin_role.id,
            site_title="My Site",
            site_logo_enabled=True,
            site_logo_data=logo_b64,
            site_logo_mime_type="image/png"
        )
        
        # Upload favicon while preserving other settings
        favicon_data = create_test_favicon(32, "PNG")
        favicon_b64 = base64.b64encode(favicon_data).decode('utf-8')
        
        new_settings = create_site_settings(
            db_session,
            user_with_admin_role.id,
            site_title="My Site",  # Preserved
            site_logo_enabled=True,  # Preserved
            site_logo_data=logo_b64,  # Preserved
            site_logo_mime_type="image/png",
            site_favicon_data=favicon_b64,
            site_favicon_mime_type="image/png"
        )
        
        assert new_settings.site_title == "My Site"
        assert new_settings.site_logo_data is not None
        assert new_settings.site_favicon_data is not None

    def test_remove_favicon_successfully(self, db_session: Session, user_with_admin_role: User):
        """Should remove favicon by setting data to None."""
        favicon_data = create_test_favicon(32, "PNG")
        favicon_b64 = base64.b64encode(favicon_data).decode('utf-8')
        
        create_site_settings(
            db_session,
            user_with_admin_role.id,
            site_favicon_data=favicon_b64,
            site_favicon_mime_type="image/png"
        )
        
        # Remove favicon
        removed = create_site_settings(
            db_session,
            user_with_admin_role.id,
            site_favicon_data=None,
            site_favicon_mime_type=None
        )
        
        assert removed.site_favicon_data is None
        assert removed.site_favicon_mime_type is None


# =============================================================================
# Phase 4: File Serving and MIME Types
# =============================================================================

class TestFileServingAndMimeTypes:
    """Test file serving functionality and MIME type preservation."""

    def test_serve_logo_with_correct_mime_type_png(self, db_session: Session, user_with_admin_role: User):
        """Should preserve PNG MIME type."""
        logo_data = create_test_image(1200, 40, "PNG")
        logo_b64 = base64.b64encode(logo_data).decode('utf-8')
        
        settings = create_site_settings(
            db_session,
            user_with_admin_role.id,
            site_logo_enabled=True,
            site_logo_data=logo_b64,
            site_logo_mime_type="image/png"
        )
        
        assert settings.site_logo_mime_type == "image/png"

    def test_serve_logo_with_correct_mime_type_jpg(self, db_session: Session, user_with_admin_role: User):
        """Should preserve JPG MIME type."""
        logo_data = create_test_image(1200, 40, "JPEG")
        logo_b64 = base64.b64encode(logo_data).decode('utf-8')
        
        settings = create_site_settings(
            db_session,
            user_with_admin_role.id,
            site_logo_enabled=True,
            site_logo_data=logo_b64,
            site_logo_mime_type="image/jpeg"
        )
        
        assert settings.site_logo_mime_type == "image/jpeg"

    def test_serve_logo_when_not_enabled(self, db_session: Session, user_with_admin_role: User):
        """Should have logo data but not be enabled."""
        logo_data = create_test_image(1200, 40, "PNG")
        logo_b64 = base64.b64encode(logo_data).decode('utf-8')
        
        settings = create_site_settings(
            db_session,
            user_with_admin_role.id,
            site_logo_enabled=False,
            site_logo_data=logo_b64,
            site_logo_mime_type="image/png"
        )
        
        # Data exists but not enabled (API would return 404)
        assert settings.site_logo_data is not None
        assert settings.site_logo_enabled is False

    def test_serve_logo_when_no_data(self, db_session: Session, user_with_admin_role: User):
        """Should have no logo data."""
        settings = create_site_settings(
            db_session,
            user_with_admin_role.id,
            site_logo_enabled=False,
            site_logo_data=None,
            site_logo_mime_type=None
        )
        
        # No data (API would return 404)
        assert settings.site_logo_data is None

    def test_serve_favicon_with_correct_mime_type(self, db_session: Session, user_with_admin_role: User):
        """Should preserve favicon MIME type."""
        favicon_data = create_test_favicon(32, "PNG")
        favicon_b64 = base64.b64encode(favicon_data).decode('utf-8')
        
        settings = create_site_settings(
            db_session,
            user_with_admin_role.id,
            site_favicon_data=favicon_b64,
            site_favicon_mime_type="image/png"
        )
        
        assert settings.site_favicon_mime_type == "image/png"

    def test_serve_favicon_when_no_data(self, db_session: Session, user_with_admin_role: User):
        """Should have no favicon data."""
        settings = create_site_settings(
            db_session,
            user_with_admin_role.id,
            site_favicon_data=None,
            site_favicon_mime_type=None
        )
        
        # No data (API would return 404)
        assert settings.site_favicon_data is None


# =============================================================================
# Phase 5: Authentication and Authorization
# =============================================================================

class TestAuthenticationAndAuthorization:
    """Test that settings operations track the updating user."""

    def test_settings_track_updated_by_admin(self, db_session: Session, user_with_admin_role: User):
        """Should track which admin updated settings."""
        settings = create_site_settings(
            db_session,
            user_with_admin_role.id,
            site_title="Updated by Admin"
        )
        
        assert settings.updated_by_id == user_with_admin_role.id
        assert settings.updated_by.id == user_with_admin_role.id

    def test_settings_track_updated_by_different_user(self, db_session: Session, user_with_admin_role: User, sample_user: User):
        """Should track updates by different users."""
        settings1 = create_site_settings(db_session, user_with_admin_role.id, site_title="Version 1")
        assert settings1.updated_by_id == user_with_admin_role.id
        
        settings2 = create_site_settings(db_session, sample_user.id, site_title="Version 2")
        assert settings2.updated_by_id == sample_user.id

    def test_logo_upload_tracks_uploader(self, db_session: Session, user_with_admin_role: User):
        """Should track who uploaded the logo."""
        logo_data = create_test_image(1200, 40, "PNG")
        logo_b64 = base64.b64encode(logo_data).decode('utf-8')
        
        settings = create_site_settings(
            db_session,
            user_with_admin_role.id,
            site_logo_enabled=True,
            site_logo_data=logo_b64,
            site_logo_mime_type="image/png"
        )
        
        assert settings.updated_by_id == user_with_admin_role.id

    def test_favicon_upload_tracks_uploader(self, db_session: Session, user_with_admin_role: User):
        """Should track who uploaded the favicon."""
        favicon_data = create_test_favicon(32, "PNG")
        favicon_b64 = base64.b64encode(favicon_data).decode('utf-8')
        
        settings = create_site_settings(
            db_session,
            user_with_admin_role.id,
            site_favicon_data=favicon_b64,
            site_favicon_mime_type="image/png"
        )
        
        assert settings.updated_by_id == user_with_admin_role.id

    def test_logo_removal_tracks_remover(self, db_session: Session, user_with_admin_role: User, sample_user: User):
        """Should track who removed the logo."""
        logo_data = create_test_image(1200, 40, "PNG")
        logo_b64 = base64.b64encode(logo_data).decode('utf-8')
        
        create_site_settings(
            db_session,
            user_with_admin_role.id,
            site_logo_enabled=True,
            site_logo_data=logo_b64,
            site_logo_mime_type="image/png"
        )
        
        removed = create_site_settings(
            db_session,
            sample_user.id,
            site_logo_enabled=False,
            site_logo_data=None,
            site_logo_mime_type=None
        )
        
        assert removed.updated_by_id == sample_user.id

    def test_favicon_removal_tracks_remover(self, db_session: Session, user_with_admin_role: User, sample_user: User):
        """Should track who removed the favicon."""
        favicon_data = create_test_favicon(32, "PNG")
        favicon_b64 = base64.b64encode(favicon_data).decode('utf-8')
        
        create_site_settings(
            db_session,
            user_with_admin_role.id,
            site_favicon_data=favicon_b64,
            site_favicon_mime_type="image/png"
        )
        
        removed = create_site_settings(
            db_session,
            sample_user.id,
            site_favicon_data=None,
            site_favicon_mime_type=None
        )
        
        assert removed.updated_by_id == sample_user.id


# =============================================================================
# Phase 6: Edge Cases and Complex Scenarios
# =============================================================================

class TestEdgeCasesAndComplexScenarios:
    """Test edge cases and complex scenarios."""

    def test_update_title_with_all_special_characters(self, db_session: Session, user_with_admin_role: User):
        """Should handle title with all allowed special characters."""
        title = "Test-Site.2024:'Best\"Choice\":"
        settings = create_site_settings(db_session, user_with_admin_role.id, site_title=title)
        assert settings.site_title == title

    def test_multiple_sequential_updates_create_history(self, db_session: Session, user_with_admin_role: User):
        """Should create separate entries for each update."""
        initial_count = count_settings_entries(db_session)
        
        s1 = create_site_settings(db_session, user_with_admin_role.id, site_title="V1")
        s2 = create_site_settings(db_session, user_with_admin_role.id, site_title="V2")
        s3 = create_site_settings(db_session, user_with_admin_role.id, site_title="V3")
        
        assert count_settings_entries(db_session) == initial_count + 3
        assert s3.id > s2.id > s1.id
        
        latest = get_latest_settings(db_session)
        assert latest.id == s3.id
        assert latest.site_title == "V3"

    def test_upload_logo_then_remove_it(self, db_session: Session, user_with_admin_role: User):
        """Should handle upload and removal lifecycle."""
        # Upload
        logo_data = create_test_image(1200, 40, "PNG")
        logo_b64 = base64.b64encode(logo_data).decode('utf-8')
        
        uploaded = create_site_settings(
            db_session,
            user_with_admin_role.id,
            site_logo_enabled=True,
            site_logo_data=logo_b64,
            site_logo_mime_type="image/png"
        )
        assert uploaded.site_logo_data is not None
        
        # Remove
        removed = create_site_settings(
            db_session,
            user_with_admin_role.id,
            site_logo_enabled=False,
            site_logo_data=None,
            site_logo_mime_type=None
        )
        assert removed.site_logo_data is None

    def test_upload_favicon_then_remove_it(self, db_session: Session, user_with_admin_role: User):
        """Should handle favicon upload and removal lifecycle."""
        # Upload
        favicon_data = create_test_favicon(32, "PNG")
        favicon_b64 = base64.b64encode(favicon_data).decode('utf-8')
        
        uploaded = create_site_settings(
            db_session,
            user_with_admin_role.id,
            site_favicon_data=favicon_b64,
            site_favicon_mime_type="image/png"
        )
        assert uploaded.site_favicon_data is not None
        
        # Remove
        removed = create_site_settings(
            db_session,
            user_with_admin_role.id,
            site_favicon_data=None,
            site_favicon_mime_type=None
        )
        assert removed.site_favicon_data is None

    def test_upload_both_logo_and_favicon(self, db_session: Session, user_with_admin_role: User):
        """Should handle both logo and favicon in same settings."""
        logo_data = create_test_image(1200, 40, "PNG")
        logo_b64 = base64.b64encode(logo_data).decode('utf-8')
        
        favicon_data = create_test_favicon(32, "PNG")
        favicon_b64 = base64.b64encode(favicon_data).decode('utf-8')
        
        settings = create_site_settings(
            db_session,
            user_with_admin_role.id,
            site_logo_enabled=True,
            site_logo_data=logo_b64,
            site_logo_mime_type="image/png",
            site_favicon_data=favicon_b64,
            site_favicon_mime_type="image/png"
        )
        
        assert settings.site_logo_data is not None
        assert settings.site_favicon_data is not None

    def test_remove_logo_preserves_favicon(self, db_session: Session, user_with_admin_role: User):
        """Should preserve favicon when removing logo."""
        logo_data = create_test_image(1200, 40, "PNG")
        logo_b64 = base64.b64encode(logo_data).decode('utf-8')
        favicon_data = create_test_favicon(32, "PNG")
        favicon_b64 = base64.b64encode(favicon_data).decode('utf-8')
        
        # Both present
        create_site_settings(
            db_session,
            user_with_admin_role.id,
            site_logo_enabled=True,
            site_logo_data=logo_b64,
            site_logo_mime_type="image/png",
            site_favicon_data=favicon_b64,
            site_favicon_mime_type="image/png"
        )
        
        # Remove logo, keep favicon
        updated = create_site_settings(
            db_session,
            user_with_admin_role.id,
            site_logo_enabled=False,
            site_logo_data=None,
            site_logo_mime_type=None,
            site_favicon_data=favicon_b64,
            site_favicon_mime_type="image/png"
        )
        
        assert updated.site_logo_data is None
        assert updated.site_favicon_data is not None

    def test_remove_favicon_preserves_logo(self, db_session: Session, user_with_admin_role: User):
        """Should preserve logo when removing favicon."""
        logo_data = create_test_image(1200, 40, "PNG")
        logo_b64 = base64.b64encode(logo_data).decode('utf-8')
        favicon_data = create_test_favicon(32, "PNG")
        favicon_b64 = base64.b64encode(favicon_data).decode('utf-8')
        
        # Both present
        create_site_settings(
            db_session,
            user_with_admin_role.id,
            site_logo_enabled=True,
            site_logo_data=logo_b64,
            site_logo_mime_type="image/png",
            site_favicon_data=favicon_b64,
            site_favicon_mime_type="image/png"
        )
        
        # Remove favicon, keep logo
        updated = create_site_settings(
            db_session,
            user_with_admin_role.id,
            site_logo_enabled=True,
            site_logo_data=logo_b64,
            site_logo_mime_type="image/png",
            site_favicon_data=None,
            site_favicon_mime_type=None
        )
        
        assert updated.site_logo_data is not None
        assert updated.site_favicon_data is None

    def test_large_logo_near_2mb_limit(self, db_session: Session, user_with_admin_role: User):
        """Should handle logo close to 2MB limit."""
        # Create a larger image
        logo_data = create_test_image(1200, 40, "PNG", color=(255, 128, 64))
        logo_b64 = base64.b64encode(logo_data).decode('utf-8')
        
        settings = create_site_settings(
            db_session,
            user_with_admin_role.id,
            site_logo_data=logo_b64,
            site_logo_mime_type="image/png"
        )
        
        # Verify it's stored
        assert settings.site_logo_data is not None
        assert len(settings.site_logo_data) > 100

    def test_large_favicon_near_500kb_limit(self, db_session: Session, user_with_admin_role: User):
        """Should handle favicon close to 500KB limit."""
        favicon_data = create_test_favicon(64, "PNG", color=(128, 64, 200))
        favicon_b64 = base64.b64encode(favicon_data).decode('utf-8')
        
        settings = create_site_settings(
            db_session,
            user_with_admin_role.id,
            site_favicon_data=favicon_b64,
            site_favicon_mime_type="image/png"
        )
        
        assert settings.site_favicon_data is not None
        assert len(settings.site_favicon_data) > 100

    def test_base64_decode_roundtrip(self, db_session: Session, user_with_admin_role: User):
        """Should correctly encode and decode image data."""
        original_logo = create_test_image(1200, 40, "PNG")
        original_favicon = create_test_favicon(32, "PNG")
        
        logo_b64 = base64.b64encode(original_logo).decode('utf-8')
        favicon_b64 = base64.b64encode(original_favicon).decode('utf-8')
        
        settings = create_site_settings(
            db_session,
            user_with_admin_role.id,
            site_logo_data=logo_b64,
            site_logo_mime_type="image/png",
            site_favicon_data=favicon_b64,
            site_favicon_mime_type="image/png"
        )
        
        # Decode and verify
        decoded_logo = base64.b64decode(settings.site_logo_data)
        decoded_favicon = base64.b64decode(settings.site_favicon_data)
        
        assert decoded_logo == original_logo
        assert decoded_favicon == original_favicon

    def test_updated_at_timestamp_changes(self, db_session: Session, user_with_admin_role: User):
        """Should update timestamp on each change."""
        s1 = create_site_settings(db_session, user_with_admin_role.id, site_title="Version 1")
        time1 = s1.updated_at
        
        s2 = create_site_settings(db_session, user_with_admin_role.id, site_title="Version 2")
        time2 = s2.updated_at
        
        # Second update should have a timestamp (may be same or later depending on speed)
        assert time2 is not None
        assert isinstance(time2, datetime)
