/**
 * Routing Routes
 * REST API endpoints for pathfinding and navigation
 */

import { Router, Request, Response } from 'express';
import { pathfindingService } from '../services/pathfinding';
import { RouteRequest } from '../types';

const router = Router();

/**
 * POST /api/route
 * Calculate shortest path between two nodes
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const request: RouteRequest = req.body;

    // Validation
    if (!request.venueId || !request.startNodeId || !request.endNodeId) {
      return res.status(400).json({
        error: 'venueId, startNodeId, and endNodeId are required',
      });
    }

    const route = await pathfindingService.findPath(
      request.venueId,
      request.startNodeId,
      request.endNodeId
    );

    if (!route) {
      return res.status(404).json({
        error: 'No path found between the specified nodes',
      });
    }

    res.json(route);
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to calculate route' });
  }
});

/**
 * GET /api/route/validate/:venueId
 * Validate graph connectivity for a venue
 */
router.get('/validate/:venueId', async (req: Request, res: Response) => {
  try {
    const { venueId } = req.params;
    const validation = await pathfindingService.validateGraph(venueId);
    res.json(validation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to validate graph' });
  }
});

/**
 * GET /api/route/reachable/:venueId/:nodeId
 * Get all nodes reachable from a starting node
 */
router.get('/reachable/:venueId/:nodeId', async (req: Request, res: Response) => {
  try {
    const { venueId, nodeId } = req.params;
    const reachable = await pathfindingService.findReachableNodes(venueId, nodeId);
    res.json({ reachableNodes: reachable });
  } catch (error) {
    res.status(500).json({ error: 'Failed to find reachable nodes' });
  }
});

export default router;
