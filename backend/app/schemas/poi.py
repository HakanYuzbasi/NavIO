from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field


class POIBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    category: Optional[str] = Field(None, max_length=100)
    x: float
    y: float
    icon: str = Field(default="marker", max_length=100)
    searchable: bool = True
    custom_metadata: Optional[Dict[str, Any]] = None


class POICreate(POIBase):
    floor_plan_id: UUID
    node_id: Optional[UUID] = None


class POIUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    category: Optional[str] = Field(None, max_length=100)
    x: Optional[float] = None
    y: Optional[float] = None
    icon: Optional[str] = Field(None, max_length=100)
    searchable: Optional[bool] = None
    custom_metadata: Optional[Dict[str, Any]] = None
    node_id: Optional[UUID] = None


class POIResponse(POIBase):
    id: UUID
    floor_plan_id: UUID
    node_id: Optional[UUID]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
