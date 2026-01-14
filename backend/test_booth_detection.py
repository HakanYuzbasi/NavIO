#!/usr/bin/env python3
"""
Booth Detection Test Script

Tests the booth detection and generates visualization with red dots
at each detected booth center (matching the reference images).

Usage:
    docker exec navio_backend python test_booth_detection.py
"""
import cv2
import numpy as np
import sys
import os
from typing import List, Dict, Optional


def test_detection(image_path: str) -> Optional[Dict]:
    """Test booth detection on a single image."""
    print(f"\n{'='*60}")
    print(f"Testing: {image_path}")
    print('='*60)

    if not os.path.exists(image_path):
        print(f"  File not found: {image_path}")
        return None

    try:
        from app.services.booth_detection import (
            detect_booth_cells,
            visualize_detections
        )

        # Run detection
        print("\n1. Running booth cell detection...")
        booths = detect_booth_cells(image_path)
        print(f"   Detected: {len(booths)} booth cells")

        # Count categories
        if booths:
            categories = {}
            for b in booths:
                cat = b.get('category', 'unknown')
                categories[cat] = categories.get(cat, 0) + 1
            print(f"   Categories: {categories}")

        # Generate visualization
        output_path = image_path.replace('.png', '_detected.png').replace('.jpg', '_detected.jpg')
        print(f"\n2. Saving visualization to: {output_path}")
        visualize_detections(image_path, booths, output_path)

        return {
            'image': image_path,
            'booths': len(booths),
            'output': output_path
        }

    except Exception as e:
        print(f"   Error: {e}")
        import traceback
        traceback.print_exc()
        return None


def main():
    """Run booth detection tests."""
    print("\n" + "="*60)
    print("NavIO Booth Detection Test")
    print("="*60)

    # Find floor plans
    search_dirs = ["./public/demo", "./uploads", "../public/demo"]
    floor_plans = []

    for dir_path in search_dirs:
        if os.path.isdir(dir_path):
            for f in sorted(os.listdir(dir_path)):
                if f.lower().endswith(('.png', '.jpg', '.jpeg')):
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
    print("SUMMARY")
    print("="*60)

    for r in results:
        print(f"\n{r['image']}:")
        print(f"  Booths detected: {r['booths']}")
        print(f"  Visualization: {r['output']}")

    print("\n" + "="*60)
    print("Done! Check the *_detected.png files for visualizations.")
    print("="*60)

    return 0


if __name__ == "__main__":
    sys.exit(main())
