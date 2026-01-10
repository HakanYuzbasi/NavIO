from sqlalchemy import Column, String, Float, Boolean, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from .base import BaseModel


class POI(BaseModel):
    """Point of Interest on the floor plan."""

    __tablename__ = "pois"

    floor_plan_id = Column(UUID(as_uuid=True), ForeignKey("floor_plans.id"), nullable=False)
    node_id = Column(UUID(as_uuid=True), ForeignKey("nodes.id"), nullable=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)  # medical, office, restroom, entrance, etc.
    x = Column(Float, nullable=False)
    y = Column(Float, nullable=False)
    icon = Column(String(100), default="marker")
    searchable = Column(Boolean, default=True)
    metadata = Column(JSONB, nullable=True)  # Custom attributes

    # Relationships
    floor_plan = relationship("FloorPlan", back_populates="pois")
    node = relationship("Node", back_populates="pois")

    def __repr__(self):
        return f"<POI(id={self.id}, name='{self.name}', category='{self.category}')>"
