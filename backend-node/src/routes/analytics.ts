/**
 * Analytics Routes
 * Dwell time analytics, overview stats, CSV export, and QR scan webhook
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db/pool';

const router = Router();

/**
 * GET /api/analytics/dwell
 * Dwell time analytics with optional filters
 */
router.get('/dwell', async (req: Request, res: Response) => {
  try {
    const { booth_id, from, to } = req.query;

    let whereClause = "WHERE status = 'done' AND called_at IS NOT NULL AND completed_at IS NOT NULL";
    const params: any[] = [];
    let paramIdx = 1;

    if (booth_id) {
      whereClause += ` AND booth_id = $${paramIdx++}`;
      params.push(booth_id);
    }
    if (from) {
      whereClause += ` AND called_at >= $${paramIdx++}`;
      params.push(from);
    }
    if (to) {
      whereClause += ` AND completed_at <= $${paramIdx++}`;
      params.push(to);
    }

    // Aggregate stats
    const { rows: statsRows } = await pool.query(
      `SELECT
         COUNT(*) as total_visits,
         COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at - called_at))), 0) as avg_dwell_seconds,
         COALESCE(MIN(EXTRACT(EPOCH FROM (completed_at - called_at))), 0) as min_dwell_seconds,
         COALESCE(MAX(EXTRACT(EPOCH FROM (completed_at - called_at))), 0) as max_dwell_seconds
       FROM queue_entries ${whereClause}`,
      params
    );

    // By-hour breakdown
    const { rows: hourlyRows } = await pool.query(
      `SELECT
         EXTRACT(HOUR FROM called_at) as hour,
         COUNT(*) as visit_count,
         AVG(EXTRACT(EPOCH FROM (completed_at - called_at))) as avg_dwell_seconds
       FROM queue_entries ${whereClause}
       GROUP BY EXTRACT(HOUR FROM called_at)
       ORDER BY hour`,
      params
    );

    // Per-booth breakdown
    const { rows: boothRows } = await pool.query(
      `SELECT
         q.booth_id,
         n.name as booth_name,
         COUNT(*) as visit_count,
         AVG(EXTRACT(EPOCH FROM (q.completed_at - q.called_at))) as avg_dwell_seconds
       FROM queue_entries q
       LEFT JOIN nodes n ON q.booth_id = n.id
       ${whereClause.replace(/WHERE/, 'WHERE q.')}
       GROUP BY q.booth_id, n.name
       ORDER BY visit_count DESC`,
      params
    );

    const stats = statsRows[0];

    res.json({
      totalVisits: parseInt(stats.total_visits, 10),
      avgDwellSeconds: Math.round(parseFloat(stats.avg_dwell_seconds)),
      minDwellSeconds: Math.round(parseFloat(stats.min_dwell_seconds)),
      maxDwellSeconds: Math.round(parseFloat(stats.max_dwell_seconds)),
      byHour: hourlyRows.map(r => ({
        hour: parseInt(r.hour, 10),
        visitCount: parseInt(r.visit_count, 10),
        avgDwellSeconds: Math.round(parseFloat(r.avg_dwell_seconds)),
      })),
      byBooth: boothRows.map(r => ({
        boothId: r.booth_id,
        boothName: r.booth_name || 'Unknown',
        visitCount: parseInt(r.visit_count, 10),
        avgDwellSeconds: Math.round(parseFloat(r.avg_dwell_seconds)),
      })),
    });
  } catch (error: any) {
    console.error('Dwell analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch dwell analytics' });
  }
});

/**
 * GET /api/analytics/overview
 * System-wide overview statistics (used by existing AnalyticsDashboard)
 */
router.get('/overview', async (_req: Request, res: Response) => {
  try {
    const [venues, nodes, edges, pois, qr, queueStats] = await Promise.all([
      pool.query('SELECT COUNT(*) as cnt FROM venues'),
      pool.query('SELECT COUNT(*) as cnt FROM nodes'),
      pool.query('SELECT COUNT(*) as cnt FROM edges'),
      pool.query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE type = 'booth') as searchable FROM nodes"),
      pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE true) as active FROM qr_mappings'),
      pool.query("SELECT COUNT(*) as total_visits FROM queue_entries WHERE status = 'done'"),
    ]);

    const totalVenues = parseInt(venues.rows[0].cnt, 10);
    const totalNodes = parseInt(nodes.rows[0].cnt, 10);
    const totalEdges = parseInt(edges.rows[0].cnt, 10);

    res.json({
      timestamp: new Date().toISOString(),
      overview: {
        total_floor_plans: totalVenues,
        total_nodes: totalNodes,
        total_edges: totalEdges,
        total_pois: parseInt(pois.rows[0].total, 10),
        searchable_pois: parseInt(pois.rows[0].searchable, 10),
        avg_nodes_per_floor_plan: totalVenues > 0 ? totalNodes / totalVenues : 0,
        avg_edges_per_floor_plan: totalVenues > 0 ? totalEdges / totalVenues : 0,
      },
      qr_analytics: {
        total_qr_anchors: parseInt(qr.rows[0].total, 10),
        active_qr_anchors: parseInt(qr.rows[0].active, 10),
        total_scans: 0, // scan_events count
        avg_scans_per_anchor: 0,
      },
      queue_analytics: {
        total_visits: parseInt(queueStats.rows[0].total_visits, 10),
      },
      system_health: {
        status: 'operational',
        database_connected: true,
      },
    });
  } catch (error: any) {
    console.error('Overview analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch overview' });
  }
});

/**
 * GET /api/analytics/usage
 * Usage analytics for the existing AnalyticsDashboard
 */
router.get('/usage', async (req: Request, res: Response) => {
  try {
    const days = parseInt((req.query.days as string) || '30', 10);

    const { rows: scanRows } = await pool.query(
      `SELECT COUNT(*) as total FROM scan_events WHERE scanned_at >= NOW() - $1 * INTERVAL '1 day'`,
      [days]
    );

    const { rows: topLocations } = await pool.query(
      `SELECT booth_id as qr_code, COUNT(*) as scan_count, booth_id as floor_plan_id
       FROM scan_events
       WHERE scanned_at >= NOW() - $1 * INTERVAL '1 day'
       GROUP BY booth_id ORDER BY scan_count DESC LIMIT 10`,
      [days]
    );

    res.json({
      period_days: days,
      usage: {
        total_qr_scans: parseInt(scanRows[0].total, 10),
        active_qr_anchors: 0,
        avg_scans_per_day: Math.round(parseInt(scanRows[0].total, 10) / days),
      },
      top_scanned_locations: topLocations.map(r => ({
        qr_code: r.qr_code,
        scan_count: parseInt(r.scan_count, 10),
        floor_plan_id: r.floor_plan_id || '',
      })),
    });
  } catch (error: any) {
    console.error('Usage analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch usage analytics' });
  }
});

/**
 * GET /api/analytics/export/csv
 * Export dwell data as CSV
 */
router.get('/export/csv', async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         q.id, q.booth_id, n.name as booth_name,
         q.visitor_name, q.status,
         q.joined_at, q.called_at, q.completed_at,
         EXTRACT(EPOCH FROM (q.completed_at - q.called_at)) as dwell_seconds
       FROM queue_entries q
       LEFT JOIN nodes n ON q.booth_id = n.id
       WHERE q.status = 'done'
       ORDER BY q.completed_at DESC`
    );

    const header = 'id,booth_id,booth_name,visitor_name,status,joined_at,called_at,completed_at,dwell_seconds\n';
    const csv = header + rows.map(r =>
      [r.id, r.booth_id, `"${r.booth_name || ''}"`, `"${r.visitor_name || ''}"`, r.status,
       r.joined_at, r.called_at, r.completed_at, Math.round(r.dwell_seconds || 0)].join(',')
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=navio_dwell_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error: any) {
    console.error('Export CSV error:', error);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

/**
 * GET /api/analytics/export/json
 * Export analytics data as JSON
 */
router.get('/export/json', async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         q.id, q.booth_id, n.name as booth_name,
         q.visitor_name, q.status,
         q.joined_at, q.called_at, q.completed_at,
         EXTRACT(EPOCH FROM (q.completed_at - q.called_at)) as dwell_seconds
       FROM queue_entries q
       LEFT JOIN nodes n ON q.booth_id = n.id
       WHERE q.status = 'done'
       ORDER BY q.completed_at DESC`
    );

    const data = rows.map(r => ({
      id: r.id,
      boothId: r.booth_id,
      boothName: r.booth_name,
      visitorName: r.visitor_name,
      status: r.status,
      joinedAt: r.joined_at,
      calledAt: r.called_at,
      completedAt: r.completed_at,
      dwellSeconds: Math.round(r.dwell_seconds || 0),
    }));

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=navio_analytics_${new Date().toISOString().split('T')[0]}.json`);
    res.json(data);
  } catch (error: any) {
    console.error('Export JSON error:', error);
    res.status(500).json({ error: 'Failed to export JSON' });
  }
});

/**
 * POST /api/analytics/scan
 * Record a QR scan event (webhook)
 */
router.post('/scan', async (req: Request, res: Response) => {
  try {
    const { visitorId, boothId } = req.body;

    if (!boothId) {
      return res.status(400).json({ error: 'boothId is required' });
    }

    const id = uuidv4();
    await pool.query(
      'INSERT INTO scan_events (id, visitor_id, booth_id) VALUES ($1, $2, $3)',
      [id, visitorId || null, boothId]
    );

    res.status(201).json({ id, recorded: true });
  } catch (error: any) {
    console.error('Scan event error:', error);
    res.status(500).json({ error: 'Failed to record scan event' });
  }
});

export default router;
