"""
Enhanced Booth Detection Service with Confidence Scoring

Detects individual booth cells in floor plans by:
1. Using adaptive thresholding for varying image conditions
2. Finding white rectangular areas on colored backgrounds
3. Detecting internal grid lines/divisions within booth groups
4. Creating POIs at the center of each individual cell
5. Providing confidence scores for each detection

This handles floor plans where booths are subdivided into smaller cells.
"""
import cv2
import numpy as np
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class DetectionMethod(str, Enum):
    """Detection method options."""
    AUTO = "auto"
    ADAPTIVE = "adaptive"
    FIXED = "fixed"
    OTSU = "otsu"


@dataclass
class BoothDetectionConfig:
    """Configuration for booth detection."""
    min_confidence: float = 0.5
    min_area_ratio: float = 0.0001  # 0.01% of image
    max_area_ratio: float = 0.05   # 5% of image
    adaptive_threshold: bool = True
    detection_method: DetectionMethod = DetectionMethod.AUTO
    threshold_value: int = 200
    min_aspect_ratio: float = 0.1
    max_aspect_ratio: float = 10.0


@dataclass
class DetectedBooth:
    """Detected booth with metadata."""
    x: int
    y: int
    width: int
    height: int
    area: int
    confidence: float
    name: str = ""
    category: str = "booth"
    description: str = ""

    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        return {
            'x': self.x,
            'y': self.y,
            'width': self.width,
            'height': self.height,
            'area': self.area,
            'confidence': round(self.confidence, 3),
            'name': self.name,
            'category': self.category,
            'description': self.description
        }


def calculate_confidence(
    area: float,
    aspect_ratio: float,
    solidity: float,
    white_ratio: float,
    median_area: float
) -> float:
    """
    Calculate confidence score for a detected booth.

    Factors considered:
    - Area relative to median (booths of similar size get higher scores)
    - Aspect ratio (squares/rectangles get higher scores)
    - Solidity (how rectangular the contour is)
    - White ratio (how much of the bounding box is white)
    """
    # Area score: highest when close to median
    if median_area > 0:
        area_ratio = min(area, median_area) / max(area, median_area)
    else:
        area_ratio = 0.5
    area_score = area_ratio * 0.3

    # Aspect ratio score: prefer rectangles (0.5 to 2.0 aspect ratio)
    if 0.5 <= aspect_ratio <= 2.0:
        aspect_score = 0.25
    elif 0.25 <= aspect_ratio <= 4.0:
        aspect_score = 0.15
    else:
        aspect_score = 0.05

    # Solidity score: how filled is the contour
    solidity_score = solidity * 0.25

    # White ratio score: booths should be mostly white
    white_score = white_ratio * 0.2

    total = area_score + aspect_score + solidity_score + white_score
    return min(1.0, max(0.0, total))


def analyze_image_histogram(gray: np.ndarray) -> Tuple[int, str]:
    """
    Analyze image histogram to determine optimal threshold.

    Returns:
        Tuple of (threshold_value, method_used)
    """
    hist = cv2.calcHist([gray], [0], None, [256], [0, 256])
    hist = hist.flatten()

    # Find peaks in histogram
    peaks = []
    for i in range(10, 246):
        if hist[i] > hist[i-1] and hist[i] > hist[i+1]:
            peaks.append((i, hist[i]))

    peaks.sort(key=lambda x: x[1], reverse=True)

    # If we have clear bimodal distribution, use midpoint
    if len(peaks) >= 2:
        top_two = sorted([peaks[0][0], peaks[1][0]])
        if top_two[1] - top_two[0] > 50:  # Clear separation
            threshold = (top_two[0] + top_two[1]) // 2
            return threshold, "histogram_bimodal"

    # Otherwise use mean-based threshold
    mean_brightness = np.mean(gray)
    if mean_brightness > 200:
        return 190, "mean_bright"
    elif mean_brightness > 150:
        return 200, "mean_normal"
    else:
        return 180, "mean_dark"


def detect_booth_cells(
    image_path: str,
    config: Optional[BoothDetectionConfig] = None
) -> List[DetectedBooth]:
    """
    Detect individual booth cells in a floor plan with confidence scoring.

    Args:
        image_path: Path to floor plan image
        config: Detection configuration (uses defaults if None)

    Returns:
        List of DetectedBooth objects with confidence scores
    """
    if config is None:
        config = BoothDetectionConfig()

    logger.info(f"Detecting booth cells in: {image_path}")

    # Read image
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not read image: {image_path}")

    height, width = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Determine threshold based on method
    if config.adaptive_threshold:
        threshold_value, method = analyze_image_histogram(gray)
        logger.info(f"Using adaptive threshold: {threshold_value} (method: {method})")
    else:
        threshold_value = config.threshold_value
        method = "fixed"
        logger.info(f"Using fixed threshold: {threshold_value}")

    # Try multiple thresholding approaches
    masks = []

    # Fixed threshold
    _, fixed_mask = cv2.threshold(gray, threshold_value, 255, cv2.THRESH_BINARY)
    masks.append(("fixed", fixed_mask))

    # Otsu's method
    _, otsu_mask = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    masks.append(("otsu", otsu_mask))

    # Adaptive threshold (for uneven lighting)
    adaptive_mask = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY, 21, 5
    )
    masks.append(("adaptive", adaptive_mask))

    # Select best mask based on white ratio
    best_mask = None
    best_score = 0
    best_method = ""

    for method_name, mask in masks:
        white_ratio = np.sum(mask > 0) / (width * height)
        # Prefer masks with 20-70% white area
        if 0.15 < white_ratio < 0.75:
            score = 1.0 - abs(0.4 - white_ratio)  # Prefer ~40% white
            if score > best_score:
                best_score = score
                best_mask = mask
                best_method = method_name

    if best_mask is None:
        best_mask = fixed_mask
        best_method = "fallback_fixed"

    logger.info(f"Selected mask method: {best_method}")

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
    separated_mask = cv2.subtract(best_mask, line_mask)

    # Clean up
    kernel_small = np.ones((3, 3), np.uint8)
    separated_mask = cv2.morphologyEx(separated_mask, cv2.MORPH_OPEN, kernel_small, iterations=1)
    separated_mask = cv2.morphologyEx(separated_mask, cv2.MORPH_CLOSE, kernel_small, iterations=1)

    # Find contours of individual cells
    contours, hierarchy = cv2.findContours(
        separated_mask,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE
    )

    logger.info(f"Found {len(contours)} initial contours")

    # Calculate area bounds
    min_area = max(100, (width * height) * config.min_area_ratio)
    max_area = (width * height) * config.max_area_ratio

    # First pass: collect all valid booth candidates
    booth_candidates = []

    for contour in contours:
        area = cv2.contourArea(contour)

        if area < min_area:
            continue

        x, y, w, h = cv2.boundingRect(contour)
        aspect = w / h if h > 0 else 0

        if aspect < config.min_aspect_ratio or aspect > config.max_aspect_ratio:
            continue

        # Calculate solidity (contour area / bounding rect area)
        rect_area = w * h
        solidity = area / rect_area if rect_area > 0 else 0

        # Calculate white ratio in bounding box
        roi = best_mask[y:y+h, x:x+w]
        white_ratio = np.sum(roi > 0) / rect_area if rect_area > 0 else 0

        if area > max_area:
            # Try to subdivide large areas
            sub_booths = subdivide_large_booth(
                best_mask, x, y, w, h, height, min_area,
                config, white_ratio
            )
            booth_candidates.extend(sub_booths)
        else:
            booth_candidates.append({
                'x': x + w // 2,
                'y': height - (y + h // 2),
                'width': w,
                'height': h,
                'area': area,
                'solidity': solidity,
                'white_ratio': white_ratio,
                'aspect': aspect
            })

    # Calculate median area for confidence scoring
    if booth_candidates:
        areas = [b['area'] for b in booth_candidates]
        median_area = np.median(areas)
    else:
        median_area = 0

    # Second pass: calculate confidence and create DetectedBooth objects
    booths = []
    for candidate in booth_candidates:
        confidence = calculate_confidence(
            candidate['area'],
            candidate.get('aspect', 1.0),
            candidate.get('solidity', 0.8),
            candidate.get('white_ratio', 0.8),
            median_area
        )

        if confidence >= config.min_confidence:
            booths.append(DetectedBooth(
                x=candidate['x'],
                y=candidate['y'],
                width=candidate['width'],
                height=candidate['height'],
                area=candidate['area'],
                confidence=confidence
            ))

    # Remove duplicates
    booths = remove_duplicate_booths(booths)

    # Sort by position (top to bottom, left to right)
    booths.sort(key=lambda b: (-b.y, b.x))

    # Categorize booths
    booths = categorize_booths(booths)

    logger.info(f"Detected {len(booths)} booth cells with confidence >= {config.min_confidence}")
    return booths


def subdivide_large_booth(
    mask: np.ndarray,
    x: int, y: int, w: int, h: int,
    img_height: int,
    min_area: float,
    config: BoothDetectionConfig,
    parent_white_ratio: float
) -> List[Dict]:
    """
    Subdivide a large booth area into individual cells using grid detection.
    """
    booths = []

    # Extract the region
    region = mask[y:y+h, x:x+w]

    # Scan for vertical divisions
    col_sums = np.sum(region, axis=0)
    col_threshold = np.max(col_sums) * 0.3

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

            # Check if this cell is mostly white
            cell_region = region[cell_y:cell_y+cell_h, cell_x:cell_x+cell_w]
            white_ratio = np.sum(cell_region > 128) / cell_area if cell_area > 0 else 0

            if white_ratio > 0.5:
                center_x = x + cell_x + cell_w // 2
                center_y = img_height - (y + cell_y + cell_h // 2)

                # Calculate aspect ratio
                aspect = cell_w / cell_h if cell_h > 0 else 1.0

                booths.append({
                    'x': center_x,
                    'y': center_y,
                    'width': cell_w,
                    'height': cell_h,
                    'area': cell_area,
                    'solidity': 0.9,
                    'white_ratio': white_ratio,
                    'aspect': aspect
                })

    # If no subdivisions found, return the whole booth as one
    if not booths:
        center_x = x + w // 2
        center_y = img_height - (y + h // 2)
        aspect = w / h if h > 0 else 1.0
        booths.append({
            'x': center_x,
            'y': center_y,
            'width': w,
            'height': h,
            'area': w * h,
            'solidity': 0.8,
            'white_ratio': parent_white_ratio,
            'aspect': aspect
        })

    return booths


def remove_duplicate_booths(
    booths: List[DetectedBooth],
    distance_threshold: int = 20
) -> List[DetectedBooth]:
    """Remove duplicate/overlapping booth detections, keeping higher confidence ones."""
    if not booths:
        return []

    # Sort by confidence (highest first)
    sorted_booths = sorted(booths, key=lambda b: -b.confidence)

    kept = []
    for booth in sorted_booths:
        is_duplicate = False
        for existing in kept:
            dx = abs(booth.x - existing.x)
            dy = abs(booth.y - existing.y)

            if dx < distance_threshold and dy < distance_threshold:
                is_duplicate = True
                break

        if not is_duplicate:
            kept.append(booth)

    return kept


def categorize_booths(booths: List[DetectedBooth]) -> List[DetectedBooth]:
    """Assign names and categories to booths based on size."""
    if not booths:
        return []

    areas = [b.area for b in booths]
    median_area = np.median(areas)

    counts = {'booth': 0, 'kiosk': 0, 'room': 0}

    for booth in booths:
        if booth.area > median_area * 3:
            counts['room'] += 1
            booth.category = 'room'
            booth.name = f"Room {counts['room']}"
            booth.description = 'Large space'
        elif booth.area < median_area * 0.3:
            counts['kiosk'] += 1
            booth.category = 'kiosk'
            booth.name = f"Kiosk {counts['kiosk']}"
            booth.description = 'Small kiosk'
        else:
            counts['booth'] += 1
            booth.category = 'vendor'
            booth.name = f"Booth {counts['booth']}"
            booth.description = 'Vendor booth'

    logger.info(f"Categorized: {counts}")
    return booths


def visualize_detections(
    image_path: str,
    booths: List[DetectedBooth],
    output_path: str
) -> None:
    """Create visualization with colored dots based on confidence."""
    img = cv2.imread(image_path)
    height = img.shape[0]

    for booth in booths:
        x = booth.x
        y_img = height - booth.y

        # Color based on confidence (green = high, red = low)
        confidence_color = (
            int(255 * (1 - booth.confidence)),
            int(255 * booth.confidence),
            0
        )

        # Draw filled circle at center
        cv2.circle(img, (x, y_img), 8, confidence_color, -1)

        # Draw rectangle outline
        cv2.rectangle(
            img,
            (x - booth.width//2, y_img - booth.height//2),
            (x + booth.width//2, y_img + booth.height//2),
            (0, 255, 0), 1
        )

        # Add confidence label
        label = f"{booth.confidence:.2f}"
        cv2.putText(
            img, label,
            (x - 15, y_img - booth.height//2 - 5),
            cv2.FONT_HERSHEY_SIMPLEX, 0.3, (0, 0, 255), 1
        )

    cv2.imwrite(output_path, img)
    logger.info(f"Saved visualization to {output_path}")


# Convenience function for API (backward compatible)
def auto_detect_booths(
    image_path: str,
    method: str = 'auto',
    min_confidence: float = 0.5
) -> List[Dict]:
    """
    Main entry point for booth detection.

    Args:
        image_path: Path to floor plan image
        method: Detection method (auto, adaptive, fixed, otsu)
        min_confidence: Minimum confidence threshold (0.0-1.0)

    Returns:
        List of detected booths with coordinates and confidence scores
    """
    config = BoothDetectionConfig(
        min_confidence=min_confidence,
        detection_method=DetectionMethod(method) if method in [m.value for m in DetectionMethod] else DetectionMethod.AUTO
    )

    booths = detect_booth_cells(image_path, config)
    return [booth.to_dict() for booth in booths]
