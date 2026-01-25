/**
 * Node Routes
 * REST API endpoints for node management
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
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
      const nodes = dataStore.getNodesByVenue(venueId);
      return res.json(nodes);
    }

    // Return all nodes (not recommended for production with large datasets)
    const allVenues = dataStore.getAllVenues();
    const allNodes: Node[] = [];
    allVenues.forEach(venue => {
      allNodes.push(...dataStore.getNodesByVenue(venue.id));
    });

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
    const node = dataStore.getNode(req.params.id);
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
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
router.post('/', async (req: Request, res: Response) => {
  try {
    const dto: CreateNodeDTO = req.body;

    // Validation
    if (!dto.venueId || !dto.name || dto.x === undefined || dto.y === undefined) {
      return res.status(400).json({
        error: 'venueId, name, x, and y are required',
      });
    }

    if (!['entrance', 'booth', 'intersection', 'waypoint'].includes(dto.type)) {
      return res.status(400).json({
        error: 'type must be entrance, booth, intersection, or waypoint',
      });
    }

    // Verify venue exists
    const venue = dataStore.getVenue(dto.venueId);
    if (!venue) {
      return res.status(404).json({ error: 'Venue not found' });
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

    const created = dataStore.createNode(node);
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create node' });
  }
});

/**
 * PUT /api/nodes/:id
 * Update a node
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const updates: Partial<Node> = req.body;

    // Prevent changing venueId
    if (updates.venueId) {
      return res.status(400).json({
        error: 'Cannot change venueId of a node',
      });
    }

    const updated = dataStore.updateNode(req.params.id, updates);
    if (!updated) {
      return res.status(404).json({ error: 'Node not found' });
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
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = dataStore.deleteNode(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Node not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete node' });
  }
});

export default router;
