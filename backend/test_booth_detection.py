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


def test_detection(image_path: str, show_walkable: bool = False) -> Optional[Dict]:
    """Test booth detection on a single image."""
    print(f"\n{'='*60}")
    print(f"Testing: {image_path}")
    print('='*60)

    if not os.path.exists(image_path):
        print(f"  File not found: {image_path}")
        return None

    try:
        from app.services.booth_detection import (
            BoothDetector,
            WalkableAreaDetector,
            visualize_detections,
            detect_booth_cells
        )

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
        if booths:
            categories = {}
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


def create_combined_visualization(image_path: str, booths: List[Dict], output_path: str):
    """Create a combined visualization showing booths and walkable areas."""
    from app.services.booth_detection import WalkableAreaDetector

    img = cv2.imread(image_path)
    height = img.shape[0]

    # Detect walkable areas
    walkable_detector = WalkableAreaDetector(image_path)
    walkable_mask = walkable_detector.detect()

    # Create overlay
    overlay = img.copy()

    # Color walkable areas in semi-transparent cyan
    overlay[walkable_mask > 0] = [180, 180, 0]  # Cyan for corridors

    # Blend
    result = cv2.addWeighted(img, 0.6, overlay, 0.4, 0)

    # Draw booth markers
    for booth in booths:
        x = booth['x']
        y_img = booth.get('img_y', height - booth['y'])

        # Red dot at center
        cv2.circle(result, (x, y_img), 6, (0, 0, 255), -1)
        cv2.circle(result, (x, y_img), 6, (255, 255, 255), 1)  # White outline

        # Green rectangle
        w = booth.get('width', 20)
        h = booth.get('height', 20)
        x1 = x - w // 2
        y1 = y_img - h // 2
        x2 = x + w // 2
        y2 = y_img + h // 2
        cv2.rectangle(result, (x1, y1), (x2, y2), (0, 255, 0), 2)

    cv2.imwrite(output_path, result)
    return output_path


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
