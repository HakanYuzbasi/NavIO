#!/usr/bin/env python3
"""
Debug script for booth detection.
Helps identify the right parameters for your floor plans.
"""
import cv2
import numpy as np
import sys

def analyze_floor_plan(image_path: str):
    """Analyze floor plan and show detection statistics."""
    print(f"\n🔍 Analyzing: {image_path}")
    print("=" * 60)

    # Read image
    img = cv2.imread(image_path)
    if img is None:
        print(f"❌ Could not read image: {image_path}")
        return

    height, width = img.shape[:2]
    print(f"📐 Image dimensions: {width} x {height} pixels")
    print(f"📏 Total area: {width * height:,} pixels")

    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Show color statistics
    mean_val = np.mean(gray)
    print(f"\n🎨 Average brightness: {mean_val:.1f}/255")

    # Try threshold at different levels
    print(f"\n🧪 Testing threshold levels:")
    for threshold in [150, 170, 180, 190, 200]:
        _, binary = cv2.threshold(gray, threshold, 255, cv2.THRESH_BINARY)
        white_pixels = np.sum(binary == 255)
        white_percent = (white_pixels / (width * height)) * 100
        print(f"   Threshold {threshold}: {white_percent:.1f}% white pixels")

    # Use optimal threshold
    _, binary = cv2.threshold(gray, 180, 255, cv2.THRESH_BINARY)

    # Morphological cleanup
    kernel = np.ones((3, 3), np.uint8)
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel, iterations=2)
    binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel, iterations=1)

    # Find contours
    contours, _ = cv2.findContours(
        binary,
        cv2.RETR_EXTERNAL,
        cv2.CONTOUR_APPROX_SIMPLE
    )

    print(f"\n📊 Found {len(contours)} contours total")

    # Analyze contour sizes
    areas = [cv2.contourArea(c) for c in contours]
    areas = [a for a in areas if a > 100]  # Filter tiny noise

    if not areas:
        print("❌ No significant contours found!")
        return

    areas.sort()

    print(f"\n📈 Contour area statistics:")
    print(f"   Smallest: {areas[0]:.0f} pixels")
    print(f"   Median: {areas[len(areas)//2]:.0f} pixels")
    print(f"   Largest: {areas[-1]:.0f} pixels")
    print(f"   Mean: {np.mean(areas):.0f} pixels")

    # Suggest parameters
    min_area = areas[0] if len(areas) > 0 else 500
    max_area = areas[-1] if len(areas) > 0 else 50000

    # Try to filter out the very large "background" contour
    reasonable_areas = [a for a in areas if a < (width * height * 0.1)]

    if reasonable_areas:
        print(f"\n✅ Recommended booth detection parameters:")
        print(f"   min_booth_area: {int(reasonable_areas[0] * 0.8)}")
        print(f"   max_booth_area: {int(reasonable_areas[-1] * 1.2)}")

        booth_count = len([a for a in reasonable_areas if
                          reasonable_areas[0] * 0.5 < a < reasonable_areas[-1] * 1.5])
        print(f"   Expected booths: ~{booth_count}")

    # Show size distribution
    print(f"\n📊 Size distribution:")
    if len(reasonable_areas) > 0:
        step = (reasonable_areas[-1] - reasonable_areas[0]) / 5
        for i in range(5):
            lower = reasonable_areas[0] + (i * step)
            upper = reasonable_areas[0] + ((i + 1) * step)
            count = len([a for a in reasonable_areas if lower <= a < upper])
            print(f"   {int(lower):6d} - {int(upper):6d}: {count:3d} contours")

if __name__ == "__main__":
    # Test with all floor plan images
    floor_plans = [
        "./public/demo/food-hall-floorplan_2.png",
        "./public/demo/food-hall-floorplan_3.png",
        "./public/demo/food-hall-floorplan_4.png",
    ]

    for fp in floor_plans:
        analyze_floor_plan(fp)
        print("\n")
