from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field


class QRAnchorBase(BaseModel):
    code: str = Field(..., min_length=1, max_length=100)
    x: float
    y: float
    placement_notes: Optional[str] = None
    active: bool = True


class QRAnchorCreate(QRAnchorBase):
    floor_plan_id: UUID
    node_id: UUID
    qr_data: Optional[str] = None  # Auto-generated if None


class QRAnchorUpdate(BaseModel):
    placement_notes: Optional[str] = None
    active: Optional[bool] = None


class QRAnchorResponse(QRAnchorBase):
    id: UUID
    floor_plan_id: UUID
    node_id: UUID
    qr_data: str
    scan_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
