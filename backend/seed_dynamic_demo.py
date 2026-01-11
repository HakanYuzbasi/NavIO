"""
Dynamic Seed Script for NavIO Demo

This script automatically detects floor plan images and creates a navigation system
for each one. It supports dynamic booth/room naming and works with ANY floor plan.

Features:
- Auto-detects image dimensions
- Works with multiple floor plans
- Allows custom naming for booths/rooms/spaces
- Flexible coordinate system
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
from app.utils.image_utils import get_image_dimensions
from sqlalchemy.orm import Session
import math
from pathlib import Path
from typing import List, Dict, Tuple


def calculate_distance(x1: float, y1: float, x2: float, y2: float) -> float:
    """Calculate Euclidean distance between two points."""
    return math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)


def create_navigation_grid(
    width: int,
    height: int,
    rows: int = 3,
    cols: int = 3
) -> List[Dict]:
    """
    Create a grid of navigation nodes dynamically based on image dimensions.

    Args:
        width: Image width in pixels
        height: Image height in pixels
        rows: Number of rows in the grid
        cols: Number of columns in the grid

    Returns:
        List of node dictionaries with coordinates
    """
    nodes = []
    margin_x = width * 0.1  # 10% margin on sides
    margin_y = height * 0.1  # 10% margin on top/bottom

    usable_width = width - (2 * margin_x)
    usable_height = height - (2 * margin_y)

    step_x = usable_width / (cols - 1) if cols > 1 else 0
    step_y = usable_height / (rows - 1) if rows > 1 else 0

    node_id = 1
    for row in range(rows):
        for col in range(cols):
            x = margin_x + (col * step_x)
            y = margin_y + (row * step_y)

            # Determine node type
            if row == 0 and col == 0:
                node_type = "entrance"
                name = "Main Entrance"
            elif row == rows - 1 and col == cols - 1:
                node_type = "exit"
                name = "Exit"
            elif row == rows // 2 and col == cols // 2:
                node_type = "waypoint"
                name = "Central Hub"
            else:
                node_type = "waypoint"
                name = f"Waypoint {node_id}"

            nodes.append({
                "id": f"n{node_id}",
                "x": round(x),
                "y": round(y),
                "type": node_type,
                "name": name,
                "row": row,
                "col": col
            })
            node_id += 1

    return nodes


def create_grid_edges(nodes: List[Dict]) -> List[Tuple[str, str]]:
    """
    Create edges connecting adjacent nodes in a grid.

    Args:
        nodes: List of node dictionaries

    Returns:
        List of (source_id, target_id) tuples
    """
    edges = []
    node_map = {(n['row'], n['col']): n['id'] for n in nodes}

    for node in nodes:
        row, col = node['row'], node['col']

        # Connect to right neighbor
        if (row, col + 1) in node_map:
            edges.append((node['id'], node_map[(row, col + 1)]))

        # Connect to bottom neighbor
        if (row + 1, col) in node_map:
            edges.append((node['id'], node_map[(row + 1, col)]))

    return edges


# Floor Plan Configurations
FLOOR_PLANS = [
    {
        "image": "food-hall-floorplan.png",
        "name": "Food Hall - Main Floor",
        "description": "Downtown Food Hall with diverse culinary options",
        "grid": {"rows": 3, "cols": 5},  # More columns for the food hall layout
        "booths": [
            # North Row
            {"name": "Ice Cream Parlor", "x_ratio": 0.15, "y_ratio": 0.10, "category": "dessert"},
            {"name": "Vegan Chocolate", "x_ratio": 0.22, "y_ratio": 0.10, "category": "dessert"},
            {"name": "American Diner", "x_ratio": 0.30, "y_ratio": 0.10, "category": "american"},
            {"name": "Pho & Vietnamese", "x_ratio": 0.38, "y_ratio": 0.10, "category": "vietnamese"},
            {"name": "Ramen House", "x_ratio": 0.50, "y_ratio": 0.10, "category": "japanese"},
            {"name": "Sandwich Shop", "x_ratio": 0.58, "y_ratio": 0.10, "category": "american"},
            {"name": "Dumpling Kitchen", "x_ratio": 0.66, "y_ratio": 0.10, "category": "chinese"},
            {"name": "Empanadas & More", "x_ratio": 0.74, "y_ratio": 0.10, "category": "latin"},
            {"name": "BBQ Smokehouse", "x_ratio": 0.82, "y_ratio": 0.10, "category": "bbq"},
            {"name": "Fried Chicken", "x_ratio": 0.88, "y_ratio": 0.10, "category": "american"},

            # Middle Section
            {"name": "Coffee Bar", "x_ratio": 0.18, "y_ratio": 0.35, "category": "coffee"},
            {"name": "Craft Cocktails", "x_ratio": 0.25, "y_ratio": 0.40, "category": "bar"},
            {"name": "Beer Garden", "x_ratio": 0.25, "y_ratio": 0.50, "category": "bar"},
            {"name": "Wine & Cheese", "x_ratio": 0.65, "y_ratio": 0.38, "category": "wine"},
            {"name": "Butcher Shop", "x_ratio": 0.72, "y_ratio": 0.38, "category": "market"},

            # South Row
            {"name": "Thai Kitchen", "x_ratio": 0.15, "y_ratio": 0.75, "category": "thai"},
            {"name": "Vegetarian Delight", "x_ratio": 0.28, "y_ratio": 0.75, "category": "vegetarian"},
            {"name": "Artisan Pizza", "x_ratio": 0.38, "y_ratio": 0.75, "category": "italian"},
            {"name": "Taco Stand", "x_ratio": 0.58, "y_ratio": 0.75, "category": "mexican"},
            {"name": "Fresh Seafood", "x_ratio": 0.75, "y_ratio": 0.75, "category": "seafood"},
            {"name": "Hot Pot Station", "x_ratio": 0.85, "y_ratio": 0.75, "category": "asian"},
        ],
        "qr_locations": [
            {"x_ratio": 0.15, "y_ratio": 0.10, "name": "Main Entrance"},
            {"x_ratio": 0.50, "y_ratio": 0.50, "name": "Central Seating"},
            {"x_ratio": 0.85, "y_ratio": 0.75, "name": "South Exit"},
        ]
    },
    {
        "image": "food-hall-floorplan_2.png",
        "name": "Food Hall - Level 2",
        "description": "Second floor dining and specialty vendors",
        "grid": {"rows": 3, "cols": 4},
        "booths": [
            # Define booths for second floor plan
            {"name": "Sushi Bar", "x_ratio": 0.20, "y_ratio": 0.15, "category": "japanese"},
            {"name": "Mediterranean Grill", "x_ratio": 0.40, "y_ratio": 0.15, "category": "mediterranean"},
            {"name": "French Bistro", "x_ratio": 0.60, "y_ratio": 0.15, "category": "french"},
            {"name": "Indian Curry House", "x_ratio": 0.80, "y_ratio": 0.15, "category": "indian"},

            {"name": "Juice & Smoothies", "x_ratio": 0.20, "y_ratio": 0.50, "category": "healthy"},
            {"name": "Salad Bar", "x_ratio": 0.40, "y_ratio": 0.50, "category": "healthy"},
            {"name": "Bubble Tea", "x_ratio": 0.60, "y_ratio": 0.50, "category": "beverages"},
            {"name": "Dessert Bar", "x_ratio": 0.80, "y_ratio": 0.50, "category": "dessert"},

            {"name": "Korean BBQ", "x_ratio": 0.30, "y_ratio": 0.85, "category": "korean"},
            {"name": "Pasta Station", "x_ratio": 0.50, "y_ratio": 0.85, "category": "italian"},
            {"name": "Burger Joint", "x_ratio": 0.70, "y_ratio": 0.85, "category": "american"},
        ],
        "qr_locations": [
            {"x_ratio": 0.20, "y_ratio": 0.15, "name": "North Entrance"},
            {"x_ratio": 0.50, "y_ratio": 0.50, "name": "Center Court"},
        ]
    },
    {
        "image": "food-hall-floorplan_3.png",
        "name": "Food Hall - Event Space",
        "description": "Special events and pop-up vendor area",
        "grid": {"rows": 2, "cols": 3},
        "booths": [
            # Event space layout
            {"name": "Pop-Up Kitchen 1", "x_ratio": 0.20, "y_ratio": 0.25, "category": "popup"},
            {"name": "Pop-Up Kitchen 2", "x_ratio": 0.50, "y_ratio": 0.25, "category": "popup"},
            {"name": "Pop-Up Kitchen 3", "x_ratio": 0.80, "y_ratio": 0.25, "category": "popup"},

            {"name": "Event Bar", "x_ratio": 0.30, "y_ratio": 0.75, "category": "bar"},
            {"name": "Catering Station", "x_ratio": 0.70, "y_ratio": 0.75, "category": "catering"},

            {"name": "Main Stage Area", "x_ratio": 0.50, "y_ratio": 0.50, "category": "event"},
        ],
        "qr_locations": [
            {"x_ratio": 0.20, "y_ratio": 0.25, "name": "Event Entrance"},
            {"x_ratio": 0.50, "y_ratio": 0.50, "name": "Stage Area"},
        ]
    }
]


def seed_floor_plan(db: Session, config: Dict, demo_dir: str):
    """
    Seed a single floor plan with dynamic dimensions.

    Args:
        db: Database session
        config: Floor plan configuration
        demo_dir: Directory containing floor plan images
    """
    image_path = os.path.join(demo_dir, config["image"])

    # Check if image exists
    if not os.path.exists(image_path):
        print(f"⚠️  Warning: Image not found: {config['image']}")
        print(f"   Skipping this floor plan...")
        return

    # Get dynamic image dimensions
    try:
        width, height = get_image_dimensions(image_path)
        print(f"\n📐 Detected image dimensions: {width}x{height} pixels")
    except Exception as e:
        print(f"❌ Error reading image: {e}")
        return

    # Create floor plan
    print(f"\n🏢 Creating: {config['name']}")
    floor_plan = FloorPlan(
        name=config["name"],
        description=config["description"],
        image_url=f"/demo/{config['image']}",
        image_width=width,
        image_height=height,
        organization_id="demo-org-001"
    )
    db.add(floor_plan)
    db.flush()

    # Create navigation grid dynamically
    print(f"📍 Creating navigation grid ({config['grid']['rows']}x{config['grid']['cols']})...")
    nodes_data = create_navigation_grid(
        width,
        height,
        rows=config['grid']['rows'],
        cols=config['grid']['cols']
    )

    # Create nodes
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

    print(f"   ✓ Created {len(nodes)} nodes")

    # Create edges
    edges_data = create_grid_edges(nodes_data)
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

    print(f"   ✓ Created {len(edges_data)} walkable paths")

    # Create booths/POIs with dynamic positioning
    print(f"🍽️  Creating {len(config['booths'])} booths/spaces...")
    for i, booth in enumerate(config['booths'], 1):
        # Calculate position based on ratios
        x = int(width * booth['x_ratio'])
        y = int(height * booth['y_ratio'])

        # Find nearest node
        min_dist = float('inf')
        nearest_node = None
        for node in nodes.values():
            dist = calculate_distance(x, y, node.x, node.y)
            if dist < min_dist:
                min_dist = dist
                nearest_node = node

        poi = POI(
            floor_plan_id=floor_plan.id,
            node_id=nearest_node.id if nearest_node else None,
            name=booth['name'],
            description=f"{booth['name']} - {booth['category'].title()}",
            category=booth['category'],
            x=x,
            y=y,
            icon="restaurant" if booth['category'] != "event" else "event",
            searchable=True,
            metadata={
                "booth_number": str(i),
                "vendor_type": booth["category"]
            }
        )
        db.add(poi)

    print(f"   ✓ All booths created")

    # Create QR code anchors
    print(f"📱 Creating {len(config['qr_locations'])} QR code anchors...")
    for i, qr_loc in enumerate(config['qr_locations'], 1):
        x = int(width * qr_loc['x_ratio'])
        y = int(height * qr_loc['y_ratio'])

        # Find nearest node
        min_dist = float('inf')
        nearest_node = None
        for node in nodes.values():
            dist = calculate_distance(x, y, node.x, node.y)
            if dist < min_dist:
                min_dist = dist
                nearest_node = node

        if nearest_node:
            code = f"{config['name'].upper().replace(' ', '-').replace(',', '')}-QR{i}"
            qr = QRAnchor(
                floor_plan_id=floor_plan.id,
                node_id=nearest_node.id,
                code=code,
                x=nearest_node.x,
                y=nearest_node.y,
                qr_data=f"https://navio.app/scan/{code}",
                placement_notes=f"Near {qr_loc['name']}",
                active=True,
                scan_count=0
            )
            db.add(qr)

    print(f"   ✓ QR codes created")
    print(f"✅ {config['name']} completed!")


def main():
    """Main seeding function."""
    print("\n" + "="*70)
    print("🚀 NavIO Dynamic Demo - Multi-Floor Plan Seed")
    print("="*70 + "\n")

    # Get demo directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    demo_dir = os.path.join(script_dir, "public", "demo")

    if not os.path.exists(demo_dir):
        print(f"❌ Demo directory not found: {demo_dir}")
        print("   Please create backend/public/demo/ and add floor plan images")
        return

    print(f"📂 Looking for floor plans in: {demo_dir}\n")

    # List available images
    available_images = []
    for ext in ['.png', '.jpg', '.jpeg']:
        available_images.extend(Path(demo_dir).glob(f"*{ext}"))

    print(f"🖼️  Found {len(available_images)} image(s):")
    for img in available_images:
        print(f"   • {img.name}")

    db = SessionLocal()
    try:
        processed = 0
        skipped = 0

        for config in FLOOR_PLANS:
            image_path = os.path.join(demo_dir, config["image"])
            if os.path.exists(image_path):
                seed_floor_plan(db, config, demo_dir)
                processed += 1
            else:
                skipped += 1

        db.commit()

        print("\n" + "="*70)
        print("🎉 Seeding Complete!")
        print("="*70)
        print(f"\n📊 Summary:")
        print(f"   • Floor Plans Processed: {processed}")
        print(f"   • Floor Plans Skipped: {skipped}")
        print(f"\n🌐 Access the demo:")
        print(f"   • Frontend: http://localhost:3000")
        print(f"   • API: http://localhost:8000/docs")
        print(f"\n💡 Value: Help visitors find booths in seconds!")
        print("\n" + "="*70 + "\n")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
