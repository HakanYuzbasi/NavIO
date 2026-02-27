/**
 * QR Routes
 * REST API endpoints for QR code management
 */

import { Router, Request, Response } from 'express';
import { qrService } from '../services/qr';
import { CreateQRMappingDTO } from '../types';

const router = Router();

/**
 * POST /api/qr
 * Create a QR code mapping
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const dto: CreateQRMappingDTO = req.body;

    if (!dto.qrId || !dto.nodeId) {
      res.status(400).json({
        error: 'qrId and nodeId are required',
      });
      return;
    }

    const mapping = await qrService.createQRMapping(dto);
    res.status(201).json(mapping);
  } catch (error: any) {
    if (error.message === 'Node not found') {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error.message === 'QR ID already exists') {
      res.status(409).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Failed to create QR mapping' });
  }
});

/**
 * POST /api/qr/generate/:nodeId
 * Generate a QR code for a specific node
 */
router.post('/generate/:nodeId', async (req: Request, res: Response) => {
  try {
    const { nodeId } = req.params;
    const mapping = await qrService.generateQRForNode(nodeId);
    res.status(201).json(mapping);
  } catch (error: any) {
    if (error.message === 'Node not found') {
      res.status(404).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

/**
 * POST /api/qr/generate-venue/:venueId
 * Generate QR codes for all nodes in a venue
 */
router.post('/generate-venue/:venueId', async (req: Request, res: Response) => {
  try {
    const { venueId } = req.params;
    const mappings = await qrService.generateQRCodesForVenue(venueId);
    res.status(201).json({
      count: mappings.length,
      mappings,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate QR codes for venue' });
  }
});

/**
 * GET /api/qr/:qrId
 * Get QR mapping by QR ID
 */
router.get('/:qrId', async (req: Request, res: Response) => {
  try {
    const { qrId } = req.params;
    const mapping = await qrService.getQRMapping(qrId);

    if (!mapping) {
      res.status(404).json({ error: 'QR mapping not found' });
      return;
    }

    res.json(mapping);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch QR mapping' });
  }
});

/**
 * GET /api/qr/node/:nodeId
 * Get all QR codes for a specific node
 */
router.get('/node/:nodeId', async (req: Request, res: Response) => {
  try {
    const { nodeId } = req.params;
    const mappings = await qrService.getQRMappingsByNode(nodeId);
    res.json(mappings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch QR mappings' });
  }
});

/**
 * DELETE /api/qr/:qrId
 * Delete a QR mapping
 */
router.delete('/:qrId', async (req: Request, res: Response) => {
  try {
    const { qrId } = req.params;
    const deleted = await qrService.deleteQRMapping(qrId);

    if (!deleted) {
      res.status(404).json({ error: 'QR mapping not found' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete QR mapping' });
  }
});

/**
 * GET /api/qr/url/:venueId/:nodeId
 * Generate QR URL for a venue and node
 */
router.get('/url/:venueId/:nodeId', async (req: Request, res: Response) => {
  try {
    const { venueId, nodeId } = req.params;
    const baseUrl = req.query.baseUrl as string || 'http://localhost:3000';

    const url = qrService.generateQRUrl(venueId, nodeId, baseUrl);
    res.json({ url });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate QR URL' });
  }
});

export default router;
