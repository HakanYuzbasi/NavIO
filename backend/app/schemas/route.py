from typing import List, Optional, Dict
from uuid import UUID
from pydantic import BaseModel


class RoutePreferences(BaseModel):
    """User preferences for route calculation."""
    accessible_only: bool = False
    avoid_stairs: bool = False
    shortest_distance: bool = True


class RouteRequest(BaseModel):
    """Request to calculate a route."""
    floor_plan_id: UUID
    start_node_id: UUID
    end_node_id: UUID
    preferences: Optional[RoutePreferences] = RoutePreferences()


class Coordinate(BaseModel):
    """2D coordinate."""
    x: float
    y: float


class RouteInstruction(BaseModel):
    """Step-by-step instruction."""
    step: int
    action: str
    distance: float


class RouteResponse(BaseModel):
    """Calculated route response."""
    success: bool
    floor_plan_id: UUID
    start_node_id: UUID
    end_node_id: UUID
    path: List[UUID]  # List of node IDs
    total_distance: float
    estimated_time_seconds: int
    coordinates: List[Coordinate]
    instructions: List[RouteInstruction]
    error: Optional[str] = None
