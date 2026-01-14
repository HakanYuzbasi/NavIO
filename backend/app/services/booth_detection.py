"""
Accurate Booth Detection Service

Detects individual booth cells in floor plans by:
1. Finding white rectangular areas on colored backgrounds
2. Detecting internal grid lines/divisions within booth groups
3. Creating POIs at the center of each individual cell

This handles floor plans where booths are subdivided into smaller cells.
"""
import cv2
import numpy as np
from typing import List, Dict, Tuple, Optional
import logging

logger = logging.getLogger(__name__)


def detect_booth_cells(image_path: str) -> List[Dict]:
    """
    Detect individual booth cells in a floor plan.

    This function finds white rectangular booths on colored backgrounds
    and detects internal divisions to identify each individual cell.

    Args:
        image_path: Path to floor plan image

    Returns:
        List of booth dictionaries with x, y coordinates at cell centers
    """
    logger.info(f"Detecting booth cells in: {image_path}")

    # Read image
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not read image: {image_path}")

    height, width = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Analyze image to determine threshold
    mean_brightness = np.mean(gray)

    # Find white areas (booths) - they're typically > 200 brightness
    # The background is colored (lower brightness in grayscale)
    _, booth_mask = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY)

    # Also try Otsu for automatic threshold
    _, otsu_mask = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # Use whichever finds more white (booth) areas reasonably
    booth_white_ratio = np.sum(booth_mask > 0) / (width * height)
    otsu_white_ratio = np.sum(otsu_mask > 0) / (width * height)

    # Choose the mask that gives reasonable booth coverage (20-70%)
    if 0.2 < booth_white_ratio < 0.7:
        mask = booth_mask
        logger.info(f"Using threshold 200, white ratio: {booth_white_ratio:.1%}")
    elif 0.2 < otsu_white_ratio < 0.7:
        mask = otsu_mask
        logger.info(f"Using Otsu threshold, white ratio: {otsu_white_ratio:.1%}")
    else:
        # Try different thresholds
        for thresh in [180, 190, 210, 220, 170, 160]:
            _, test_mask = cv2.threshold(gray, thresh, 255, cv2.THRESH_BINARY)
            ratio = np.sum(test_mask > 0) / (width * height)
            if 0.15 < ratio < 0.75:
                mask = test_mask
                logger.info(f"Using threshold {thresh}, white ratio: {ratio:.1%}")
                break
        else:
            mask = booth_mask
            logger.info(f"Fallback to threshold 200")

    # Detect edges/lines within the white areas (booth divisions)
    edges = cv2.Canny(gray, 50, 150)

    # Find lines using HoughLinesP
    lines = cv2.HoughLinesP(edges, 1, np.pi/180, threshold=30, minLineLength=20, maxLineGap=5)

    # Create a line mask to separate booth cells
    line_mask = np.zeros_like(gray)
    if lines is not None:
        for line in lines:
            x1, y1, x2, y2 = line[0]
            cv2.line(line_mask, (x1, y1), (x2, y2), 255, 2)

    # Subtract lines from booth mask to separate cells
    separated_mask = cv2.subtract(mask, line_mask)

    # Clean up
    kernel_small = np.ones((3, 3), np.uint8)
    kernel_medium = np.ones((5, 5), np.uint8)

    # Remove small noise
    separated_mask = cv2.morphologyEx(separated_mask, cv2.MORPH_OPEN, kernel_small, iterations=1)
    # Close small gaps within cells
    separated_mask = cv2.morphologyEx(separated_mask, cv2.MORPH_CLOSE, kernel_small, iterations=1)

    # Find contours of individual cells
    contours, hierarchy = cv2.findContours(
        separated_mask,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE
    )

    logger.info(f"Found {len(contours)} initial contours")

    # Filter and process contours
    booths = []
    min_area = max(100, (width * height) * 0.0001)  # Minimum 0.01% of image
    max_area = (width * height) * 0.05  # Maximum 5% of image (single cell shouldn't be huge)

    for contour in contours:
        area = cv2.contourArea(contour)

        if area < min_area:
            continue

        # Get bounding rectangle
        x, y, w, h = cv2.boundingRect(contour)

        # Skip if too large (might be multiple cells merged)
        if area > max_area:
            # Try to subdivide this large area
            sub_booths = subdivide_large_booth(mask, x, y, w, h, height, min_area)
            booths.extend(sub_booths)
            continue

        # Aspect ratio check - booths are roughly rectangular
        aspect = w / h if h > 0 else 0
        if aspect < 0.1 or aspect > 10:
            continue

        # Calculate center (flip Y for coordinate system)
        center_x = x + w // 2
        center_y = height - (y + h // 2)

        booths.append({
            'x': center_x,
            'y': center_y,
            'width': w,
            'height': h,
            'area': area
        })

    # Remove duplicates (overlapping detections)
    booths = remove_duplicate_booths(booths)

    # Sort by position (top to bottom, left to right)
    booths.sort(key=lambda b: (-b['y'], b['x']))

    # Assign names and categories
    booths = categorize_booths(booths)

    logger.info(f"Detected {len(booths)} booth cells")
    return booths


def subdivide_large_booth(
    mask: np.ndarray,
    x: int, y: int, w: int, h: int,
    img_height: int,
    min_area: float
) -> List[Dict]:
    """
    Subdivide a large booth area into individual cells using grid detection.
    """
    booths = []

    # Extract the region
    region = mask[y:y+h, x:x+w]

    # Try to find grid lines within this region
    # Look for vertical and horizontal gaps (dark lines)

    # Scan for vertical divisions
    col_sums = np.sum(region, axis=0)
    col_threshold = np.max(col_sums) * 0.3

    # Find gaps (low values indicate dividing lines)
    v_gaps = []
    in_gap = False
    gap_start = 0
    for i, val in enumerate(col_sums):
        if val < col_threshold:
            if not in_gap:
                gap_start = i
                in_gap = True
        else:
            if in_gap:
                gap_center = (gap_start + i) // 2
                v_gaps.append(gap_center)
                in_gap = False

    # Scan for horizontal divisions
    row_sums = np.sum(region, axis=1)
    row_threshold = np.max(row_sums) * 0.3

    h_gaps = []
    in_gap = False
    gap_start = 0
    for i, val in enumerate(row_sums):
        if val < row_threshold:
            if not in_gap:
                gap_start = i
                in_gap = True
        else:
            if in_gap:
                gap_center = (gap_start + i) // 2
                h_gaps.append(gap_center)
                in_gap = False

    # Create grid cells
    v_positions = [0] + v_gaps + [w]
    h_positions = [0] + h_gaps + [h]

    for i in range(len(h_positions) - 1):
        for j in range(len(v_positions) - 1):
            cell_x = v_positions[j]
            cell_y = h_positions[i]
            cell_w = v_positions[j + 1] - v_positions[j]
            cell_h = h_positions[i + 1] - h_positions[i]

            if cell_w < 5 or cell_h < 5:
                continue

            cell_area = cell_w * cell_h
            if cell_area < min_area:
                continue

            # Check if this cell is mostly white (is a booth)
            cell_region = region[cell_y:cell_y+cell_h, cell_x:cell_x+cell_w]
            white_ratio = np.sum(cell_region > 128) / (cell_w * cell_h) if cell_w * cell_h > 0 else 0

            if white_ratio > 0.5:  # At least 50% white
                center_x = x + cell_x + cell_w // 2
                center_y = img_height - (y + cell_y + cell_h // 2)

                booths.append({
                    'x': center_x,
                    'y': center_y,
                    'width': cell_w,
                    'height': cell_h,
                    'area': cell_area
                })

    # If no subdivisions found, return the whole booth as one
    if not booths:
        center_x = x + w // 2
        center_y = img_height - (y + h // 2)
        booths.append({
            'x': center_x,
            'y': center_y,
            'width': w,
            'height': h,
            'area': w * h
        })

    return booths


def remove_duplicate_booths(booths: List[Dict], distance_threshold: int = 20) -> List[Dict]:
    """Remove duplicate/overlapping booth detections."""
    if not booths:
        return []

    # Sort by area (larger first)
    sorted_booths = sorted(booths, key=lambda b: -b['area'])

    kept = []
    for booth in sorted_booths:
        is_duplicate = False
        for existing in kept:
            dx = abs(booth['x'] - existing['x'])
            dy = abs(booth['y'] - existing['y'])

            if dx < distance_threshold and dy < distance_threshold:
                is_duplicate = True
                break

        if not is_duplicate:
            kept.append(booth)

    return kept


def categorize_booths(booths: List[Dict]) -> List[Dict]:
    """Assign names and categories to booths based on size."""
    if not booths:
        return []

    areas = [b['area'] for b in booths]
    median_area = np.median(areas)

    counts = {'booth': 0, 'kiosk': 0, 'room': 0}

    for booth in booths:
        area = booth['area']

        if area > median_area * 3:
            counts['room'] += 1
            booth['category'] = 'room'
            booth['name'] = f"Room {counts['room']}"
            booth['description'] = 'Large space'
        elif area < median_area * 0.3:
            counts['kiosk'] += 1
            booth['category'] = 'kiosk'
            booth['name'] = f"Kiosk {counts['kiosk']}"
            booth['description'] = 'Small kiosk'
        else:
            counts['booth'] += 1
            booth['category'] = 'vendor'
            booth['name'] = f"Booth {counts['booth']}"
            booth['description'] = 'Vendor booth'

    logger.info(f"Categorized: {counts}")
    return booths


def visualize_detections(
    image_path: str,
    booths: List[Dict],
    output_path: str
) -> None:
    """Create visualization with red dots at booth centers."""
    img = cv2.imread(image_path)
    height = img.shape[0]

    for booth in booths:
        x = booth['x']
        y_img = height - booth['y']  # Convert back to image coords

        # Draw red filled circle at center
        cv2.circle(img, (x, y_img), 8, (0, 0, 255), -1)

        # Draw small rectangle outline
        w = booth.get('width', 20)
        h = booth.get('height', 20)
        cv2.rectangle(
            img,
            (x - w//2, y_img - h//2),
            (x + w//2, y_img + h//2),
            (0, 255, 0), 1
        )

    cv2.imwrite(output_path, img)
    logger.info(f"Saved visualization to {output_path}")


# Convenience function for API
def auto_detect_booths(image_path: str, method: str = 'auto') -> List[Dict]:
    """
    Main entry point for booth detection.

    Args:
        image_path: Path to floor plan image
        method: Detection method (ignored, always uses best method)

    Returns:
        List of detected booths with coordinates
    """
    return detect_booth_cells(image_path)
