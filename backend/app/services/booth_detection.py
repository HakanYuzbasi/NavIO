"""
Adaptive Booth Detection Service

Uses advanced computer vision to automatically detect booth/room locations
from floor plan images regardless of color scheme, size, or style.

Features:
- Automatic image analysis to determine optimal detection strategy
- Adaptive thresholding for any color scheme
- Multiple detection modes (white on colored, colored on white, edge-based)
- Automatic mode selection based on image characteristics
- Configurable parameters with intelligent defaults
"""
import cv2
import numpy as np
from PIL import Image
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class DetectionMode(Enum):
    """Detection modes for different floor plan styles."""
    WHITE_ON_COLORED = "white_on_colored"  # White booths on colored background
    COLORED_ON_WHITE = "colored_on_white"  # Colored booths on white background
    EDGE_BASED = "edge_based"  # Use edge detection for complex images
    ADAPTIVE = "adaptive"  # Automatically select best mode
    AUTO = "auto"  # Full automatic analysis


@dataclass
class ImageAnalysis:
    """Results of floor plan image analysis."""
    width: int
    height: int
    mean_brightness: float
    std_brightness: float
    white_ratio: float  # Ratio of very bright pixels
    dark_ratio: float  # Ratio of dark pixels
    edge_density: float  # How many edges are detected
    recommended_mode: DetectionMode
    optimal_threshold: int
    is_inverted: bool  # True if booths are darker than background


class AdaptiveBoothDetector:
    """
    Advanced booth detector with automatic adaptation to any floor plan style.

    Automatically analyzes images to determine:
    - Whether booths are light or dark relative to background
    - Optimal threshold values
    - Best detection strategy
    """

    def __init__(
        self,
        min_booth_area: int = 300,
        max_booth_area: int = 100000,
        min_aspect_ratio: float = 0.15,
        max_aspect_ratio: float = 6.0
    ):
        """
        Initialize adaptive booth detector.

        Args:
            min_booth_area: Minimum area (pixels) for a valid booth
            max_booth_area: Maximum area (pixels) for a valid booth
            min_aspect_ratio: Minimum width/height ratio
            max_aspect_ratio: Maximum width/height ratio
        """
        self.min_booth_area = min_booth_area
        self.max_booth_area = max_booth_area
        self.min_aspect_ratio = min_aspect_ratio
        self.max_aspect_ratio = max_aspect_ratio
        logger.info(
            f"AdaptiveBoothDetector initialized: area={min_booth_area}-{max_booth_area}, "
            f"aspect={min_aspect_ratio}-{max_aspect_ratio}"
        )

    def analyze_image(self, image_path: str) -> Optional[ImageAnalysis]:
        """
        Analyze floor plan image to determine optimal detection parameters.

        Args:
            image_path: Path to the floor plan image

        Returns:
            ImageAnalysis with recommended parameters, or None if analysis fails
        """
        try:
            img = cv2.imread(image_path)
            if img is None:
                raise ValueError(f"Could not read image: {image_path}")

            height, width = img.shape[:2]
            total_pixels = width * height

            # Convert to grayscale
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

            # Calculate brightness statistics
            mean_brightness = np.mean(gray)
            std_brightness = np.std(gray)

            # Calculate pixel distribution
            white_threshold = 200
            dark_threshold = 80
            white_ratio = np.sum(gray > white_threshold) / total_pixels
            dark_ratio = np.sum(gray < dark_threshold) / total_pixels

            # Calculate edge density using Canny
            edges = cv2.Canny(gray, 50, 150)
            edge_density = np.sum(edges > 0) / total_pixels

            # Determine if image is inverted (booths darker than background)
            # If most of image is white, booths are likely colored/dark
            is_inverted = white_ratio > 0.6

            # Determine optimal threshold
            if is_inverted:
                # For colored booths on white background
                # Find threshold that separates booths from white background
                optimal_threshold = int(mean_brightness - std_brightness * 0.5)
                optimal_threshold = max(100, min(200, optimal_threshold))
            else:
                # For white booths on colored background
                optimal_threshold = int(mean_brightness + std_brightness * 0.3)
                optimal_threshold = max(150, min(220, optimal_threshold))

            # Determine recommended mode
            if edge_density > 0.15:
                # Complex image with many edges - use edge-based detection
                recommended_mode = DetectionMode.EDGE_BASED
            elif is_inverted:
                recommended_mode = DetectionMode.COLORED_ON_WHITE
            else:
                recommended_mode = DetectionMode.WHITE_ON_COLORED

            analysis = ImageAnalysis(
                width=width,
                height=height,
                mean_brightness=mean_brightness,
                std_brightness=std_brightness,
                white_ratio=white_ratio,
                dark_ratio=dark_ratio,
                edge_density=edge_density,
                recommended_mode=recommended_mode,
                optimal_threshold=optimal_threshold,
                is_inverted=is_inverted
            )

            logger.info(
                f"Image analysis: {width}x{height}, brightness={mean_brightness:.1f}±{std_brightness:.1f}, "
                f"white={white_ratio:.1%}, edges={edge_density:.1%}, "
                f"mode={recommended_mode.value}, threshold={optimal_threshold}"
            )

            return analysis

        except Exception as e:
            logger.error(f"Error analyzing image: {e}")
            return None

    def detect_adaptive(self, image_path: str) -> List[Dict]:
        """
        Fully adaptive booth detection that automatically selects the best strategy.

        Args:
            image_path: Path to floor plan image

        Returns:
            List of detected booths
        """
        # Analyze image first
        analysis = self.analyze_image(image_path)
        if analysis is None:
            logger.warning("Image analysis failed, falling back to default detection")
            return self._detect_white_on_colored(image_path, 180)

        logger.info(f"Using detection mode: {analysis.recommended_mode.value}")

        # Select detection method based on analysis
        if analysis.recommended_mode == DetectionMode.EDGE_BASED:
            booths = self._detect_edge_based(image_path, analysis)
        elif analysis.recommended_mode == DetectionMode.COLORED_ON_WHITE:
            booths = self._detect_colored_on_white(image_path, analysis)
        else:  # WHITE_ON_COLORED
            booths = self._detect_white_on_colored(image_path, analysis.optimal_threshold)

        # If primary method found nothing, try alternative methods
        if not booths:
            logger.info("Primary detection found no booths, trying alternatives...")
            booths = self._try_alternative_methods(image_path, analysis)

        return booths

    def _detect_white_on_colored(
        self,
        image_path: str,
        threshold: int = 180
    ) -> List[Dict]:
        """Detect white/light booths on colored background."""
        try:
            img = cv2.imread(image_path)
            if img is None:
                return []

            height, width = img.shape[:2]
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

            # Binary threshold - white areas become white
            _, binary = cv2.threshold(gray, threshold, 255, cv2.THRESH_BINARY)

            return self._extract_booths_from_binary(binary, height, width, "white_on_colored")

        except Exception as e:
            logger.error(f"Error in white_on_colored detection: {e}")
            return []

    def _detect_colored_on_white(
        self,
        image_path: str,
        analysis: ImageAnalysis
    ) -> List[Dict]:
        """Detect colored/dark booths on white background."""
        try:
            img = cv2.imread(image_path)
            if img is None:
                return []

            height, width = img.shape[:2]
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

            # Invert threshold - dark areas become white (booths)
            _, binary = cv2.threshold(gray, analysis.optimal_threshold, 255, cv2.THRESH_BINARY_INV)

            return self._extract_booths_from_binary(binary, height, width, "colored_on_white")

        except Exception as e:
            logger.error(f"Error in colored_on_white detection: {e}")
            return []

    def _detect_edge_based(
        self,
        image_path: str,
        analysis: ImageAnalysis
    ) -> List[Dict]:
        """Use edge detection for complex floor plans."""
        try:
            img = cv2.imread(image_path)
            if img is None:
                return []

            height, width = img.shape[:2]
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

            # Apply Gaussian blur to reduce noise
            blurred = cv2.GaussianBlur(gray, (5, 5), 0)

            # Canny edge detection
            edges = cv2.Canny(blurred, 30, 100)

            # Dilate edges to connect nearby lines
            kernel = np.ones((3, 3), np.uint8)
            dilated = cv2.dilate(edges, kernel, iterations=2)

            # Close gaps
            closed = cv2.morphologyEx(dilated, cv2.MORPH_CLOSE, kernel, iterations=3)

            # Fill enclosed regions
            # Use flood fill from corners (assuming corners are background)
            filled = closed.copy()
            mask = np.zeros((height + 2, width + 2), np.uint8)

            # Flood fill from corners
            corners = [(0, 0), (width-1, 0), (0, height-1), (width-1, height-1)]
            for corner in corners:
                if filled[corner[1], corner[0]] == 0:
                    cv2.floodFill(filled, mask, corner, 128)

            # Areas that weren't filled are potential booths
            binary = np.where(filled == 0, 255, 0).astype(np.uint8)

            return self._extract_booths_from_binary(binary, height, width, "edge_based")

        except Exception as e:
            logger.error(f"Error in edge-based detection: {e}")
            return []

    def _detect_with_adaptive_threshold(
        self,
        image_path: str
    ) -> List[Dict]:
        """Use OpenCV adaptive thresholding for varied lighting."""
        try:
            img = cv2.imread(image_path)
            if img is None:
                return []

            height, width = img.shape[:2]
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

            # Apply adaptive threshold
            binary = cv2.adaptiveThreshold(
                gray, 255,
                cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv2.THRESH_BINARY,
                blockSize=51,
                C=10
            )

            return self._extract_booths_from_binary(binary, height, width, "adaptive_threshold")

        except Exception as e:
            logger.error(f"Error in adaptive threshold detection: {e}")
            return []

    def _detect_with_otsu(self, image_path: str) -> List[Dict]:
        """Use Otsu's method for automatic threshold selection."""
        try:
            img = cv2.imread(image_path)
            if img is None:
                return []

            height, width = img.shape[:2]
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

            # Otsu's thresholding
            _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

            booths = self._extract_booths_from_binary(binary, height, width, "otsu")

            # If Otsu didn't work well, try inverted
            if not booths:
                _, binary_inv = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
                booths = self._extract_booths_from_binary(binary_inv, height, width, "otsu_inv")

            return booths

        except Exception as e:
            logger.error(f"Error in Otsu detection: {e}")
            return []

    def _try_alternative_methods(
        self,
        image_path: str,
        analysis: ImageAnalysis
    ) -> List[Dict]:
        """Try alternative detection methods when primary fails."""
        methods = [
            ("Otsu", lambda: self._detect_with_otsu(image_path)),
            ("Adaptive", lambda: self._detect_with_adaptive_threshold(image_path)),
            ("Edge-based", lambda: self._detect_edge_based(image_path, analysis)),
            ("Inverted white", lambda: self._detect_colored_on_white(image_path, analysis)),
        ]

        for name, method in methods:
            logger.info(f"Trying alternative method: {name}")
            booths = method()
            if booths:
                logger.info(f"Alternative method {name} found {len(booths)} booths")
                return booths

        logger.warning("All detection methods failed")
        return []

    def _extract_booths_from_binary(
        self,
        binary: np.ndarray,
        height: int,
        width: int,
        method_name: str
    ) -> List[Dict]:
        """Extract booth locations from binary image."""
        # Morphological cleanup
        kernel_close = np.ones((5, 5), np.uint8)
        kernel_open = np.ones((3, 3), np.uint8)

        # Close small gaps
        binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel_close, iterations=2)
        # Remove small noise
        binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel_open, iterations=1)

        # Find contours
        contours, hierarchy = cv2.findContours(
            binary,
            cv2.RETR_CCOMP,
            cv2.CHAIN_APPROX_SIMPLE
        )

        if hierarchy is None:
            return []

        booths = []
        total_area = height * width

        for i, contour in enumerate(contours):
            # Skip internal contours (holes)
            if hierarchy[0][i][3] != -1:
                continue

            area = cv2.contourArea(contour)

            # Dynamic area filtering based on image size
            min_area = max(self.min_booth_area, total_area * 0.0005)
            max_area = min(self.max_booth_area, total_area * 0.15)

            if not (min_area < area < max_area):
                continue

            # Get bounding rectangle
            x, y, w, h = cv2.boundingRect(contour)

            # Check aspect ratio
            aspect_ratio = float(w) / h if h > 0 else 0
            if not (self.min_aspect_ratio < aspect_ratio < self.max_aspect_ratio):
                continue

            # Calculate center point
            center_x = x + w // 2
            center_y = height - (y + h // 2)  # Flip Y for coordinate system

            # Get contour properties
            peri = cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(contour, 0.02 * peri, True)

            booths.append({
                'x': center_x,
                'y': center_y,
                'width': w,
                'height': h,
                'area': area,
                'corners': len(approx),
                'detection_method': method_name
            })

        # Sort by position (top to bottom, left to right)
        booths.sort(key=lambda b: (-b['y'], b['x']))

        # Assign names and categories
        booths = self._categorize_booths(booths)

        logger.info(f"Method '{method_name}' extracted {len(booths)} booths")
        return booths

    def _categorize_booths(self, booths: List[Dict]) -> List[Dict]:
        """Categorize booths by size and assign names."""
        if not booths:
            return []

        areas = [b['area'] for b in booths]
        median_area = np.median(areas)

        booth_counts = {'booth': 0, 'room': 0, 'kiosk': 0}

        for booth in booths:
            area = booth['area']

            if area > median_area * 2.5:
                booth_counts['room'] += 1
                booth['category'] = 'room'
                booth['name'] = f"Room {booth_counts['room']}"
                booth['description'] = 'Large space - main area or event space'
            elif area < median_area * 0.4:
                booth_counts['kiosk'] += 1
                booth['category'] = 'kiosk'
                booth['name'] = f"Kiosk {booth_counts['kiosk']}"
                booth['description'] = 'Small station or kiosk'
            else:
                booth_counts['booth'] += 1
                booth['category'] = 'booth'
                booth['name'] = f"Booth {booth_counts['booth']}"
                booth['description'] = 'Standard vendor booth'

        logger.info(
            f"Categorized: {booth_counts['room']} rooms, "
            f"{booth_counts['booth']} booths, {booth_counts['kiosk']} kiosks"
        )

        return booths

    def visualize_detections(
        self,
        image_path: str,
        booths: List[Dict],
        output_path: str
    ) -> None:
        """Create a visualization of detected booths."""
        try:
            img = cv2.imread(image_path)
            height, width = img.shape[:2]

            # Color map for categories
            colors = {
                'room': (255, 0, 0),    # Blue
                'booth': (0, 255, 0),   # Green
                'kiosk': (0, 255, 255), # Yellow
            }

            for booth in booths:
                x = booth['x']
                y = height - booth['y']
                w = booth.get('width', 50)
                h = booth.get('height', 50)
                category = booth.get('category', 'booth')
                color = colors.get(category, (0, 255, 0))

                # Draw bounding box
                cv2.rectangle(
                    img,
                    (x - w//2, y - h//2),
                    (x + w//2, y + h//2),
                    color,
                    2
                )

                # Draw center point
                cv2.circle(img, (x, y), 5, (0, 0, 255), -1)

                # Add label
                label = booth.get('name', 'Booth')
                cv2.putText(
                    img,
                    label,
                    (x - w//2, y - h//2 - 10),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.4,
                    color,
                    1
                )

            cv2.imwrite(output_path, img)
            logger.info(f"Saved visualization to {output_path}")

        except Exception as e:
            logger.error(f"Error creating visualization: {e}")


# Backward compatible class
class BoothDetector(AdaptiveBoothDetector):
    """Backward compatible wrapper for AdaptiveBoothDetector."""

    def detect_booths(self, image_path: str) -> List[Dict]:
        """Original method - now uses adaptive detection."""
        return self._detect_white_on_colored(image_path, 180)

    def detect_with_grid_analysis(self, image_path: str) -> List[Dict]:
        """Grid analysis - now uses full adaptive detection."""
        return self.detect_adaptive(image_path)

    def detect_with_smart_categorization(self, image_path: str) -> List[Dict]:
        """Smart categorization - now uses full adaptive detection."""
        return self.detect_adaptive(image_path)


def auto_detect_booths(
    image_path: str,
    method: str = 'auto',
    min_booth_area: int = 300,
    max_booth_area: int = 100000
) -> List[Dict]:
    """
    Convenience function to auto-detect booths from an image.

    Args:
        image_path: Path to floor plan image
        method: Detection method:
            - 'auto': Fully automatic (recommended)
            - 'adaptive': Same as auto
            - 'smart': Same as auto (backward compatible)
            - 'grid': Same as auto (backward compatible)
            - 'basic': Simple white-on-colored detection
            - 'white_on_colored': Detect white booths on colored background
            - 'colored_on_white': Detect colored booths on white background
            - 'edge': Edge-based detection
        min_booth_area: Minimum booth area in pixels
        max_booth_area: Maximum booth area in pixels

    Returns:
        List of detected booth dictionaries
    """
    detector = AdaptiveBoothDetector(
        min_booth_area=min_booth_area,
        max_booth_area=max_booth_area
    )

    if method in ('auto', 'adaptive', 'smart', 'grid'):
        return detector.detect_adaptive(image_path)
    elif method == 'basic' or method == 'white_on_colored':
        return detector._detect_white_on_colored(image_path, 180)
    elif method == 'colored_on_white':
        analysis = detector.analyze_image(image_path)
        if analysis:
            return detector._detect_colored_on_white(image_path, analysis)
        return []
    elif method == 'edge':
        analysis = detector.analyze_image(image_path)
        if analysis:
            return detector._detect_edge_based(image_path, analysis)
        return []
    else:
        # Default to auto
        return detector.detect_adaptive(image_path)


def analyze_floor_plan(image_path: str) -> Optional[Dict]:
    """
    Analyze a floor plan image and return detection recommendations.

    Args:
        image_path: Path to floor plan image

    Returns:
        Dictionary with analysis results and recommendations
    """
    detector = AdaptiveBoothDetector()
    analysis = detector.analyze_image(image_path)

    if analysis is None:
        return None

    return {
        'width': analysis.width,
        'height': analysis.height,
        'mean_brightness': analysis.mean_brightness,
        'std_brightness': analysis.std_brightness,
        'white_ratio': analysis.white_ratio,
        'dark_ratio': analysis.dark_ratio,
        'edge_density': analysis.edge_density,
        'recommended_mode': analysis.recommended_mode.value,
        'optimal_threshold': analysis.optimal_threshold,
        'is_inverted': analysis.is_inverted,
        'recommendation': (
            "Use 'colored_on_white' mode" if analysis.is_inverted
            else "Use 'white_on_colored' mode"
        )
    }
