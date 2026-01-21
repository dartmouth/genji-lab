# tests/unit/test_annotation_schemas.py
import pytest
from pydantic import ValidationError

from schemas.annotations import (
    Body,
    TextPositionSelector,
    TextQuoteSelector,
    TextTarget,
    ObjectTarget,
    AnnotationBase,
    AnnotationCreate,
    Annotation,
    AnnotationPatch,
    AnnotationAddTarget
)


class TestTextPositionSelector:
    """Test TextPositionSelector schema validation."""
    
    def test_valid_selector(self):
        """Should accept valid start and end positions."""
        selector = TextPositionSelector(type="TextPositionSelector", start=0, end=10)
        assert selector.start == 0
        assert selector.end == 10
        assert selector.type == "TextPositionSelector"
    
    def test_default_type_value(self):
        """Should use default type value when not provided."""
        selector = TextPositionSelector(start=0, end=10)
        assert selector.type == "TextPositionSelector"
    
    def test_missing_start_raises_error(self):
        """Should reject missing start position."""
        with pytest.raises(ValidationError) as exc_info:
            TextPositionSelector(type="TextPositionSelector", end=10)
        errors = exc_info.value.errors()
        error_fields = [e["loc"][0] for e in errors]
        assert "start" in error_fields
    
    def test_missing_end_raises_error(self):
        """Should reject missing end position."""
        with pytest.raises(ValidationError) as exc_info:
            TextPositionSelector(type="TextPositionSelector", start=0)
        errors = exc_info.value.errors()
        error_fields = [e["loc"][0] for e in errors]
        assert "end" in error_fields
    
    def test_negative_positions_accepted(self):
        """Should accept negative positions (schema doesn't restrict)."""
        selector = TextPositionSelector(start=-5, end=-1)
        assert selector.start == -5
        assert selector.end == -1

class TestTextQuoteSelector:
    """Test TextQuoteSelector schema validation."""
    
    def test_valid_selector_with_refinement(self):
        """Should accept valid selector with refined_by."""
        selector = TextQuoteSelector(
            type="TextQuoteSelector",
            value="test quote",
            refined_by=TextPositionSelector(
                type="TextPositionSelector",
                start=5,
                end=15
            )
        )
        assert selector.value == "test quote"
        assert selector.refined_by.start == 5
        assert selector.refined_by.end == 15
    
    def test_default_type_value(self):
        """Should use default type value when not provided."""
        selector = TextQuoteSelector(
            value="test",
            refined_by=TextPositionSelector(start=0, end=4)
        )
        assert selector.type == "TextQuoteSelector"
    
    def test_missing_value_raises_error(self):
        """Should reject missing value."""
        with pytest.raises(ValidationError) as exc_info:
            TextQuoteSelector(
                type="TextQuoteSelector",
                refined_by=TextPositionSelector(start=0, end=10)
            )
        errors = exc_info.value.errors()
        error_fields = [e["loc"][0] for e in errors]
        assert "value" in error_fields
    
    def test_missing_refined_by_raises_error(self):
        """Should reject missing refined_by."""
        with pytest.raises(ValidationError) as exc_info:
            TextQuoteSelector(type="TextQuoteSelector", value="test")
        errors = exc_info.value.errors()
        error_fields = [e["loc"][0] for e in errors]
        assert "refined_by" in error_fields
    
    def test_empty_value_accepted(self):
        """Should accept empty string value."""
        selector = TextQuoteSelector(
            value="",
            refined_by=TextPositionSelector(start=0, end=0)
        )
        assert selector.value == ""

class TestBody:
    """Test Body schema validation."""
    
    def test_body_with_all_fields(self, valid_body_data):
        """Should accept all valid fields."""
        body = Body(**valid_body_data)
        assert body.type == "TextualBody"
        assert body.value == "This is a test annotation"
        assert body.format == "text/plain"
        assert body.language == "en"
    
    def test_body_id_is_optional(self):
        """Body ID should be optional and default to None."""
        body = Body(
            type="TextualBody",
            value="Test",
            format="text/plain",
            language="en"
        )
        assert body.id is None
    
    def test_body_with_explicit_id(self, valid_body_data):
        """Should accept explicit ID."""
        valid_body_data["id"] = 42
        body = Body(**valid_body_data)
        assert body.id == 42
    
    def test_body_missing_type_raises_error(self):
        """Should reject missing type field."""
        with pytest.raises(ValidationError) as exc_info:
            Body(value="Test", format="text/plain", language="en")
        errors = exc_info.value.errors()
        error_fields = [e["loc"][0] for e in errors]
        assert "type" in error_fields
    
    def test_body_missing_value_raises_error(self):
        """Should reject missing value field."""
        with pytest.raises(ValidationError) as exc_info:
            Body(type="TextualBody", format="text/plain", language="en")
        errors = exc_info.value.errors()
        error_fields = [e["loc"][0] for e in errors]
        assert "value" in error_fields
    
    def test_body_missing_format_raises_error(self):
        """Should reject missing format field."""
        with pytest.raises(ValidationError) as exc_info:
            Body(type="TextualBody", value="Test", language="en")
        errors = exc_info.value.errors()
        error_fields = [e["loc"][0] for e in errors]
        assert "format" in error_fields
    
    def test_body_missing_language_raises_error(self):
        """Should reject missing language field."""
        with pytest.raises(ValidationError) as exc_info:
            Body(type="TextualBody", value="Test", format="text/plain")
        errors = exc_info.value.errors()
        error_fields = [e["loc"][0] for e in errors]
        assert "language" in error_fields
    
    def test_body_empty_value_accepted(self):
        """Should accept empty string value."""
        body = Body(
            type="TextualBody",
            value="",
            format="text/plain",
            language="en"
        )
        assert body.value == ""


class TestTextTarget:
    """Test TextTarget schema validation."""
    
    def test_text_target_with_string_source(self):
        """Should accept string source (matches TypeScript interface)."""
        target = TextTarget(
            type="TextTarget",
            source="https://example.com/document/1",
            selector=None
        )
        assert target.source == "https://example.com/document/1"
    
    def test_text_target_with_int_source(self):
        """Should accept integer source (Python schema allows Union[int, str]) [1]."""
        target = TextTarget(
            type="TextTarget",
            source=123,
            selector=None
        )
        assert target.source == 123
    
    def test_text_target_with_selector(self, valid_text_target_data):
        """Should accept nested selector structure."""
        target = TextTarget(**valid_text_target_data)
        assert target.selector is not None
        assert target.selector.value == "selected text"
        assert target.selector.refined_by.start == 0
        assert target.selector.refined_by.end == 13
    
    def test_text_target_selector_is_optional(self):
        """Selector should be optional [1]."""
        target = TextTarget(
            type="TextTarget",
            source="doc/1",
            selector=None
        )
        assert target.selector is None
    
    def test_text_target_id_is_optional(self, valid_text_target_data):
        """Target ID should be optional (assigned by service) [1]."""
        del valid_text_target_data["id"]
        target = TextTarget(**valid_text_target_data)
        assert target.id is None
    
    def test_text_target_missing_type_raises_error(self):
        """Should reject missing type field."""
        with pytest.raises(ValidationError) as exc_info:
            TextTarget(source="doc/1", selector=None)
        errors = exc_info.value.errors()
        error_fields = [e["loc"][0] for e in errors]
        assert "type" in error_fields
    
    def test_text_target_missing_source_raises_error(self):
        """Should reject missing source field."""
        with pytest.raises(ValidationError) as exc_info:
            TextTarget(type="TextTarget", selector=None)
        errors = exc_info.value.errors()
        error_fields = [e["loc"][0] for e in errors]
        assert "source" in error_fields

class TestObjectTarget:
    """Test ObjectTarget schema validation."""
    
    def test_valid_object_target(self, valid_object_target_data):
        """Should accept valid object target."""
        target = ObjectTarget(**valid_object_target_data)
        assert target.type == "ObjectTarget"
        assert target.source == "image/1"
    
    def test_object_target_with_string_source(self):
        """Should accept string source."""
        target = ObjectTarget(type="ObjectTarget", source="https://example.com/image.png")
        assert target.source == "https://example.com/image.png"
    
    def test_object_target_with_int_source(self):
        """Should accept integer source [1]."""
        target = ObjectTarget(type="ObjectTarget", source=456)
        assert target.source == 456
    
    def test_object_target_id_is_optional(self):
        """Target ID should be optional [1]."""
        target = ObjectTarget(type="ObjectTarget", source="image/1")
        assert target.id is None
    
    def test_object_target_with_explicit_id(self):
        """Should accept explicit ID."""
        target = ObjectTarget(id=99, type="ObjectTarget", source="image/1")
        assert target.id == 99
    
    def test_object_target_missing_type_raises_error(self):
        """Should reject missing type field."""
        with pytest.raises(ValidationError) as exc_info:
            ObjectTarget(source="image/1")
        errors = exc_info.value.errors()
        error_fields = [e["loc"][0] for e in errors]
        assert "type" in error_fields
    
    def test_object_target_missing_source_raises_error(self):
        """Should reject missing source field."""
        with pytest.raises(ValidationError) as exc_info:
            ObjectTarget(type="ObjectTarget")
        errors = exc_info.value.errors()
        error_fields = [e["loc"][0] for e in errors]
        assert "source" in error_fields


class TestAnnotationCreate:
    """Test AnnotationCreate schema validation."""
    
    def test_valid_annotation_create(self, valid_annotation_create_data):
        """Should accept valid annotation creation data."""
        annotation = AnnotationCreate(**valid_annotation_create_data)
        assert annotation.motivation == "commenting"
        assert annotation.body.value == "This is a test annotation"
        assert len(annotation.target) == 1
    
    def test_annotation_with_text_target(self, valid_annotation_create_data):
        """Should accept annotation with TextTarget."""
        annotation = AnnotationCreate(**valid_annotation_create_data)
        target = annotation.target[0]
        assert target.type == "TextTarget"
        assert target.selector is not None
    
    def test_annotation_with_object_target(
        self, 
        valid_annotation_create_data, 
        valid_object_target_data
    ):
        """Should accept annotation with ObjectTarget."""
        valid_annotation_create_data["target"] = [valid_object_target_data]
        annotation = AnnotationCreate(**valid_annotation_create_data)
        target = annotation.target[0]
        assert target.type == "ObjectTarget"
    
    def test_annotation_with_mixed_targets(
        self,
        valid_annotation_create_data,
        valid_text_target_data,
        valid_object_target_data
    ):
        """Should accept annotation with both TextTarget and ObjectTarget."""
        valid_annotation_create_data["target"] = [
            valid_text_target_data,
            valid_object_target_data
        ]
        annotation = AnnotationCreate(**valid_annotation_create_data)
        assert len(annotation.target) == 2
    
    def test_annotation_with_nested_targets(self, valid_annotation_create_data):
        """Should accept nested target arrays for linking annotations [1]."""
        valid_annotation_create_data["target"] = [
            [
                {"type": "TextTarget", "source": "doc/1", "selector": None},
                {"type": "TextTarget", "source": "doc/2", "selector": None}
            ]
        ]
        annotation = AnnotationCreate(**valid_annotation_create_data)
        assert len(annotation.target) == 1
        assert isinstance(annotation.target[0], list)
        assert len(annotation.target[0]) == 2
    
    def test_annotation_context_is_optional(self, valid_annotation_create_data):
        """Context should be optional [1]."""
        del valid_annotation_create_data["context"]
        annotation = AnnotationCreate(**valid_annotation_create_data)
        assert annotation.context is None
    
    def test_annotation_classroom_id_is_optional(self, valid_annotation_create_data):
        """Classroom ID should be optional [1]."""
        annotation = AnnotationCreate(**valid_annotation_create_data)
        assert annotation.classroom_id is None
    
    def test_annotation_with_classroom_id(self, valid_annotation_create_data):
        """Should accept classroom_id when provided."""
        valid_annotation_create_data["classroom_id"] = 5
        annotation = AnnotationCreate(**valid_annotation_create_data)
        assert annotation.classroom_id == 5
    
    def test_annotation_missing_creator_id_raises_error(self, valid_annotation_create_data):
        """Should reject missing creator_id [1]."""
        del valid_annotation_create_data["creator_id"]
        with pytest.raises(ValidationError) as exc_info:
            AnnotationCreate(**valid_annotation_create_data)
        errors = exc_info.value.errors()
        error_fields = [e["loc"][0] for e in errors]
        assert "creator_id" in error_fields
    
    def test_annotation_with_empty_target_list(self, valid_annotation_create_data):
        """Should accept empty target list."""
        valid_annotation_create_data["target"] = []
        annotation = AnnotationCreate(**valid_annotation_create_data)
        assert annotation.target == []
    
    def test_annotation_target_is_optional(self, valid_annotation_create_data):
        """Target should be optional [1]."""
        del valid_annotation_create_data["target"]
        annotation = AnnotationCreate(**valid_annotation_create_data)
        assert annotation.target is None

class TestAnnotation:
    """Test Annotation schema validation (response model)."""
    
    def test_annotation_requires_id(self, valid_annotation_create_data):
        """Annotation response should require id field [1]."""
        valid_annotation_create_data["creator"] = None
        with pytest.raises(ValidationError) as exc_info:
            Annotation(**valid_annotation_create_data)
        errors = exc_info.value.errors()
        error_fields = [e["loc"][0] for e in errors]
        assert "id" in error_fields
    
    def test_annotation_with_id(self, valid_annotation_create_data):
        """Should accept annotation with id."""
        valid_annotation_create_data["id"] = 1
        valid_annotation_create_data["creator"] = None
        annotation = Annotation(**valid_annotation_create_data)
        assert annotation.id == 1
    
    def test_annotation_timestamps_are_optional(self, valid_annotation_create_data):
        """Timestamps should be optional [1]."""
        valid_annotation_create_data["id"] = 1
        valid_annotation_create_data["creator"] = None
        annotation = Annotation(**valid_annotation_create_data)
        assert annotation.created is None
        assert annotation.modified is None
        assert annotation.generated is None
    
    def test_annotation_with_timestamps(self, valid_annotation_create_data):
        """Should accept annotation with timestamps."""
        from datetime import datetime
        now = datetime.now()
        
        valid_annotation_create_data["id"] = 1
        valid_annotation_create_data["creator"] = None
        valid_annotation_create_data["created"] = now
        valid_annotation_create_data["modified"] = now
        valid_annotation_create_data["generated"] = now
        
        annotation = Annotation(**valid_annotation_create_data)
        assert annotation.created == now
        assert annotation.modified == now
        assert annotation.generated == now
    
    def test_annotation_creator_accepts_none(self, valid_annotation_create_data):
        """Creator can be set to None explicitly [1]."""
        valid_annotation_create_data["id"] = 1
        valid_annotation_create_data["creator"] = None
        annotation = Annotation(**valid_annotation_create_data)
        assert annotation.creator is None
    
    def test_annotation_creator_is_required(self, valid_annotation_create_data):
        """Creator field must be provided (even if None) [1]."""
        valid_annotation_create_data["id"] = 1
        # Don't set creator at all
        with pytest.raises(ValidationError) as exc_info:
            Annotation(**valid_annotation_create_data)
        errors = exc_info.value.errors()
        error_fields = [e["loc"][0] for e in errors]
        assert "creator" in error_fields

class TestAnnotationPatch:
    """Test AnnotationPatch schema validation."""
    
    def test_patch_with_body_only(self):
        """Should accept body-only patch [1]."""
        patch = AnnotationPatch(body="Updated content")
        assert patch.body == "Updated content"
        assert patch.motivation is None
    
    def test_patch_with_motivation_only(self):
        """Should accept motivation-only patch [1]."""
        patch = AnnotationPatch(motivation="highlighting")
        assert patch.motivation == "highlighting"
        assert patch.body is None
    
    def test_patch_with_both_fields(self):
        """Should accept both fields."""
        patch = AnnotationPatch(body="New content", motivation="editing")
        assert patch.body == "New content"
        assert patch.motivation == "editing"
    
    def test_empty_patch_is_valid(self):
        """Should accept empty patch (all fields optional) [1]."""
        patch = AnnotationPatch()
        assert patch.body is None
        assert patch.motivation is None
    
    def test_patch_body_is_string(self):
        """Body should be a string value, not a Body object [1]."""
        patch = AnnotationPatch(body="Just a string value")
        assert isinstance(patch.body, str)


class TestAnnotationAddTarget:
    """Test AnnotationAddTarget schema validation."""
    
    def test_add_single_text_target(self, valid_text_target_data):
        """Should accept single TextTarget [1]."""
        add_target = AnnotationAddTarget(target=valid_text_target_data)
        assert add_target.target is not None
    
    def test_add_single_object_target(self, valid_object_target_data):
        """Should accept single ObjectTarget [1]."""
        add_target = AnnotationAddTarget(target=valid_object_target_data)
        assert add_target.target is not None
    
    def test_add_list_of_targets(self, valid_text_target_data, valid_object_target_data):
        """Should accept list of targets [1]."""
        add_target = AnnotationAddTarget(
            target=[valid_text_target_data, valid_object_target_data]
        )
        assert isinstance(add_target.target, list)
        assert len(add_target.target) == 2
    
    def test_add_empty_list_of_targets(self):
        """Should accept empty list of targets."""
        add_target = AnnotationAddTarget(target=[])
        assert add_target.target == []
    
    def test_target_defaults_to_none(self):
        """Target should default to None [1]."""
        add_target = AnnotationAddTarget()
        assert add_target.target is None                