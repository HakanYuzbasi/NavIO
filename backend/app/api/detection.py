"""
API endpoints for automatic floor plan analysis and booth detection.

This module provides endpoints for:
1. Simple booth detection (legacy)
2. Comprehensive floor plan analysis with walkable areas
3. Automatic navigation infrastructure creation (nodes, edges, POIs)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import uuid
import logging

from app.core.database import get_db
from app.models import FloorPlan, POI, Node, Edge
from app.schemas import POIResponse
from app.services.booth_detection import auto_detect_booths
from app.services.floor_plan_analyzer import (
    FloorPlanAnalyzer,
    analyze_and_create_navigation,
    FloorPlanAnalysisResult
)
from pydantic import BaseModel

router = APIRouter()
logger = logging.getLogger(__name__)


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


class FullAnalysisRequest(BaseModel):
    """Request for full floor plan analysis."""
    node_spacing: int = 50  # Spacing between navigation nodes
    clear_existing: bool = True  # Clear existing nodes/edges/POIs first
    create_visualization: bool = False  # Save debug visualization


class FullAnalysisResponse(BaseModel):
    """Response from full floor plan analysis."""
    success: bool
    floor_plan_id: str
    booths_detected: int
    nodes_created: int
    edges_created: int
    pois_created: int
    walkable_percentage: float
    analysis_method: str
    message: str
    visualization_path: Optional[str] = None


@router.post("/floor-plans/{floor_plan_id}/detect-booths", response_model=DetectionResponse)
async def detect_booths(
    floor_plan_id: str,
    method: str = "smart",
    auto_create: bool = True,
    db: Session = Depends(get_db)
):
    """
    Automatically detect booths from floor plan image using computer vision.

    This is a simplified detection that only finds booth locations.
    For full navigation infrastructure, use /analyze-navigation instead.

    Args:
        floor_plan_id: ID of the floor plan
        method: Detection method (basic, grid, smart, auto)
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
        logger.error(f"Error detecting booths: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error detecting booths: {str(e)}"
        )


@router.post("/floor-plans/{floor_plan_id}/analyze-navigation", response_model=FullAnalysisResponse)
async def analyze_navigation(
    floor_plan_id: str,
    node_spacing: int = 50,
    clear_existing: bool = True,
    create_visualization: bool = False,
    db: Session = Depends(get_db)
):
    """
    Perform comprehensive floor plan analysis and create complete navigation infrastructure.

    This endpoint:
    1. Detects walkable corridors and pathways
    2. Detects booths/rooms (non-walkable areas)
    3. Creates navigation nodes along walkable paths
    4. Creates edges between connected nodes for pathfinding
    5. Creates POIs for each booth linked to nearest nodes

    Args:
        floor_plan_id: ID of the floor plan
        node_spacing: Spacing between navigation nodes (default 50 pixels)
        clear_existing: If True, clears existing nodes/edges/POIs first
        create_visualization: If True, saves a debug visualization image

    Returns:
        Analysis results with counts of created elements
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
        # Clear existing data if requested
        if clear_existing:
            logger.info(f"Clearing existing navigation data for floor plan {floor_plan_id}")
            db.query(Edge).filter(Edge.floor_plan_id == floor_plan_id).delete()
            db.query(POI).filter(POI.floor_plan_id == floor_plan_id).delete()
            db.query(Node).filter(Node.floor_plan_id == floor_plan_id).delete()
            db.commit()

        # Run comprehensive analysis
        logger.info(f"Starting floor plan analysis for {floor_plan_id}")
        analyzer = FloorPlanAnalyzer(node_spacing=node_spacing)
        result = analyzer.analyze(image_path)

        # Calculate walkable percentage
        if result.walkable_mask is not None:
            walkable_pct = (result.walkable_mask > 0).sum() / result.walkable_mask.size * 100
        else:
            walkable_pct = 0

        # Create database entries
        node_id_map = {}  # Map analyzer node IDs to database UUIDs

        # Create nodes
        for nav_node in result.nodes:
            db_node = Node(
                floor_plan_id=floor_plan_id,
                x=nav_node.x,
                y=nav_node.y,
                node_type=nav_node.node_type,
                name=nav_node.name
            )
            db.add(db_node)
            db.flush()  # Get the generated ID
            node_id_map[nav_node.id] = db_node.id

        # Create edges
        for nav_edge in result.edges:
            source_uuid = node_id_map.get(nav_edge.source_id)
            target_uuid = node_id_map.get(nav_edge.target_id)

            if source_uuid and target_uuid:
                db_edge = Edge(
                    floor_plan_id=floor_plan_id,
                    source_node_id=source_uuid,
                    target_node_id=target_uuid,
                    weight=nav_edge.weight,
                    bidirectional=nav_edge.bidirectional,
                    edge_type=nav_edge.edge_type
                )
                db.add(db_edge)

        # Create POIs with node links
        for poi_data in result.pois:
            nearest_node_uuid = node_id_map.get(poi_data.nearest_node_id)

            db_poi = POI(
                floor_plan_id=floor_plan_id,
                node_id=nearest_node_uuid,
                name=poi_data.name,
                description=poi_data.description,
                category=poi_data.category,
                x=poi_data.x,
                y=poi_data.y,
                searchable=True
            )
            db.add(db_poi)

        db.commit()
        logger.info(
            f"Created navigation infrastructure: {len(result.nodes)} nodes, "
            f"{len(result.edges)} edges, {len(result.pois)} POIs"
        )

        # Create visualization if requested
        visualization_path = None
        if create_visualization:
            vis_filename = f"analysis_{floor_plan_id}.png"
            visualization_path = f"./uploads/{vis_filename}"
            analyzer.visualize_analysis(image_path, result, visualization_path)
            visualization_path = f"/uploads/{vis_filename}"

        return FullAnalysisResponse(
            success=True,
            floor_plan_id=floor_plan_id,
            booths_detected=len(result.booths),
            nodes_created=len(result.nodes),
            edges_created=len(result.edges),
            pois_created=len(result.pois),
            walkable_percentage=walkable_pct,
            analysis_method=result.analysis_method,
            message=f"Successfully created navigation infrastructure with {len(result.nodes)} nodes, "
                    f"{len(result.edges)} edges, and {len(result.pois)} POIs",
            visualization_path=visualization_path
        )

    except Exception as e:
        logger.error(f"Error analyzing floor plan: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error analyzing floor plan: {str(e)}"
        )


@router.delete("/floor-plans/{floor_plan_id}/clear-navigation")
async def clear_all_navigation(
    floor_plan_id: str,
    db: Session = Depends(get_db)
):
    """
    Clear all navigation data (nodes, edges, POIs) from a floor plan.
    """
    floor_plan = db.query(FloorPlan).filter(FloorPlan.id == floor_plan_id).first()
    if not floor_plan:
        raise HTTPException(status_code=404, detail="Floor plan not found")

    # Delete in order (edges first due to FK)
    edges_deleted = db.query(Edge).filter(Edge.floor_plan_id == floor_plan_id).delete()
    pois_deleted = db.query(POI).filter(POI.floor_plan_id == floor_plan_id).delete()
    nodes_deleted = db.query(Node).filter(Node.floor_plan_id == floor_plan_id).delete()
    db.commit()

    return {
        "success": True,
        "floor_plan_id": floor_plan_id,
        "deleted": {
            "nodes": nodes_deleted,
            "edges": edges_deleted,
            "pois": pois_deleted
        },
        "message": f"Cleared all navigation data: {nodes_deleted} nodes, {edges_deleted} edges, {pois_deleted} POIs"
    }


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


@router.get("/floor-plans/{floor_plan_id}/navigation-stats")
async def get_navigation_stats(
    floor_plan_id: str,
    db: Session = Depends(get_db)
):
    """
    Get statistics about the navigation infrastructure for a floor plan.
    """
    floor_plan = db.query(FloorPlan).filter(FloorPlan.id == floor_plan_id).first()
    if not floor_plan:
        raise HTTPException(status_code=404, detail="Floor plan not found")

    nodes_count = db.query(Node).filter(Node.floor_plan_id == floor_plan_id).count()
    edges_count = db.query(Edge).filter(Edge.floor_plan_id == floor_plan_id).count()
    pois_count = db.query(POI).filter(POI.floor_plan_id == floor_plan_id).count()
    pois_with_nodes = db.query(POI).filter(
        POI.floor_plan_id == floor_plan_id,
        POI.node_id.isnot(None)
    ).count()

    # Get node types breakdown
    waypoints = db.query(Node).filter(
        Node.floor_plan_id == floor_plan_id,
        Node.node_type == "waypoint"
    ).count()
    access_points = db.query(Node).filter(
        Node.floor_plan_id == floor_plan_id,
        Node.node_type == "booth_access"
    ).count()

    return {
        "floor_plan_id": floor_plan_id,
        "floor_plan_name": floor_plan.name,
        "navigation_ready": nodes_count > 0 and edges_count > 0,
        "stats": {
            "total_nodes": nodes_count,
            "waypoints": waypoints,
            "access_points": access_points,
            "total_edges": edges_count,
            "total_pois": pois_count,
            "pois_linked_to_nodes": pois_with_nodes,
            "pois_unlinked": pois_count - pois_with_nodes
        },
        "coverage": {
            "poi_link_percentage": (pois_with_nodes / pois_count * 100) if pois_count > 0 else 0,
            "avg_edges_per_node": (edges_count * 2 / nodes_count) if nodes_count > 0 else 0
        }
    }
