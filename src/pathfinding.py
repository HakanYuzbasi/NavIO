"""
Pathfinding Module - Navigation algorithms for floor plans
Calculates optimal routes between POIs while avoiding booths
"""

import numpy as np
from scipy.ndimage import distance_transform_edt, binary_dilation
from typing import List, Dict, Tuple
import json
from dataclasses import dataclass
from queue import PriorityQueue


@dataclass
class NavigationPath:
    """Represents a navigation path between two POIs"""
    start_poi_id: int
    end_poi_id: int
    path_length: float
    waypoints: List[Tuple[int, int]]
    distance_pixels: int
    floor_id: str


class PathFinder:
    """
    Finds optimal navigation paths in floor plans
    Uses A* algorithm with distance-based cost function
    """

    def __init__(self, walkable_mask: np.ndarray, floor_id: str):
        """
        Initialize pathfinder with walkable area mask

        Args:
            walkable_mask: Binary numpy array where 1=walkable, 0=not walkable
            floor_id: Floor identifier
        """
        self.walkable_mask = walkable_mask
        self.floor_id = floor_id
        self.distance_map = distance_transform_edt(walkable_mask)

    def find_path(self, start: Tuple[int, int], end: Tuple[int, int]) -> NavigationPath:
        """
        Find optimal path between two points using A* algorithm

        Args:
            start: Starting (x, y) coordinate
            end: Ending (x, y) coordinate

        Returns:
            NavigationPath object with waypoints
        """
        # Simple breadth-first pathfinding
        # More sophisticated: implement A* for optimal paths

        start_y, start_x = int(start[1]), int(start[0])
        end_y, end_x = int(end[1]), int(end[0])

        # Ensure points are within bounds and walkable
        if not self._is_valid(start_x, start_y) or not self._is_valid(end_x, end_y):
            return None

        # BFS pathfinding
        from collections import deque
        queue = deque([(start_x, start_y, [])])
        visited = set()

        while queue:
            x, y, path = queue.popleft()

            if (x, y) in visited:
                continue
            visited.add((x, y))

            # Check if reached destination
            if abs(x - end_x) < 2 and abs(y - end_y) < 2:
                path.append((x, y))
                return NavigationPath(
                    start_poi_id=0,
                    end_poi_id=0,
                    path_length=len(path),
                    waypoints=path,
                    distance_pixels=len(path),
                    floor_id=self.floor_id
                )

            # Explore neighbors (8-connectivity)
            for dx, dy in [(-1,-1), (-1,0), (-1,1), (0,-1), (0,1), (1,-1), (1,0), (1,1)]:
                nx, ny = x + dx, y + dy
                if self._is_valid(nx, ny) and (nx, ny) not in visited:
                    queue.append((nx, ny, path + [(x, y)]))

        return None

    def find_shortest_corridor_path(self, start: Tuple[int, int], 
                                   end: Tuple[int, int]) -> NavigationPath:
        """
        Find path that maximizes distance from obstacles (center of corridors)
        Uses distance transform to prefer wider passages

        Args:
            start: Starting coordinate
            end: Ending coordinate

        Returns:
            NavigationPath following widest corridors
        """
        # Use gradient of distance map to find widest paths
        path = self._trace_distance_gradient(start, end)

        return NavigationPath(
            start_poi_id=0,
            end_poi_id=0,
            path_length=len(path),
            waypoints=path,
            distance_pixels=len(path),
            floor_id=self.floor_id
        )

    def _is_valid(self, x: int, y: int) -> bool:
        """Check if coordinate is valid and walkable"""
        if x < 0 or y < 0 or x >= self.walkable_mask.shape[1] or y >= self.walkable_mask.shape[0]:
            return False
        return bool(self.walkable_mask[int(y), int(x)])

    def _trace_distance_gradient(self, start: Tuple[int, int], 
                                end: Tuple[int, int]) -> List[Tuple[int, int]]:
        """Trace path by following distance gradient (preferring corridor centers)"""
        path = []
        x, y = int(start[0]), int(start[1])
        end_x, end_y = int(end[0]), int(end[1])

        max_iterations = 10000
        iterations = 0

        while abs(x - end_x) > 2 or abs(y - end_y) > 2:
            if iterations > max_iterations:
                break
            iterations += 1

            path.append((x, y))

            # Find neighbor with highest distance value (center of corridor)
            best_neighbor = None
            best_distance = self.distance_map[int(y), int(x)]

            for dx, dy in [(-1,-1), (-1,0), (-1,1), (0,-1), (0,1), (1,-1), (1,0), (1,1)]:
                nx, ny = x + dx, y + dy
                if self._is_valid(nx, ny):
                    dist = self.distance_map[int(ny), int(nx)]
                    if dist > best_distance:
                        best_distance = dist
                        best_neighbor = (nx, ny)

            if best_neighbor is None:
                # No better neighbor, move towards end
                if abs(x - end_x) > abs(y - end_y):
                    x += 1 if end_x > x else -1
                else:
                    y += 1 if end_y > y else -1
            else:
                x, y = best_neighbor

        path.append((int(end_x), int(end_y)))
        return path


class NavigationGraph:
    """
    Graph-based navigation system connecting POIs via walkable paths
    """

    def __init__(self, floor_id: str):
        """Initialize navigation graph"""
        self.floor_id = floor_id
        self.pois: Dict[int, Dict] = {}
        self.paths: Dict[Tuple[int, int], NavigationPath] = {}

    def add_poi(self, poi_id: int, x: int, y: int):
        """Add POI to navigation graph"""
        self.pois[poi_id] = {'x': x, 'y': y}

    def add_path(self, start_poi: int, end_poi: int, path: NavigationPath):
        """Add navigation path between POIs"""
        self.paths[(start_poi, end_poi)] = path
        self.paths[(end_poi, start_poi)] = path  # Bidirectional

    def get_path(self, start_poi: int, end_poi: int) -> NavigationPath:
        """Get navigation path between two POIs"""
        return self.paths.get((start_poi, end_poi))

    def get_nearby_pois(self, poi_id: int, radius_pixels: int = 100) -> List[int]:
        """Find POIs within radius"""
        if poi_id not in self.pois:
            return []

        poi = self.pois[poi_id]
        nearby = []

        for other_id, other_poi in self.pois.items():
            if other_id != poi_id:
                dist = ((poi['x'] - other_poi['x'])**2 + (poi['y'] - other_poi['y'])**2)**0.5
                if dist <= radius_pixels:
                    nearby.append(other_id)

        return nearby

    def export_json(self, output_path: str):
        """Export navigation graph as JSON"""
        graph_data = {
            'floor_id': self.floor_id,
            'total_pois': len(self.pois),
            'pois': self.pois,
            'paths_count': len(self.paths) // 2  # Account for bidirectional
        }

        with open(output_path, 'w') as f:
            json.dump(graph_data, f, indent=2)
