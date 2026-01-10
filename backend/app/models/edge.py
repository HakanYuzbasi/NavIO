from sqlalchemy import Column, String, Float, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .base import BaseModel


class Edge(BaseModel):
    """Edge connecting two nodes in the navigation graph."""

    __tablename__ = "edges"

    floor_plan_id = Column(UUID(as_uuid=True), ForeignKey("floor_plans.id"), nullable=False)
    source_node_id = Column(UUID(as_uuid=True), ForeignKey("nodes.id"), nullable=False)
    target_node_id = Column(UUID(as_uuid=True), ForeignKey("nodes.id"), nullable=False)
    weight = Column(Float, nullable=False)  # Typically Euclidean distance
    bidirectional = Column(Boolean, default=True)
    accessible = Column(Boolean, default=True)  # Wheelchair accessible
    edge_type = Column(String(50), default="corridor")  # corridor, doorway, stairs, elevator

    # Relationships
    floor_plan = relationship("FloorPlan", back_populates="edges")
    source_node = relationship(
        "Node",
        foreign_keys=[source_node_id],
        back_populates="outgoing_edges"
    )
    target_node = relationship(
        "Node",
        foreign_keys=[target_node_id],
        back_populates="incoming_edges"
    )

    def __repr__(self):
        return f"<Edge(id={self.id}, source={self.source_node_id}, target={self.target_node_id}, weight={self.weight})>"
