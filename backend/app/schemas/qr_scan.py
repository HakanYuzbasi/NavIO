from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel


class QRScanRequest(BaseModel):
    """Request when scanning a QR code."""
    qr_code: str


class NearbyPOI(BaseModel):
    """Nearby point of interest."""
    id: UUID
    name: str
    distance: float
    category: Optional[str] = None


class LocationInfo(BaseModel):
    """Location information from QR scan."""
    node_id: UUID
    x: float
    y: float
    name: Optional[str] = None


class FloorPlanInfo(BaseModel):
    """Basic floor plan information."""
    id: UUID
    name: str
    image_url: str
    image_width: int
    image_height: int


class QRScanResponse(BaseModel):
    """Response after scanning a QR code."""
    success: bool
    floor_plan: Optional[FloorPlanInfo] = None
    location: Optional[LocationInfo] = None
    nearby_pois: List[NearbyPOI] = []
    error: Optional[str] = None
