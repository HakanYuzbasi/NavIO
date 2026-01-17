/**
 * A* Pathfinding Algorithm Implementation
 * Production-ready routing service for indoor navigation
 */

import { Node, Edge, Graph, GraphNode, RouteResponse } from '../types';
import { dataStore } from '../models/store';

interface PriorityQueueItem {
  nodeId: string;
  priority: number;
}

class PriorityQueue {
  private items: PriorityQueueItem[] = [];

  enqueue(nodeId: string, priority: number): void {
    const item = { nodeId, priority };
    let added = false;

    for (let i = 0; i < this.items.length; i++) {
      if (priority < this.items[i].priority) {
        this.items.splice(i, 0, item);
        added = true;
        break;
      }
    }

    if (!added) {
      this.items.push(item);
    }
  }

  dequeue(): PriorityQueueItem | undefined {
    return this.items.shift();
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }
}

export class PathfindingService {
  /**
   * Calculate Euclidean distance between two nodes (heuristic for A*)
   */
  private calculateHeuristic(node1: Node, node2: Node): number {
    const dx = node1.x - node2.x;
    const dy = node1.y - node2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Build a graph structure from venue nodes and edges
   */
  private buildGraph(venueId: string): Graph {
    const nodes = dataStore.getNodesByVenue(venueId);
    const edges = dataStore.getEdgesByVenue(venueId);

    const graph: Graph = {
      nodes: new Map(),
      edges: new Map(),
    };

    // Initialize all nodes
    nodes.forEach(node => {
      graph.nodes.set(node.id, {
        id: node.id,
        x: node.x,
        y: node.y,
        neighbors: [],
      });
      graph.edges.set(node.id, []);
    });

    // Build adjacency list
    edges.forEach(edge => {
      const fromNode = graph.nodes.get(edge.fromNodeId);
      const toNode = graph.nodes.get(edge.toNodeId);

      if (fromNode && toNode) {
        // Undirected graph - add edge in both directions
        fromNode.neighbors.push({
          nodeId: edge.toNodeId,
          distance: edge.distance,
        });

        toNode.neighbors.push({
          nodeId: edge.fromNodeId,
          distance: edge.distance,
        });

        // Store edges for both nodes
        const fromEdges = graph.edges.get(edge.fromNodeId) || [];
        fromEdges.push(edge);
        graph.edges.set(edge.fromNodeId, fromEdges);

        const toEdges = graph.edges.get(edge.toNodeId) || [];
        toEdges.push({ ...edge, fromNodeId: edge.toNodeId, toNodeId: edge.fromNodeId });
        graph.edges.set(edge.toNodeId, toEdges);
      }
    });

    return graph;
  }

  /**
   * Reconstruct the path from start to end using the came-from map
   */
  private reconstructPath(
    cameFrom: Map<string, string>,
    currentId: string,
    nodes: Map<string, Node>
  ): Node[] {
    const path: Node[] = [];
    let current: string | undefined = currentId;

    while (current) {
      const node = nodes.get(current);
      if (node) {
        path.unshift(node);
      }
      current = cameFrom.get(current);
    }

    return path;
  }

  /**
   * A* Algorithm Implementation
   * Finds the shortest path between two nodes in a graph
   *
   * @param venueId - The venue containing the nodes
   * @param startNodeId - Starting node ID
   * @param endNodeId - Destination node ID
   * @returns RouteResponse with path and distance, or null if no path exists
   */
  async findPath(
    venueId: string,
    startNodeId: string,
    endNodeId: string
  ): Promise<RouteResponse | null> {
    // Validate inputs
    const startNode = dataStore.getNode(startNodeId);
    const endNode = dataStore.getNode(endNodeId);

    if (!startNode || !endNode) {
      throw new Error('Start or end node not found');
    }

    if (startNode.venueId !== venueId || endNode.venueId !== venueId) {
      throw new Error('Nodes do not belong to the specified venue');
    }

    if (startNodeId === endNodeId) {
      return {
        path: [startNode],
        totalDistance: 0,
        estimatedTimeSeconds: 0,
      };
    }

    // Build the graph
    const graph = this.buildGraph(venueId);

    // Initialize data structures for A*
    const openSet = new PriorityQueue();
    const cameFrom = new Map<string, string>();
    const gScore = new Map<string, number>(); // Cost from start to node
    const fScore = new Map<string, number>(); // gScore + heuristic

    // Initialize scores
    gScore.set(startNodeId, 0);
    fScore.set(startNodeId, this.calculateHeuristic(startNode, endNode));
    openSet.enqueue(startNodeId, fScore.get(startNodeId)!);

    const allNodes = new Map<string, Node>();
    dataStore.getNodesByVenue(venueId).forEach(node => {
      allNodes.set(node.id, node);
    });

    // A* main loop
    while (!openSet.isEmpty()) {
      const current = openSet.dequeue();
      if (!current) break;

      // Found the destination
      if (current.nodeId === endNodeId) {
        const path = this.reconstructPath(cameFrom, endNodeId, allNodes);
        const totalDistance = gScore.get(endNodeId) || 0;

        return {
          path,
          totalDistance,
          estimatedTimeSeconds: this.estimateWalkingTime(totalDistance),
        };
      }

      const currentGraphNode = graph.nodes.get(current.nodeId);
      if (!currentGraphNode) continue;

      // Explore neighbors
      for (const neighbor of currentGraphNode.neighbors) {
        const tentativeGScore = (gScore.get(current.nodeId) || Infinity) + neighbor.distance;

        if (tentativeGScore < (gScore.get(neighbor.nodeId) || Infinity)) {
          // This path to neighbor is better than any previous one
          cameFrom.set(neighbor.nodeId, current.nodeId);
          gScore.set(neighbor.nodeId, tentativeGScore);

          const neighborNode = allNodes.get(neighbor.nodeId);
          if (neighborNode) {
            const h = this.calculateHeuristic(neighborNode, endNode);
            const f = tentativeGScore + h;
            fScore.set(neighbor.nodeId, f);
            openSet.enqueue(neighbor.nodeId, f);
          }
        }
      }
    }

    // No path found
    return null;
  }

  /**
   * Estimate walking time based on distance
   * Assumes average walking speed of 1.4 m/s (5 km/h)
   *
   * @param distance - Distance in pixels/units
   * @returns Estimated time in seconds
   */
  private estimateWalkingTime(distance: number): number {
    // Assuming 1 unit = 1 meter for this calculation
    // Adjust the conversion factor based on your coordinate system
    const WALKING_SPEED = 1.4; // meters per second
    const CONVERSION_FACTOR = 1.0; // adjust based on your map scale

    const distanceInMeters = distance * CONVERSION_FACTOR;
    return Math.round(distanceInMeters / WALKING_SPEED);
  }

  /**
   * Find all reachable nodes from a starting node
   * Useful for debugging and validation
   *
   * @param venueId - The venue ID
   * @param startNodeId - Starting node ID
   * @returns Array of reachable node IDs
   */
  async findReachableNodes(venueId: string, startNodeId: string): Promise<string[]> {
    const graph = this.buildGraph(venueId);
    const visited = new Set<string>();
    const queue: string[] = [startNodeId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;

      visited.add(current);
      const currentNode = graph.nodes.get(current);

      if (currentNode) {
        currentNode.neighbors.forEach(neighbor => {
          if (!visited.has(neighbor.nodeId)) {
            queue.push(neighbor.nodeId);
          }
        });
      }
    }

    return Array.from(visited);
  }

  /**
   * Validate graph connectivity
   * Ensures all nodes can reach all other nodes
   *
   * @param venueId - The venue ID
   * @returns Validation result with disconnected components
   */
  async validateGraph(venueId: string): Promise<{
    isFullyConnected: boolean;
    components: string[][];
  }> {
    const nodes = dataStore.getNodesByVenue(venueId);
    const unvisited = new Set(nodes.map(n => n.id));
    const components: string[][] = [];

    while (unvisited.size > 0) {
      const startNode = Array.from(unvisited)[0];
      const reachable = await this.findReachableNodes(venueId, startNode);
      components.push(reachable);

      reachable.forEach(nodeId => unvisited.delete(nodeId));
    }

    return {
      isFullyConnected: components.length <= 1,
      components,
    };
  }
}

export const pathfindingService = new PathfindingService();
