"""
API route definitions.
"""
import math
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import FloorPlan, Node, Edge, POI, QRAnchor
from app.schemas import (
    FloorPlanCreate,
    FloorPlanUpdate,
    FloorPlanResponse,
    FloorPlanWithGraph,
    NodeCreate,
    NodeUpdate,
    NodeResponse,
    EdgeCreate,
    EdgeUpdate,
    EdgeResponse,
    POICreate,
    POIUpdate,
    POIResponse,
    QRAnchorCreate,
    QRAnchorUpdate,
    QRAnchorResponse,
    RouteRequest,
    RouteResponse,
    QRScanRequest,
    QRScanResponse,
)
from app.services.pathfinding import PathfindingService
from app.services.qr_service import QRCodeService
from app.core.config import settings

router = APIRouter()


# ============================================================================
# Floor Plan Routes
# ============================================================================

@router.post("/floor-plans", response_model=FloorPlanResponse, status_code=201)
async def create_floor_plan(
    floor_plan: FloorPlanCreate,
    db: Session = Depends(get_db)
):
    """Create a new floor plan."""
    # In production, handle image upload here
    db_floor_plan = FloorPlan(
        name=floor_plan.name,
        description=floor_plan.description,
        image_url="/uploads/placeholder.png",  # Set after upload
        image_width=floor_plan.image_width,
        image_height=floor_plan.image_height,
        organization_id=floor_plan.organization_id
    )
    db.add(db_floor_plan)
    db.commit()
    db.refresh(db_floor_plan)
    return db_floor_plan


@router.get("/floor-plans/{floor_plan_id}", response_model=FloorPlanWithGraph)
async def get_floor_plan(floor_plan_id: UUID, db: Session = Depends(get_db)):
    """Get floor plan with complete navigation graph."""
    floor_plan = db.query(FloorPlan).filter(FloorPlan.id == floor_plan_id).first()
    if not floor_plan:
        raise HTTPException(status_code=404, detail="Floor plan not found")
    return floor_plan


@router.get("/floor-plans", response_model=List[FloorPlanResponse])
async def list_floor_plans(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """List all floor plans."""
    floor_plans = db.query(FloorPlan).offset(skip).limit(limit).all()
    return floor_plans


@router.patch("/floor-plans/{floor_plan_id}", response_model=FloorPlanResponse)
async def update_floor_plan(
    floor_plan_id: UUID,
    floor_plan_update: FloorPlanUpdate,
    db: Session = Depends(get_db)
):
    """Update floor plan."""
    floor_plan = db.query(FloorPlan).filter(FloorPlan.id == floor_plan_id).first()
    if not floor_plan:
        raise HTTPException(status_code=404, detail="Floor plan not found")

    update_data = floor_plan_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(floor_plan, field, value)

    db.commit()
    db.refresh(floor_plan)
    return floor_plan


@router.delete("/floor-plans/{floor_plan_id}", status_code=204)
async def delete_floor_plan(floor_plan_id: UUID, db: Session = Depends(get_db)):
    """Delete floor plan and all associated data."""
    floor_plan = db.query(FloorPlan).filter(FloorPlan.id == floor_plan_id).first()
    if not floor_plan:
        raise HTTPException(status_code=404, detail="Floor plan not found")

    db.delete(floor_plan)
    db.commit()
    return None


# ============================================================================
# Node Routes
# ============================================================================

@router.post("/nodes", response_model=NodeResponse, status_code=201)
async def create_node(node: NodeCreate, db: Session = Depends(get_db)):
    """Create a new node."""
    db_node = Node(**node.model_dump())
    db.add(db_node)
    db.commit()
    db.refresh(db_node)
    return db_node


@router.get("/nodes/{node_id}", response_model=NodeResponse)
async def get_node(node_id: UUID, db: Session = Depends(get_db)):
    """Get node by ID."""
    node = db.query(Node).filter(Node.id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    return node


@router.get("/floor-plans/{floor_plan_id}/nodes", response_model=List[NodeResponse])
async def list_nodes(floor_plan_id: UUID, db: Session = Depends(get_db)):
    """List all nodes for a floor plan."""
    nodes = db.query(Node).filter(Node.floor_plan_id == floor_plan_id).all()
    return nodes


@router.patch("/nodes/{node_id}", response_model=NodeResponse)
async def update_node(
    node_id: UUID,
    node_update: NodeUpdate,
    db: Session = Depends(get_db)
):
    """Update node."""
    node = db.query(Node).filter(Node.id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    update_data = node_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(node, field, value)

    db.commit()
    db.refresh(node)
    return node


@router.delete("/nodes/{node_id}", status_code=204)
async def delete_node(node_id: UUID, db: Session = Depends(get_db)):
    """Delete node."""
    node = db.query(Node).filter(Node.id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    db.delete(node)
    db.commit()
    return None


# ============================================================================
# Edge Routes
# ============================================================================

@router.post("/edges", response_model=EdgeResponse, status_code=201)
async def create_edge(edge: EdgeCreate, db: Session = Depends(get_db)):
    """Create a new edge."""
    # Auto-calculate weight if not provided
    if edge.weight is None:
        source = db.query(Node).filter(Node.id == edge.source_node_id).first()
        target = db.query(Node).filter(Node.id == edge.target_node_id).first()

        if not source or not target:
            raise HTTPException(status_code=404, detail="Source or target node not found")

        edge.weight = PathfindingService.calculate_euclidean_distance(
            source.x, source.y, target.x, target.y
        )

    db_edge = Edge(**edge.model_dump())
    db.add(db_edge)
    db.commit()
    db.refresh(db_edge)
    return db_edge


@router.get("/edges/{edge_id}", response_model=EdgeResponse)
async def get_edge(edge_id: UUID, db: Session = Depends(get_db)):
    """Get edge by ID."""
    edge = db.query(Edge).filter(Edge.id == edge_id).first()
    if not edge:
        raise HTTPException(status_code=404, detail="Edge not found")
    return edge


@router.get("/floor-plans/{floor_plan_id}/edges", response_model=List[EdgeResponse])
async def list_edges(floor_plan_id: UUID, db: Session = Depends(get_db)):
    """List all edges for a floor plan."""
    edges = db.query(Edge).filter(Edge.floor_plan_id == floor_plan_id).all()
    return edges


@router.patch("/edges/{edge_id}", response_model=EdgeResponse)
async def update_edge(
    edge_id: UUID,
    edge_update: EdgeUpdate,
    db: Session = Depends(get_db)
):
    """Update edge."""
    edge = db.query(Edge).filter(Edge.id == edge_id).first()
    if not edge:
        raise HTTPException(status_code=404, detail="Edge not found")

    update_data = edge_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(edge, field, value)

    db.commit()
    db.refresh(edge)
    return edge


@router.delete("/edges/{edge_id}", status_code=204)
async def delete_edge(edge_id: UUID, db: Session = Depends(get_db)):
    """Delete edge."""
    edge = db.query(Edge).filter(Edge.id == edge_id).first()
    if not edge:
        raise HTTPException(status_code=404, detail="Edge not found")

    db.delete(edge)
    db.commit()
    return None


# ============================================================================
# POI Routes
# ============================================================================

@router.post("/pois", response_model=POIResponse, status_code=201)
async def create_poi(poi: POICreate, db: Session = Depends(get_db)):
    """Create a new POI."""
    db_poi = POI(**poi.model_dump())
    db.add(db_poi)
    db.commit()
    db.refresh(db_poi)
    return db_poi


@router.get("/pois/{poi_id}", response_model=POIResponse)
async def get_poi(poi_id: UUID, db: Session = Depends(get_db)):
    """Get POI by ID."""
    poi = db.query(POI).filter(POI.id == poi_id).first()
    if not poi:
        raise HTTPException(status_code=404, detail="POI not found")
    return poi


@router.get("/floor-plans/{floor_plan_id}/pois", response_model=List[POIResponse])
async def list_pois(
    floor_plan_id: UUID,
    searchable_only: bool = False,
    db: Session = Depends(get_db)
):
    """List all POIs for a floor plan."""
    query = db.query(POI).filter(POI.floor_plan_id == floor_plan_id)
    if searchable_only:
        query = query.filter(POI.searchable == True)
    pois = query.all()
    return pois


@router.patch("/pois/{poi_id}", response_model=POIResponse)
async def update_poi(
    poi_id: UUID,
    poi_update: POIUpdate,
    db: Session = Depends(get_db)
):
    """Update POI."""
    poi = db.query(POI).filter(POI.id == poi_id).first()
    if not poi:
        raise HTTPException(status_code=404, detail="POI not found")

    update_data = poi_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(poi, field, value)

    db.commit()
    db.refresh(poi)
    return poi


@router.delete("/pois/{poi_id}", status_code=204)
async def delete_poi(poi_id: UUID, db: Session = Depends(get_db)):
    """Delete POI."""
    poi = db.query(POI).filter(POI.id == poi_id).first()
    if not poi:
        raise HTTPException(status_code=404, detail="POI not found")

    db.delete(poi)
    db.commit()
    return None


# ============================================================================
# QR Anchor Routes
# ============================================================================

@router.post("/qr-anchors", response_model=QRAnchorResponse, status_code=201)
async def create_qr_anchor(qr_anchor: QRAnchorCreate, db: Session = Depends(get_db)):
    """Create a new QR anchor."""
    # Auto-generate QR data if not provided
    if qr_anchor.qr_data is None:
        qr_anchor.qr_data = QRCodeService.generate_qr_data(
            settings.QR_CODE_BASE_URL,
            qr_anchor.code
        )

    db_qr_anchor = QRAnchor(**qr_anchor.model_dump())
    db.add(db_qr_anchor)
    db.commit()
    db.refresh(db_qr_anchor)
    return db_qr_anchor


@router.get("/qr-anchors/{qr_anchor_id}", response_model=QRAnchorResponse)
async def get_qr_anchor(qr_anchor_id: UUID, db: Session = Depends(get_db)):
    """Get QR anchor by ID."""
    qr_anchor = db.query(QRAnchor).filter(QRAnchor.id == qr_anchor_id).first()
    if not qr_anchor:
        raise HTTPException(status_code=404, detail="QR anchor not found")
    return qr_anchor


@router.get("/floor-plans/{floor_plan_id}/qr-anchors", response_model=List[QRAnchorResponse])
async def list_qr_anchors(
    floor_plan_id: UUID,
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    """List all QR anchors for a floor plan."""
    query = db.query(QRAnchor).filter(QRAnchor.floor_plan_id == floor_plan_id)
    if active_only:
        query = query.filter(QRAnchor.active == True)
    qr_anchors = query.all()
    return qr_anchors


@router.patch("/qr-anchors/{qr_anchor_id}", response_model=QRAnchorResponse)
async def update_qr_anchor(
    qr_anchor_id: UUID,
    qr_anchor_update: QRAnchorUpdate,
    db: Session = Depends(get_db)
):
    """Update QR anchor."""
    qr_anchor = db.query(QRAnchor).filter(QRAnchor.id == qr_anchor_id).first()
    if not qr_anchor:
        raise HTTPException(status_code=404, detail="QR anchor not found")

    update_data = qr_anchor_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(qr_anchor, field, value)

    db.commit()
    db.refresh(qr_anchor)
    return qr_anchor


@router.delete("/qr-anchors/{qr_anchor_id}", status_code=204)
async def delete_qr_anchor(qr_anchor_id: UUID, db: Session = Depends(get_db)):
    """Delete QR anchor."""
    qr_anchor = db.query(QRAnchor).filter(QRAnchor.id == qr_anchor_id).first()
    if not qr_anchor:
        raise HTTPException(status_code=404, detail="QR anchor not found")

    db.delete(qr_anchor)
    db.commit()
    return None


# ============================================================================
# Navigation Routes
# ============================================================================

@router.post("/routes/calculate", response_model=RouteResponse)
async def calculate_route(route_request: RouteRequest, db: Session = Depends(get_db)):
    """Calculate optimal route using A* algorithm."""
    return PathfindingService.calculate_route(
        db=db,
        floor_plan_id=route_request.floor_plan_id,
        start_node_id=route_request.start_node_id,
        end_node_id=route_request.end_node_id,
        preferences=route_request.preferences
    )


@router.post("/qr/scan", response_model=QRScanResponse)
async def scan_qr_code(scan_request: QRScanRequest, db: Session = Depends(get_db)):
    """Process QR code scan and return location information."""
    from app.schemas.qr_scan import LocationInfo, FloorPlanInfo, NearbyPOI

    location_data = QRCodeService.get_location_from_qr(db, scan_request.qr_code)

    if not location_data:
        return QRScanResponse(
            success=False,
            error="QR code not found or inactive"
        )

    floor_plan = location_data["floor_plan"]
    node = location_data["node"]

    # Find nearby POIs (within 50 units)
    nearby_pois = []
    all_pois = db.query(POI).filter(POI.floor_plan_id == floor_plan.id).all()

    for poi in all_pois:
        distance = PathfindingService.calculate_euclidean_distance(
            node.x, node.y, poi.x, poi.y
        )
        if distance <= 50:
            nearby_pois.append(
                NearbyPOI(
                    id=poi.id,
                    name=poi.name,
                    distance=round(distance, 2),
                    category=poi.category
                )
            )

    # Sort by distance
    nearby_pois.sort(key=lambda p: p.distance)

    return QRScanResponse(
        success=True,
        floor_plan=FloorPlanInfo(
            id=floor_plan.id,
            name=floor_plan.name,
            image_url=floor_plan.image_url,
            image_width=floor_plan.image_width,
            image_height=floor_plan.image_height
        ),
        location=LocationInfo(
            node_id=node.id,
            x=node.x,
            y=node.y,
            name=node.name
        ),
        nearby_pois=nearby_pois[:5]  # Return top 5 nearest
    )
