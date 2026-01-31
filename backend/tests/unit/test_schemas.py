"""Unit tests for Pydantic schemas validation."""
import pytest
from uuid import uuid4
from pydantic import ValidationError

from app.schemas.node import NodeCreate, NodeUpdate, NODE_TYPES
from app.schemas.poi import POICreate, POIUpdate
from app.schemas.user import UserCreate, PasswordChangeRequest
from app.schemas.floor_plan import FloorPlanCreate


class TestNodeSchemas:
    """Tests for Node schemas validation."""

    def test_node_create_valid(self):
        """Should accept valid node data."""
        node = NodeCreate(
            floor_plan_id=uuid4(),
            x=100.0,
            y=200.0,
            node_type="waypoint",
            name="Test Node"
        )
        assert node.x == 100.0
        assert node.y == 200.0
        assert node.node_type == "waypoint"

    def test_node_create_negative_x(self):
        """Should reject negative x coordinate."""
        with pytest.raises(ValidationError) as exc_info:
            NodeCreate(
                floor_plan_id=uuid4(),
                x=-10.0,
                y=200.0
            )
        assert "greater than or equal to 0" in str(exc_info.value).lower()

    def test_node_create_negative_y(self):
        """Should reject negative y coordinate."""
        with pytest.raises(ValidationError) as exc_info:
            NodeCreate(
                floor_plan_id=uuid4(),
                x=100.0,
                y=-50.0
            )
        assert "greater than or equal to 0" in str(exc_info.value).lower()

    def test_node_create_invalid_type(self):
        """Should reject invalid node type."""
        with pytest.raises(ValidationError) as exc_info:
            NodeCreate(
                floor_plan_id=uuid4(),
                x=100.0,
                y=200.0,
                node_type="invalid_type"
            )
        assert "invalid node type" in str(exc_info.value).lower()

    def test_node_create_coordinate_too_large(self):
        """Should reject coordinates exceeding maximum."""
        with pytest.raises(ValidationError) as exc_info:
            NodeCreate(
                floor_plan_id=uuid4(),
                x=200000.0,
                y=200.0
            )
        assert "exceeds maximum" in str(exc_info.value).lower()

    def test_node_update_partial(self):
        """Should allow partial updates."""
        update = NodeUpdate(x=150.0)
        assert update.x == 150.0
        assert update.y is None
        assert update.node_type is None

    def test_valid_node_types(self):
        """Should accept all valid node types."""
        floor_plan_id = uuid4()
        for node_type in NODE_TYPES:
            node = NodeCreate(
                floor_plan_id=floor_plan_id,
                x=100.0,
                y=100.0,
                node_type=node_type
            )
            assert node.node_type == node_type


class TestPOISchemas:
    """Tests for POI schemas validation."""

    def test_poi_create_valid(self):
        """Should accept valid POI data."""
        poi = POICreate(
            floor_plan_id=uuid4(),
            name="Test POI",
            x=100.0,
            y=200.0,
            category="vendor"
        )
        assert poi.name == "Test POI"
        assert poi.category == "vendor"

    def test_poi_create_empty_name(self):
        """Should reject empty name."""
        with pytest.raises(ValidationError) as exc_info:
            POICreate(
                floor_plan_id=uuid4(),
                name="",
                x=100.0,
                y=200.0
            )
        assert "min_length" in str(exc_info.value).lower() or "at least 1" in str(exc_info.value).lower()

    def test_poi_create_name_too_long(self):
        """Should reject name exceeding max length."""
        with pytest.raises(ValidationError) as exc_info:
            POICreate(
                floor_plan_id=uuid4(),
                name="x" * 256,
                x=100.0,
                y=200.0
            )
        assert "max_length" in str(exc_info.value).lower() or "at most 255" in str(exc_info.value).lower()

    def test_poi_create_negative_coordinates(self):
        """Should reject negative coordinates."""
        with pytest.raises(ValidationError) as exc_info:
            POICreate(
                floor_plan_id=uuid4(),
                name="Test POI",
                x=-10.0,
                y=200.0
            )
        assert "greater than or equal to 0" in str(exc_info.value).lower()

    def test_poi_metadata_valid(self):
        """Should accept valid metadata."""
        poi = POICreate(
            floor_plan_id=uuid4(),
            name="Test POI",
            x=100.0,
            y=200.0,
            custom_metadata={"hours": "9-5", "phone": "123-456"}
        )
        assert poi.custom_metadata == {"hours": "9-5", "phone": "123-456"}

    def test_poi_metadata_too_large(self):
        """Should reject metadata exceeding size limit."""
        large_data = {"key": "x" * 15000}  # Exceed 10KB limit
        with pytest.raises(ValidationError) as exc_info:
            POICreate(
                floor_plan_id=uuid4(),
                name="Test POI",
                x=100.0,
                y=200.0,
                custom_metadata=large_data
            )
        assert "10kb" in str(exc_info.value).lower()


class TestUserSchemas:
    """Tests for User schemas validation."""

    def test_user_create_valid(self):
        """Should accept valid user data."""
        user = UserCreate(
            email="test@example.com",
            password="Password123",
            full_name="Test User"
        )
        assert user.email == "test@example.com"
        assert user.full_name == "Test User"

    def test_user_create_invalid_email(self):
        """Should reject invalid email."""
        with pytest.raises(ValidationError) as exc_info:
            UserCreate(
                email="invalid-email",
                password="Password123"
            )
        assert "email" in str(exc_info.value).lower()

    def test_user_create_password_too_short(self):
        """Should reject password shorter than 8 characters."""
        with pytest.raises(ValidationError) as exc_info:
            UserCreate(
                email="test@example.com",
                password="Pass1"
            )
        assert "min_length" in str(exc_info.value).lower() or "at least 8" in str(exc_info.value).lower()

    def test_user_create_password_no_uppercase(self):
        """Should reject password without uppercase letter."""
        with pytest.raises(ValidationError) as exc_info:
            UserCreate(
                email="test@example.com",
                password="password123"
            )
        assert "uppercase" in str(exc_info.value).lower()

    def test_user_create_password_no_lowercase(self):
        """Should reject password without lowercase letter."""
        with pytest.raises(ValidationError) as exc_info:
            UserCreate(
                email="test@example.com",
                password="PASSWORD123"
            )
        assert "lowercase" in str(exc_info.value).lower()

    def test_user_create_password_no_digit(self):
        """Should reject password without digit."""
        with pytest.raises(ValidationError) as exc_info:
            UserCreate(
                email="test@example.com",
                password="PasswordABC"
            )
        assert "digit" in str(exc_info.value).lower()


class TestFloorPlanSchemas:
    """Tests for FloorPlan schemas validation."""

    def test_floor_plan_create_valid(self):
        """Should accept valid floor plan data."""
        fp = FloorPlanCreate(
            name="Test Floor Plan",
            image_width=1000,
            image_height=800
        )
        assert fp.name == "Test Floor Plan"
        assert fp.image_width == 1000
        assert fp.image_height == 800

    def test_floor_plan_create_empty_name(self):
        """Should reject empty name."""
        with pytest.raises(ValidationError):
            FloorPlanCreate(
                name="",
                image_width=1000,
                image_height=800
            )

    def test_floor_plan_create_zero_dimensions(self):
        """Should reject zero or negative dimensions."""
        with pytest.raises(ValidationError):
            FloorPlanCreate(
                name="Test",
                image_width=0,
                image_height=800
            )

    def test_floor_plan_create_negative_dimensions(self):
        """Should reject negative dimensions."""
        with pytest.raises(ValidationError):
            FloorPlanCreate(
                name="Test",
                image_width=-100,
                image_height=800
            )
