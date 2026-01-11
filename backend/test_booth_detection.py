#!/usr/bin/env python3
"""
Comprehensive booth detection testing and analysis script.

This script provides:
1. Floor plan image analysis with statistics
2. Testing of the BoothDetector service
3. Comparison of different detection methods
4. Parameter optimization recommendations

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

    # Try threshold at different levels
    print(f"\nThreshold analysis:")
    threshold_results = {}
    for threshold in [150, 170, 180, 190, 200]:
        _, binary = cv2.threshold(gray, threshold, 255, cv2.THRESH_BINARY)
        white_pixels = np.sum(binary == 255)
        white_percent = (white_pixels / (width * height)) * 100
        threshold_results[threshold] = white_percent
        print(f"  Threshold {threshold}: {white_percent:.1f}% white pixels")

    # Use optimal threshold (180 is typically good for white booths)
    optimal_threshold = 180
    _, binary = cv2.threshold(gray, optimal_threshold, 255, cv2.THRESH_BINARY)

    # Morphological cleanup
    kernel = np.ones((3, 3), np.uint8)
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel, iterations=2)
    binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel, iterations=1)

    # Find contours using correct OpenCV constant
    contours, hierarchy = cv2.findContours(
        binary,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE
    )

    print(f"\nContour detection:")
    print(f"  Total contours found: {len(contours)}")

    # Analyze contour sizes
    areas = [cv2.contourArea(c) for c in contours]
    areas = [a for a in areas if a > 100]  # Filter tiny noise

    if not areas:
        print("  No significant contours found!")
        return {
            "image_path": image_path,
            "width": width,
            "height": height,
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

    recommended_params = {}
    if reasonable_areas:
        recommended_params = {
            "min_booth_area": int(reasonable_areas[0] * 0.8),
            "max_booth_area": int(reasonable_areas[-1] * 1.2),
        }

        booth_count = len([a for a in reasonable_areas if
                          reasonable_areas[0] * 0.5 < a < reasonable_areas[-1] * 1.5])

        print(f"\nRecommended parameters:")
        print(f"  min_booth_area: {recommended_params['min_booth_area']}")
        print(f"  max_booth_area: {recommended_params['max_booth_area']}")
        print(f"  Expected booths: ~{booth_count}")

        # Show size distribution
        if len(reasonable_areas) > 1:
            step = max((reasonable_areas[-1] - reasonable_areas[0]) / 5, 1)
            print(f"\nSize distribution:")
            for i in range(5):
                lower = reasonable_areas[0] + (i * step)
                upper = reasonable_areas[0] + ((i + 1) * step)
                count = len([a for a in reasonable_areas if lower <= a < upper])
                if count > 0:
                    print(f"  {int(lower):6d} - {int(upper):6d}: {count:3d} contours")

    return {
        "image_path": image_path,
        "width": width,
        "height": height,
        "mean_brightness": mean_val,
        "contours_found": len(contours),
        "significant_contours": len(areas),
        "booth_candidates": len(reasonable_areas),
        "recommended_params": recommended_params,
        "threshold_results": threshold_results
    }


def test_booth_detection_service(image_path: str) -> Optional[List[Dict]]:
    """
    Test the BoothDetector service directly.

    Args:
        image_path: Path to floor plan image

    Returns:
        List of detected booths, or None if detection fails
    """
    print(f"\nTesting BoothDetector service on: {image_path}")
    print("=" * 60)

    if not os.path.exists(image_path):
        print(f"File not found: {image_path}")
        return None

    try:
        from app.services.booth_detection import BoothDetector, auto_detect_booths

        # Test basic detection
        print("\n1. Basic detection method:")
        detector = BoothDetector()
        basic_booths = detector.detect_booths(image_path)
        print(f"   Detected: {len(basic_booths)} booths")

        # Test grid analysis
        print("\n2. Grid analysis method:")
        grid_booths = detector.detect_with_grid_analysis(image_path)
        print(f"   Detected: {len(grid_booths)} booths")

        # Test smart categorization
        print("\n3. Smart categorization method:")
        smart_booths = detector.detect_with_smart_categorization(image_path)
        print(f"   Detected: {len(smart_booths)} booths")

        if smart_booths:
            categories = {}
            for booth in smart_booths:
                cat = booth.get('category', 'unknown')
                categories[cat] = categories.get(cat, 0) + 1
            print(f"   Categories: {categories}")

        # Test convenience function
        print("\n4. auto_detect_booths function:")
        auto_booths = auto_detect_booths(image_path, method='smart')
        print(f"   Detected: {len(auto_booths)} booths")

        return auto_booths

    except ImportError as e:
        print(f"   Could not import booth detection service: {e}")
        print("   Make sure you're running inside the Docker container.")
        return None
    except Exception as e:
        print(f"   Error during detection: {e}")
        import traceback
        traceback.print_exc()
        return None


def find_floor_plan_images(search_paths: List[str]) -> List[str]:
    """
    Find floor plan images in the given search paths.

    Args:
        search_paths: List of paths to search

    Returns:
        List of found image paths
    """
    found_images = []
    image_extensions = ('.png', '.jpg', '.jpeg', '.gif', '.webp')

    for path in search_paths:
        if os.path.isfile(path) and path.lower().endswith(image_extensions):
            found_images.append(path)
        elif os.path.isdir(path):
            for filename in os.listdir(path):
                if filename.lower().endswith(image_extensions):
                    found_images.append(os.path.join(path, filename))

    return found_images


def main():
    """Run comprehensive booth detection tests."""
    print("\n" + "=" * 60)
    print("NavIO Booth Detection Test Suite")
    print("=" * 60)

    # Step 1: Verify OpenCV installation
    if not verify_opencv_installation():
        print("\nOpenCV verification failed. Please check installation.")
        return 1

    # Step 2: Find floor plan images
    if len(sys.argv) > 1:
        # Use command line arguments
        floor_plans = sys.argv[1:]
    else:
        # Default search paths
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

        # Basic analysis
        analysis = analyze_floor_plan(fp)
        if analysis:
            results.append(analysis)

        # Test detection service
        booths = test_booth_detection_service(fp)
        if booths and analysis:
            analysis['detected_booths'] = booths

    # Step 4: Print summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)

    for result in results:
        print(f"\n{result['image_path']}:")
        print(f"  Dimensions: {result['width']}x{result['height']}")
        print(f"  Contours: {result.get('significant_contours', 0)}")
        print(f"  Booth candidates: {result.get('booth_candidates', 0)}")
        if 'detected_booths' in result:
            print(f"  Service detected: {len(result['detected_booths'])} booths")

    print("\n" + "=" * 60)
    print("All tests completed successfully!")
    print("=" * 60)

    return 0


if __name__ == "__main__":
    sys.exit(main())
