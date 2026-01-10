from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field


class FloorPlanBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    organization_id: Optional[UUID] = None


class FloorPlanCreate(FloorPlanBase):
    image_width: int = Field(..., gt=0)
    image_height: int = Field(..., gt=0)


class FloorPlanUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None


class FloorPlanResponse(FloorPlanBase):
    id: UUID
    image_url: str
    image_width: int
    image_height: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FloorPlanWithGraph(FloorPlanResponse):
    """Floor plan with complete navigation graph."""
    nodes: List["NodeResponse"] = []
    edges: List["EdgeResponse"] = []
    pois: List["POIResponse"] = []
    qr_anchors: List["QRAnchorResponse"] = []

    class Config:
        from_attributes = True


# Import here to avoid circular imports
from .node import NodeResponse
from .edge import EdgeResponse
from .poi import POIResponse
from .qr_anchor import QRAnchorResponse

FloorPlanWithGraph.model_rebuild()
