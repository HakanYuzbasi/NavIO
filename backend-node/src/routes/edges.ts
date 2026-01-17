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
      const edges = dataStore.getEdgesByVenue(venueId);
      return res.json(edges);
    }

    // Return all edges
    const allVenues = dataStore.getAllVenues();
    const allEdges: Edge[] = [];
    allVenues.forEach(venue => {
      allEdges.push(...dataStore.getEdgesByVenue(venue.id));
    });

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
    const edge = dataStore.getEdge(req.params.id);
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
    const venue = dataStore.getVenue(dto.venueId);
    if (!venue) {
      return res.status(404).json({ error: 'Venue not found' });
    }

    // Verify both nodes exist and belong to the venue
    const fromNode = dataStore.getNode(dto.fromNodeId);
    const toNode = dataStore.getNode(dto.toNodeId);

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

    const created = dataStore.createEdge(edge);
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
    const deleted = dataStore.deleteEdge(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Edge not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete edge' });
  }
});

export default router;
