from sqlalchemy import Column, String, Float, Boolean, Integer, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .base import BaseModel


class QRAnchor(BaseModel):
    """QR code anchor for user localization."""

    __tablename__ = "qr_anchors"

    floor_plan_id = Column(UUID(as_uuid=True), ForeignKey("floor_plans.id"), nullable=False)
    node_id = Column(UUID(as_uuid=True), ForeignKey("nodes.id"), nullable=False)
    code = Column(String(100), unique=True, nullable=False)
    x = Column(Float, nullable=False)
    y = Column(Float, nullable=False)
    qr_data = Column(Text, nullable=False)  # Encoded URL
    placement_notes = Column(Text, nullable=True)
    active = Column(Boolean, default=True)
    scan_count = Column(Integer, default=0)

    # Relationships
    floor_plan = relationship("FloorPlan", back_populates="qr_anchors")
    node = relationship("Node", back_populates="qr_anchors")

    def __repr__(self):
        return f"<QRAnchor(id={self.id}, code='{self.code}', scans={self.scan_count})>"
