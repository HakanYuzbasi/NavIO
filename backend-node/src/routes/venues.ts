/**
 * Venue Routes
 * REST API endpoints for venue management
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dataStore } from '../models/store';
import { Venue, CreateVenueDTO } from '../types';

const router = Router();

/**
 * GET /api/venues
 * Get all venues
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const venues = dataStore.getAllVenues();
    res.json(venues);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch venues' });
  }
});

/**
 * GET /api/venues/:id
 * Get a specific venue by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const venue = dataStore.getVenue(req.params.id);
    if (!venue) {
      return res.status(404).json({ error: 'Venue not found' });
    }
    res.json(venue);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch venue' });
  }
});

/**
 * POST /api/venues
 * Create a new venue
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const dto: CreateVenueDTO = req.body;

    if (!dto.name || dto.name.trim().length === 0) {
      return res.status(400).json({ error: 'Venue name is required' });
    }

    const venue: Venue = {
      id: uuidv4(),
      name: dto.name,
      mapImageUrl: dto.mapImageUrl,
      width: dto.width,
      height: dto.height,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const created = dataStore.createVenue(venue);
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create venue' });
  }
});

/**
 * PUT /api/venues/:id
 * Update a venue
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const updates: Partial<CreateVenueDTO> = req.body;
    const updated = dataStore.updateVenue(req.params.id, updates);

    if (!updated) {
      return res.status(404).json({ error: 'Venue not found' });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update venue' });
  }
});

/**
 * DELETE /api/venues/:id
 * Delete a venue and all associated data
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = dataStore.deleteVenue(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Venue not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete venue' });
  }
});

export default router;
