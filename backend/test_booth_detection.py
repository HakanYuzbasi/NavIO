#!/usr/bin/env python3
"""
Booth Detection Test Script

Tests the improved booth detection algorithm and generates visualizations
showing red dots at each detected booth cell center and green rectangles
around each cell boundary.

Usage:
    docker exec navio_backend python test_booth_detection.py

Or run directly:
    cd backend && python test_booth_detection.py
"""
import cv2
import numpy as np
import sys
import os
from typing import List, Dict, Optional

# Direct import to avoid loading all services
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def test_detection(image_path: str, show_walkable: bool = False) -> Optional[Dict]:
    """Test booth detection on a single image."""
    print(f"\n{'='*60}")
    print(f"Testing: {image_path}")
    print('='*60)

    if not os.path.exists(image_path):
        print(f"  File not found: {image_path}")
        return None

    try:
        # Direct import from module file to avoid services __init__.py
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "booth_detection",
            os.path.join(os.path.dirname(__file__), "app/services/booth_detection.py")
        )
        booth_detection = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(booth_detection)

        BoothDetector = booth_detection.BoothDetector
        WalkableAreaDetector = booth_detection.WalkableAreaDetector
        visualize_detections = booth_detection.visualize_detections

        # Load image info
        img = cv2.imread(image_path)
        height, width = img.shape[:2]
        print(f"   Image size: {width}x{height}")

        # Run detection with detailed output
        print("\n1. Running booth cell detection...")
        print("   Using multi-strategy detection:")
        print("   - Line-based segmentation")
        print("   - Contour hierarchy analysis")
        print("   - Watershed segmentation")

        detector = BoothDetector(image_path)
        booths = detector.detect()

        print(f"\n   Total detected: {len(booths)} booth cells")

        # Count categories
        categories = {}
        if booths:
            areas = []
            for b in booths:
                cat = b.get('category', 'unknown')
                categories[cat] = categories.get(cat, 0) + 1
                areas.append(b.get('area', 0))

            print(f"   Categories: {categories}")
            if areas:
                print(f"   Area range: {min(areas)} - {max(areas)} pixels")
                print(f"   Median area: {np.median(areas):.0f} pixels")

        # Generate visualization with booths
        output_path = image_path.replace('.png', '_detected.png').replace('.jpg', '_detected.jpg')
        print(f"\n2. Generating visualization...")
        visualize_detections(image_path, booths, output_path,
                           show_rectangles=True, show_walkable=show_walkable)
        print(f"   Saved to: {output_path}")

        # Also detect walkable areas
        print("\n3. Detecting walkable corridors...")
        walkable_detector = WalkableAreaDetector(image_path)
        walkable_mask = walkable_detector.detect()
        walkable_pixels = cv2.countNonZero(walkable_mask)
        walkable_percent = (walkable_pixels / (width * height)) * 100
        print(f"   Walkable area: {walkable_percent:.1f}% of floor plan")

        # Save walkable visualization
        walkable_output = image_path.replace('.png', '_walkable.png').replace('.jpg', '_walkable.jpg')
        walkable_vis = img.copy()
        walkable_vis[walkable_mask > 0] = [0, 180, 0]
        walkable_vis = cv2.addWeighted(img, 0.5, walkable_vis, 0.5, 0)
        cv2.imwrite(walkable_output, walkable_vis)
        print(f"   Walkable visualization: {walkable_output}")

        return {
            'image': image_path,
            'size': f"{width}x{height}",
            'booths': len(booths),
            'categories': categories if booths else {},
            'walkable_percent': walkable_percent,
            'output': output_path,
            'walkable_output': walkable_output
        }

    except Exception as e:
        print(f"   Error: {e}")
        import traceback
        traceback.print_exc()
        return None


def main():
    """Run booth detection tests."""
    print("\n" + "="*60)
    print("NavIO Advanced Booth Detection Test")
    print("="*60)
    print("\nDetection strategies:")
    print("  1. Line-based segmentation (finds black dividing lines)")
    print("  2. Contour hierarchy (finds enclosed white regions)")
    print("  3. Watershed segmentation (separates touching cells)")
    print("  4. Results merged and deduplicated")

    # Find floor plans
    search_dirs = ["./public/demo", "./uploads", "../public/demo"]
    floor_plans = []

    for dir_path in search_dirs:
        if os.path.isdir(dir_path):
            for f in sorted(os.listdir(dir_path)):
                if f.lower().endswith(('.png', '.jpg', '.jpeg')):
                    if '_detected' not in f and '_walkable' not in f:
                        floor_plans.append(os.path.join(dir_path, f))

    if not floor_plans:
        print("\nNo floor plan images found.")
        return 1

    print(f"\nFound {len(floor_plans)} floor plan(s)")

    # Test each
    results = []
    for fp in floor_plans:
        result = test_detection(fp)
        if result:
            results.append(result)

    # Summary
    print("\n" + "="*60)
    print("DETECTION SUMMARY")
    print("="*60)

    total_booths = 0
    for r in results:
        total_booths += r['booths']
        print(f"\n{os.path.basename(r['image'])}:")
        print(f"  Size: {r['size']}")
        print(f"  Booth cells detected: {r['booths']}")
        print(f"  Categories: {r['categories']}")
        print(f"  Walkable area: {r['walkable_percent']:.1f}%")
        print(f"  Outputs:")
        print(f"    - {r['output']}")
        print(f"    - {r['walkable_output']}")

    print(f"\nTotal booth cells detected across all images: {total_booths}")

    print("\n" + "="*60)
    print("Done! Check the output files:")
    print("  *_detected.png - Red dots at booth centers, green rectangles")
    print("  *_walkable.png - Green overlay on walkable corridors")
    print("="*60)

    return 0


if __name__ == "__main__":
    sys.exit(main())
