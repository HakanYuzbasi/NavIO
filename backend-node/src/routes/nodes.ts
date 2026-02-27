/**
 * Node Routes
 * REST API endpoints for node management
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { dataStore } from '../models/store';
import { Node, CreateNodeDTO } from '../types';

const router = Router();

/**
 * GET /api/nodes
 * Get all nodes, optionally filtered by venue
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { venueId } = req.query;

    if (venueId && typeof venueId === 'string') {
      const nodes = await dataStore.getNodesByVenue(venueId);
      res.json(nodes);
      return;
    }

    // Return all nodes (not recommended for production with large datasets)
    const allVenues = await dataStore.getAllVenues();
    const allNodes: Node[] = [];
    for (const venue of allVenues) {
      allNodes.push(...await dataStore.getNodesByVenue(venue.id));
    }

    res.json(allNodes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch nodes' });
  }
});

/**
 * GET /api/nodes/:id
 * Get a specific node by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const node = await dataStore.getNode(req.params.id);
    if (!node) {
      res.status(404).json({ error: 'Node not found' });
      return;
    }
    res.json(node);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch node' });
  }
});

/**
 * POST /api/nodes
 * Create a new node
 */
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const dto: CreateNodeDTO = req.body;

    // Validation
    if (!dto.venueId || !dto.name || dto.x === undefined || dto.y === undefined) {
      res.status(400).json({
        error: 'venueId, name, x, and y are required',
      });
      return;
    }

    if (!['entrance', 'booth', 'intersection', 'waypoint'].includes(dto.type)) {
      res.status(400).json({
        error: 'type must be entrance, booth, intersection, or waypoint',
      });
      return;
    }

    // Verify venue exists
    const venue = await dataStore.getVenue(dto.venueId);
    if (!venue) {
      res.status(404).json({ error: 'Venue not found' });
      return;
    }

    const node: Node = {
      id: uuidv4(),
      venueId: dto.venueId,
      name: dto.name,
      type: dto.type,
      x: dto.x,
      y: dto.y,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const created = await dataStore.createNode(node);
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create node' });
  }
});

/**
 * POST /api/nodes/batch
 * Create multiple nodes at once
 */
router.post('/batch', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const dtos: CreateNodeDTO[] = req.body.nodes;

    if (!Array.isArray(dtos) || dtos.length === 0) {
      res.status(400).json({ error: 'nodes array is required and must not be empty' });
      return;
    }

    const { venueId } = dtos[0];

    // Verify venue exists
    const venue = await dataStore.getVenue(venueId);
    if (!venue) {
      res.status(404).json({ error: 'Venue not found' });
      return;
    }

    const nodes: Node[] = dtos.map(dto => {
      // Basic validation
      if (!dto.venueId || !dto.name || dto.x === undefined || dto.y === undefined) {
        throw new Error('Invalid node data provided in batch');
      }
      return {
        id: (dto as any).id || uuidv4(),
        venueId: dto.venueId,
        name: dto.name,
        type: dto.type,
        x: dto.x,
        y: dto.y,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });

    const created = await dataStore.createNodesBatch(nodes);
    res.status(201).json({ success: true, count: created.length, nodes: created });
  } catch (error: any) {
    console.error('Batch create nodes error:', error);
    res.status(500).json({ error: error.message || 'Failed to create nodes' });
  }
});

/**
 * PUT /api/nodes/:id
 * Update a node
 */
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const updates: Partial<Node> = req.body;

    // Prevent changing venueId
    if (updates.venueId) {
      res.status(400).json({
        error: 'Cannot change venueId of a node',
      });
      return;
    }

    const updated = await dataStore.updateNode(req.params.id, updates);
    if (!updated) {
      res.status(404).json({ error: 'Node not found' });
      return;
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update node' });
  }
});

/**
 * DELETE /api/nodes/:id
 * Delete a node
 */
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const deleted = await dataStore.deleteNode(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Node not found' });
      return;
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete node' });
  }
});

export default router;
