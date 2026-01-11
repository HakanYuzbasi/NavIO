"""
Automatic Booth Detection Service

Uses computer vision to automatically detect booth/room locations
from floor plan images and generate POIs.
"""
import cv2
import numpy as np
from PIL import Image
from typing import List, Dict, Tuple
import logging

logger = logging.getLogger(__name__)


class BoothDetector:
    """Detects booths/rooms from floor plan images using computer vision."""

    def __init__(self, min_booth_area: int = 1000, max_booth_area: int = 50000):
        """
        Initialize booth detector.

        Args:
            min_booth_area: Minimum area (pixels) for a valid booth
            max_booth_area: Maximum area (pixels) for a valid booth
        """
        self.min_booth_area = min_booth_area
        self.max_booth_area = max_booth_area

    def detect_booths(self, image_path: str) -> List[Dict]:
        """
        Detect booth locations from a floor plan image.

        Args:
            image_path: Path to the floor plan image

        Returns:
            List of detected booths with center positions and dimensions
        """
        try:
            # Read image
            img = cv2.imread(image_path)
            if img is None:
                raise ValueError(f"Could not read image: {image_path}")

            # Get image dimensions
            height, width = img.shape[:2]

            # Convert to grayscale
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

            # Apply threshold to get binary image
            # Invert so booths are white on black background
            _, binary = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)

            # Find contours (booth boundaries)
            contours, _ = cv2.findContours(
                binary,
                cv2.RETR_EXTERNAL,
                cv2.CONTOUR_APPROX_SIMPLE
            )

            booths = []
            booth_number = 1

            for contour in contours:
                # Calculate area
                area = cv2.contourArea(contour)

                # Filter by size
                if self.min_booth_area < area < self.max_booth_area:
                    # Get bounding rectangle
                    x, y, w, h = cv2.boundingRect(contour)

                    # Calculate center point (in pixel coordinates)
                    center_x = x + w // 2
                    center_y = height - (y + h // 2)  # Flip Y for our coordinate system

                    # Check if booth is reasonably rectangular
                    aspect_ratio = float(w) / h if h > 0 else 0
                    if 0.3 < aspect_ratio < 3.0:  # Reasonable booth proportions
                        booths.append({
                            'name': f'Booth {booth_number}',
                            'x': center_x,
                            'y': center_y,
                            'width': w,
                            'height': h,
                            'area': area,
                            'category': 'booth',
                            'description': f'Automatically detected booth #{booth_number}'
                        })
                        booth_number += 1

            # Sort booths by position (left to right, top to bottom)
            booths.sort(key=lambda b: (-b['y'], b['x']))

            logger.info(f"Detected {len(booths)} booths from {image_path}")
            return booths

        except Exception as e:
            logger.error(f"Error detecting booths: {e}")
            return []

    def detect_with_grid_analysis(self, image_path: str) -> List[Dict]:
        """
        Advanced detection using grid analysis for more accurate booth identification.

        This method analyzes the floor plan as a grid and identifies
        individual booth cells based on wall/line detection.
        """
        try:
            img = cv2.imread(image_path)
            if img is None:
                raise ValueError(f"Could not read image: {image_path}")

            height, width = img.shape[:2]
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

            # Edge detection to find walls
            edges = cv2.Canny(gray, 50, 150, apertureSize=3)

            # Dilate edges to connect nearby lines
            kernel = np.ones((3, 3), np.uint8)
            dilated = cv2.dilate(edges, kernel, iterations=1)

            # Find contours from edges
            contours, _ = cv2.findContours(
                dilated,
                cv2.RETR_TREE,
                cv2.CONTOUR_APPROX_SIMPLE
            )

            booths = []
            booth_number = 1

            # Process each contour
            for contour in contours:
                area = cv2.contourArea(contour)

                if self.min_booth_area < area < self.max_booth_area:
                    # Approximate contour to polygon
                    peri = cv2.arcLength(contour, True)
                    approx = cv2.approxPolyDP(contour, 0.02 * peri, True)

                    # Get bounding box
                    x, y, w, h = cv2.boundingRect(contour)

                    # Calculate center
                    center_x = x + w // 2
                    center_y = height - (y + h // 2)

                    # Check if roughly rectangular (4-6 sides)
                    if 4 <= len(approx) <= 6:
                        aspect_ratio = float(w) / h if h > 0 else 0

                        if 0.3 < aspect_ratio < 3.0:
                            booths.append({
                                'name': f'Booth {booth_number}',
                                'x': center_x,
                                'y': center_y,
                                'width': w,
                                'height': h,
                                'area': area,
                                'category': 'booth',
                                'description': f'Auto-detected booth #{booth_number}',
                                'corners': len(approx)
                            })
                            booth_number += 1

            # Sort by position
            booths.sort(key=lambda b: (-b['y'], b['x']))

            # Renumber after sorting
            for i, booth in enumerate(booths, 1):
                booth['name'] = f'Booth {i}'
                booth['description'] = f'Auto-detected booth #{i}'

            logger.info(f"Grid analysis detected {len(booths)} booths")
            return booths

        except Exception as e:
            logger.error(f"Error in grid analysis: {e}")
            return []

    def detect_with_smart_categorization(self, image_path: str) -> List[Dict]:
        """
        Intelligent booth detection with automatic categorization.

        Categorizes detected spaces as:
        - Large areas: main rooms, event spaces
        - Medium areas: standard booths
        - Small areas: kiosks, stations
        """
        try:
            booths = self.detect_with_grid_analysis(image_path)

            if not booths:
                return []

            # Calculate area statistics for categorization
            areas = [b['area'] for b in booths]
            median_area = np.median(areas)

            categorized_booths = []
            booth_counts = {'booth': 0, 'room': 0, 'kiosk': 0}

            for booth in booths:
                area = booth['area']

                # Categorize by size
                if area > median_area * 2:
                    # Large space
                    booth_counts['room'] += 1
                    booth['category'] = 'room'
                    booth['name'] = f"Room {booth_counts['room']}"
                    booth['description'] = 'Large space - suitable for main areas'

                elif area < median_area * 0.5:
                    # Small space
                    booth_counts['kiosk'] += 1
                    booth['category'] = 'kiosk'
                    booth['name'] = f"Kiosk {booth_counts['kiosk']}"
                    booth['description'] = 'Small station or kiosk'

                else:
                    # Standard booth
                    booth_counts['booth'] += 1
                    booth['category'] = 'booth'
                    booth['name'] = f"Booth {booth_counts['booth']}"
                    booth['description'] = 'Standard vendor booth'

                categorized_booths.append(booth)

            logger.info(
                f"Categorized: {booth_counts['room']} rooms, "
                f"{booth_counts['booth']} booths, {booth_counts['kiosk']} kiosks"
            )

            return categorized_booths

        except Exception as e:
            logger.error(f"Error in smart categorization: {e}")
            return []

    def visualize_detections(
        self,
        image_path: str,
        booths: List[Dict],
        output_path: str
    ) -> None:
        """
        Create a visualization of detected booths.

        Args:
            image_path: Original floor plan image
            booths: List of detected booths
            output_path: Where to save visualization
        """
        try:
            img = cv2.imread(image_path)
            height, width = img.shape[:2]

            # Draw each booth
            for booth in booths:
                x = booth['x']
                y = height - booth['y']  # Flip Y back for visualization
                w = booth.get('width', 50)
                h = booth.get('height', 50)

                # Draw bounding box
                cv2.rectangle(
                    img,
                    (x - w//2, y - h//2),
                    (x + w//2, y + h//2),
                    (0, 255, 0),
                    2
                )

                # Draw center point
                cv2.circle(img, (x, y), 5, (0, 0, 255), -1)

                # Add label
                cv2.putText(
                    img,
                    booth['name'],
                    (x - w//2, y - h//2 - 10),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.5,
                    (255, 0, 0),
                    2
                )

            # Save visualization
            cv2.imwrite(output_path, img)
            logger.info(f"Saved visualization to {output_path}")

        except Exception as e:
            logger.error(f"Error creating visualization: {e}")


def auto_detect_booths(image_path: str, method: str = 'smart') -> List[Dict]:
    """
    Convenience function to auto-detect booths from an image.

    Args:
        image_path: Path to floor plan image
        method: Detection method ('basic', 'grid', or 'smart')

    Returns:
        List of detected booth dictionaries
    """
    detector = BoothDetector()

    if method == 'basic':
        return detector.detect_booths(image_path)
    elif method == 'grid':
        return detector.detect_with_grid_analysis(image_path)
    else:  # 'smart'
        return detector.detect_with_smart_categorization(image_path)
