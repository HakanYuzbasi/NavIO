/**
 * Queue Service
 * Manages booth visitor queues with PostgreSQL persistence
 */

import { v4 as uuidv4 } from 'uuid';
import pool from '../db/pool';
import { QueueEntry } from '../types';

function toQueueEntry(row: any): QueueEntry {
  return {
    id: row.id,
    boothId: row.booth_id,
    visitorName: row.visitor_name ?? undefined,
    visitorPhone: row.visitor_phone ?? undefined,
    status: row.status,
    position: row.position,
    joinedAt: new Date(row.joined_at),
    calledAt: row.called_at ? new Date(row.called_at) : undefined,
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    dwellSeconds: row.dwell_seconds ?? undefined,
  };
}

const EST_MINUTES_PER_VISITOR = 5;

export class QueueService {
  /**
   * Join a booth queue
   */
  async joinQueue(
    boothId: string,
    visitorName?: string,
    visitorPhone?: string
  ): Promise<{ entry: QueueEntry; position: number; estimatedWaitMinutes: number }> {
    // Get current queue depth to calculate position
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) as cnt FROM queue_entries WHERE booth_id = $1 AND status IN ('waiting', 'active')`,
      [boothId]
    );
    const queueDepth = parseInt(countRows[0].cnt, 10);
    const position = queueDepth + 1;

    const id = uuidv4();
    const { rows } = await pool.query(
      `INSERT INTO queue_entries (id, booth_id, visitor_name, visitor_phone, status, position)
       VALUES ($1, $2, $3, $4, 'waiting', $5) RETURNING *`,
      [id, boothId, visitorName ?? null, visitorPhone ?? null, position]
    );

    const entry = toQueueEntry(rows[0]);
    return {
      entry,
      position,
      estimatedWaitMinutes: position * EST_MINUTES_PER_VISITOR,
    };
  }

  /**
   * Get queue status for a booth
   */
  async getQueueStatus(boothId: string): Promise<{
    queueDepth: number;
    estimatedWaitMinutes: number;
    currentlyServing: QueueEntry | null;
  }> {
    const { rows: waitingRows } = await pool.query(
      `SELECT COUNT(*) as cnt FROM queue_entries WHERE booth_id = $1 AND status = 'waiting'`,
      [boothId]
    );
    const queueDepth = parseInt(waitingRows[0].cnt, 10);

    const { rows: activeRows } = await pool.query(
      `SELECT * FROM queue_entries WHERE booth_id = $1 AND status = 'active' ORDER BY called_at DESC LIMIT 1`,
      [boothId]
    );

    return {
      queueDepth,
      estimatedWaitMinutes: queueDepth * EST_MINUTES_PER_VISITOR,
      currentlyServing: activeRows.length ? toQueueEntry(activeRows[0]) : null,
    };
  }

  /**
   * Call next visitor in the queue
   */
  async callNext(boothId: string): Promise<QueueEntry | null> {
    // Complete any currently active entry first
    await pool.query(
      `UPDATE queue_entries SET status = 'done', completed_at = NOW()
       WHERE booth_id = $1 AND status = 'active'`,
      [boothId]
    );

    // Get next waiting entry
    const { rows } = await pool.query(
      `UPDATE queue_entries SET status = 'active', called_at = NOW()
       WHERE id = (
         SELECT id FROM queue_entries
         WHERE booth_id = $1 AND status = 'waiting'
         ORDER BY position ASC LIMIT 1
       ) RETURNING *`,
      [boothId]
    );

    return rows.length ? toQueueEntry(rows[0]) : null;
  }

  /**
   * Complete current active visit
   */
  async completeVisit(boothId: string): Promise<QueueEntry | null> {
    const { rows } = await pool.query(
      `UPDATE queue_entries SET status = 'done', completed_at = NOW()
       WHERE booth_id = $1 AND status = 'active'
       RETURNING *`,
      [boothId]
    );

    if (!rows.length) return null;

    const entry = toQueueEntry(rows[0]);
    // Calculate dwell seconds manually (since we removed the GENERATED column for simplicity)
    if (entry.calledAt && entry.completedAt) {
      entry.dwellSeconds = Math.round((entry.completedAt.getTime() - entry.calledAt.getTime()) / 1000);
    }
    return entry;
  }

  /**
   * Get all entries for a booth (waiting + active)
   */
  async getQueueEntries(boothId: string): Promise<QueueEntry[]> {
    const { rows } = await pool.query(
      `SELECT * FROM queue_entries
       WHERE booth_id = $1 AND status IN ('waiting', 'active')
       ORDER BY position ASC`,
      [boothId]
    );
    return rows.map(toQueueEntry);
  }

  /**
   * Get a specific entry by ID (for position polling)
   */
  async getEntry(entryId: string): Promise<QueueEntry | null> {
    const { rows } = await pool.query(
      `SELECT * FROM queue_entries WHERE id = $1`,
      [entryId]
    );
    return rows.length ? toQueueEntry(rows[0]) : null;
  }

  /**
   * Get position of a specific entry in the queue
   */
  async getPosition(entryId: string): Promise<number | null> {
    const entry = await this.getEntry(entryId);
    if (!entry || entry.status !== 'waiting') return null;

    const { rows } = await pool.query(
      `SELECT COUNT(*) as cnt FROM queue_entries
       WHERE booth_id = $1 AND status = 'waiting' AND position <= $2`,
      [entry.boothId, entry.position]
    );
    return parseInt(rows[0].cnt, 10);
  }
}

export const queueService = new QueueService();
