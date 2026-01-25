"""
Complete Example - Full POI and Navigation Detection Pipeline
Demonstrates end-to-end floor plan analysis for NavIO
"""

from floor_plan_analyzer import FloorPlanAnalyzer
from pathfinding import PathFinder, NavigationGraph
import numpy as np
from PIL import Image
import json
import os


def process_floor_plan(image_path: str, floor_id: str, output_dir: str = 'navio_export'):
    """
    Complete pipeline: detect POIs, walkable areas, and generate navigation

    Args:
        image_path: Path to floor plan image
        floor_id: Unique floor identifier
        output_dir: Directory to save results
    """

    print(f"\n{'='*70}")
    print(f"Processing: {floor_id}")
    print(f"{'='*70}")

    # Create output directory
    os.makedirs(output_dir, exist_ok=True)

    # 1. Initialize analyzer
    print(f"\n1. Initializing analyzer...")
    analyzer = FloorPlanAnalyzer(image_path, floor_id)
    print(f"   ✓ Loaded image: {analyzer.image.size}")

    # 2. Detect POIs (booths/stalls)
    print(f"\n2. Detecting POIs...")
    pois = analyzer.detect_pois(min_size=10, fill_threshold=0.3)
    print(f"   ✓ Found {len(pois)} POIs")

    # Categorize by size
    small = sum(1 for p in pois if p.width < 30 or p.height < 30)
    medium = sum(1 for p in pois if 30 <= min(p.width, p.height) < 100)
    large = sum(1 for p in pois if min(p.width, p.height) >= 100)
    print(f"     - Small: {small}, Medium: {medium}, Large: {large}")

    # 3. Detect walkable areas
    print(f"\n3. Detecting walkable areas...")
    walkable = analyzer.detect_walkable_areas()
    print(f"   ✓ Walkable: {walkable.walkable_percent:.1f}%")
    print(f"   ✓ Booths: {walkable.booth_percent:.1f}%")
    print(f"   ✓ Walls: {walkable.wall_percent:.1f}%")
    print(f"   ✓ Navigation paths: {walkable.skeleton_length:,} pixels")

    # 4. Visualize POIs
    print(f"\n4. Creating visualizations...")
    poi_viz_path = os.path.join(output_dir, f"{floor_id}_pois.png")
    analyzer.visualize_pois(poi_viz_path)
    print(f"   ✓ POI visualization: {poi_viz_path}")

    # 5. Visualize walkable areas
    walk_viz_path = os.path.join(output_dir, f"{floor_id}_walkable.png")
    analyzer.visualize_walkable_areas(walk_viz_path)
    print(f"   ✓ Walkable area visualization: {walk_viz_path}")

    # 6. Export data
    print(f"\n5. Exporting data...")

    poi_json_path = os.path.join(output_dir, f"{floor_id}_pois.json")
    analyzer.export_pois_json(poi_json_path)
    print(f"   ✓ POI data: {poi_json_path}")

    walk_json_path = os.path.join(output_dir, f"{floor_id}_walkable.json")
    analyzer.export_walkable_json(walk_json_path)
    print(f"   ✓ Walkable data: {walk_json_path}")

    # 7. Setup navigation graph (for future pathfinding)
    print(f"\n6. Setting up navigation graph...")
    nav_graph = NavigationGraph(floor_id)

    for poi in pois:
        nav_graph.add_poi(poi.poi_id, poi.center_x, poi.center_y)

    print(f"   ✓ Navigation graph initialized with {len(pois)} POIs")

    # 8. Create summary
    summary = {
        'floor_id': floor_id,
        'image_dimensions': {
            'width': analyzer.image.width,
            'height': analyzer.image.height
        },
        'poi_statistics': {
            'total': len(pois),
            'small': small,
            'medium': medium,
            'large': large
        },
        'walkable_statistics': {
            'walkable_percent': round(walkable.walkable_percent, 1),
            'booth_percent': round(walkable.booth_percent, 1),
            'wall_percent': round(walkable.wall_percent, 1),
            'navigation_path_length': walkable.skeleton_length
        }
    }

    summary_path = os.path.join(output_dir, f"{floor_id}_summary.json")
    with open(summary_path, 'w') as f:
        json.dump(summary, f, indent=2)
    print(f"   ✓ Summary: {summary_path}")

    return analyzer, pois, walkable, summary


def main():
    """Main execution"""

    print("\n" + "="*70)
    print("NavIO Floor Plan Analysis - Complete Pipeline")
    print("="*70)

    # Process each floor
    floors = [
        ('food-hall-floorplan_3.jpg', 'floor_1'),
        ('food-hall-floorplan.jpg', 'floor_2'),
        ('food-hall-floorplan_2.jpg', 'floor_3'),
    ]

    all_results = {}

    for image_path, floor_id in floors:
        if os.path.exists(image_path):
            analyzer, pois, walkable, summary = process_floor_plan(image_path, floor_id)
            all_results[floor_id] = summary
        else:
            print(f"\n⚠ Warning: {image_path} not found")

    # Create master index
    print(f"\n{'='*70}")
    print("Creating master index...")
    print(f"{'='*70}")

    master_index = {
        'project': 'NavIO - Floor Plan Analysis',
        'total_floors': len(all_results),
        'total_pois': sum(s['poi_statistics']['total'] for s in all_results.values()),
        'floors': all_results,
        'generated_files': {
            'pois_visualization': 'floor_*_pois.png',
            'walkable_visualization': 'floor_*_walkable.png',
            'pois_data': 'floor_*_pois.json',
            'walkable_data': 'floor_*_walkable.json',
            'summary': 'floor_*_summary.json',
            'master_index': 'index.json'
        }
    }

    with open('navio_export/index.json', 'w') as f:
        json.dump(master_index, f, indent=2)

    print(f"\n✓ Master index: navio_export/index.json")
    print(f"\n{'='*70}")
    print("ANALYSIS COMPLETE")
    print(f"{'='*70}")
    print(f"Total POIs detected: {master_index['total_pois']}")
    print(f"Total floors analyzed: {master_index['total_floors']}")
    print(f"Output directory: navio_export/")
    print(f"{'='*70}\n")


if __name__ == "__main__":
    main()
