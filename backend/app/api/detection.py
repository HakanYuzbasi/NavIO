"""
API endpoints for automatic booth detection
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
import os

from app.core.database import get_db
from app.models import FloorPlan, POI
from app.schemas import POIResponse
from app.services.booth_detection import auto_detect_booths
from pydantic import BaseModel

router = APIRouter()


class DetectionRequest(BaseModel):
    """Request to detect booths from floor plan."""
    floor_plan_id: str
    method: str = "smart"  # basic, grid, or smart
    auto_create: bool = True  # Automatically create POIs


class DetectionResponse(BaseModel):
    """Response from booth detection."""
    success: bool
    floor_plan_id: str
    booths_detected: int
    booths_created: int
    booths: List[dict]
    message: str


@router.post("/floor-plans/{floor_plan_id}/detect-booths", response_model=DetectionResponse)
async def detect_booths(
    floor_plan_id: str,
    method: str = "smart",
    auto_create: bool = True,
    db: Session = Depends(get_db)
):
    """
    Automatically detect booths from floor plan image using computer vision.

    Args:
        floor_plan_id: ID of the floor plan
        method: Detection method (basic, grid, smart)
        auto_create: If True, automatically create POIs for detected booths

    Returns:
        Detection results with booth locations
    """
    # Get floor plan
    floor_plan = db.query(FloorPlan).filter(FloorPlan.id == floor_plan_id).first()
    if not floor_plan:
        raise HTTPException(status_code=404, detail="Floor plan not found")

    # Get image path
    image_path = floor_plan.image_url.replace("/demo/", "./public/demo/")

    if not os.path.exists(image_path):
        raise HTTPException(
            status_code=404,
            detail=f"Floor plan image not found: {image_path}"
        )

    try:
        # Run detection
        booths = auto_detect_booths(image_path, method=method)

        booths_created = 0

        if auto_create and booths:
            # Create POIs for detected booths
            for booth in booths:
                poi = POI(
                    floor_plan_id=floor_plan_id,
                    name=booth['name'],
                    description=booth.get('description', ''),
                    category=booth.get('category', 'booth'),
                    x=booth['x'],
                    y=booth['y'],
                    searchable=True
                )
                db.add(poi)
                booths_created += 1

            db.commit()

        return DetectionResponse(
            success=True,
            floor_plan_id=floor_plan_id,
            booths_detected=len(booths),
            booths_created=booths_created,
            booths=booths,
            message=f"Successfully detected {len(booths)} booths using {method} method"
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error detecting booths: {str(e)}"
        )


@router.delete("/floor-plans/{floor_plan_id}/clear-pois")
async def clear_all_pois(
    floor_plan_id: str,
    db: Session = Depends(get_db)
):
    """
    Clear all POIs from a floor plan (useful before re-detecting).
    """
    floor_plan = db.query(FloorPlan).filter(FloorPlan.id == floor_plan_id).first()
    if not floor_plan:
        raise HTTPException(status_code=404, detail="Floor plan not found")

    # Delete all POIs
    count = db.query(POI).filter(POI.floor_plan_id == floor_plan_id).delete()
    db.commit()

    return {
        "success": True,
        "deleted_count": count,
        "message": f"Deleted {count} POIs from floor plan"
    }
