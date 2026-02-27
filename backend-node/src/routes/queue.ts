/**
 * Queue Routes
 * REST API endpoints for booth queue management
 */

import { Router, Request, Response } from 'express';
import { queueService } from '../services/queue';

const router = Router();

/**
 * POST /api/queue/:boothId/join
 * Join a booth queue
 */
router.post('/:boothId/join', async (req: Request, res: Response) => {
  try {
    const { boothId } = req.params;
    const { visitorName, visitorPhone } = req.body;

    const result = await queueService.joinQueue(boothId, visitorName, visitorPhone);
    res.status(201).json(result);
  } catch (error: any) {
    console.error('Join queue error:', error);
    res.status(500).json({ error: 'Failed to join queue' });
  }
});

/**
 * GET /api/queue/:boothId/status
 * Get queue status for a booth
 */
router.get('/:boothId/status', async (req: Request, res: Response) => {
  try {
    const { boothId } = req.params;
    const status = await queueService.getQueueStatus(boothId);
    res.json(status);
  } catch (error: any) {
    console.error('Queue status error:', error);
    res.status(500).json({ error: 'Failed to get queue status' });
  }
});

/**
 * GET /api/queue/:boothId/entries
 * Get all queue entries for a booth
 */
router.get('/:boothId/entries', async (req: Request, res: Response) => {
  try {
    const { boothId } = req.params;
    const entries = await queueService.getQueueEntries(boothId);
    res.json(entries);
  } catch (error: any) {
    console.error('Queue entries error:', error);
    res.status(500).json({ error: 'Failed to get queue entries' });
  }
});

/**
 * POST /api/queue/:boothId/next
 * Call next visitor in queue
 */
router.post('/:boothId/next', async (req: Request, res: Response) => {
  try {
    const { boothId } = req.params;
    const entry = await queueService.callNext(boothId);

    if (!entry) {
      res.json({ message: 'No visitors waiting in queue' });
      return;
    }

    res.json(entry);
  } catch (error: any) {
    console.error('Call next error:', error);
    res.status(500).json({ error: 'Failed to call next visitor' });
  }
});

/**
 * POST /api/queue/:boothId/complete
 * Complete current active visit
 */
router.post('/:boothId/complete', async (req: Request, res: Response) => {
  try {
    const { boothId } = req.params;
    const entry = await queueService.completeVisit(boothId);

    if (!entry) {
      res.json({ message: 'No active visit to complete' });
      return;
    }

    res.json(entry);
  } catch (error: any) {
    console.error('Complete visit error:', error);
    res.status(500).json({ error: 'Failed to complete visit' });
  }
});

/**
 * GET /api/queue/entry/:entryId
 * Get a specific queue entry (for visitor polling)
 */
router.get('/entry/:entryId', async (req: Request, res: Response) => {
  try {
    const { entryId } = req.params;
    const entry = await queueService.getEntry(entryId);

    if (!entry) {
      res.status(404).json({ error: 'Queue entry not found' });
      return;
    }

    const position = await queueService.getPosition(entryId);
    res.json({ ...entry, currentPosition: position });
  } catch (error: any) {
    console.error('Get entry error:', error);
    res.status(500).json({ error: 'Failed to get queue entry' });
  }
});

export default router;
