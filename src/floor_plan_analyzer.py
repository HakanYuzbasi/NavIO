"""
Floor Plan Analyzer - Advanced POI and Navigation Detection
Detects Points of Interest (booths/stalls) and walkable corridors in floor plans
"""

from PIL import Image, ImageDraw
import numpy as np
from scipy import ndimage
from scipy.ndimage import binary_dilation, binary_erosion
from skimage.morphology import skeletonize
from dataclasses import dataclass
from typing import List, Dict, Tuple
import json


@dataclass
class POI:
    """Point of Interest (booth/stall)"""
    poi_id: int
    center_x: int
    center_y: int
    width: int
    height: int
    area: int
    fill_ratio: float
    floor_id: str


@dataclass
class WalkableArea:
    """Walkable corridor information"""
    floor_id: str
    walkable_pixels: int
    booth_pixels: int
    wall_pixels: int
    walkable_percent: float
    booth_percent: float
    wall_percent: float
    skeleton_length: int


class FloorPlanAnalyzer:
    """
    Comprehensive floor plan analyzer for POI detection and navigation mapping
    """

    def __init__(self, image_path: str, floor_id: str):
        """
        Initialize analyzer with floor plan image

        Args:
            image_path: Path to floor plan image
            floor_id: Unique identifier for this floor (e.g., 'floor_1')
        """
        self.image_path = image_path
        self.floor_id = floor_id
        self.image = Image.open(image_path)
        self.image_array = np.array(self.image.convert('L'))
        self.pois: List[POI] = []
        self.walkable_area: WalkableArea = None

    def detect_pois(self, min_size: int = 10, fill_threshold: float = 0.3) -> List[POI]:
        """
        Detect all Points of Interest (booths/stalls) in floor plan

        Args:
            min_size: Minimum pixel count for detection
            fill_threshold: Minimum fill ratio to accept as POI

        Returns:
            List of detected POI objects
        """
        # Binary threshold - white regions (> 180) = booths
        white_regions = (self.image_array > 180).astype(np.uint8)

        # Label connected components
        labeled, num_features = ndimage.label(white_regions)

        self.pois = []
        poi_id = 0

        for region_id in range(1, num_features + 1):
            mask = (labeled == region_id)
            coords = np.argwhere(mask)

            if len(coords) < min_size:
                continue

            min_y, min_x = coords.min(axis=0)
            max_y, max_x = coords.max(axis=0)

            width = max_x - min_x + 1
            height = max_y - min_y + 1

            # Skip very small or very large regions
            if width < 5 or height < 5:
                continue
            if width > self.image.width * 0.95 or height > self.image.height * 0.95:
                continue

            # Calculate rectangularity
            area = len(coords)
            bbox_area = width * height
            fill_ratio = area / bbox_area if bbox_area > 0 else 0

            if fill_ratio > fill_threshold:
                center_x = (min_x + max_x) // 2
                center_y = (min_y + max_y) // 2

                poi = POI(
                    poi_id=poi_id,
                    center_x=center_x,
                    center_y=center_y,
                    width=width,
                    height=height,
                    area=area,
                    fill_ratio=fill_ratio,
                    floor_id=self.floor_id
                )
                self.pois.append(poi)
                poi_id += 1

        return self.pois

    def detect_walkable_areas(self) -> WalkableArea:
        """
        Detect walkable corridors and paths

        Returns:
            WalkableArea object with statistics
        """
        # Identify regions
        booths = (self.image_array > 200).astype(np.uint8)
        walls = (self.image_array < 50).astype(np.uint8)

        # Walkable area = everything that's NOT a booth and NOT a wall
        walkable = ((self.image_array >= 50) & (self.image_array <= 200)).astype(np.uint8)

        # Clean up walkable area
        walkable_cleaned = binary_erosion(walkable, iterations=1)
        walkable_cleaned = binary_dilation(walkable_cleaned, iterations=1)

        # Calculate skeleton for navigation paths
        skeleton = skeletonize(walkable_cleaned.astype(bool))

        # Calculate statistics
        total_pixels = self.image_array.shape[0] * self.image_array.shape[1]
        walkable_pixels = np.sum(walkable_cleaned)
        booth_pixels = np.sum(booths)
        wall_pixels = np.sum(walls)

        walkable_percent = (walkable_pixels / total_pixels) * 100
        booth_percent = (booth_pixels / total_pixels) * 100
        wall_percent = (wall_pixels / total_pixels) * 100

        self.walkable_area = WalkableArea(
            floor_id=self.floor_id,
            walkable_pixels=int(walkable_pixels),
            booth_pixels=int(booth_pixels),
            wall_pixels=int(wall_pixels),
            walkable_percent=walkable_percent,
            booth_percent=booth_percent,
            wall_percent=wall_percent,
            skeleton_length=int(np.sum(skeleton))
        )

        return self.walkable_area

    def visualize_pois(self, output_path: str = None) -> Image.Image:
        """
        Create annotated image with POIs marked

        Args:
            output_path: Path to save annotated image

        Returns:
            PIL Image with red dots marking POI centers
        """
        annotated = self.image.copy()
        draw = ImageDraw.Draw(annotated)

        for poi in self.pois:
            radius = 2 if (poi.width < 30 or poi.height < 30) else 3
            draw.ellipse(
                [poi.center_x - radius, poi.center_y - radius,
                 poi.center_x + radius, poi.center_y + radius],
                fill='red', outline='red'
            )

        if output_path:
            annotated.save(output_path)

        return annotated

    def visualize_walkable_areas(self, output_path: str = None) -> Image.Image:
        """
        Create annotated image with walkable areas and navigation paths

        Args:
            output_path: Path to save annotated image

        Returns:
            PIL Image with green walkable areas and red navigation paths
        """
        # Recreate walkable detection for visualization
        walkable = ((self.image_array >= 50) & (self.image_array <= 200)).astype(np.uint8)
        walkable_cleaned = binary_erosion(walkable, iterations=1)
        walkable_cleaned = binary_dilation(walkable_cleaned, iterations=1)
        skeleton = skeletonize(walkable_cleaned.astype(bool))

        # Create overlay
        img_rgba = self.image.convert('RGBA')
        overlay = Image.new('RGBA', img_rgba.size, (0, 0, 0, 0))
        overlay_draw = ImageDraw.Draw(overlay)

        # Draw walkable areas in green
        walkable_coords = np.argwhere(walkable_cleaned)
        for y, x in walkable_coords:
            overlay_draw.point((x, y), fill=(0, 255, 0, 100))

        # Combine images
        annotated_rgba = Image.alpha_composite(img_rgba, overlay)
        annotated = annotated_rgba.convert('RGB')

        # Draw skeleton paths in red
        draw = ImageDraw.Draw(annotated)
        skeleton_coords = np.argwhere(skeleton)
        for y, x in skeleton_coords:
            draw.point((x, y), fill=(255, 0, 0))

        if output_path:
            annotated.save(output_path)

        return annotated

    def export_pois_json(self, output_path: str) -> Dict:
        """
        Export POI data as JSON

        Args:
            output_path: Path to save JSON file

        Returns:
            Dictionary of exported data
        """
        pois_data = {
            'floor_id': self.floor_id,
            'total_pois': len(self.pois),
            'image_width': self.image.width,
            'image_height': self.image.height,
            'pois': [
                {
                    'poi_id': poi.poi_id,
                    'center': {'x': poi.center_x, 'y': poi.center_y},
                    'size': {'width': poi.width, 'height': poi.height},
                    'area': poi.area,
                    'fill_ratio': round(poi.fill_ratio, 3)
                }
                for poi in self.pois
            ]
        }

        with open(output_path, 'w') as f:
            json.dump(pois_data, f, indent=2)

        return pois_data

    def export_walkable_json(self, output_path: str) -> Dict:
        """
        Export walkable area data as JSON

        Args:
            output_path: Path to save JSON file

        Returns:
            Dictionary of exported data
        """
        walkable_data = {
            'floor_id': self.floor_id,
            'image_width': self.image.width,
            'image_height': self.image.height,
            'statistics': {
                'walkable_pixels': self.walkable_area.walkable_pixels,
                'booth_pixels': self.walkable_area.booth_pixels,
                'wall_pixels': self.walkable_area.wall_pixels,
                'walkable_percent': round(self.walkable_area.walkable_percent, 1),
                'booth_percent': round(self.walkable_area.booth_percent, 1),
                'wall_percent': round(self.walkable_area.wall_percent, 1),
                'navigation_path_length': self.walkable_area.skeleton_length
            }
        }

        with open(output_path, 'w') as f:
            json.dump(walkable_data, f, indent=2)

        return walkable_data
