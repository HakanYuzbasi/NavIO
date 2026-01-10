from sqlalchemy import Column, String, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .base import BaseModel


class FloorPlan(BaseModel):
    """Floor plan model representing a navigable floor space."""

    __tablename__ = "floor_plans"

    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String(512), nullable=False)
    image_width = Column(Integer, nullable=False)
    image_height = Column(Integer, nullable=False)
    organization_id = Column(UUID(as_uuid=True), nullable=True)  # For multi-tenancy

    # Relationships
    nodes = relationship("Node", back_populates="floor_plan", cascade="all, delete-orphan")
    edges = relationship("Edge", back_populates="floor_plan", cascade="all, delete-orphan")
    pois = relationship("POI", back_populates="floor_plan", cascade="all, delete-orphan")
    qr_anchors = relationship("QRAnchor", back_populates="floor_plan", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<FloorPlan(id={self.id}, name='{self.name}')>"
