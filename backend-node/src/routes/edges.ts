/**
 * Edge Routes
 * REST API endpoints for edge management
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dataStore } from '../models/store';
import { Edge, CreateEdgeDTO } from '../types';

const router = Router();

/**
 * GET /api/edges
 * Get all edges, optionally filtered by venue
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { venueId } = req.query;

    if (venueId && typeof venueId === 'string') {
      const edges = await dataStore.getEdgesByVenue(venueId);
      return res.json(edges);
    }

    // Return all edges
    const allVenues = await dataStore.getAllVenues();
    const allEdges: Edge[] = [];
    for (const venue of allVenues) {
      allEdges.push(...await dataStore.getEdgesByVenue(venue.id));
    }

    res.json(allEdges);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch edges' });
  }
});

/**
 * GET /api/edges/:id
 * Get a specific edge by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const edge = await dataStore.getEdge(req.params.id);
    if (!edge) {
      return res.status(404).json({ error: 'Edge not found' });
    }
    res.json(edge);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch edge' });
  }
});

/**
 * POST /api/edges
 * Create a new edge
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const dto: CreateEdgeDTO = req.body;

    // Validation
    if (!dto.venueId || !dto.fromNodeId || !dto.toNodeId || dto.distance === undefined) {
      return res.status(400).json({
        error: 'venueId, fromNodeId, toNodeId, and distance are required',
      });
    }

    if (dto.distance <= 0) {
      return res.status(400).json({
        error: 'distance must be greater than 0',
      });
    }

    if (dto.fromNodeId === dto.toNodeId) {
      return res.status(400).json({
        error: 'fromNodeId and toNodeId cannot be the same',
      });
    }

    // Verify venue exists
    const venue = await dataStore.getVenue(dto.venueId);
    if (!venue) {
      return res.status(404).json({ error: 'Venue not found' });
    }

    // Verify both nodes exist and belong to the venue
    const fromNode = await dataStore.getNode(dto.fromNodeId);
    const toNode = await dataStore.getNode(dto.toNodeId);

    if (!fromNode || !toNode) {
      return res.status(404).json({ error: 'One or both nodes not found' });
    }

    if (fromNode.venueId !== dto.venueId || toNode.venueId !== dto.venueId) {
      return res.status(400).json({
        error: 'Both nodes must belong to the specified venue',
      });
    }

    const edge: Edge = {
      id: uuidv4(),
      venueId: dto.venueId,
      fromNodeId: dto.fromNodeId,
      toNodeId: dto.toNodeId,
      distance: dto.distance,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const created = await dataStore.createEdge(edge);
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create edge' });
  }
});

/**
 * DELETE /api/edges/:id
 * Delete an edge
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await dataStore.deleteEdge(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Edge not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete edge' });
  }
});

/**
 * POST /api/edges/auto-generate/:venueId
 * Automatically generate edges between nearby nodes
 * Uses proximity-based connection with configurable max distance
 */
router.post('/auto-generate/:venueId', async (req: Request, res: Response) => {
  try {
    const { venueId } = req.params;
    const {
      maxDistance = 100,
      kNearest = 4,
      enableDirectPaths = true,  // Enable direct corridor path optimization
      directPathMaxDistance = 500,  // Max distance for direct paths
      gridTolerance = 20  // How close nodes must be to same row/column
    } = req.body;

    // Verify venue exists
    const venue = await dataStore.getVenue(venueId);
    if (!venue) {
      return res.status(404).json({ error: 'Venue not found' });
    }

    // Get all nodes for this venue
    const nodes = await dataStore.getNodesByVenue(venueId);
    if (nodes.length < 2) {
      return res.status(400).json({ error: 'Need at least 2 nodes to generate edges' });
    }

    // Calculate Euclidean distance between two nodes
    const calcDistance = (n1: any, n2: any): number => {
      return Math.sqrt(Math.pow(n2.x - n1.x, 2) + Math.pow(n2.y - n1.y, 2));
    };

    // Get existing edges to avoid duplicates
    const existingEdges = await dataStore.getEdgesByVenue(venueId);
    const edgeSet = new Set<string>();
    existingEdges.forEach(e => {
      edgeSet.add(`${e.fromNodeId}-${e.toNodeId}`);
      edgeSet.add(`${e.toNodeId}-${e.fromNodeId}`);
    });

    const createdEdges: Edge[] = [];

    // Helper to add edge if not duplicate
    const addEdgeIfNew = async (fromNode: any, toNode: any, distance: number): Promise<boolean> => {
      const edgeKey1 = `${fromNode.id}-${toNode.id}`;
      const edgeKey2 = `${toNode.id}-${fromNode.id}`;

      if (edgeSet.has(edgeKey1) || edgeSet.has(edgeKey2)) {
        return false;
      }

      const edge: Edge = {
        id: uuidv4(),
        venueId,
        fromNodeId: fromNode.id,
        toNodeId: toNode.id,
        distance: Math.round(distance * 10) / 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const created = await dataStore.createEdge(edge);
      createdEdges.push(created);
      edgeSet.add(edgeKey1);
      edgeSet.add(edgeKey2);
      return true;
    };

    // PHASE 1: For each node, connect to k nearest neighbors within maxDistance
    for (const node of nodes) {
      const distances: { node: any; distance: number }[] = [];

      for (const other of nodes) {
        if (other.id === node.id) continue;
        const dist = calcDistance(node, other);
        if (dist <= maxDistance) {
          distances.push({ node: other, distance: dist });
        }
      }

      distances.sort((a, b) => a.distance - b.distance);
      const nearest = distances.slice(0, kNearest);

      for (const { node: neighbor, distance } of nearest) {
        await addEdgeIfNew(node, neighbor, distance);
      }
    }

    const phase1Edges = createdEdges.length;

    // PHASE 2: DIRECT CORRIDOR PATH OPTIMIZATION
    let directPathEdges = 0;

    if (enableDirectPaths) {
      // Get only waypoint nodes (not booth nodes) for direct paths
      const waypointNodes = nodes.filter(n => n.type === 'waypoint');

      // Group by approximate row (y coordinate)
      const nodesByRow = new Map<number, any[]>();
      for (const node of waypointNodes) {
        const row = Math.round(node.y / gridTolerance);
        if (!nodesByRow.has(row)) nodesByRow.set(row, []);
        nodesByRow.get(row)!.push(node);
      }

      // Group by approximate column (x coordinate)
      const nodesByCol = new Map<number, any[]>();
      for (const node of waypointNodes) {
        const col = Math.round(node.x / gridTolerance);
        if (!nodesByCol.has(col)) nodesByCol.set(col, []);
        nodesByCol.get(col)!.push(node);
      }

      // Create horizontal direct edges - only connect ADJACENT waypoints in same row
      for (const [, rowNodes] of nodesByRow) {
        if (rowNodes.length < 2) continue;
        rowNodes.sort((a: any, b: any) => a.x - b.x);

        for (let i = 0; i < rowNodes.length - 1; i++) {
          const n1 = rowNodes[i];
          const n2 = rowNodes[i + 1];
          const dist = calcDistance(n1, n2);

          if (dist > maxDistance && dist <= directPathMaxDistance * 0.5) {
            if (await addEdgeIfNew(n1, n2, dist)) {
              directPathEdges++;
            }
          }
        }
      }

      // Create vertical direct edges - only connect ADJACENT waypoints in same column
      for (const [, colNodes] of nodesByCol) {
        if (colNodes.length < 2) continue;
        colNodes.sort((a: any, b: any) => a.y - b.y);

        for (let i = 0; i < colNodes.length - 1; i++) {
          const n1 = colNodes[i];
          const n2 = colNodes[i + 1];
          const dist = calcDistance(n1, n2);

          if (dist > maxDistance && dist <= directPathMaxDistance * 0.5) {
            if (await addEdgeIfNew(n1, n2, dist)) {
              directPathEdges++;
            }
          }
        }
      }
    }

    res.status(201).json({
      success: true,
      message: `Generated ${createdEdges.length} edges (${phase1Edges} nearby + ${directPathEdges} direct paths)`,
      edgesCreated: createdEdges.length,
      nearbyEdges: phase1Edges,
      directPathEdges,
      totalEdges: existingEdges.length + createdEdges.length,
      parameters: { maxDistance, kNearest, enableDirectPaths, directPathMaxDistance, gridTolerance },
    });
  } catch (error: any) {
    console.error('Auto-generate edges error:', error);
    res.status(500).json({ error: 'Failed to auto-generate edges' });
  }
});

export default router;
