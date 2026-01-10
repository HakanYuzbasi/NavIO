from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field


class NodeBase(BaseModel):
    x: float
    y: float
    node_type: str = Field(default="waypoint", max_length=50)
    name: Optional[str] = Field(None, max_length=255)
    accessibility_level: str = Field(default="wheelchair_accessible", max_length=50)


class NodeCreate(NodeBase):
    floor_plan_id: UUID


class NodeUpdate(BaseModel):
    x: Optional[float] = None
    y: Optional[float] = None
    node_type: Optional[str] = Field(None, max_length=50)
    name: Optional[str] = Field(None, max_length=255)
    accessibility_level: Optional[str] = Field(None, max_length=50)


class NodeResponse(NodeBase):
    id: UUID
    floor_plan_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
