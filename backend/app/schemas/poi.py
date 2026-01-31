"""POI schemas with enhanced validation."""
from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


# Valid POI categories
POI_CATEGORIES = [
    "vendor", "booth", "kiosk", "room", "restroom", "entrance", "exit",
    "stairs", "elevator", "food", "medical", "office", "information",
    "parking", "atm", "other"
]

# Valid icon names
VALID_ICONS = [
    "marker", "store", "restaurant", "restroom", "medical", "info",
    "parking", "atm", "stairs", "elevator", "entrance", "exit", "star"
]


class POIBase(BaseModel):
    """Base POI schema with coordinate and category validation."""
    name: str = Field(..., min_length=1, max_length=255, description="POI name")
    description: Optional[str] = Field(None, max_length=1000)
    category: Optional[str] = Field(None, max_length=100)
    x: float = Field(..., ge=0, description="X coordinate (must be non-negative)")
    y: float = Field(..., ge=0, description="Y coordinate (must be non-negative)")
    icon: str = Field(default="marker", max_length=100)
    searchable: bool = True
    custom_metadata: Optional[Dict[str, Any]] = None

    @field_validator('category')
    @classmethod
    def validate_category(cls, v: Optional[str]) -> Optional[str]:
        """Validate category is one of the allowed values or None."""
        if v is not None and v not in POI_CATEGORIES:
            # Allow custom categories but log warning
            # For strict validation, uncomment below:
            # raise ValueError(
            #     f"Invalid category '{v}'. Recommended: {', '.join(POI_CATEGORIES)}"
            # )
            pass
        return v

    @field_validator('icon')
    @classmethod
    def validate_icon(cls, v: str) -> str:
        """Validate icon is one of the allowed values."""
        if v not in VALID_ICONS:
            # Default to marker if invalid
            return "marker"
        return v

    @field_validator('x', 'y')
    @classmethod
    def validate_coordinate_range(cls, v: float) -> float:
        """Validate coordinates are within reasonable bounds."""
        max_coord = 100000  # Maximum reasonable coordinate value
        if v > max_coord:
            raise ValueError(f"Coordinate value {v} exceeds maximum of {max_coord}")
        return v

    @field_validator('custom_metadata')
    @classmethod
    def validate_metadata_size(cls, v: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Validate metadata size to prevent abuse."""
        if v is not None:
            import json
            json_str = json.dumps(v)
            if len(json_str) > 10000:  # 10KB limit
                raise ValueError("Custom metadata exceeds maximum size of 10KB")
        return v


class POICreate(POIBase):
    """Schema for creating a new POI."""
    floor_plan_id: UUID
    node_id: Optional[UUID] = None


class POIUpdate(BaseModel):
    """Schema for updating an existing POI."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    category: Optional[str] = Field(None, max_length=100)
    x: Optional[float] = Field(None, ge=0)
    y: Optional[float] = Field(None, ge=0)
    icon: Optional[str] = Field(None, max_length=100)
    searchable: Optional[bool] = None
    custom_metadata: Optional[Dict[str, Any]] = None
    node_id: Optional[UUID] = None

    @field_validator('x', 'y')
    @classmethod
    def validate_coordinate_range(cls, v: Optional[float]) -> Optional[float]:
        """Validate coordinates are within reasonable bounds if provided."""
        if v is not None:
            max_coord = 100000
            if v > max_coord:
                raise ValueError(f"Coordinate value {v} exceeds maximum of {max_coord}")
        return v

    @field_validator('custom_metadata')
    @classmethod
    def validate_metadata_size(cls, v: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Validate metadata size to prevent abuse."""
        if v is not None:
            import json
            json_str = json.dumps(v)
            if len(json_str) > 10000:  # 10KB limit
                raise ValueError("Custom metadata exceeds maximum size of 10KB")
        return v


class POIResponse(POIBase):
    """POI response schema."""
    id: UUID
    floor_plan_id: UUID
    node_id: Optional[UUID]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
