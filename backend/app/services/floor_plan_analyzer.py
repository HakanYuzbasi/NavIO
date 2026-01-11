"""
Comprehensive Floor Plan Analyzer

This service analyzes floor plan images to automatically:
1. Detect rooms/booths (destinations - POIs)
2. Detect walkable corridors and pathways
3. Generate navigation nodes along walkable areas
4. Create edges between connected nodes for pathfinding
5. Link POIs to their nearest accessible nodes

The goal is to create a complete navigation graph from a floor plan image.
"""
import cv2
import numpy as np
from typing import List, Dict, Tuple, Optional, Set
from dataclasses import dataclass, field
from enum import Enum
import logging
import math
from scipy import ndimage
from collections import deque

logger = logging.getLogger(__name__)


class AreaType(Enum):
    """Types of areas detected in floor plan."""
    WALKABLE = "walkable"      # Corridors, pathways - where people walk
    BOOTH = "booth"            # Standard vendor booth
    ROOM = "room"              # Larger room/space
    KIOSK = "kiosk"            # Small station
    OBSTACLE = "obstacle"      # Walls, pillars, etc.
    ENTRANCE = "entrance"      # Entry/exit points


@dataclass
class DetectedArea:
    """Represents a detected area in the floor plan."""
    id: int
    area_type: AreaType
    center_x: int
    center_y: int
    width: int
    height: int
    area_pixels: int
    contour: np.ndarray = None
    name: str = ""
    description: str = ""


@dataclass
class NavigationNode:
    """A node in the navigation graph."""
    id: int
    x: int
    y: int
    node_type: str = "waypoint"  # waypoint, entrance, booth_access
    name: str = ""
    connected_poi_id: Optional[int] = None


@dataclass
class NavigationEdge:
    """An edge connecting two navigation nodes."""
    source_id: int
    target_id: int
    weight: float  # Distance
    bidirectional: bool = True
    edge_type: str = "corridor"


@dataclass
class POIData:
    """Point of Interest data."""
    id: int
    name: str
    x: int
    y: int
    category: str
    description: str
    nearest_node_id: Optional[int] = None
    area_width: int = 0
    area_height: int = 0


@dataclass
class FloorPlanAnalysisResult:
    """Complete result of floor plan analysis."""
    width: int
    height: int
    walkable_mask: np.ndarray = None
    booths: List[DetectedArea] = field(default_factory=list)
    corridors: List[DetectedArea] = field(default_factory=list)
    nodes: List[NavigationNode] = field(default_factory=list)
    edges: List[NavigationEdge] = field(default_factory=list)
    pois: List[POIData] = field(default_factory=list)
    analysis_method: str = ""


class FloorPlanAnalyzer:
    """
    Comprehensive floor plan analyzer that creates complete navigation infrastructure.

    This analyzer:
    1. Identifies walkable vs non-walkable areas
    2. Detects booth/room locations
    3. Creates navigation nodes along corridors
    4. Builds edges for pathfinding graph
    5. Links POIs to accessible nodes
    """

    def __init__(
        self,
        node_spacing: int = 50,  # Pixels between navigation nodes
        min_booth_area: int = 500,
        max_booth_area: int = 100000,
        corridor_min_width: int = 20,  # Minimum corridor width in pixels
    ):
        self.node_spacing = node_spacing
        self.min_booth_area = min_booth_area
        self.max_booth_area = max_booth_area
        self.corridor_min_width = corridor_min_width

    def analyze(self, image_path: str) -> FloorPlanAnalysisResult:
        """
        Perform complete floor plan analysis.

        Args:
            image_path: Path to floor plan image

        Returns:
            FloorPlanAnalysisResult with all detected elements
        """
        logger.info(f"Starting floor plan analysis: {image_path}")

        # Read image
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Could not read image: {image_path}")

        height, width = img.shape[:2]
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # Analyze image characteristics
        mean_brightness = np.mean(gray)
        white_ratio = np.sum(gray > 200) / (width * height)

        logger.info(f"Image: {width}x{height}, brightness={mean_brightness:.1f}, white_ratio={white_ratio:.1%}")

        # Determine if floor plan has white corridors or colored corridors
        is_white_corridor = white_ratio > 0.3 and white_ratio < 0.8

        # Step 1: Create walkable area mask
        walkable_mask = self._detect_walkable_areas(gray, is_white_corridor)

        # Step 2: Detect booths/rooms (non-walkable enclosed areas)
        booths = self._detect_booths(gray, walkable_mask, height, width)

        # Step 3: Generate navigation nodes along walkable areas
        nodes = self._generate_navigation_nodes(walkable_mask, booths, height, width)

        # Step 4: Create edges between nearby nodes
        edges = self._create_navigation_edges(nodes, walkable_mask)

        # Step 5: Create POIs from booths and link to nearest nodes
        pois = self._create_pois_from_booths(booths, nodes, height)

        # Update nodes with POI connections
        self._link_pois_to_nodes(pois, nodes)

        result = FloorPlanAnalysisResult(
            width=width,
            height=height,
            walkable_mask=walkable_mask,
            booths=booths,
            nodes=nodes,
            edges=edges,
            pois=pois,
            analysis_method="adaptive" if is_white_corridor else "inverted"
        )

        logger.info(
            f"Analysis complete: {len(booths)} booths, {len(nodes)} nodes, "
            f"{len(edges)} edges, {len(pois)} POIs"
        )

        return result

    def _detect_walkable_areas(
        self,
        gray: np.ndarray,
        is_white_corridor: bool
    ) -> np.ndarray:
        """
        Detect walkable corridor areas.

        Walkable areas are typically:
        - White/light colored in most floor plans (corridors)
        - Connected pathways between booths
        """
        height, width = gray.shape

        if is_white_corridor:
            # White corridors - threshold to get light areas
            # Use adaptive threshold for better results
            binary = cv2.adaptiveThreshold(
                gray, 255,
                cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv2.THRESH_BINARY,
                blockSize=51,
                C=-5
            )
        else:
            # Colored corridors on white background - invert
            _, binary = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)
            binary = 255 - binary

        # Clean up with morphological operations
        kernel = np.ones((5, 5), np.uint8)

        # Remove small noise
        binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel, iterations=1)

        # Close small gaps in corridors
        binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel, iterations=2)

        # Ensure corridors are connected - use distance transform to find skeleton
        # then dilate to get walkable width
        dist_transform = cv2.distanceTransform(binary, cv2.DIST_L2, 5)

        # Threshold distance transform to get only areas wide enough to walk
        min_corridor_radius = self.corridor_min_width // 2
        walkable = (dist_transform >= min_corridor_radius).astype(np.uint8) * 255

        # Dilate back to full corridor width
        walkable = cv2.dilate(walkable, kernel, iterations=2)

        # Combine with original binary to ensure we don't lose narrow but important paths
        walkable = cv2.bitwise_or(walkable, binary)

        logger.info(f"Walkable area: {np.sum(walkable > 0) / (width * height) * 100:.1f}% of image")

        return walkable

    def _detect_booths(
        self,
        gray: np.ndarray,
        walkable_mask: np.ndarray,
        height: int,
        width: int
    ) -> List[DetectedArea]:
        """
        Detect booth/room areas (non-walkable enclosed spaces).

        Booths are areas that are:
        - Enclosed (have clear boundaries)
        - Not part of the walkable corridor
        - Within size constraints
        """
        # Invert walkable to get potential booth areas
        non_walkable = cv2.bitwise_not(walkable_mask)

        # Also try direct booth detection
        mean_brightness = np.mean(gray)

        # Try multiple thresholds to find booths
        booth_candidates = []

        for threshold in [150, 170, 190, 210]:
            _, binary = cv2.threshold(gray, threshold, 255, cv2.THRESH_BINARY)

            # Find contours
            contours, hierarchy = cv2.findContours(
                binary,
                cv2.RETR_CCOMP,
                cv2.CHAIN_APPROX_SIMPLE
            )

            if hierarchy is None:
                continue

            for i, contour in enumerate(contours):
                # Skip holes
                if hierarchy[0][i][3] != -1:
                    continue

                area = cv2.contourArea(contour)

                # Size filtering
                if not (self.min_booth_area < area < self.max_booth_area):
                    continue

                # Get bounding box
                x, y, w, h = cv2.boundingRect(contour)

                # Aspect ratio check
                aspect = w / h if h > 0 else 0
                if not (0.2 < aspect < 5.0):
                    continue

                center_x = x + w // 2
                center_y = y + h // 2

                # Check if this overlaps with walkable area significantly
                # Booths should NOT be mostly walkable
                booth_region = walkable_mask[y:y+h, x:x+w]
                walkable_ratio = np.sum(booth_region > 0) / (w * h) if w * h > 0 else 0

                if walkable_ratio < 0.5:  # Less than 50% walkable = likely a booth
                    booth_candidates.append({
                        'x': center_x,
                        'y': center_y,
                        'w': w,
                        'h': h,
                        'area': area,
                        'contour': contour,
                        'threshold': threshold
                    })

        # Remove duplicates (overlapping detections)
        booths = self._remove_duplicate_detections(booth_candidates, height)

        # Convert to DetectedArea objects
        detected_booths = []
        for i, booth in enumerate(booths):
            # Categorize by size
            median_area = np.median([b['area'] for b in booths]) if booths else 1000

            if booth['area'] > median_area * 2.5:
                area_type = AreaType.ROOM
                name = f"Room {sum(1 for b in detected_booths if b.area_type == AreaType.ROOM) + 1}"
            elif booth['area'] < median_area * 0.4:
                area_type = AreaType.KIOSK
                name = f"Kiosk {sum(1 for b in detected_booths if b.area_type == AreaType.KIOSK) + 1}"
            else:
                area_type = AreaType.BOOTH
                name = f"Booth {sum(1 for b in detected_booths if b.area_type == AreaType.BOOTH) + 1}"

            detected_booths.append(DetectedArea(
                id=i + 1,
                area_type=area_type,
                center_x=booth['x'],
                center_y=height - booth['y'],  # Flip Y
                width=booth['w'],
                height=booth['h'],
                area_pixels=booth['area'],
                contour=booth['contour'],
                name=name,
                description=f"Auto-detected {area_type.value}"
            ))

        logger.info(f"Detected {len(detected_booths)} booths/rooms")
        return detected_booths

    def _remove_duplicate_detections(
        self,
        candidates: List[Dict],
        height: int
    ) -> List[Dict]:
        """Remove overlapping/duplicate booth detections."""
        if not candidates:
            return []

        # Sort by area (larger first)
        sorted_candidates = sorted(candidates, key=lambda x: -x['area'])

        kept = []
        for candidate in sorted_candidates:
            # Check if this overlaps with any kept booth
            dominated = False
            for existing in kept:
                # Calculate overlap
                dx = abs(candidate['x'] - existing['x'])
                dy = abs(candidate['y'] - existing['y'])

                # If centers are close, consider it a duplicate
                max_dist = max(candidate['w'], candidate['h'], existing['w'], existing['h']) * 0.5
                if dx < max_dist and dy < max_dist:
                    dominated = True
                    break

            if not dominated:
                kept.append(candidate)

        return kept

    def _generate_navigation_nodes(
        self,
        walkable_mask: np.ndarray,
        booths: List[DetectedArea],
        height: int,
        width: int
    ) -> List[NavigationNode]:
        """
        Generate navigation nodes along walkable corridors.

        Strategy:
        1. Create grid of nodes in walkable areas
        2. Add nodes at corridor intersections
        3. Add access nodes near each booth entrance
        """
        nodes = []
        node_id = 1

        # Get skeleton of walkable area for node placement
        skeleton = cv2.ximgproc.thinning(walkable_mask) if hasattr(cv2, 'ximgproc') else self._simple_skeleton(walkable_mask)

        # Method 1: Grid-based nodes in walkable areas
        for y in range(self.node_spacing, height - self.node_spacing, self.node_spacing):
            for x in range(self.node_spacing, width - self.node_spacing, self.node_spacing):
                # Check if position is walkable
                if walkable_mask[y, x] > 0:
                    # Also check neighborhood to ensure it's a stable position
                    neighborhood = walkable_mask[
                        max(0, y-10):min(height, y+10),
                        max(0, x-10):min(width, x+10)
                    ]
                    if np.mean(neighborhood) > 128:  # Mostly walkable
                        nodes.append(NavigationNode(
                            id=node_id,
                            x=x,
                            y=height - y,  # Flip Y for coordinate system
                            node_type="waypoint",
                            name=f"Node {node_id}"
                        ))
                        node_id += 1

        # Method 2: Add nodes near booth entrances
        for booth in booths:
            # Find the nearest walkable point to the booth
            booth_y_img = height - booth.center_y  # Convert back to image coords
            booth_x = booth.center_x

            # Search in 4 directions for walkable access point
            directions = [
                (0, -1, "top"),    # Above
                (0, 1, "bottom"),  # Below
                (-1, 0, "left"),   # Left
                (1, 0, "right")    # Right
            ]

            access_points = []
            for dx, dy, direction in directions:
                # Search outward from booth edge
                search_x = booth_x + dx * (booth.width // 2 + 20)
                search_y = booth_y_img + dy * (booth.height // 2 + 20)

                # Clamp to image bounds
                search_x = max(0, min(width - 1, search_x))
                search_y = max(0, min(height - 1, search_y))

                # Check if walkable
                if walkable_mask[int(search_y), int(search_x)] > 0:
                    access_points.append((search_x, search_y, direction))

            # Add access nodes for this booth
            for ax, ay, direction in access_points:
                # Check if there's already a node nearby
                too_close = False
                for existing in nodes:
                    existing_y_img = height - existing.y
                    dist = math.sqrt((ax - existing.x)**2 + (ay - existing_y_img)**2)
                    if dist < self.node_spacing * 0.5:
                        # Use existing node as access point
                        existing.connected_poi_id = booth.id
                        existing.node_type = "booth_access"
                        too_close = True
                        break

                if not too_close:
                    nodes.append(NavigationNode(
                        id=node_id,
                        x=int(ax),
                        y=height - int(ay),  # Flip Y
                        node_type="booth_access",
                        name=f"Access to {booth.name}",
                        connected_poi_id=booth.id
                    ))
                    node_id += 1

        logger.info(f"Generated {len(nodes)} navigation nodes")
        return nodes

    def _simple_skeleton(self, binary: np.ndarray) -> np.ndarray:
        """Simple skeletonization fallback if cv2.ximgproc not available."""
        skeleton = np.zeros_like(binary)
        element = cv2.getStructuringElement(cv2.MORPH_CROSS, (3, 3))

        img = binary.copy()
        while True:
            eroded = cv2.erode(img, element)
            temp = cv2.dilate(eroded, element)
            temp = cv2.subtract(img, temp)
            skeleton = cv2.bitwise_or(skeleton, temp)
            img = eroded.copy()

            if cv2.countNonZero(img) == 0:
                break

        return skeleton

    def _create_navigation_edges(
        self,
        nodes: List[NavigationNode],
        walkable_mask: np.ndarray
    ) -> List[NavigationEdge]:
        """
        Create edges between nodes that have walkable paths between them.
        """
        height = walkable_mask.shape[0]
        edges = []
        max_edge_distance = self.node_spacing * 2.5  # Max distance for direct connection

        # Check each pair of nodes
        for i, node1 in enumerate(nodes):
            for j, node2 in enumerate(nodes):
                if i >= j:  # Skip self and already checked pairs
                    continue

                # Convert to image coordinates
                n1_y_img = height - node1.y
                n2_y_img = height - node2.y

                # Calculate distance
                dist = math.sqrt((node1.x - node2.x)**2 + (n1_y_img - n2_y_img)**2)

                if dist > max_edge_distance:
                    continue

                # Check if path between nodes is walkable
                if self._is_path_walkable(
                    node1.x, n1_y_img,
                    node2.x, n2_y_img,
                    walkable_mask
                ):
                    edges.append(NavigationEdge(
                        source_id=node1.id,
                        target_id=node2.id,
                        weight=dist,
                        bidirectional=True,
                        edge_type="corridor"
                    ))

        logger.info(f"Created {len(edges)} navigation edges")
        return edges

    def _is_path_walkable(
        self,
        x1: int, y1: int,
        x2: int, y2: int,
        walkable_mask: np.ndarray
    ) -> bool:
        """Check if the path between two points is walkable."""
        height, width = walkable_mask.shape

        # Use Bresenham's line algorithm to check path
        num_points = max(abs(x2 - x1), abs(y2 - y1))
        if num_points == 0:
            return True

        walkable_count = 0
        total_points = 0

        for i in range(num_points + 1):
            t = i / num_points
            x = int(x1 + t * (x2 - x1))
            y = int(y1 + t * (y2 - y1))

            # Clamp to bounds
            x = max(0, min(width - 1, x))
            y = max(0, min(height - 1, y))

            total_points += 1
            if walkable_mask[y, x] > 0:
                walkable_count += 1

        # Path is walkable if at least 80% of points are walkable
        return (walkable_count / total_points) >= 0.8 if total_points > 0 else False

    def _create_pois_from_booths(
        self,
        booths: List[DetectedArea],
        nodes: List[NavigationNode],
        image_height: int
    ) -> List[POIData]:
        """Create POIs from detected booths and link to nearest nodes."""
        pois = []

        for booth in booths:
            # Find nearest navigation node
            nearest_node = None
            min_dist = float('inf')

            for node in nodes:
                dist = math.sqrt(
                    (booth.center_x - node.x)**2 +
                    (booth.center_y - node.y)**2
                )
                if dist < min_dist:
                    min_dist = dist
                    nearest_node = node

            # Map booth type to category
            category_map = {
                AreaType.BOOTH: "vendor",
                AreaType.ROOM: "room",
                AreaType.KIOSK: "kiosk",
                AreaType.ENTRANCE: "entrance"
            }

            poi = POIData(
                id=booth.id,
                name=booth.name,
                x=booth.center_x,
                y=booth.center_y,
                category=category_map.get(booth.area_type, "vendor"),
                description=booth.description,
                nearest_node_id=nearest_node.id if nearest_node else None,
                area_width=booth.width,
                area_height=booth.height
            )
            pois.append(poi)

        logger.info(f"Created {len(pois)} POIs from booths")
        return pois

    def _link_pois_to_nodes(
        self,
        pois: List[POIData],
        nodes: List[NavigationNode]
    ) -> None:
        """Update nodes with POI connections."""
        for poi in pois:
            if poi.nearest_node_id:
                for node in nodes:
                    if node.id == poi.nearest_node_id:
                        node.connected_poi_id = poi.id
                        if node.node_type == "waypoint":
                            node.node_type = "booth_access"
                        break

    def visualize_analysis(
        self,
        image_path: str,
        result: FloorPlanAnalysisResult,
        output_path: str
    ) -> None:
        """Create visualization of the analysis result."""
        img = cv2.imread(image_path)
        height = img.shape[0]

        # Draw walkable areas (green tint)
        if result.walkable_mask is not None:
            walkable_overlay = np.zeros_like(img)
            walkable_overlay[:, :, 1] = result.walkable_mask // 2  # Green channel
            img = cv2.addWeighted(img, 0.7, walkable_overlay, 0.3, 0)

        # Draw booths (blue rectangles)
        for booth in result.booths:
            y_img = height - booth.center_y
            x1 = booth.center_x - booth.width // 2
            y1 = y_img - booth.height // 2
            x2 = booth.center_x + booth.width // 2
            y2 = y_img + booth.height // 2

            color = {
                AreaType.BOOTH: (255, 0, 0),    # Blue
                AreaType.ROOM: (255, 100, 0),   # Orange-blue
                AreaType.KIOSK: (255, 255, 0),  # Cyan
            }.get(booth.area_type, (255, 0, 0))

            cv2.rectangle(img, (x1, y1), (x2, y2), color, 2)
            cv2.putText(img, booth.name, (x1, y1 - 5),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)

        # Draw nodes (green circles)
        for node in result.nodes:
            y_img = height - node.y
            color = (0, 255, 0) if node.node_type == "waypoint" else (0, 255, 255)
            cv2.circle(img, (node.x, y_img), 5, color, -1)

        # Draw edges (green lines)
        node_dict = {n.id: n for n in result.nodes}
        for edge in result.edges:
            n1 = node_dict.get(edge.source_id)
            n2 = node_dict.get(edge.target_id)
            if n1 and n2:
                y1_img = height - n1.y
                y2_img = height - n2.y
                cv2.line(img, (n1.x, y1_img), (n2.x, y2_img), (0, 200, 0), 1)

        # Draw POIs (red markers)
        for poi in result.pois:
            y_img = height - poi.y
            cv2.drawMarker(img, (poi.x, y_img), (0, 0, 255),
                          cv2.MARKER_STAR, 15, 2)

        cv2.imwrite(output_path, img)
        logger.info(f"Saved visualization to {output_path}")


def analyze_and_create_navigation(
    image_path: str,
    node_spacing: int = 50
) -> FloorPlanAnalysisResult:
    """
    Convenience function to analyze floor plan and create navigation infrastructure.

    Args:
        image_path: Path to floor plan image
        node_spacing: Spacing between navigation nodes in pixels

    Returns:
        Complete analysis result with nodes, edges, and POIs
    """
    analyzer = FloorPlanAnalyzer(node_spacing=node_spacing)
    return analyzer.analyze(image_path)
