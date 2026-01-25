"""
State-of-the-Art Floor Plan Detection

Uses scipy.ndimage.label for connected component analysis.
This is the EXACT same approach as the reference Python script that produces
complete_annotated_1.png results.

Two outputs:
1. Rectangle/Booth Detection - Red dots at center of each white rectangle
2. Walkable Path Detection - Green overlay on colored corridor areas
"""
import cv2
import numpy as np
from scipy import ndimage
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class DetectedRectangle:
    """A detected rectangle (booth/room)."""
    id: int
    center_x: int
    center_y: int
    width: int
    height: int
    area: int
    fill_ratio: float
    category: str  # 'small', 'medium', 'large'


@dataclass
class DetectionResult:
    """Complete detection result."""
    rectangles: List[DetectedRectangle]
    walkable_mask: np.ndarray
    image_width: int
    image_height: int


def detect_all_rectangles(image_path: str) -> Tuple[List[DetectedRectangle], np.ndarray]:
    """
    Detect ALL white rectangles in a floor plan image.

    This uses the EXACT same algorithm as the reference script:
    1. Convert to grayscale
    2. Threshold at 180 to find white regions
    3. Use scipy.ndimage.label for connected components
    4. Filter by size (min 10 pixels) and shape (fill_ratio > 0.3)

    Args:
        image_path: Path to floor plan image

    Returns:
        Tuple of (list of detected rectangles, original image as numpy array)
    """
    # Read image
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not read image: {image_path}")

    height, width = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    logger.info(f"Analyzing image: {width}x{height}")

    # Binary threshold - white regions are booths (brightness > 180)
    white_regions = (gray > 180).astype(np.uint8)

    # Connected component labeling using scipy
    labeled, num_features = ndimage.label(white_regions)

    logger.info(f"Found {num_features} connected white regions")

    rectangles = []

    for region_id in range(1, num_features + 1):
        mask = (labeled == region_id)

        # Get coordinates of all pixels in this region
        coords = np.argwhere(mask)
        if len(coords) < 10:  # Skip extremely tiny regions
            continue

        # Calculate bounding box (coords are [y, x])
        min_y, min_x = coords.min(axis=0)
        max_y, max_x = coords.max(axis=0)

        rect_width = max_x - min_x + 1
        rect_height = max_y - min_y + 1

        # Skip if too small in any dimension
        if rect_width < 5 or rect_height < 5:
            continue

        # Skip if it's the entire image background
        if rect_width > width * 0.95 or rect_height > height * 0.95:
            continue

        # Calculate fill ratio (rectangularity)
        area = len(coords)
        bbox_area = rect_width * rect_height
        fill_ratio = area / bbox_area if bbox_area > 0 else 0

        # Accept shapes that are at least 30% rectangular
        if fill_ratio < 0.3:
            continue

        # Calculate center
        center_x = (min_x + max_x) // 2
        center_y = (min_y + max_y) // 2

        # Categorize by size
        if area < 500:
            category = 'small'
        elif area < 5000:
            category = 'medium'
        else:
            category = 'large'

        rectangles.append(DetectedRectangle(
            id=len(rectangles) + 1,
            center_x=int(center_x),
            center_y=int(center_y),
            width=int(rect_width),
            height=int(rect_height),
            area=int(area),
            fill_ratio=float(fill_ratio),
            category=category
        ))

    logger.info(f"Detected {len(rectangles)} valid rectangles")
    return rectangles, img


def detect_walkable_areas(image_path: str) -> Tuple[np.ndarray, np.ndarray]:
    """
    Detect walkable corridor areas.

    Walkable areas are the COLORED regions (not white).
    Uses HSV saturation to distinguish colored corridors from white booths.

    Args:
        image_path: Path to floor plan image

    Returns:
        Tuple of (walkable mask as binary numpy array, original image)
    """
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not read image: {image_path}")

    height, width = img.shape[:2]

    # Convert to HSV for better color detection
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    saturation = hsv[:, :, 1]

    # Walkable areas have COLOR (saturation > 15)
    # White/gray areas (booths) have low saturation
    walkable = (saturation > 15).astype(np.uint8) * 255

    # Clean up with morphological operations
    kernel = np.ones((5, 5), np.uint8)

    # Remove small noise
    walkable = cv2.morphologyEx(walkable, cv2.MORPH_OPEN, kernel, iterations=1)

    # Close small gaps
    walkable = cv2.morphologyEx(walkable, cv2.MORPH_CLOSE, kernel, iterations=2)

    walkable_pct = np.sum(walkable > 0) / (width * height) * 100
    logger.info(f"Walkable area: {walkable_pct:.1f}% of image")

    return walkable, img


def create_annotated_image(
    image_path: str,
    output_path: str,
    dot_radius: int = 3
) -> int:
    """
    Create annotated image with red dots at rectangle centers.
    This matches the reference complete_annotated_*.png images.

    Args:
        image_path: Input floor plan image
        output_path: Where to save the annotated image
        dot_radius: Radius of red dots (default 3 for small dots)

    Returns:
        Number of rectangles detected
    """
    rectangles, img = detect_all_rectangles(image_path)

    # Draw red dots at each rectangle center
    for rect in rectangles:
        # Red color in BGR
        cv2.circle(img, (rect.center_x, rect.center_y), dot_radius, (0, 0, 255), -1)

    cv2.imwrite(output_path, img)
    logger.info(f"Saved annotated image to {output_path} with {len(rectangles)} dots")

    return len(rectangles)


def create_walkable_overlay(
    image_path: str,
    output_path: str,
    overlay_color: Tuple[int, int, int] = (0, 255, 0),  # Green
    alpha: float = 0.5
) -> float:
    """
    Create image with walkable paths highlighted.
    This matches the reference walkable_paths_*.png images.

    Args:
        image_path: Input floor plan image
        output_path: Where to save the walkable overlay image
        overlay_color: Color for walkable areas (BGR)
        alpha: Transparency of overlay

    Returns:
        Percentage of walkable area
    """
    walkable_mask, img = detect_walkable_areas(image_path)
    height, width = img.shape[:2]

    # Create colored overlay
    overlay = img.copy()
    overlay[walkable_mask > 0] = overlay_color

    # Blend with original
    result = cv2.addWeighted(img, 1 - alpha, overlay, alpha, 0)

    # Draw contours around walkable areas for clarity
    contours, _ = cv2.findContours(walkable_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(result, contours, -1, (0, 0, 255), 2)  # Red contour lines

    cv2.imwrite(output_path, result)

    walkable_pct = np.sum(walkable_mask > 0) / (width * height) * 100
    logger.info(f"Saved walkable overlay to {output_path} ({walkable_pct:.1f}% walkable)")

    return walkable_pct


def analyze_floor_plan(image_path: str) -> DetectionResult:
    """
    Complete floor plan analysis.

    Args:
        image_path: Path to floor plan image

    Returns:
        DetectionResult with all detected elements
    """
    rectangles, img = detect_all_rectangles(image_path)
    walkable_mask, _ = detect_walkable_areas(image_path)

    height, width = img.shape[:2]

    return DetectionResult(
        rectangles=rectangles,
        walkable_mask=walkable_mask,
        image_width=width,
        image_height=height
    )


# Convenience functions for API compatibility
def detect_booth_cells(image_path: str) -> List[Dict]:
    """
    API-compatible function that returns booth detections as dictionaries.
    """
    rectangles, _ = detect_all_rectangles(image_path)

    return [
        {
            'x': rect.center_x,
            'y': rect.center_y,
            'width': rect.width,
            'height': rect.height,
            'area': rect.area,
            'fill_ratio': rect.fill_ratio,
            'category': rect.category,
            'name': f"Booth {rect.id}",
            'description': f"Auto-detected {rect.category} booth"
        }
        for rect in rectangles
    ]


def auto_detect_booths(image_path: str, method: str = 'auto') -> List[Dict]:
    """Legacy API compatibility."""
    return detect_booth_cells(image_path)


if __name__ == "__main__":
    """Test the detection on demo images."""
    import sys
    import os

    logging.basicConfig(level=logging.INFO)

    # Find demo images
    demo_dir = "./public/demo"
    if not os.path.isdir(demo_dir):
        demo_dir = "../public/demo"

    if not os.path.isdir(demo_dir):
        print("Demo directory not found")
        sys.exit(1)

    for filename in sorted(os.listdir(demo_dir)):
        if filename.endswith(('.png', '.jpg', '.jpeg')) and not filename.endswith('_detected.png') and not filename.endswith('_walkable.png'):
            image_path = os.path.join(demo_dir, filename)
            base_name = os.path.splitext(filename)[0]

            print(f"\n{'='*60}")
            print(f"Processing: {filename}")
            print('='*60)

            # Create annotated image (red dots)
            annotated_path = os.path.join(demo_dir, f"{base_name}_detected.png")
            count = create_annotated_image(image_path, annotated_path)
            print(f"  Rectangles detected: {count}")
            print(f"  Saved: {annotated_path}")

            # Create walkable overlay
            walkable_path = os.path.join(demo_dir, f"{base_name}_walkable.png")
            pct = create_walkable_overlay(image_path, walkable_path)
            print(f"  Walkable area: {pct:.1f}%")
            print(f"  Saved: {walkable_path}")

    print("\nDone!")
