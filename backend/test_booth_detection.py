#!/usr/bin/env python3
"""
Comprehensive floor plan analysis and booth detection testing script.

This script provides:
1. Floor plan image analysis with statistics
2. Testing of booth detection methods
3. Testing of full navigation infrastructure generation
4. Walkable area detection verification
5. Node and edge generation testing

Usage:
    docker exec navio_backend python test_booth_detection.py [image_path]
"""
import cv2
import numpy as np
import sys
import os
from typing import List, Dict, Optional, Tuple


def verify_opencv_installation() -> bool:
    """Verify OpenCV is properly installed and configured."""
    print("=" * 60)
    print("OpenCV Installation Check")
    print("=" * 60)

    try:
        print(f"  OpenCV version: {cv2.__version__}")

        # Verify key constants exist
        required_constants = [
            ('CHAIN_APPROX_SIMPLE', cv2.CHAIN_APPROX_SIMPLE),
            ('RETR_EXTERNAL', cv2.RETR_EXTERNAL),
            ('THRESH_BINARY', cv2.THRESH_BINARY),
            ('MORPH_CLOSE', cv2.MORPH_CLOSE),
            ('MORPH_OPEN', cv2.MORPH_OPEN),
        ]

        for name, value in required_constants:
            print(f"  cv2.{name}: {value}")

        # Check for ximgproc (advanced features)
        has_ximgproc = hasattr(cv2, 'ximgproc')
        print(f"  cv2.ximgproc available: {has_ximgproc}")

        print("\nOpenCV installation verified successfully")
        return True

    except AttributeError as e:
        print(f"OpenCV constant missing: {e}")
        return False
    except Exception as e:
        print(f"OpenCV verification failed: {e}")
        return False


def analyze_floor_plan(image_path: str) -> Optional[Dict]:
    """
    Analyze floor plan and show detection statistics.

    Args:
        image_path: Path to the floor plan image

    Returns:
        Dictionary with analysis results, or None if analysis fails
    """
    print(f"\nAnalyzing: {image_path}")
    print("=" * 60)

    # Check if file exists
    if not os.path.exists(image_path):
        print(f"File not found: {image_path}")
        return None

    # Read image
    img = cv2.imread(image_path)
    if img is None:
        print(f"Could not read image: {image_path}")
        return None

    height, width = img.shape[:2]
    print(f"Image dimensions: {width} x {height} pixels")
    print(f"Total area: {width * height:,} pixels")

    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Show color statistics
    mean_val = np.mean(gray)
    std_val = np.std(gray)
    print(f"\nBrightness statistics:")
    print(f"  Mean: {mean_val:.1f}/255")
    print(f"  Std Dev: {std_val:.1f}")

    # Calculate white/dark ratios
    white_ratio = np.sum(gray > 200) / (width * height)
    dark_ratio = np.sum(gray < 80) / (width * height)
    print(f"  White pixels (>200): {white_ratio:.1%}")
    print(f"  Dark pixels (<80): {dark_ratio:.1%}")

    # Edge density
    edges = cv2.Canny(gray, 50, 150)
    edge_density = np.sum(edges > 0) / (width * height)
    print(f"  Edge density: {edge_density:.1%}")

    # Try threshold at different levels
    print(f"\nThreshold analysis:")
    threshold_results = {}
    for threshold in [150, 170, 180, 190, 200]:
        _, binary = cv2.threshold(gray, threshold, 255, cv2.THRESH_BINARY)
        white_pixels = np.sum(binary == 255)
        white_percent = (white_pixels / (width * height)) * 100
        threshold_results[threshold] = white_percent
        print(f"  Threshold {threshold}: {white_percent:.1f}% white pixels")

    # Find contours
    _, binary = cv2.threshold(gray, 180, 255, cv2.THRESH_BINARY)
    kernel = np.ones((3, 3), np.uint8)
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel, iterations=2)
    binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel, iterations=1)

    contours, hierarchy = cv2.findContours(
        binary,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE
    )

    print(f"\nContour detection:")
    print(f"  Total contours found: {len(contours)}")

    # Analyze contour sizes
    areas = [cv2.contourArea(c) for c in contours]
    areas = [a for a in areas if a > 100]

    if not areas:
        print("  No significant contours found!")
        return {
            "image_path": image_path,
            "width": width,
            "height": height,
            "mean_brightness": mean_val,
            "white_ratio": white_ratio,
            "contours_found": 0,
            "booths_detected": 0
        }

    areas.sort()

    print(f"\nContour area statistics:")
    print(f"  Count: {len(areas)}")
    print(f"  Smallest: {areas[0]:.0f} pixels")
    print(f"  Median: {areas[len(areas)//2]:.0f} pixels")
    print(f"  Largest: {areas[-1]:.0f} pixels")
    print(f"  Mean: {np.mean(areas):.0f} pixels")

    # Filter out very large "background" contours
    max_reasonable_area = width * height * 0.1
    reasonable_areas = [a for a in areas if a < max_reasonable_area]

    return {
        "image_path": image_path,
        "width": width,
        "height": height,
        "mean_brightness": mean_val,
        "white_ratio": white_ratio,
        "edge_density": edge_density,
        "contours_found": len(contours),
        "significant_contours": len(areas),
        "booth_candidates": len(reasonable_areas),
        "threshold_results": threshold_results
    }


def test_floor_plan_analyzer(image_path: str) -> Optional[Dict]:
    """
    Test the comprehensive FloorPlanAnalyzer.

    This tests the full navigation infrastructure generation including:
    - Walkable area detection
    - Booth detection
    - Node generation
    - Edge creation
    - POI creation with node linking
    """
    print(f"\nTesting FloorPlanAnalyzer on: {image_path}")
    print("=" * 60)

    if not os.path.exists(image_path):
        print(f"File not found: {image_path}")
        return None

    try:
        from app.services.floor_plan_analyzer import (
            FloorPlanAnalyzer,
            analyze_and_create_navigation
        )

        print("\n1. Initializing FloorPlanAnalyzer...")
        analyzer = FloorPlanAnalyzer(
            node_spacing=50,
            min_booth_area=500,
            max_booth_area=100000,
            corridor_min_width=20
        )

        print("\n2. Running full analysis...")
        result = analyzer.analyze(image_path)

        print("\n3. Analysis Results:")
        print(f"   Image size: {result.width}x{result.height}")
        print(f"   Analysis method: {result.analysis_method}")

        # Walkable area stats
        if result.walkable_mask is not None:
            walkable_pct = (result.walkable_mask > 0).sum() / result.walkable_mask.size * 100
            print(f"\n   WALKABLE AREAS:")
            print(f"   - Walkable percentage: {walkable_pct:.1f}%")
        else:
            walkable_pct = 0
            print(f"\n   WALKABLE AREAS: Not detected")

        # Booth stats
        print(f"\n   BOOTHS/ROOMS DETECTED: {len(result.booths)}")
        if result.booths:
            booth_types = {}
            for booth in result.booths:
                bt = booth.area_type.value
                booth_types[bt] = booth_types.get(bt, 0) + 1
            print(f"   - Types: {booth_types}")

        # Node stats
        print(f"\n   NAVIGATION NODES: {len(result.nodes)}")
        if result.nodes:
            node_types = {}
            for node in result.nodes:
                nt = node.node_type
                node_types[nt] = node_types.get(nt, 0) + 1
            print(f"   - Types: {node_types}")

        # Edge stats
        print(f"\n   NAVIGATION EDGES: {len(result.edges)}")
        if result.edges and result.nodes:
            avg_connections = len(result.edges) * 2 / len(result.nodes)
            print(f"   - Avg connections per node: {avg_connections:.1f}")

        # POI stats
        print(f"\n   POIs CREATED: {len(result.pois)}")
        if result.pois:
            linked = sum(1 for p in result.pois if p.nearest_node_id is not None)
            print(f"   - Linked to nodes: {linked}/{len(result.pois)}")
            categories = {}
            for poi in result.pois:
                categories[poi.category] = categories.get(poi.category, 0) + 1
            print(f"   - Categories: {categories}")

        # Save visualization
        vis_path = image_path.replace('.png', '_analysis.png').replace('.jpg', '_analysis.jpg')
        print(f"\n4. Saving visualization to: {vis_path}")
        analyzer.visualize_analysis(image_path, result, vis_path)

        return {
            "image_path": image_path,
            "width": result.width,
            "height": result.height,
            "walkable_percentage": walkable_pct,
            "booths_detected": len(result.booths),
            "nodes_created": len(result.nodes),
            "edges_created": len(result.edges),
            "pois_created": len(result.pois),
            "analysis_method": result.analysis_method
        }

    except ImportError as e:
        print(f"   Could not import FloorPlanAnalyzer: {e}")
        print("   Make sure you're running inside the Docker container.")
        return None
    except Exception as e:
        print(f"   Error during analysis: {e}")
        import traceback
        traceback.print_exc()
        return None


def test_booth_detection_service(image_path: str) -> Optional[List[Dict]]:
    """
    Test the BoothDetector service directly with all detection modes.
    """
    print(f"\nTesting AdaptiveBoothDetector on: {image_path}")
    print("=" * 60)

    if not os.path.exists(image_path):
        print(f"File not found: {image_path}")
        return None

    try:
        from app.services.booth_detection import (
            AdaptiveBoothDetector,
            auto_detect_booths,
            analyze_floor_plan
        )

        # First, analyze the image
        print("\n1. Image Analysis:")
        analysis = analyze_floor_plan(image_path)
        if analysis:
            print(f"   Recommended mode: {analysis['recommended_mode']}")
            print(f"   Optimal threshold: {analysis['optimal_threshold']}")
            print(f"   Is inverted: {analysis['is_inverted']}")

        # Test adaptive detector
        detector = AdaptiveBoothDetector()

        # Test fully adaptive detection
        print("\n2. ADAPTIVE DETECTION:")
        adaptive_booths = detector.detect_adaptive(image_path)
        print(f"   Detected: {len(adaptive_booths)} booths")

        if adaptive_booths:
            categories = {}
            for booth in adaptive_booths:
                cat = booth.get('category', 'unknown')
                categories[cat] = categories.get(cat, 0) + 1
            print(f"   Categories: {categories}")

        return adaptive_booths

    except ImportError as e:
        print(f"   Could not import booth detection service: {e}")
        return None
    except Exception as e:
        print(f"   Error during detection: {e}")
        import traceback
        traceback.print_exc()
        return None


def find_floor_plan_images(search_paths: List[str]) -> List[str]:
    """Find floor plan images in the given search paths."""
    found_images = []
    image_extensions = ('.png', '.jpg', '.jpeg', '.gif', '.webp')

    for path in search_paths:
        if os.path.isfile(path) and path.lower().endswith(image_extensions):
            found_images.append(path)
        elif os.path.isdir(path):
            for filename in sorted(os.listdir(path)):
                if filename.lower().endswith(image_extensions):
                    found_images.append(os.path.join(path, filename))

    return found_images


def main():
    """Run comprehensive floor plan analysis tests."""
    print("\n" + "=" * 60)
    print("NavIO Floor Plan Analysis Test Suite")
    print("=" * 60)

    # Step 1: Verify OpenCV installation
    if not verify_opencv_installation():
        print("\nOpenCV verification failed. Please check installation.")
        return 1

    # Step 2: Find floor plan images
    if len(sys.argv) > 1:
        floor_plans = sys.argv[1:]
    else:
        search_paths = [
            "./public/demo",
            "./uploads",
            "../public/demo",
        ]
        floor_plans = find_floor_plan_images(search_paths)

        if not floor_plans:
            print("\nNo floor plan images found in default paths.")
            print("Usage: python test_booth_detection.py [image_path ...]")
            return 1

    print(f"\nFound {len(floor_plans)} floor plan(s) to analyze")

    # Step 3: Analyze each floor plan
    results = []
    for fp in floor_plans:
        print("\n" + "-" * 60)

        # Basic image analysis
        basic_analysis = analyze_floor_plan(fp)

        # Test booth detection
        booths = test_booth_detection_service(fp)

        # Test full floor plan analyzer
        full_analysis = test_floor_plan_analyzer(fp)

        if full_analysis:
            results.append(full_analysis)
        elif basic_analysis:
            results.append(basic_analysis)

    # Step 4: Print summary
    print("\n" + "=" * 60)
    print("ANALYSIS SUMMARY")
    print("=" * 60)

    for result in results:
        print(f"\n{result['image_path']}:")
        print(f"  Dimensions: {result['width']}x{result['height']}")

        if 'walkable_percentage' in result:
            print(f"  Walkable area: {result['walkable_percentage']:.1f}%")
            print(f"  Booths detected: {result['booths_detected']}")
            print(f"  Navigation nodes: {result['nodes_created']}")
            print(f"  Navigation edges: {result['edges_created']}")
            print(f"  POIs created: {result['pois_created']}")
            print(f"  Analysis method: {result['analysis_method']}")

            # Navigation readiness check
            if result['nodes_created'] > 0 and result['edges_created'] > 0:
                print(f"  Navigation: READY")
            else:
                print(f"  Navigation: NOT READY (no nodes/edges)")
        else:
            print(f"  Booth candidates: {result.get('booth_candidates', 0)}")

    print("\n" + "=" * 60)
    print("All tests completed!")
    print("=" * 60)

    print("\nNEW FEATURES:")
    print("  - Walkable corridor detection")
    print("  - Automatic navigation node generation")
    print("  - Edge creation for pathfinding")
    print("  - POIs linked to nearest walkable nodes")
    print("  - Visualization output saved as *_analysis.png")

    print("\nAPI ENDPOINTS:")
    print("  POST /api/v1/floor-plans/{id}/analyze-navigation")
    print("    - Creates complete navigation infrastructure")
    print("  GET /api/v1/floor-plans/{id}/navigation-stats")
    print("    - Shows navigation statistics")

    return 0


if __name__ == "__main__":
    sys.exit(main())
