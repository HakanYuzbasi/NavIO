"""
Advanced Booth Cell Detection System

Accurately detects individual booth cells in floor plans by:
1. Multi-scale line detection for booth boundaries
2. Adaptive thresholding for different floor plan styles
3. Watershed segmentation for cell separation
4. Contour hierarchy analysis for nested structures
5. Shape validation for rectangular cells

Handles:
- White booths on colored backgrounds (gold, blue, red, etc.)
- Thin internal dividing lines
- Various booth sizes and shapes
"""
import cv2
import numpy as np
from typing import List, Dict, Tuple, Optional
import logging

logger = logging.getLogger(__name__)


class BoothDetector:
    """Advanced booth cell detector with multiple detection strategies."""

    def __init__(self, image_path: str):
        self.image_path = image_path
        self.img = cv2.imread(image_path)
        if self.img is None:
            raise ValueError(f"Could not read image: {image_path}")

        self.height, self.width = self.img.shape[:2]
        self.gray = cv2.cvtColor(self.img, cv2.COLOR_BGR2GRAY)
        self.hsv = cv2.cvtColor(self.img, cv2.COLOR_BGR2HSV)

        # Calculate adaptive parameters based on image size
        self.min_cell_area = max(100, int(self.width * self.height * 0.00005))
        self.max_cell_area = int(self.width * self.height * 0.05)

        logger.info(f"Image: {self.width}x{self.height}, min_area={self.min_cell_area}, max_area={self.max_cell_area}")

    def detect(self) -> List[Dict]:
        """Main detection method - tries multiple strategies."""

        # Strategy 1: Line-based cell segmentation (best for clean floor plans)
        cells_line = self._detect_by_line_segmentation()

        # Strategy 2: Contour hierarchy (good for nested structures)
        cells_contour = self._detect_by_contour_hierarchy()

        # Strategy 3: Watershed for touching regions
        cells_watershed = self._detect_by_watershed()

        # Merge results from all strategies
        all_cells = self._merge_detections([cells_line, cells_contour, cells_watershed])

        logger.info(f"Detection results - Line: {len(cells_line)}, Contour: {len(cells_contour)}, "
                   f"Watershed: {len(cells_watershed)}, Merged: {len(all_cells)}")

        # Categorize and name
        all_cells = self._categorize_cells(all_cells)

        return all_cells

    def _detect_by_line_segmentation(self) -> List[Dict]:
        """Detect cells by finding black lines and segmenting white regions."""

        # Detect black lines with multiple thresholds to catch thin lines
        black_mask = np.zeros_like(self.gray)

        # Very dark pixels (definite lines)
        _, dark = cv2.threshold(self.gray, 40, 255, cv2.THRESH_BINARY_INV)
        black_mask = cv2.bitwise_or(black_mask, dark)

        # Somewhat dark pixels (thinner lines, anti-aliased)
        _, medium_dark = cv2.threshold(self.gray, 80, 255, cv2.THRESH_BINARY_INV)
        # Only keep medium dark that's near definite dark (to avoid background)
        kernel_connect = np.ones((5, 5), np.uint8)
        near_dark = cv2.dilate(dark, kernel_connect, iterations=1)
        medium_dark = cv2.bitwise_and(medium_dark, near_dark)
        black_mask = cv2.bitwise_or(black_mask, medium_dark)

        # Strengthen lines with morphological operations
        # Use different kernels to preserve both horizontal and vertical lines
        kernel_h = np.ones((1, 3), np.uint8)
        kernel_v = np.ones((3, 1), np.uint8)

        lines_h = cv2.dilate(black_mask, kernel_h, iterations=1)
        lines_v = cv2.dilate(black_mask, kernel_v, iterations=1)
        black_lines = cv2.bitwise_or(lines_h, lines_v)

        # Detect white regions (booths)
        _, white_mask = cv2.threshold(self.gray, 180, 255, cv2.THRESH_BINARY)

        # Also detect very bright regions
        _, very_white = cv2.threshold(self.gray, 220, 255, cv2.THRESH_BINARY)
        white_mask = cv2.bitwise_or(white_mask, very_white)

        # Fill small holes in white regions
        kernel_fill = np.ones((3, 3), np.uint8)
        white_mask = cv2.morphologyEx(white_mask, cv2.MORPH_CLOSE, kernel_fill, iterations=2)

        # Subtract black lines from white to separate cells
        # Dilate lines slightly more to ensure clean separation
        kernel_sep = np.ones((2, 2), np.uint8)
        black_separator = cv2.dilate(black_lines, kernel_sep, iterations=1)

        cells_mask = cv2.subtract(white_mask, black_separator)

        # Clean up
        cells_mask = cv2.morphologyEx(cells_mask, cv2.MORPH_OPEN, kernel_fill, iterations=1)

        # Find connected components
        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(
            cells_mask, connectivity=4  # Use 4-connectivity for better separation
        )

        cells = []
        for i in range(1, num_labels):
            x, y, w, h, area = stats[i]
            cx, cy = centroids[i]

            if self._is_valid_cell(x, y, w, h, area, labels == i):
                cells.append(self._create_cell_dict(cx, cy, w, h, area))

        return cells

    def _detect_by_contour_hierarchy(self) -> List[Dict]:
        """Detect cells using contour hierarchy to find enclosed regions."""

        # Use adaptive thresholding for better edge detection
        adaptive = cv2.adaptiveThreshold(
            self.gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY, 15, 5
        )

        # Find contours with hierarchy
        contours, hierarchy = cv2.findContours(
            adaptive, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE
        )

        if hierarchy is None or len(contours) == 0:
            return []

        hierarchy = hierarchy[0]
        cells = []

        for i, contour in enumerate(contours):
            area = cv2.contourArea(contour)

            if area < self.min_cell_area or area > self.max_cell_area:
                continue

            x, y, w, h = cv2.boundingRect(contour)

            # Check if this contour has a parent (is enclosed)
            parent_idx = hierarchy[i][3]

            # Calculate contour properties
            rect_area = w * h
            if rect_area == 0:
                continue

            extent = area / rect_area

            # Must be reasonably rectangular (extent > 0.5)
            if extent < 0.45:
                continue

            # Check aspect ratio
            aspect = max(w, h) / min(w, h) if min(w, h) > 0 else 999
            if aspect > 8:
                continue

            # Calculate centroid
            M = cv2.moments(contour)
            if M['m00'] > 0:
                cx = M['m10'] / M['m00']
                cy = M['m01'] / M['m00']
            else:
                cx = x + w / 2
                cy = y + h / 2

            # Verify the region is mostly white (booth, not corridor)
            mask = np.zeros(self.gray.shape, dtype=np.uint8)
            cv2.drawContours(mask, [contour], -1, 255, -1)
            mean_val = cv2.mean(self.gray, mask=mask)[0]

            if mean_val > 150:  # Mostly white
                cells.append(self._create_cell_dict(cx, cy, w, h, area))

        return cells

    def _detect_by_watershed(self) -> List[Dict]:
        """Use watershed segmentation to separate touching cells."""

        # Threshold to get white regions
        _, binary = cv2.threshold(self.gray, 180, 255, cv2.THRESH_BINARY)

        # Distance transform to find cell centers
        dist = cv2.distanceTransform(binary, cv2.DIST_L2, 5)

        # Normalize and threshold distance transform
        dist_normalized = cv2.normalize(dist, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
        _, sure_fg = cv2.threshold(dist_normalized, 0.4 * dist_normalized.max(), 255, cv2.THRESH_BINARY)
        sure_fg = sure_fg.astype(np.uint8)

        # Find sure background (dilate binary)
        kernel = np.ones((3, 3), np.uint8)
        sure_bg = cv2.dilate(binary, kernel, iterations=2)

        # Unknown region
        unknown = cv2.subtract(sure_bg, sure_fg)

        # Label markers
        num_labels, markers = cv2.connectedComponents(sure_fg)
        markers = markers + 1
        markers[unknown == 255] = 0

        # Apply watershed
        img_color = cv2.cvtColor(self.gray, cv2.COLOR_GRAY2BGR)
        markers = cv2.watershed(img_color, markers)

        cells = []
        for label in range(2, num_labels + 1):  # Skip background (1)
            mask = (markers == label).astype(np.uint8) * 255

            contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if not contours:
                continue

            contour = max(contours, key=cv2.contourArea)
            area = cv2.contourArea(contour)

            if area < self.min_cell_area or area > self.max_cell_area:
                continue

            x, y, w, h = cv2.boundingRect(contour)

            # Check rectangularity
            rect_area = w * h
            if rect_area == 0:
                continue
            extent = area / rect_area
            if extent < 0.4:
                continue

            # Check aspect ratio
            aspect = max(w, h) / min(w, h) if min(w, h) > 0 else 999
            if aspect > 8:
                continue

            M = cv2.moments(contour)
            if M['m00'] > 0:
                cx = M['m10'] / M['m00']
                cy = M['m01'] / M['m00']
            else:
                cx = x + w / 2
                cy = y + h / 2

            cells.append(self._create_cell_dict(cx, cy, w, h, area))

        return cells

    def _is_valid_cell(self, x: int, y: int, w: int, h: int, area: int,
                       mask: Optional[np.ndarray] = None) -> bool:
        """Validate if a detected region is a valid booth cell."""

        # Area bounds
        if area < self.min_cell_area or area > self.max_cell_area:
            return False

        # Aspect ratio (allow elongated booths but not extreme)
        aspect = max(w, h) / min(w, h) if min(w, h) > 0 else 999
        if aspect > 10:
            return False

        # Minimum dimensions
        if w < 5 or h < 5:
            return False

        # Rectangularity (fill ratio)
        rect_area = w * h
        if rect_area > 0:
            fill_ratio = area / rect_area
            if fill_ratio < 0.35:  # Allow somewhat irregular shapes
                return False

        # Edge check - reject if touching image boundary significantly
        edge_margin = 3
        if x < edge_margin or y < edge_margin:
            return False
        if x + w > self.width - edge_margin or y + h > self.height - edge_margin:
            return False

        return True

    def _create_cell_dict(self, cx: float, cy: float, w: int, h: int, area: int) -> Dict:
        """Create a standardized cell dictionary."""
        return {
            'x': int(cx),
            'y': int(self.height - cy),  # Flip Y coordinate
            'width': int(w),
            'height': int(h),
            'area': int(area),
            'img_y': int(cy)  # Keep original for visualization
        }

    def _merge_detections(self, detection_lists: List[List[Dict]]) -> List[Dict]:
        """Merge detections from multiple strategies, removing duplicates."""

        all_cells = []
        for cells in detection_lists:
            all_cells.extend(cells)

        if not all_cells:
            return []

        # Remove duplicates using spatial proximity
        merged = []
        merge_threshold = min(self.width, self.height) * 0.02  # 2% of image size
        merge_threshold = max(10, min(merge_threshold, 30))

        # Sort by area (prefer larger/more complete detections)
        all_cells.sort(key=lambda c: c['area'], reverse=True)

        for cell in all_cells:
            is_duplicate = False
            for existing in merged:
                dx = abs(cell['x'] - existing['x'])
                dy = abs(cell['y'] - existing['y'])
                distance = (dx**2 + dy**2) ** 0.5

                if distance < merge_threshold:
                    is_duplicate = True
                    break

            if not is_duplicate:
                merged.append(cell)

        # Sort by position (top to bottom, left to right)
        merged.sort(key=lambda c: (-c['y'], c['x']))

        return merged

    def _categorize_cells(self, cells: List[Dict]) -> List[Dict]:
        """Assign names and categories based on size."""

        if not cells:
            return []

        areas = [c['area'] for c in cells]
        median_area = np.median(areas)
        q1 = np.percentile(areas, 25)
        q3 = np.percentile(areas, 75)

        counts = {'booth': 0, 'kiosk': 0, 'room': 0}

        for cell in cells:
            area = cell['area']

            if area > q3 * 1.8:
                counts['room'] += 1
                cell['category'] = 'room'
                cell['name'] = f"Room {counts['room']}"
            elif area < q1 * 0.7:
                counts['kiosk'] += 1
                cell['category'] = 'kiosk'
                cell['name'] = f"Kiosk {counts['kiosk']}"
            else:
                counts['booth'] += 1
                cell['category'] = 'vendor'
                cell['name'] = f"Booth {counts['booth']}"

            cell['description'] = f"Auto-detected {cell['category']}"

        logger.info(f"Categorized: {counts['booth']} booths, {counts['kiosk']} kiosks, {counts['room']} rooms")
        return cells


class WalkableAreaDetector:
    """Detects walkable corridor areas in floor plans."""

    def __init__(self, image_path: str):
        self.image_path = image_path
        self.img = cv2.imread(image_path)
        if self.img is None:
            raise ValueError(f"Could not read image: {image_path}")

        self.height, self.width = self.img.shape[:2]
        self.gray = cv2.cvtColor(self.img, cv2.COLOR_BGR2GRAY)
        self.hsv = cv2.cvtColor(self.img, cv2.COLOR_BGR2HSV)

    def detect(self) -> np.ndarray:
        """Detect walkable areas - returns binary mask."""

        # Method 1: Color-based detection (corridors are colored, booths are white)
        saturation = self.hsv[:, :, 1]
        value = self.hsv[:, :, 2]

        # Colored areas have saturation > 20 and are not too dark
        is_colored = (saturation > 20) & (value > 50)

        # Method 2: Not white and not black
        not_white = self.gray < 200
        not_black = self.gray > 40
        is_middle = not_white & not_black

        # Combine methods
        walkable = is_colored | is_middle

        # Remove areas that are too white (likely booths with slight color tint)
        too_bright = self.gray > 220
        walkable = walkable & ~too_bright

        # Convert to uint8 mask
        walkable_mask = walkable.astype(np.uint8) * 255

        # Morphological cleanup
        kernel = np.ones((5, 5), np.uint8)
        walkable_mask = cv2.morphologyEx(walkable_mask, cv2.MORPH_CLOSE, kernel, iterations=3)
        walkable_mask = cv2.morphologyEx(walkable_mask, cv2.MORPH_OPEN, kernel, iterations=2)

        return walkable_mask

    def get_walkable_skeleton(self) -> np.ndarray:
        """Get skeleton/centerlines of walkable areas for navigation."""

        walkable = self.detect()

        # Skeletonize
        from scipy import ndimage
        skeleton = ndimage.binary_erosion(walkable > 0)

        # Iterative thinning
        kernel = np.ones((3, 3), np.uint8)
        thin = walkable.copy()
        while True:
            eroded = cv2.erode(thin, kernel)
            opened = cv2.morphologyEx(eroded, cv2.MORPH_OPEN, kernel)
            temp = cv2.subtract(eroded, opened)
            thin = eroded.copy()
            if cv2.countNonZero(temp) == 0:
                break

        return thin


def detect_booth_cells(image_path: str) -> List[Dict]:
    """Main entry point for booth cell detection."""
    detector = BoothDetector(image_path)
    return detector.detect()


def detect_walkable_areas(image_path: str) -> np.ndarray:
    """Main entry point for walkable area detection."""
    detector = WalkableAreaDetector(image_path)
    return detector.detect()


def visualize_detections(
    image_path: str,
    booths: List[Dict],
    output_path: str,
    show_rectangles: bool = True,
    show_walkable: bool = False
) -> None:
    """Create visualization with detected booths marked."""

    img = cv2.imread(image_path)
    height = img.shape[0]

    # Optionally show walkable areas
    if show_walkable:
        walkable_mask = detect_walkable_areas(image_path)
        # Overlay walkable areas in semi-transparent green
        overlay = img.copy()
        overlay[walkable_mask > 0] = [0, 200, 0]
        img = cv2.addWeighted(img, 0.7, overlay, 0.3, 0)

    for booth in booths:
        x = booth['x']
        y_img = booth.get('img_y', height - booth['y'])

        # Draw red filled circle at center
        cv2.circle(img, (x, y_img), 5, (0, 0, 255), -1)

        # Draw rectangle outline
        if show_rectangles:
            w = booth.get('width', 20)
            h = booth.get('height', 20)
            x1 = x - w // 2
            y1 = y_img - h // 2
            x2 = x + w // 2
            y2 = y_img + h // 2
            cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 1)

    cv2.imwrite(output_path, img)
    logger.info(f"Saved visualization: {output_path} ({len(booths)} cells)")


def auto_detect_booths(image_path: str, method: str = 'auto') -> List[Dict]:
    """Main entry point for booth detection - alias for detect_booth_cells."""
    return detect_booth_cells(image_path)


# Legacy function aliases for backward compatibility
def adaptive_detect_booths(image_path: str) -> List[Dict]:
    """Legacy alias."""
    return detect_booth_cells(image_path)
