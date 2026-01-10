from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field


class EdgeBase(BaseModel):
    source_node_id: UUID
    target_node_id: UUID
    weight: Optional[float] = None  # Auto-calculated if None
    bidirectional: bool = True
    accessible: bool = True
    edge_type: str = Field(default="corridor", max_length=50)


class EdgeCreate(EdgeBase):
    floor_plan_id: UUID


class EdgeUpdate(BaseModel):
    weight: Optional[float] = None
    bidirectional: Optional[bool] = None
    accessible: Optional[bool] = None
    edge_type: Optional[str] = Field(None, max_length=50)


class EdgeResponse(EdgeBase):
    id: UUID
    floor_plan_id: UUID
    weight: float
    created_at: datetime

    class Config:
        from_attributes = True
