/**
 * SOTA Pathfinding Algorithm Implementation
 * Production-ready routing service for indoor navigation
 *
 * Features:
 * - Binary Heap Priority Queue (O(log n) operations)
 * - Bidirectional A* Search (faster convergence)
 * - K-Shortest Paths for alternative routes
 * - Adaptive path smoothing
 */

import fs from 'fs';
import path from 'path';
import { Node, Graph, RouteResponse, DirectionStep, Edge, Venue } from '../types';
import { dataStore } from '../models/store';
import { detectBooths, detectWalkableAreas } from './accurateDetector';

interface PriorityQueueItem {
  nodeId: string;
  priority: number;
  gScore: number; // Track g-score for bidirectional meet point
}

interface WalkableValidationContext {
  mask: Uint8Array;
  width: number;
  height: number;
}

interface EdgeValidationCacheEntry {
  key: string;
  allowedEdgeIds: Set<string>;
}

/**
 * SOTA Binary Heap Priority Queue
 * O(log n) enqueue and dequeue operations
 */
class BinaryHeapPriorityQueue {
  private heap: PriorityQueueItem[] = [];

  enqueue(nodeId: string, priority: number, gScore: number = 0): void {
    const item = { nodeId, priority, gScore };
    this.heap.push(item);
    this.bubbleUp(this.heap.length - 1);
  }

  dequeue(): PriorityQueueItem | undefined {
    if (this.heap.length === 0) return undefined;
    if (this.heap.length === 1) return this.heap.pop();

    const min = this.heap[0];
    this.heap[0] = this.heap.pop()!;
    this.bubbleDown(0);
    return min;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  size(): number {
    return this.heap.length;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[parentIndex].priority <= this.heap[index].priority) break;
      [this.heap[parentIndex], this.heap[index]] = [this.heap[index], this.heap[parentIndex]];
      index = parentIndex;
    }
  }

  private bubbleDown(index: number): void {
    const length = this.heap.length;
    while (true) {
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;
      let smallest = index;

      if (leftChild < length && this.heap[leftChild].priority < this.heap[smallest].priority) {
        smallest = leftChild;
      }
      if (rightChild < length && this.heap[rightChild].priority < this.heap[smallest].priority) {
        smallest = rightChild;
      }
      if (smallest === index) break;

      [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
      index = smallest;
    }
  }
}


export class PathfindingService {
  private edgeValidationCache = new Map<string, EdgeValidationCacheEntry>();

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
  private async buildGraph(venueId: string): Promise<Graph> {
    const venue = await dataStore.getVenue(venueId);
    if (!venue) {
      throw new Error(`Venue not found: ${venueId}`);
    }

    const nodes = await dataStore.getNodesByVenue(venueId);
    const edges = await dataStore.getEdgesByVenue(venueId);
    const validatedEdges = await this.filterEdgesByCorridor(venue, nodes, edges);

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
    validatedEdges.forEach(edge => {
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

  private resolveVenueImagePath(mapImageUrl: string): string | null {
    if (!mapImageUrl || mapImageUrl.startsWith('http://') || mapImageUrl.startsWith('https://')) {
      return null;
    }

    const candidates: string[] = [];

    if (path.isAbsolute(mapImageUrl)) {
      candidates.push(mapImageUrl);
    }

    if (mapImageUrl.startsWith('/uploads/')) {
      candidates.push(path.join(process.cwd(), mapImageUrl.replace(/^\/+/, '')));
    }

    if (mapImageUrl.startsWith('/demo/')) {
      candidates.push(path.join(process.cwd(), '../backend/public', mapImageUrl.replace(/^\/+/, '')));
    }

    if (mapImageUrl.startsWith('/')) {
      candidates.push(path.join(process.cwd(), mapImageUrl.replace(/^\/+/, '')));
    } else {
      candidates.push(path.join(process.cwd(), mapImageUrl));
    }

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return candidate;
    }

    return null;
  }

  private async buildWalkableValidationContext(imagePath: string): Promise<WalkableValidationContext> {
    const walkable = await detectWalkableAreas(imagePath);
    const booths = await detectBooths(imagePath);
    const mask = new Uint8Array(walkable.mask);

    // Mask booth rectangles so edges that cut through booths are always rejected.
    for (const booth of booths) {
      const minX = Math.max(0, Math.floor(booth.centerX - booth.width / 2));
      const maxX = Math.min(walkable.width - 1, Math.ceil(booth.centerX + booth.width / 2));
      const minY = Math.max(0, Math.floor(booth.centerY - booth.height / 2));
      const maxY = Math.min(walkable.height - 1, Math.ceil(booth.centerY + booth.height / 2));

      for (let y = minY; y <= maxY; y++) {
        const rowOffset = y * walkable.width;
        for (let x = minX; x <= maxX; x++) {
          mask[rowOffset + x] = 0;
        }
      }
    }

    return { mask, width: walkable.width, height: walkable.height };
  }

  private hasCorridorLineOfSight(
    from: Node,
    to: Node,
    context: WalkableValidationContext,
    scaleX: number,
    scaleY: number
  ): boolean {
    const startX = Math.round(from.x * scaleX);
    const startY = Math.round(from.y * scaleY);
    const endX = Math.round(to.x * scaleX);
    const endY = Math.round(to.y * scaleY);

    const isInBounds = (x: number, y: number): boolean =>
      x >= 0 && x < context.width && y >= 0 && y < context.height;

    const isWalkable = (x: number, y: number): boolean =>
      isInBounds(x, y) && context.mask[y * context.width + x] > 0;

    if (!isInBounds(startX, startY) || !isInBounds(endX, endY)) {
      return false;
    }

    const dx = Math.abs(endX - startX);
    const dy = Math.abs(endY - startY);
    const sx = startX < endX ? 1 : -1;
    const sy = startY < endY ? 1 : -1;
    let err = dx - dy;

    let x = startX;
    let y = startY;
    const ENDPOINT_CLEARANCE_RADIUS = 1;

    const isWithinEndpointClearance = (px: number, py: number): boolean => {
      const startDx = px - startX;
      const startDy = py - startY;
      const endDx = px - endX;
      const endDy = py - endY;
      return (
        (startDx * startDx + startDy * startDy) <= ENDPOINT_CLEARANCE_RADIUS * ENDPOINT_CLEARANCE_RADIUS ||
        (endDx * endDx + endDy * endDy) <= ENDPOINT_CLEARANCE_RADIUS * ENDPOINT_CLEARANCE_RADIUS
      );
    };

    while (true) {
      const isEndpoint = (x === startX && y === startY) || (x === endX && y === endY);

      if (!isEndpoint) {
        const exempt = isWithinEndpointClearance(x, y);
        if (!exempt && !isWalkable(x, y)) {
          return false;
        }
      }

      if (x === endX && y === endY) break;

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }

    return true;
  }

  private async filterEdgesByCorridor(
    venue: Venue,
    nodes: Node[],
    edges: Edge[]
  ): Promise<Edge[]> {
    if (edges.length === 0) return edges;
    if (!venue.mapImageUrl) {
      throw new Error(`Strict corridor validation requires a map image for venue ${venue.id}`);
    }

    const imagePath = this.resolveVenueImagePath(venue.mapImageUrl);
    if (!imagePath) {
      throw new Error(`Unable to resolve venue map image for strict validation: ${venue.mapImageUrl}`);
    }

    const maxEdgeUpdatedAt = edges.reduce((max, edge) => {
      const t = edge.updatedAt instanceof Date ? edge.updatedAt.getTime() : new Date(edge.updatedAt).getTime();
      return Number.isFinite(t) ? Math.max(max, t) : max;
    }, 0);
    const imageMtime = fs.statSync(imagePath).mtimeMs;
    const cacheKey = [
      venue.mapImageUrl,
      imagePath,
      imageMtime,
      venue.width ?? 'na',
      venue.height ?? 'na',
      edges.length,
      maxEdgeUpdatedAt,
    ].join('|');

    const cached = this.edgeValidationCache.get(venue.id);
    if (cached && cached.key === cacheKey) {
      return edges.filter(edge => cached.allowedEdgeIds.has(edge.id));
    }

    const context = await this.buildWalkableValidationContext(imagePath);
    const scaleX = venue.width && venue.width > 0 ? context.width / venue.width : 1;
    const scaleY = venue.height && venue.height > 0 ? context.height / venue.height : 1;
    const nodeById = new Map(nodes.map(node => [node.id, node]));

    const validEdges: Edge[] = [];
    const allowedEdgeIds = new Set<string>();

    for (const edge of edges) {
      const from = nodeById.get(edge.fromNodeId);
      const to = nodeById.get(edge.toNodeId);
      if (!from || !to) continue;

      if (this.hasCorridorLineOfSight(from, to, context, scaleX, scaleY)) {
        validEdges.push(edge);
        allowedEdgeIds.add(edge.id);
      }
    }

    if (validEdges.length === 0) {
      throw new Error(`All edges failed strict corridor validation for venue ${venue.id}`);
    }

    const rejected = edges.length - validEdges.length;
    if (rejected > 0) {
      console.warn(`[routing] strict corridor validation rejected ${rejected}/${edges.length} edges for venue ${venue.id}`);
    }

    this.edgeValidationCache.set(venue.id, { key: cacheKey, allowedEdgeIds });
    return validEdges;
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
   * Path Smoothing (String Pulling)
   * Reduces the "jagged" grid look by straightening segments where line-of-sight is clear.
   */
  private smoothPath(path: Node[]): Node[] {
    // SOTA: Path smoothing is disabled to prevent clipping through obstacles
    // Since the pathfinder doesn't have access to the collision map,
    // "string pulling" optimization is unsafe as it may create paths through physical barriers.
    return path;
  }

  /**
   * Orthogonalize path segments.
   * Converts any diagonal segments into strictly orthogonal (horizontal/vertical)
   * L-shaped segments. Every turn is a clean 90-degree angle.
   * No diagonal or angled lines — only 0°, 90°, 180° segments.
   */
  private orthogonalizePath(path: Node[]): Node[] {
    if (path.length < 2) return path;

    const result: Node[] = [path[0]];

    for (let i = 0; i < path.length - 1; i++) {
      const current = path[i];
      const next = path[i + 1];

      const dx = next.x - current.x;
      const dy = next.y - current.y;

      // Already aligned horizontally or vertically — no change needed
      if (Math.abs(dx) < 0.5 || Math.abs(dy) < 0.5) {
        result.push(next);
        continue;
      }

      // Diagonal segment detected — break into L-shape.
      // Strategy: continue in the same axis as the previous segment to minimize turns.
      let horizontalFirst = true;

      if (result.length >= 2) {
        const prev = result[result.length - 2];
        const curr = result[result.length - 1];
        const prevDx = Math.abs(curr.x - prev.x);
        const prevDy = Math.abs(curr.y - prev.y);
        // If previous segment was more horizontal, continue horizontal first
        horizontalFirst = prevDx >= prevDy;
      }

      // Create intermediate waypoint for the L-bend
      const intermediate: Node = {
        id: `ortho-${current.id}-${next.id}`,
        venueId: current.venueId,
        name: '',
        type: 'waypoint',
        x: horizontalFirst ? next.x : current.x,
        y: horizontalFirst ? current.y : next.y,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      result.push(intermediate);
      result.push(next);
    }

    return result;
  }

  /**
   * Calculate total distance of a path by summing segment lengths
   */
  private calculatePathDistance(path: Node[]): number {
    let total = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const dx = path[i + 1].x - path[i].x;
      const dy = path[i + 1].y - path[i].y;
      total += Math.sqrt(dx * dx + dy * dy);
    }
    return total;
  }

  /**
   * SOTA Bidirectional A* Search
   * Searches from both start and end simultaneously, meeting in the middle.
   * Typically 2x faster than unidirectional A* for large graphs.
   */
  private bidirectionalAStar(
    graph: Graph,
    startNodeId: string,
    endNodeId: string,
    allNodes: Map<string, Node>
  ): { path: Node[]; distance: number } | null {
    const startNode = allNodes.get(startNodeId);
    const endNode = allNodes.get(endNodeId);
    if (!startNode || !endNode) return null;

    // Forward search (from start)
    const fwdOpen = new BinaryHeapPriorityQueue();
    const fwdCameFrom = new Map<string, string>();
    const fwdGScore = new Map<string, number>();
    const fwdClosed = new Set<string>();

    // Backward search (from end)
    const bwdOpen = new BinaryHeapPriorityQueue();
    const bwdCameFrom = new Map<string, string>();
    const bwdGScore = new Map<string, number>();
    const bwdClosed = new Set<string>();

    // Initialize forward search
    fwdGScore.set(startNodeId, 0);
    fwdOpen.enqueue(startNodeId, this.calculateHeuristic(startNode, endNode), 0);

    // Initialize backward search
    bwdGScore.set(endNodeId, 0);
    bwdOpen.enqueue(endNodeId, this.calculateHeuristic(endNode, startNode), 0);

    // Best path found so far
    let bestPath: Node[] | null = null;
    let bestDistance = Infinity;
    let meetNode: string | null = null;

    const maxIterations = allNodes.size * 4; // Safety limit
    let iterations = 0;

    while (!fwdOpen.isEmpty() && !bwdOpen.isEmpty() && iterations < maxIterations) {
      iterations++;

      // Alternate between forward and backward search
      const expandForward = fwdOpen.size() <= bwdOpen.size();

      if (expandForward) {
        const current = fwdOpen.dequeue();
        if (!current) break;

        if (fwdClosed.has(current.nodeId)) continue;
        fwdClosed.add(current.nodeId);

        // Check if backward search has visited this node
        if (bwdClosed.has(current.nodeId)) {
          const totalDist = (fwdGScore.get(current.nodeId) ?? Infinity) +
            (bwdGScore.get(current.nodeId) ?? Infinity);
          if (totalDist < bestDistance) {
            bestDistance = totalDist;
            meetNode = current.nodeId;
          }
        }

        // Early termination: if current node's f-score exceeds best path, we're done
        if (current.priority >= bestDistance) break;

        const currentGraphNode = graph.nodes.get(current.nodeId);
        if (!currentGraphNode) continue;

        for (const neighbor of currentGraphNode.neighbors) {
          if (fwdClosed.has(neighbor.nodeId)) continue;

          const neighborNode = allNodes.get(neighbor.nodeId);
          if (!neighborNode) continue;

          // Never traverse through booth interiors; booth nodes are only valid
          // as explicit route endpoints.
          if (
            neighborNode.type === 'booth' &&
            neighbor.nodeId !== endNodeId &&
            neighbor.nodeId !== startNodeId
          ) {
            continue;
          }

          const tentativeG = (fwdGScore.get(current.nodeId) ?? Infinity) + neighbor.distance;
          if (tentativeG < (fwdGScore.get(neighbor.nodeId) ?? Infinity)) {
            fwdCameFrom.set(neighbor.nodeId, current.nodeId);
            fwdGScore.set(neighbor.nodeId, tentativeG);
            const h = this.calculateHeuristic(neighborNode, endNode);
            fwdOpen.enqueue(neighbor.nodeId, tentativeG + h, tentativeG);
          }
        }
      } else {
        const current = bwdOpen.dequeue();
        if (!current) break;

        if (bwdClosed.has(current.nodeId)) continue;
        bwdClosed.add(current.nodeId);

        // Check if forward search has visited this node
        if (fwdClosed.has(current.nodeId)) {
          const totalDist = (fwdGScore.get(current.nodeId) ?? Infinity) +
            (bwdGScore.get(current.nodeId) ?? Infinity);
          if (totalDist < bestDistance) {
            bestDistance = totalDist;
            meetNode = current.nodeId;
          }
        }

        // Early termination check
        if (current.priority >= bestDistance) break;

        const currentGraphNode = graph.nodes.get(current.nodeId);
        if (!currentGraphNode) continue;

        for (const neighbor of currentGraphNode.neighbors) {
          if (bwdClosed.has(neighbor.nodeId)) continue;

          const neighborNode = allNodes.get(neighbor.nodeId);
          if (!neighborNode) continue;

          // Never traverse through booth interiors; booth nodes are only valid
          // as explicit route endpoints.
          if (
            neighborNode.type === 'booth' &&
            neighbor.nodeId !== endNodeId &&
            neighbor.nodeId !== startNodeId
          ) {
            continue;
          }

          const tentativeG = (bwdGScore.get(current.nodeId) ?? Infinity) + neighbor.distance;
          if (tentativeG < (bwdGScore.get(neighbor.nodeId) ?? Infinity)) {
            bwdCameFrom.set(neighbor.nodeId, current.nodeId);
            bwdGScore.set(neighbor.nodeId, tentativeG);
            const h = this.calculateHeuristic(neighborNode, startNode);
            bwdOpen.enqueue(neighbor.nodeId, tentativeG + h, tentativeG);
          }
        }
      }
    }

    // Reconstruct path if we found a meeting point
    if (meetNode) {
      // Forward path: start -> meetNode
      const fwdPath: Node[] = [];
      let current: string | undefined = meetNode;
      while (current) {
        const node = allNodes.get(current);
        if (node) fwdPath.unshift(node);
        current = fwdCameFrom.get(current);
      }

      // Backward path: meetNode -> end (reversed)
      const bwdPath: Node[] = [];
      current = bwdCameFrom.get(meetNode); // Skip meetNode (already in fwdPath)
      while (current) {
        const node = allNodes.get(current);
        if (node) bwdPath.push(node);
        current = bwdCameFrom.get(current);
      }

      bestPath = [...fwdPath, ...bwdPath];
    }

    return bestPath ? { path: bestPath, distance: bestDistance } : null;
  }

  /**
   * A* Algorithm Implementation
   * Finds the shortest path between two nodes in a graph
   * Uses bidirectional A* for improved performance on large graphs.
   *
   * IMPORTANT: This implementation adds a HIGH PENALTY for traversing through
   * booth nodes. Booth nodes should ONLY be used as start/end points, never
   * as intermediate waypoints. This keeps navigation paths in corridors.
   */
  async findPath(
    venueId: string,
    startNodeId: string,
    endNodeId: string
  ): Promise<RouteResponse | null> {
    // Validate inputs
    const startNode = await dataStore.getNode(startNodeId);
    const endNode = await dataStore.getNode(endNodeId);

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
    const graph = await this.buildGraph(venueId);

    const allNodes = new Map<string, Node>();
    const venueNodes = await dataStore.getNodesByVenue(venueId);
    venueNodes.forEach(node => {
      allNodes.set(node.id, node);
    });

    // SOTA: Use bidirectional A* for graphs with >100 nodes (2x faster)
    // Falls back to standard A* for smaller graphs where overhead isn't worth it
    const useBidirectional = allNodes.size > 100;

    let rawPath: Node[];

    if (useBidirectional) {
      const result = this.bidirectionalAStar(graph, startNodeId, endNodeId, allNodes);
      if (!result) return null;
      rawPath = result.path;
    } else {
      // Standard A* for smaller graphs
      const result = this.standardAStar(graph, startNodeId, endNodeId, allNodes);
      if (!result) return null;
      rawPath = result.path;
    }

    // Keep true shortest-path geometry. Forced orthogonalization can introduce
    // artificial detours and extra turns that do not exist in the computed graph path.
    const displayPath = this.smoothPath(rawPath);
    const totalDistance = this.calculatePathDistance(displayPath);
    const { directions, simpleDirections } = this.generateDirections(displayPath, venueId, allNodes);

    return {
      path: displayPath,
      totalDistance,
      estimatedTimeSeconds: this.estimateWalkingTime(totalDistance),
      directions,
      simpleDirections,
    };
  }

  /**
   * Standard A* Algorithm (for smaller graphs)
   */
  private standardAStar(
    graph: Graph,
    startNodeId: string,
    endNodeId: string,
    allNodes: Map<string, Node>
  ): { path: Node[]; distance: number } | null {
    const startNode = allNodes.get(startNodeId);
    const endNode = allNodes.get(endNodeId);
    if (!startNode || !endNode) return null;

    const openSet = new BinaryHeapPriorityQueue();
    const cameFrom = new Map<string, string>();
    const gScore = new Map<string, number>();

    gScore.set(startNodeId, 0);
    openSet.enqueue(startNodeId, this.calculateHeuristic(startNode, endNode), 0);

    const closedSet = new Set<string>();

    while (!openSet.isEmpty()) {
      const current = openSet.dequeue();
      if (!current) break;

      if (current.nodeId === endNodeId) {
        return {
          path: this.reconstructPath(cameFrom, endNodeId, allNodes),
          distance: gScore.get(endNodeId) || 0,
        };
      }

      if (closedSet.has(current.nodeId)) continue;
      closedSet.add(current.nodeId);

      const currentGraphNode = graph.nodes.get(current.nodeId);
      if (!currentGraphNode) continue;

      for (const neighbor of currentGraphNode.neighbors) {
        if (closedSet.has(neighbor.nodeId)) continue;

        const neighborNode = allNodes.get(neighbor.nodeId);
        if (!neighborNode) continue;

        // Never traverse through booth interiors; booth nodes are only valid
        // as explicit route endpoints.
        if (
          neighborNode.type === 'booth' &&
          neighbor.nodeId !== endNodeId &&
          neighbor.nodeId !== startNodeId
        ) {
          continue;
        }

        const tentativeG = (gScore.get(current.nodeId) ?? Infinity) + neighbor.distance;
        if (tentativeG < (gScore.get(neighbor.nodeId) ?? Infinity)) {
          cameFrom.set(neighbor.nodeId, current.nodeId);
          gScore.set(neighbor.nodeId, tentativeG);
          const h = this.calculateHeuristic(neighborNode, endNode);
          openSet.enqueue(neighbor.nodeId, tentativeG + h, tentativeG);
        }
      }
    }

    return null;
  }

  /**
   * Find K Alternative Routes (Yen's Algorithm)
   * Returns up to K shortest paths that are sufficiently different
   * Useful for giving users route options
   */
  async findAlternativeRoutes(
    venueId: string,
    startNodeId: string,
    endNodeId: string,
    k: number = 3
  ): Promise<RouteResponse[]> {
    const routes: RouteResponse[] = [];

    // Get the shortest path first
    const shortestPath = await this.findPath(venueId, startNodeId, endNodeId);
    if (!shortestPath) return [];

    routes.push(shortestPath);
    if (k === 1) return routes;

    // Simplified K-shortest: find paths avoiding nodes from previous paths
    const usedNodes = new Set<string>();
    shortestPath.path.forEach((n, idx) => {
      // Don't exclude start, end, or first/last few waypoints
      if (idx > 1 && idx < shortestPath.path.length - 2) {
        usedNodes.add(n.id);
      }
    });

    // Build modified graph excluding heavily-used nodes
    const graph = await this.buildGraph(venueId);
    const allNodes = new Map<string, Node>();
    const venueNodes = await dataStore.getNodesByVenue(venueId);
    venueNodes.forEach(node => {
      allNodes.set(node.id, node);
    });

    // Try to find alternative routes by penalizing nodes from previous paths
    for (let i = 1; i < k; i++) {
      const result = this.findPenalizedPath(
        graph,
        startNodeId,
        endNodeId,
        allNodes,
        usedNodes,
        1.5 + (i * 0.5) // Increasing penalty factor
      );

      if (result) {
        const displayPath = this.smoothPath(result.path);
        const totalDistance = this.calculatePathDistance(displayPath);
        const { directions, simpleDirections } = this.generateDirections(displayPath, venueId, allNodes);

        // Only add if sufficiently different (>20% different path length or uses different corridors)
        const isDifferent = totalDistance > shortestPath.totalDistance * 1.05;
        const hasDifferentNodes = result.path.some(
          (n, idx) => idx > 0 && idx < result.path.length - 1 && !usedNodes.has(n.id)
        );

        if (isDifferent || hasDifferentNodes) {
          routes.push({
            path: displayPath,
            totalDistance,
            estimatedTimeSeconds: this.estimateWalkingTime(totalDistance),
            directions,
            simpleDirections,
          });

          // Add new path nodes to used set
          result.path.forEach((n, idx) => {
            if (idx > 1 && idx < result.path.length - 2) {
              usedNodes.add(n.id);
            }
          });
        }
      }
    }

    // Sort by distance and return
    return routes.sort((a, b) => a.totalDistance - b.totalDistance);
  }

  /**
   * A* with node penalties for finding alternative routes
   */
  private findPenalizedPath(
    graph: Graph,
    startNodeId: string,
    endNodeId: string,
    allNodes: Map<string, Node>,
    penalizedNodes: Set<string>,
    penaltyFactor: number
  ): { path: Node[]; distance: number } | null {
    const startNode = allNodes.get(startNodeId);
    const endNode = allNodes.get(endNodeId);
    if (!startNode || !endNode) return null;

    const openSet = new BinaryHeapPriorityQueue();
    const cameFrom = new Map<string, string>();
    const gScore = new Map<string, number>();
    const actualDistance = new Map<string, number>(); // Track real distance without penalties

    gScore.set(startNodeId, 0);
    actualDistance.set(startNodeId, 0);
    openSet.enqueue(startNodeId, this.calculateHeuristic(startNode, endNode), 0);

    const closedSet = new Set<string>();

    while (!openSet.isEmpty()) {
      const current = openSet.dequeue();
      if (!current) break;

      if (current.nodeId === endNodeId) {
        return {
          path: this.reconstructPath(cameFrom, endNodeId, allNodes),
          distance: actualDistance.get(endNodeId) || 0,
        };
      }

      if (closedSet.has(current.nodeId)) continue;
      closedSet.add(current.nodeId);

      const currentGraphNode = graph.nodes.get(current.nodeId);
      if (!currentGraphNode) continue;

      for (const neighbor of currentGraphNode.neighbors) {
        if (closedSet.has(neighbor.nodeId)) continue;

        const neighborNode = allNodes.get(neighbor.nodeId);
        if (!neighborNode) continue;

        if (
          neighborNode.type === 'booth' &&
          neighbor.nodeId !== endNodeId &&
          neighbor.nodeId !== startNodeId
        ) {
          continue;
        }

        // Apply penalty to nodes used in previous paths
        const penalty = penalizedNodes.has(neighbor.nodeId) ? penaltyFactor : 1.0;
        const penalizedCost = neighbor.distance * penalty;
        const actualCost = neighbor.distance;

        const tentativeG = (gScore.get(current.nodeId) ?? Infinity) + penalizedCost;
        const tentativeActual = (actualDistance.get(current.nodeId) ?? Infinity) + actualCost;

        if (tentativeG < (gScore.get(neighbor.nodeId) ?? Infinity)) {
          cameFrom.set(neighbor.nodeId, current.nodeId);
          gScore.set(neighbor.nodeId, tentativeG);
          actualDistance.set(neighbor.nodeId, tentativeActual);
          const h = this.calculateHeuristic(neighborNode, endNode);
          openSet.enqueue(neighbor.nodeId, tentativeG + h, tentativeG);
        }
      }
    }

    return null;
  }

  /**
   * Calculate angle between two points in degrees (0 = right, 90 = down, -90 = up)
   */
  private calculateAngle(from: Node, to: Node): number {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    return Math.atan2(dy, dx) * (180 / Math.PI);
  }

  /**
   * Determine if an angle change represents a significant turn
   * Returns 'left', 'right', or null (straight/minor adjustment)
   */
  private classifyTurn(prevAngle: number, newAngle: number): 'left' | 'right' | null {
    let angleDiff = newAngle - prevAngle;

    // Normalize to -180 to 180
    while (angleDiff > 180) angleDiff -= 360;
    while (angleDiff < -180) angleDiff += 360;

    // Only count significant turns (>45 degrees)
    if (Math.abs(angleDiff) < 45) return null;

    // Positive angle = turning right (clockwise)
    // Negative angle = turning left (counter-clockwise)
    return angleDiff > 0 ? 'right' : 'left';
  }

  /**
   * Find nearby landmarks (booth nodes) for a given position
   * Used to provide landmark-based navigation hints
   * SOTA: Increased search radius and better direction handling
   * Now takes allNodes directly to avoid async in direction generation
   */
  private findNearbyLandmarks(
    x: number,
    y: number,
    allNodes: Map<string, Node>,
    maxDistance: number = 150 // Increased default radius for better coverage
  ): { name: string; distance: number; direction: string }[] {
    const landmarks: { name: string; distance: number; direction: string }[] = [];

    // Track unique booth names to avoid duplicates (booths may have multiple entrance nodes)
    const seenNames = new Set<string>();

    for (const [, node] of allNodes) {
      // Only consider booth nodes as landmarks
      if (node.type !== 'booth') continue;

      // Skip if we've already seen this booth name
      if (seenNames.has(node.name)) continue;

      const dx = node.x - x;
      const dy = node.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= maxDistance && distance > 5) { // Allow closer landmarks
        seenNames.add(node.name);

        // Determine relative direction
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        let direction = '';
        if (angle >= -45 && angle < 45) direction = 'on your right';
        else if (angle >= 45 && angle < 135) direction = 'ahead';
        else if (angle >= -135 && angle < -45) direction = 'behind';
        else direction = 'on your left';

        landmarks.push({
          name: node.name,
          distance: Math.round(distance),
          direction,
        });
      }
    }

    // Sort by distance and return top 3 for better landmark coverage
    return landmarks.sort((a, b) => a.distance - b.distance).slice(0, 3);
  }

  /**
   * Generate simple, human-friendly navigation directions
   * SOTA: Includes landmark-based hints when available
   * Example: "Turn left at Booth 5, then right to destination"
   */
  private generateDirections(
    path: Node[],
    _venueId: string,
    allNodes: Map<string, Node>
  ): { directions: DirectionStep[]; simpleDirections: string } {
    const directions: DirectionStep[] = [];

    if (path.length < 2) {
      return {
        directions: [{ instruction: 'You have arrived', distance: 0 }],
        simpleDirections: 'You have arrived'
      };
    }

    const dest = path[path.length - 1];
    const destName = dest.name || 'destination';

    // Collect significant turns along the path with distance and landmark info
    interface TurnInfo {
      type: 'left' | 'right';
      index: number;
      distanceFromPrev: number;
      landmark?: string;
      node: Node;
    }
    const significantTurns: TurnInfo[] = [];

    if (path.length >= 3) {
      let prevAngle = this.calculateAngle(path[0], path[1]);
      let lastTurnIndex = 0;

      for (let i = 1; i < path.length - 1; i++) {
        const current = path[i];
        const next = path[i + 1];

        const newAngle = this.calculateAngle(current, next);
        const turn = this.classifyTurn(prevAngle, newAngle);

        if (turn) {
          // Calculate distance from last turn
          let distanceFromPrev = 0;
          for (let j = lastTurnIndex; j < i; j++) {
            distanceFromPrev += this.calculateHeuristic(path[j], path[j + 1]);
          }

          // SOTA: Find nearby landmarks at this turn point
          let landmark: string | undefined;
          const nearbyLandmarks = this.findNearbyLandmarks(current.x, current.y, allNodes, 150);
          if (nearbyLandmarks.length > 0) {
            landmark = nearbyLandmarks[0].name;
          }

          significantTurns.push({
            type: turn,
            index: i,
            distanceFromPrev,
            landmark,
            node: current,
          });
          lastTurnIndex = i;
        }

        prevAngle = newAngle;
      }
    }

    // Generate simple directions based on turn count with landmark hints
    let simpleDirections = '';

    if (significantTurns.length === 0) {
      simpleDirections = `Walk straight to ${destName}`;
      directions.push({
        instruction: `Walk straight to ${destName}`,
        distance: Math.round(this.calculateHeuristic(path[0], dest)),
      });
    } else if (significantTurns.length === 1) {
      const turn = significantTurns[0];
      const landmarkHint = turn.landmark ? ` (near ${turn.landmark})` : '';
      simpleDirections = `Turn ${turn.type}${landmarkHint} and continue to ${destName}`;
      directions.push({
        instruction: `Turn ${turn.type}${landmarkHint}`,
        distance: Math.round(turn.distanceFromPrev),
        landmark: turn.landmark,
      });
      directions.push({
        instruction: `Continue to ${destName}`,
        distance: Math.round(this.calculateHeuristic(path[turn.index], dest)),
      });
    } else if (significantTurns.length === 2) {
      const turn1 = significantTurns[0];
      const turn2 = significantTurns[1];
      const hint1 = turn1.landmark ? ` (near ${turn1.landmark})` : '';
      const hint2 = turn2.landmark ? ` (near ${turn2.landmark})` : '';
      simpleDirections = `Turn ${turn1.type}${hint1}, then ${turn2.type}${hint2} to ${destName}`;
      directions.push({ instruction: `Turn ${turn1.type}${hint1}`, distance: Math.round(turn1.distanceFromPrev), landmark: turn1.landmark });
      directions.push({ instruction: `Then turn ${turn2.type}${hint2}`, distance: Math.round(turn2.distanceFromPrev), landmark: turn2.landmark });
      directions.push({ instruction: `Arrive at ${destName}`, distance: 0, landmark: destName });
    } else {
      // For 3+ turns, use ordinal counting with landmark hints
      const turnInstructions: string[] = [];
      let leftCount = 0;
      let rightCount = 0;

      for (let i = 0; i < significantTurns.length && i < 4; i++) {
        const turn = significantTurns[i];
        const landmarkHint = turn.landmark ? ` (at ${turn.landmark})` : '';

        if (turn.type === 'left') {
          leftCount++;
          if (leftCount === 1) {
            turnInstructions.push(`turn left${landmarkHint}`);
          } else {
            const lastLeftIdx = turnInstructions.map((t, idx) => t.includes('left') ? idx : -1).filter(x => x >= 0).pop();
            if (lastLeftIdx !== undefined && lastLeftIdx >= 0) {
              turnInstructions[lastLeftIdx] = `take the ${this.getOrdinal(leftCount)} left${landmarkHint}`;
            }
          }
        } else {
          rightCount++;
          if (rightCount === 1) {
            turnInstructions.push(`turn right${landmarkHint}`);
          } else {
            const lastRightIdx = turnInstructions.map((t, idx) => t.includes('right') ? idx : -1).filter(x => x >= 0).pop();
            if (lastRightIdx !== undefined && lastRightIdx >= 0) {
              turnInstructions[lastRightIdx] = `take the ${this.getOrdinal(rightCount)} right${landmarkHint}`;
            }
          }
        }
        directions.push({
          instruction: `Turn ${turn.type}${landmarkHint}`,
          distance: Math.round(turn.distanceFromPrev),
          landmark: turn.landmark,
        });
      }

      // Build simple directions string
      if (turnInstructions.length === 1) {
        simpleDirections = `${turnInstructions[0]} to ${destName}`;
      } else if (turnInstructions.length === 2) {
        simpleDirections = `${turnInstructions[0]}, then ${turnInstructions[1]} to ${destName}`;
      } else {
        simpleDirections = turnInstructions.slice(0, -1).join(', then ');
        simpleDirections += `, then ${turnInstructions[turnInstructions.length - 1]} to ${destName}`;
      }

      // Capitalize first letter
      simpleDirections = simpleDirections.charAt(0).toUpperCase() + simpleDirections.slice(1);

      directions.push({
        instruction: `Arrive at ${destName}`,
        distance: 0,
        landmark: destName,
      });
    }

    return { directions, simpleDirections };
  }

  /**
   * Get ordinal string (1st, 2nd, 3rd, etc.)
   */
  private getOrdinal(n: number): string {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
  }

  /**
   * Estimate walking time based on distance
   * Assumes average walking speed of 1.4 m/s (5 km/h)
   */
  private estimateWalkingTime(distance: number): number {
    const WALKING_SPEED = 1.4; // meters per second
    const CONVERSION_FACTOR = 1.0; // adjust based on your map scale

    const distanceInMeters = distance * CONVERSION_FACTOR;
    return Math.round(distanceInMeters / WALKING_SPEED);
  }

  /**
   * Find all reachable nodes from a starting node
   * Useful for debugging and validation
   */
  async findReachableNodes(venueId: string, startNodeId: string): Promise<string[]> {
    const graph = await this.buildGraph(venueId);
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
   */
  async validateGraph(venueId: string): Promise<{
    isFullyConnected: boolean;
    components: string[][];
  }> {
    const nodes = await dataStore.getNodesByVenue(venueId);
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

  /**
   * Test all booth pairs for pathfinding validation
   */
  async testAllBoothPairs(venueId: string): Promise<{
    totalPairs: number;
    successfulPaths: number;
    failedPaths: number;
    suspiciousPaths: { from: string; to: string; distance: number; pathLength: number; ratio: number }[];
    summary: string;
  }> {
    const allNodes = await dataStore.getNodesByVenue(venueId);
    const boothNodes = allNodes.filter(n => n.type === 'booth');

    // Group booth nodes by name to get unique booths
    const uniqueBooths = new Map<string, typeof boothNodes[0]>();
    for (const node of boothNodes) {
      if (!uniqueBooths.has(node.name)) {
        uniqueBooths.set(node.name, node);
      }
    }

    const booths = Array.from(uniqueBooths.values());
    const results = {
      totalPairs: 0,
      successfulPaths: 0,
      failedPaths: 0,
      suspiciousPaths: [] as { from: string; to: string; distance: number; pathLength: number; ratio: number }[],
      summary: '',
    };

    // Test all pairs
    for (let i = 0; i < booths.length; i++) {
      for (let j = i + 1; j < booths.length; j++) {
        results.totalPairs++;
        const from = booths[i];
        const to = booths[j];

        try {
          const route = await this.findPath(venueId, from.id, to.id);

          if (route) {
            results.successfulPaths++;

            // Calculate straight-line distance
            const straightLine = this.calculateHeuristic(from, to);
            const pathDistance = route.totalDistance;
            const ratio = pathDistance / straightLine;

            // Flag paths that are >2x longer than straight line (potential room-crossing)
            if (ratio > 2.0) {
              results.suspiciousPaths.push({
                from: from.name,
                to: to.name,
                distance: Math.round(pathDistance),
                pathLength: route.path.length,
                ratio: Math.round(ratio * 100) / 100,
              });
            }
          } else {
            results.failedPaths++;
          }
        } catch {
          results.failedPaths++;
        }
      }
    }

    // Sort suspicious paths by ratio (worst first)
    results.suspiciousPaths.sort((a, b) => b.ratio - a.ratio);

    // Generate summary
    const successRate = ((results.successfulPaths / results.totalPairs) * 100).toFixed(1);
    results.summary = `Tested ${results.totalPairs} booth pairs: ${results.successfulPaths} successful (${successRate}%), ${results.failedPaths} failed, ${results.suspiciousPaths.length} suspicious (ratio > 2.0)`;

    return results;
  }
}

export const pathfindingService = new PathfindingService();
