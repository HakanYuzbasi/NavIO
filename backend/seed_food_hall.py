"""
Seed script for Food Hall MVP Demo

This script populates the database with:
- Food hall floor plan
- Navigation nodes at key intersections
- Edges connecting the nodes
- All food booths as POIs
- QR code anchors at entrances and key locations
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.floor_plan import FloorPlan
from app.models.node import Node
from app.models.edge import Edge
from app.models.poi import POI
from app.models.qr_anchor import QRAnchor
from sqlalchemy.orm import Session
import math


def calculate_distance(x1: float, y1: float, x2: float, y2: float) -> float:
    """Calculate Euclidean distance between two points."""
    return math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)


def create_food_hall_demo(db: Session):
    """Create the complete Food Hall demo data."""

    print("🏢 Creating Food Hall Floor Plan...")

    # Create floor plan
    floor_plan = FloorPlan(
        name="Food Hall - Main Floor",
        description="Downtown Food Hall with 31 vendors",
        image_url="/demo/food-hall-floorplan.png",
        image_width=780,
        image_height=560,
        organization_id="demo-org-001"
    )
    db.add(floor_plan)
    db.flush()

    print(f"✅ Floor Plan created: {floor_plan.id}")

    # Define navigation nodes (intersections and key points)
    # Coordinates are based on the floor plan image
    nodes_data = [
        # Main intersections
        {"id": "n1", "x": 150, "y": 100, "type": "entrance", "name": "Main Entrance (Ludlow St)"},
        {"id": "n2", "x": 390, "y": 100, "type": "waypoint", "name": "Central North Intersection"},
        {"id": "n3", "x": 630, "y": 100, "type": "waypoint", "name": "East North Intersection"},

        # Center area
        {"id": "n4", "x": 150, "y": 280, "type": "waypoint", "name": "West Central Hub"},
        {"id": "n5", "x": 390, "y": 280, "type": "waypoint", "name": "Central Hub"},
        {"id": "n6", "x": 630, "y": 280, "type": "waypoint", "name": "East Central Hub"},

        # South area
        {"id": "n7", "x": 150, "y": 460, "type": "entrance", "name": "South Entrance"},
        {"id": "n8", "x": 390, "y": 460, "type": "waypoint", "name": "Central South Intersection"},
        {"id": "n9", "x": 630, "y": 460, "type": "waypoint", "name": "East South Intersection"},

        # Additional key points
        {"id": "n10", "x": 270, "y": 180, "type": "waypoint", "name": "Craft Cocktail Junction"},
        {"id": "n11", "x": 510, "y": 180, "type": "waypoint", "name": "Wine Corner"},
    ]

    print("\n📍 Creating navigation nodes...")
    nodes = {}
    for node_data in nodes_data:
        node = Node(
            floor_plan_id=floor_plan.id,
            x=node_data["x"],
            y=node_data["y"],
            node_type=node_data["type"],
            name=node_data["name"],
            accessibility_level="wheelchair_accessible"
        )
        db.add(node)
        db.flush()
        nodes[node_data["id"]] = node
        print(f"  ✓ {node_data['name']}")

    # Define edges (walkable paths)
    edges_data = [
        # North corridor
        ("n1", "n2"), ("n2", "n3"),

        # Center corridors
        ("n4", "n5"), ("n5", "n6"),

        # South corridor
        ("n7", "n8"), ("n8", "n9"),

        # Vertical connections
        ("n1", "n4"), ("n4", "n7"),  # West side
        ("n2", "n5"), ("n5", "n8"),  # Center
        ("n3", "n6"), ("n6", "n9"),  # East side

        # Cross connections
        ("n2", "n10"), ("n10", "n4"),
        ("n2", "n11"), ("n11", "n6"),
    ]

    print("\n🛤️  Creating walkable paths...")
    for source_id, target_id in edges_data:
        source = nodes[source_id]
        target = nodes[target_id]

        weight = calculate_distance(source.x, source.y, target.x, target.y)

        edge = Edge(
            floor_plan_id=floor_plan.id,
            source_node_id=source.id,
            target_node_id=target.id,
            weight=weight,
            bidirectional=True,
            accessible=True,
            edge_type="corridor"
        )
        db.add(edge)
    print(f"  ✓ Created {len(edges_data)} paths")

    # Define all food booths as POIs
    booths_data = [
        # North Row (Top)
        {"num": 1, "name": "Ice Cream", "x": 120, "y": 70, "category": "dessert", "node": "n1"},
        {"num": "1A", "name": "Vegan Chocolate", "x": 165, "y": 70, "category": "dessert", "node": "n1"},
        {"num": 2, "name": "American Diner", "x": 210, "y": 70, "category": "american", "node": "n2"},
        {"num": 3, "name": "Phoecel", "x": 255, "y": 70, "category": "vietnamese", "node": "n2"},
        {"num": 4, "name": "Ramen", "x": 430, "y": 70, "category": "japanese", "node": "n2"},
        {"num": 5, "name": "Sandwich", "x": 475, "y": 70, "category": "american", "node": "n2"},
        {"num": 6, "name": "Dumpling", "x": 520, "y": 70, "category": "chinese", "node": "n3"},
        {"num": 7, "name": "Empanada", "x": 565, "y": 70, "category": "latin", "node": "n3"},
        {"num": 8, "name": "BBQ", "x": 610, "y": 70, "category": "bbq", "node": "n3"},
        {"num": 9, "name": "Fried Chicken", "x": 655, "y": 70, "category": "american", "node": "n3"},
        {"num": 10, "name": "Bakery", "x": 700, "y": 70, "category": "bakery", "node": "n3"},

        # Coffee & Bar Area (Middle North)
        {"num": 19, "name": "Coffee", "x": 130, "y": 200, "category": "coffee", "node": "n10"},
        {"num": 20, "name": "Craft Cocktail", "x": 180, "y": 200, "category": "bar", "node": "n10"},
        {"num": 21, "name": "Beer Bar - Craft Beer", "x": 180, "y": 250, "category": "bar", "node": "n4"},

        # Wine & Butcher Area (Middle East)
        {"num": 22, "name": "Wine", "x": 460, "y": 200, "category": "wine", "node": "n11"},
        {"num": 23, "name": "Butcher", "x": 505, "y": 200, "category": "butcher", "node": "n11"},
        {"num": 24, "name": "Crepes", "x": 550, "y": 200, "category": "french", "node": "n6"},
        {"num": 25, "name": "Produce", "x": 595, "y": 200, "category": "grocery", "node": "n6"},
        {"num": 26, "name": "Flour", "x": 640, "y": 200, "category": "bakery", "node": "n6"},
        {"num": 29, "name": "Cheese", "x": 505, "y": 250, "category": "deli", "node": "n11"},
        {"num": 28, "name": "Fresh Pasta", "x": 550, "y": 250, "category": "italian", "node": "n6"},
        {"num": 27, "name": "Juice + Acai", "x": 595, "y": 250, "category": "healthy", "node": "n6"},

        # South Row (Bottom)
        {"num": 18, "name": "Thai", "x": 100, "y": 370, "category": "thai", "node": "n7"},
        {"num": 17, "name": "Vegetarian", "x": 180, "y": 370, "category": "vegetarian", "node": "n4"},
        {"num": 16, "name": "Pizza", "x": 260, "y": 370, "category": "italian", "node": "n8"},
        {"num": 15, "name": "Taco", "x": 470, "y": 370, "category": "mexican", "node": "n8"},
        {"num": 14, "name": "Singaporean", "x": 515, "y": 370, "category": "asian", "node": "n8"},
        {"num": 13, "name": "Fishmonger", "x": 560, "y": 370, "category": "seafood", "node": "n9"},
        {"num": 12, "name": "Seafood", "x": 605, "y": 370, "category": "seafood", "node": "n9"},
        {"num": 11, "name": "Hot Pot", "x": 650, "y": 370, "category": "asian", "node": "n9"},
    ]

    print("\n🍽️  Creating food booth POIs...")
    for booth in booths_data:
        nearest_node = nodes[booth["node"]]

        poi = POI(
            floor_plan_id=floor_plan.id,
            node_id=nearest_node.id,
            name=f"Booth {booth['num']}: {booth['name']}",
            description=f"{booth['name']} - {booth['category'].title()} Vendor",
            category=booth['category'],
            x=booth["x"],
            y=booth["y"],
            icon="restaurant",
            searchable=True,
            metadata={
                "booth_number": str(booth["num"]),
                "vendor_type": booth["category"],
                "floor": "main"
            }
        )
        db.add(poi)
        print(f"  ✓ Booth {booth['num']}: {booth['name']}")

    # Create QR code anchors at key locations
    qr_anchors_data = [
        {"node": "n1", "code": "FOODHALL-MAIN-ENTRANCE", "notes": "Main entrance on Ludlow Street"},
        {"node": "n7", "code": "FOODHALL-SOUTH-ENTRANCE", "notes": "South entrance"},
        {"node": "n5", "code": "FOODHALL-CENTRAL-HUB", "notes": "Central seating area"},
        {"node": "n10", "code": "FOODHALL-COFFEE-BAR", "notes": "Near coffee and cocktail bar"},
        {"node": "n11", "code": "FOODHALL-WINE-CORNER", "notes": "Near wine and cheese area"},
    ]

    print("\n📱 Creating QR code anchors...")
    for qr_data in qr_anchors_data:
        node = nodes[qr_data["node"]]

        qr = QRAnchor(
            floor_plan_id=floor_plan.id,
            node_id=node.id,
            code=qr_data["code"],
            x=node.x,
            y=node.y,
            qr_data=f"https://navio.app/scan/{qr_data['code']}",
            placement_notes=qr_data["notes"],
            active=True,
            scan_count=0
        )
        db.add(qr)
        print(f"  ✓ QR: {qr_data['code']}")

    db.commit()

    print("\n" + "="*60)
    print("🎉 Food Hall Demo Created Successfully!")
    print("="*60)
    print(f"\n📊 Summary:")
    print(f"   • Floor Plan: {floor_plan.name}")
    print(f"   • Navigation Nodes: {len(nodes_data)}")
    print(f"   • Walkable Paths: {len(edges_data)}")
    print(f"   • Food Booths: {len(booths_data)}")
    print(f"   • QR Anchors: {len(qr_anchors_data)}")
    print(f"\n🌐 Access the demo:")
    print(f"   • Frontend: http://localhost:3000")
    print(f"   • API: http://localhost:8000/docs")
    print(f"\n💡 Value Proposition: Help visitors find booths in seconds!")
    print("\n" + "="*60)


if __name__ == "__main__":
    print("\n" + "="*60)
    print("🚀 NavIO Food Hall MVP - Database Seed")
    print("="*60 + "\n")

    db = SessionLocal()
    try:
        create_food_hall_demo(db)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()
