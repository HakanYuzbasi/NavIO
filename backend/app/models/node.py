from sqlalchemy import Column, String, Float, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .base import BaseModel


class Node(BaseModel):
    """Navigation node/waypoint in the floor plan graph."""

    __tablename__ = "nodes"

    floor_plan_id = Column(UUID(as_uuid=True), ForeignKey("floor_plans.id"), nullable=False)
    x = Column(Float, nullable=False)
    y = Column(Float, nullable=False)
    node_type = Column(String(50), default="waypoint")  # waypoint, entrance, exit, stairs, elevator
    name = Column(String(255), nullable=True)
    accessibility_level = Column(String(50), default="wheelchair_accessible")

    # Relationships
    floor_plan = relationship("FloorPlan", back_populates="nodes")
    outgoing_edges = relationship(
        "Edge",
        foreign_keys="Edge.source_node_id",
        back_populates="source_node",
        cascade="all, delete-orphan"
    )
    incoming_edges = relationship(
        "Edge",
        foreign_keys="Edge.target_node_id",
        back_populates="target_node",
        cascade="all, delete-orphan"
    )
    pois = relationship("POI", back_populates="node")
    qr_anchors = relationship("QRAnchor", back_populates="node")

    def __repr__(self):
        return f"<Node(id={self.id}, type='{self.node_type}', x={self.x}, y={self.y})>"
