/**
 * Venue Routes
 * REST API endpoints for venue management
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { dataStore } from '../models/store';
import { Venue, CreateVenueDTO, Node, Edge } from '../types';
import { generateNavigationGraph } from '../services/accurateDetector';

/**
 * Get image dimensions from a file path or URL
 */
async function getImageDimensions(imageUrl: string): Promise<{ width: number; height: number } | null> {
  try {
    let imagePath: string;

    // Convert URL to file path
    if (imageUrl.startsWith('/demo/')) {
      imagePath = path.join(process.cwd(), '../backend/public', imageUrl);
    } else if (imageUrl.startsWith('/uploads/')) {
      imagePath = path.join(process.cwd(), imageUrl);
    } else if (imageUrl.startsWith('/')) {
      imagePath = imageUrl;
    } else {
      return null;
    }

    if (!fs.existsSync(imagePath)) {
      console.log(`Image not found: ${imagePath}`);
      return null;
    }

    const metadata = await sharp(imagePath).metadata();
    return {
      width: metadata.width || 1000,
      height: metadata.height || 800,
    };
  } catch (error) {
    console.error('Failed to get image dimensions:', error);
    return null;
  }
}

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
 * Auto-detects image dimensions if mapImageUrl is provided
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const dto: CreateVenueDTO = req.body;

    if (!dto.name || dto.name.trim().length === 0) {
      return res.status(400).json({ error: 'Venue name is required' });
    }

    // Auto-detect image dimensions if mapImageUrl is provided
    let width = dto.width || 1000;
    let height = dto.height || 800;

    if (dto.mapImageUrl) {
      const dimensions = await getImageDimensions(dto.mapImageUrl);
      if (dimensions) {
        width = dimensions.width;
        height = dimensions.height;
        console.log(`Auto-detected dimensions: ${width}x${height} for ${dto.mapImageUrl}`);
      }
    }

    const venue: Venue = {
      id: uuidv4(),
      name: dto.name,
      mapImageUrl: dto.mapImageUrl,
      width,
      height,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const created = dataStore.createVenue(venue);
    res.status(201).json(created);
  } catch (error) {
    console.error('Create venue error:', error);
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

/**
 * POST /api/venues/:id/import-navigation-graph
 * Import a navigation graph from a floor plan image into a venue
 * This creates all nodes (booths + waypoints) and edges for pathfinding
 */
router.post('/:id/import-navigation-graph', async (req: Request, res: Response) => {
  try {
    const venueId = req.params.id;
    const { imagePath, gridSpacing = 15 } = req.body;

    // Verify venue exists
    const venue = dataStore.getVenue(venueId);
    if (!venue) {
      return res.status(404).json({ error: 'Venue not found' });
    }

    // Resolve image path
    let resolvedImagePath: string;
    if (imagePath) {
      resolvedImagePath = imagePath;
    } else if (venue.mapImageUrl) {
      if (venue.mapImageUrl.startsWith('/demo/')) {
        resolvedImagePath = path.join(process.cwd(), '../backend/public', venue.mapImageUrl);
      } else if (venue.mapImageUrl.startsWith('/uploads/')) {
        resolvedImagePath = path.join(process.cwd(), venue.mapImageUrl);
      } else {
        resolvedImagePath = venue.mapImageUrl;
      }
    } else {
      return res.status(400).json({ error: 'No image path provided and venue has no mapImageUrl' });
    }

    if (!fs.existsSync(resolvedImagePath)) {
      return res.status(404).json({ error: `Image not found: ${resolvedImagePath}` });
    }

    console.log(`Importing navigation graph for venue ${venueId} from ${resolvedImagePath}`);

    // Generate navigation graph
    const navGraph = await generateNavigationGraph(resolvedImagePath, gridSpacing);

    // Clear existing nodes and edges for this venue
    const existingNodes = dataStore.getNodesByVenue(venueId);
    for (const node of existingNodes) {
      dataStore.deleteNode(node.id);
    }

    // Map from navigation graph node IDs to datastore node IDs
    const nodeIdMap = new Map<number, string>();

    // Create nodes
    for (const navNode of navGraph.nodes) {
      const nodeId = uuidv4();
      const node: Node = {
        id: nodeId,
        venueId,
        name: navNode.boothName || (navNode.type === 'booth' ? `Booth ${navNode.boothId}` : `Waypoint ${navNode.id}`),
        type: navNode.type as 'booth' | 'waypoint' | 'entrance' | 'intersection',
        x: navNode.x,
        y: navNode.y,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      dataStore.createNode(node);
      nodeIdMap.set(navNode.id, nodeId);
    }

    // Create edges
    for (const navEdge of navGraph.edges) {
      const fromNodeId = nodeIdMap.get(navEdge.fromId);
      const toNodeId = nodeIdMap.get(navEdge.toId);

      if (fromNodeId && toNodeId) {
        const edge: Edge = {
          id: uuidv4(),
          venueId,
          fromNodeId,
          toNodeId,
          distance: navEdge.distance,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        dataStore.createEdge(edge);
      }
    }

    const boothCount = navGraph.nodes.filter(n => n.type === 'booth').length;
    const waypointCount = navGraph.nodes.filter(n => n.type === 'waypoint').length;

    console.log(`Imported ${boothCount} booths, ${waypointCount} waypoints, ${navGraph.edges.length} edges`);

    return res.status(200).json({
      success: true,
      imported: {
        booths: boothCount,
        waypoints: waypointCount,
        edges: navGraph.edges.length,
        totalNodes: navGraph.nodes.length,
      },
      venueId,
    });
  } catch (error: any) {
    console.error('Import navigation graph error:', error);
    res.status(500).json({
      error: 'Failed to import navigation graph',
      details: error.message,
    });
  }
});

export default router;
