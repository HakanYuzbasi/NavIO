"""
Pathfinding service using NetworkX for calculating optimal routes.

Features:
- A* pathfinding algorithm for optimal route calculation
- Redis caching for navigation graphs
- Step-by-step navigation instructions
- Accessibility-aware routing
"""
import math
import hashlib
import logging
from typing import List, Tuple, Optional
from uuid import UUID

import networkx as nx
from sqlalchemy.orm import Session

from app.models import Node, Edge
from app.schemas import RouteResponse, RoutePreferences, Coordinate, RouteInstruction
from app.core.cache import cache

logger = logging.getLogger(__name__)


class PathfindingService:
    """Service for calculating routes using A* algorithm with caching."""

    @staticmethod
    def calculate_euclidean_distance(x1: float, y1: float, x2: float, y2: float) -> float:
        """Calculate Euclidean distance between two points."""
        return math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)

    @staticmethod
    def _get_preferences_hash(preferences: Optional[RoutePreferences]) -> str:
        """Generate a hash of route preferences for cache keying."""
        if preferences is None:
            return "default"

        pref_str = f"{preferences.accessible_only}:{preferences.avoid_stairs}:{preferences.shortest_distance}"
        return hashlib.md5(pref_str.encode()).hexdigest()[:8]

    @staticmethod
    def build_graph(
        db: Session,
        floor_plan_id: UUID,
        preferences: Optional[RoutePreferences] = None,
        use_cache: bool = True
    ) -> Tuple[nx.Graph, dict]:
        """
        Build NetworkX graph from database nodes and edges.

        Implements caching to avoid rebuilding the graph on every request.

        Args:
            db: Database session
            floor_plan_id: Floor plan UUID
            preferences: Route calculation preferences
            use_cache: Whether to use Redis cache (default: True)

        Returns:
            Tuple of (graph, node_positions_dict)
        """
        if preferences is None:
            preferences = RoutePreferences()

        floor_plan_id_str = str(floor_plan_id)
        preferences_hash = PathfindingService._get_preferences_hash(preferences)

        # Try to get from cache
        if use_cache:
            cached_graph = cache.get_graph(floor_plan_id_str, preferences_hash)
            if cached_graph is not None:
                logger.debug(f"Graph cache hit for floor plan {floor_plan_id_str}")
                return cached_graph

        logger.debug(f"Building graph for floor plan {floor_plan_id_str}")

        # Create undirected graph
        G = nx.Graph()

        # Get all nodes for this floor plan
        nodes = db.query(Node).filter(Node.floor_plan_id == floor_plan_id).all()
        node_positions = {}

        # Add nodes to graph
        for node in nodes:
            G.add_node(
                str(node.id),
                x=node.x,
                y=node.y,
                node_type=node.node_type,
                accessibility_level=node.accessibility_level,
                name=node.name
            )
            node_positions[str(node.id)] = (node.x, node.y)

        # Get all edges for this floor plan
        edges = db.query(Edge).filter(Edge.floor_plan_id == floor_plan_id).all()

        # Add edges to graph
        for edge in edges:
            # Filter based on preferences
            if preferences.accessible_only and not edge.accessible:
                continue
            if preferences.avoid_stairs and edge.edge_type == "stairs":
                continue

            source_id = str(edge.source_node_id)
            target_id = str(edge.target_node_id)

            # Add edge (NetworkX handles bidirectionality automatically for undirected graphs)
            G.add_edge(
                source_id,
                target_id,
                weight=edge.weight,
                accessible=edge.accessible,
                edge_type=edge.edge_type
            )

        graph_data = (G, node_positions)

        # Cache the graph
        if use_cache:
            cache.set_graph(floor_plan_id_str, preferences_hash, graph_data)
            logger.debug(f"Cached graph for floor plan {floor_plan_id_str}")

        return graph_data

    @staticmethod
    def invalidate_cache(floor_plan_id: UUID) -> int:
        """
        Invalidate all cached graphs for a floor plan.

        Call this when nodes or edges are modified.

        Args:
            floor_plan_id: Floor plan UUID

        Returns:
            Number of cache entries invalidated
        """
        return cache.invalidate_floor_plan(str(floor_plan_id))

    @staticmethod
    def calculate_route(
        db: Session,
        floor_plan_id: UUID,
        start_node_id: UUID,
        end_node_id: UUID,
        preferences: Optional[RoutePreferences] = None
    ) -> RouteResponse:
        """
        Calculate shortest route using A* algorithm.

        Args:
            db: Database session
            floor_plan_id: Floor plan UUID
            start_node_id: Starting node UUID
            end_node_id: Destination node UUID
            preferences: Route calculation preferences

        Returns:
            RouteResponse with path and instructions
        """
        try:
            # Build graph (may use cache)
            G, node_positions = PathfindingService.build_graph(db, floor_plan_id, preferences)

            start_id = str(start_node_id)
            end_id = str(end_node_id)

            # Check if nodes exist in graph
            if start_id not in G:
                return RouteResponse(
                    success=False,
                    floor_plan_id=floor_plan_id,
                    start_node_id=start_node_id,
                    end_node_id=end_node_id,
                    path=[],
                    total_distance=0,
                    estimated_time_seconds=0,
                    coordinates=[],
                    instructions=[],
                    error="Start node not found in navigation graph"
                )

            if end_id not in G:
                return RouteResponse(
                    success=False,
                    floor_plan_id=floor_plan_id,
                    start_node_id=start_node_id,
                    end_node_id=end_node_id,
                    path=[],
                    total_distance=0,
                    estimated_time_seconds=0,
                    coordinates=[],
                    instructions=[],
                    error="End node not found in navigation graph"
                )

            # Heuristic function for A* (Euclidean distance to goal)
            def heuristic(node1, node2):
                x1, y1 = node_positions[node1]
                x2, y2 = node_positions[node2]
                return PathfindingService.calculate_euclidean_distance(x1, y1, x2, y2)

            # Calculate shortest path using A*
            try:
                path = nx.astar_path(G, start_id, end_id, heuristic=heuristic, weight='weight')
            except nx.NetworkXNoPath:
                return RouteResponse(
                    success=False,
                    floor_plan_id=floor_plan_id,
                    start_node_id=start_node_id,
                    end_node_id=end_node_id,
                    path=[],
                    total_distance=0,
                    estimated_time_seconds=0,
                    coordinates=[],
                    instructions=[],
                    error="No path found between start and end nodes"
                )

            # Calculate total distance
            total_distance = nx.astar_path_length(G, start_id, end_id, heuristic=heuristic, weight='weight')

            # Extract coordinates
            coordinates = [
                Coordinate(x=node_positions[node_id][0], y=node_positions[node_id][1])
                for node_id in path
            ]

            # Generate instructions
            instructions = PathfindingService._generate_instructions(G, path, node_positions)

            # Estimate time (assume walking speed of 1.4 m/s or 5 km/h)
            estimated_time = int(total_distance / 1.4)

            # Convert path back to UUIDs
            path_uuids = [UUID(node_id) for node_id in path]

            logger.info(
                f"Route calculated: {len(path)} nodes, {total_distance:.1f} units",
                extra={
                    "floor_plan_id": str(floor_plan_id),
                    "path_length": len(path),
                    "distance": total_distance
                }
            )

            return RouteResponse(
                success=True,
                floor_plan_id=floor_plan_id,
                start_node_id=start_node_id,
                end_node_id=end_node_id,
                path=path_uuids,
                total_distance=round(total_distance, 2),
                estimated_time_seconds=estimated_time,
                coordinates=coordinates,
                instructions=instructions
            )

        except Exception as e:
            logger.error(f"Error calculating route: {e}", exc_info=True)
            return RouteResponse(
                success=False,
                floor_plan_id=floor_plan_id,
                start_node_id=start_node_id,
                end_node_id=end_node_id,
                path=[],
                total_distance=0,
                estimated_time_seconds=0,
                coordinates=[],
                instructions=[],
                error=f"Error calculating route: {str(e)}"
            )

    @staticmethod
    def _generate_instructions(
        G: nx.Graph,
        path: List[str],
        node_positions: dict
    ) -> List[RouteInstruction]:
        """Generate step-by-step navigation instructions."""
        instructions = []
        cumulative_distance = 0

        # Start instruction
        start_node = G.nodes[path[0]]
        start_name = start_node.get('name') or 'Start location'
        instructions.append(
            RouteInstruction(
                step=1,
                action=f"Start at {start_name}",
                distance=0
            )
        )

        # Middle waypoints
        for i in range(len(path) - 1):
            current_id = path[i]
            next_id = path[i + 1]

            # Get edge data
            edge_data = G[current_id][next_id]
            segment_distance = edge_data['weight']
            cumulative_distance += segment_distance

            # Get node info
            next_node = G.nodes[next_id]
            node_type = next_node.get('node_type', 'waypoint')
            node_name = next_node.get('name')

            # Generate action text
            if node_type == 'stairs':
                action = f"Take stairs to {node_name or 'next level'}"
            elif node_type == 'elevator':
                action = f"Take elevator to {node_name or 'next level'}"
            elif node_name:
                action = f"Continue to {node_name}"
            else:
                action = f"Walk straight for {round(segment_distance, 1)} units"

            instructions.append(
                RouteInstruction(
                    step=len(instructions) + 1,
                    action=action,
                    distance=round(cumulative_distance, 2)
                )
            )

        # End instruction
        end_node = G.nodes[path[-1]]
        end_name = end_node.get('name') or 'destination'
        instructions.append(
            RouteInstruction(
                step=len(instructions) + 1,
                action=f"Arrive at {end_name}",
                distance=round(cumulative_distance, 2)
            )
        )

        return instructions
