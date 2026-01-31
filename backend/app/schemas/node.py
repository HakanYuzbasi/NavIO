"""Node schemas with enhanced validation."""
from datetime import datetime
from typing import Optional, Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator


# Valid node types
NODE_TYPES = ["waypoint", "entrance", "exit", "stairs", "elevator", "booth_access"]
ACCESSIBILITY_LEVELS = ["wheelchair_accessible", "stairs_only", "restricted", "standard"]


class NodeBase(BaseModel):
    """Base node schema with coordinate validation."""
    x: float = Field(..., ge=0, description="X coordinate (must be non-negative)")
    y: float = Field(..., ge=0, description="Y coordinate (must be non-negative)")
    node_type: str = Field(
        default="waypoint",
        max_length=50,
        description="Type of node"
    )
    name: Optional[str] = Field(None, max_length=255)
    accessibility_level: str = Field(
        default="wheelchair_accessible",
        max_length=50,
        description="Accessibility level of the node"
    )

    @field_validator('node_type')
    @classmethod
    def validate_node_type(cls, v: str) -> str:
        """Validate node type is one of the allowed values."""
        if v not in NODE_TYPES:
            raise ValueError(
                f"Invalid node type '{v}'. Must be one of: {', '.join(NODE_TYPES)}"
            )
        return v

    @field_validator('accessibility_level')
    @classmethod
    def validate_accessibility_level(cls, v: str) -> str:
        """Validate accessibility level is one of the allowed values."""
        if v not in ACCESSIBILITY_LEVELS:
            raise ValueError(
                f"Invalid accessibility level '{v}'. Must be one of: {', '.join(ACCESSIBILITY_LEVELS)}"
            )
        return v

    @field_validator('x', 'y')
    @classmethod
    def validate_coordinate_range(cls, v: float) -> float:
        """Validate coordinates are within reasonable bounds."""
        max_coord = 100000  # Maximum reasonable coordinate value
        if v > max_coord:
            raise ValueError(f"Coordinate value {v} exceeds maximum of {max_coord}")
        return v


class NodeCreate(NodeBase):
    """Schema for creating a new node."""
    floor_plan_id: UUID

    @model_validator(mode='after')
    def validate_coordinates_positive(self):
        """Ensure both coordinates are provided and valid."""
        if self.x is None or self.y is None:
            raise ValueError("Both x and y coordinates are required")
        return self


class NodeUpdate(BaseModel):
    """Schema for updating an existing node."""
    x: Optional[float] = Field(None, ge=0)
    y: Optional[float] = Field(None, ge=0)
    node_type: Optional[str] = Field(None, max_length=50)
    name: Optional[str] = Field(None, max_length=255)
    accessibility_level: Optional[str] = Field(None, max_length=50)

    @field_validator('node_type')
    @classmethod
    def validate_node_type(cls, v: Optional[str]) -> Optional[str]:
        """Validate node type if provided."""
        if v is not None and v not in NODE_TYPES:
            raise ValueError(
                f"Invalid node type '{v}'. Must be one of: {', '.join(NODE_TYPES)}"
            )
        return v

    @field_validator('accessibility_level')
    @classmethod
    def validate_accessibility_level(cls, v: Optional[str]) -> Optional[str]:
        """Validate accessibility level if provided."""
        if v is not None and v not in ACCESSIBILITY_LEVELS:
            raise ValueError(
                f"Invalid accessibility level '{v}'. Must be one of: {', '.join(ACCESSIBILITY_LEVELS)}"
            )
        return v

    @field_validator('x', 'y')
    @classmethod
    def validate_coordinate_range(cls, v: Optional[float]) -> Optional[float]:
        """Validate coordinates are within reasonable bounds if provided."""
        if v is not None:
            max_coord = 100000
            if v > max_coord:
                raise ValueError(f"Coordinate value {v} exceeds maximum of {max_coord}")
        return v


class NodeResponse(NodeBase):
    """Node response schema."""
    id: UUID
    floor_plan_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
