"""
Pathfinding service using NetworkX for calculating optimal routes.
"""
import math
from typing import List, Tuple, Optional
from uuid import UUID
import networkx as nx
from sqlalchemy.orm import Session

from app.models import Node, Edge
from app.schemas import RouteResponse, RoutePreferences, Coordinate, RouteInstruction


class PathfindingService:
    """Service for calculating routes using A* algorithm."""

    @staticmethod
    def calculate_euclidean_distance(x1: float, y1: float, x2: float, y2: float) -> float:
        """Calculate Euclidean distance between two points."""
        return math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)

    @staticmethod
    def build_graph(
        db: Session,
        floor_plan_id: UUID,
        preferences: Optional[RoutePreferences] = None
    ) -> Tuple[nx.Graph, dict]:
        """
        Build NetworkX graph from database nodes and edges.

        Args:
            db: Database session
            floor_plan_id: Floor plan UUID
            preferences: Route calculation preferences

        Returns:
            Tuple of (graph, node_positions_dict)
        """
        if preferences is None:
            preferences = RoutePreferences()

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

        return G, node_positions

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
            # Build graph
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
            # This is a rough estimate - adjust based on your scale
            estimated_time = int(total_distance / 1.4)

            # Convert path back to UUIDs
            path_uuids = [UUID(node_id) for node_id in path]

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
