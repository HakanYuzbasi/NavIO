/**
 * PostgreSQL Data Store
 * Async wrapper around pg queries — same public API as the old in-memory store
 */

import pool from '../db/pool';
import { Venue, Node, Edge, QRMapping } from '../types';

/** Map a snake_case row to a camelCase Venue */
function toVenue(row: any): Venue {
  return {
    id: row.id,
    orgId: row.org_id,
    name: row.name,
    mapImageUrl: row.map_image_url ?? undefined,
    width: row.width ?? undefined,
    height: row.height ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/** Map a snake_case row to a camelCase Node */
function toNode(row: any): Node {
  return {
    id: row.id,
    venueId: row.venue_id,
    name: row.name,
    type: row.type,
    x: row.x,
    y: row.y,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/** Map a snake_case row to a camelCase Edge */
function toEdge(row: any): Edge {
  return {
    id: row.id,
    venueId: row.venue_id,
    fromNodeId: row.from_node_id,
    toNodeId: row.to_node_id,
    distance: row.distance,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/** Map a snake_case row to a camelCase QRMapping */
function toQRMapping(row: any): QRMapping {
  return {
    qrId: row.qr_id,
    nodeId: row.node_id,
    createdAt: new Date(row.created_at),
  };
}

class DataStore {
  // ─── Venue Operations ───

  async createVenue(venue: Venue): Promise<Venue> {
    const { rows } = await pool.query(
      `INSERT INTO venues (id, org_id, name, map_image_url, width, height, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [venue.id, venue.orgId, venue.name, venue.mapImageUrl ?? null, venue.width ?? null, venue.height ?? null, venue.createdAt, venue.updatedAt]
    );
    return toVenue(rows[0]);
  }

  async getVenue(id: string): Promise<Venue | undefined> {
    const { rows } = await pool.query('SELECT * FROM venues WHERE id = $1', [id]);
    return rows.length ? toVenue(rows[0]) : undefined;
  }

  async getAllVenues(): Promise<Venue[]> {
    const { rows } = await pool.query('SELECT * FROM venues ORDER BY created_at');
    return rows.map(toVenue);
  }

  async updateVenue(id: string, updates: Partial<Venue>): Promise<Venue | undefined> {
    const venue = await this.getVenue(id);
    if (!venue) return undefined;

    const merged = { ...venue, ...updates, updatedAt: new Date() };
    const { rows } = await pool.query(
      `UPDATE venues SET name=$1, map_image_url=$2, width=$3, height=$4, updated_at=$5
       WHERE id=$6 RETURNING *`,
      [merged.name, merged.mapImageUrl ?? null, merged.width ?? null, merged.height ?? null, merged.updatedAt, id]
    );
    return rows.length ? toVenue(rows[0]) : undefined;
  }

  async deleteVenue(id: string): Promise<boolean> {
    const { rowCount } = await pool.query('DELETE FROM venues WHERE id = $1', [id]);
    return (rowCount ?? 0) > 0;
  }

  // ─── Node Operations ───
  async createNode(node: Node): Promise<Node> {
    const { rows } = await pool.query(
      `INSERT INTO nodes (id, venue_id, name, type, x, y, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [node.id, node.venueId, node.name, node.type, node.x, node.y, node.createdAt, node.updatedAt]
    );
    return toNode(rows[0]);
  }

  async createNodesBatch(nodes: Node[]): Promise<Node[]> {
    if (nodes.length === 0) return [];

    const values = nodes.map(n => `('${n.id}', '${n.venueId}', '${n.name.replace(/'/g, "''")}', '${n.type}', ${n.x}, ${n.y}, '${n.createdAt.toISOString()}', '${n.updatedAt.toISOString()}')`).join(', ');

    // WARNING: For absolute SQL safety with user names, parameterization is much safer. Let's do a parameterized bulk insert.
    let paramIndex = 1;
    const valueParams: string[] = [];
    const flatValues: any[] = [];

    for (const node of nodes) {
      valueParams.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
      flatValues.push(node.id, node.venueId, node.name, node.type, node.x, node.y, node.createdAt, node.updatedAt);
    }

    const { rows } = await pool.query(
      `INSERT INTO nodes (id, venue_id, name, type, x, y, created_at, updated_at)
       VALUES ${valueParams.join(', ')} RETURNING *`,
      flatValues
    );
    return rows.map(toNode);
  }

  async getNode(id: string): Promise<Node | undefined> {
    const { rows } = await pool.query('SELECT * FROM nodes WHERE id = $1', [id]);
    return rows.length ? toNode(rows[0]) : undefined;
  }

  async getNodesByVenue(venueId: string): Promise<Node[]> {
    const { rows } = await pool.query('SELECT * FROM nodes WHERE venue_id = $1', [venueId]);
    return rows.map(toNode);
  }

  async updateNode(id: string, updates: Partial<Node>): Promise<Node | undefined> {
    const node = await this.getNode(id);
    if (!node) return undefined;

    const merged = { ...node, ...updates, updatedAt: new Date() };
    const { rows } = await pool.query(
      `UPDATE nodes SET name=$1, type=$2, x=$3, y=$4, updated_at=$5
       WHERE id=$6 RETURNING *`,
      [merged.name, merged.type, merged.x, merged.y, merged.updatedAt, id]
    );
    return rows.length ? toNode(rows[0]) : undefined;
  }

  async deleteNode(id: string): Promise<boolean> {
    const { rowCount } = await pool.query('DELETE FROM nodes WHERE id = $1', [id]);
    return (rowCount ?? 0) > 0;
  }

  // ─── Edge Operations ───
  async createEdge(edge: Edge): Promise<Edge> {
    const { rows } = await pool.query(
      `INSERT INTO edges (id, venue_id, from_node_id, to_node_id, distance, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [edge.id, edge.venueId, edge.fromNodeId, edge.toNodeId, edge.distance, edge.createdAt, edge.updatedAt]
    );
    return toEdge(rows[0]);
  }

  async createEdgesBatch(edges: Edge[]): Promise<Edge[]> {
    if (edges.length === 0) return [];

    // Large floor plans can generate tens of thousands of edges.
    // Chunk inserts to avoid PostgreSQL parameter/protocol limits.
    const CHUNK_SIZE = 1000;
    const created: Edge[] = [];

    for (let offset = 0; offset < edges.length; offset += CHUNK_SIZE) {
      const chunk = edges.slice(offset, offset + CHUNK_SIZE);
      let paramIndex = 1;
      const valueParams: string[] = [];
      const flatValues: any[] = [];

      for (const edge of chunk) {
        valueParams.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
        flatValues.push(edge.id, edge.venueId, edge.fromNodeId, edge.toNodeId, edge.distance, edge.createdAt, edge.updatedAt);
      }

      const { rows } = await pool.query(
        `INSERT INTO edges (id, venue_id, from_node_id, to_node_id, distance, created_at, updated_at)
         VALUES ${valueParams.join(', ')} RETURNING *`,
        flatValues
      );
      created.push(...rows.map(toEdge));
    }

    return created;
  }

  async getEdge(id: string): Promise<Edge | undefined> {
    const { rows } = await pool.query('SELECT * FROM edges WHERE id = $1', [id]);
    return rows.length ? toEdge(rows[0]) : undefined;
  }

  async getEdgesByVenue(venueId: string): Promise<Edge[]> {
    const { rows } = await pool.query('SELECT * FROM edges WHERE venue_id = $1', [venueId]);
    return rows.map(toEdge);
  }

  async getEdgesByNode(nodeId: string): Promise<Edge[]> {
    const { rows } = await pool.query(
      'SELECT * FROM edges WHERE from_node_id = $1 OR to_node_id = $1',
      [nodeId]
    );
    return rows.map(toEdge);
  }

  async deleteEdge(id: string): Promise<boolean> {
    const { rowCount } = await pool.query('DELETE FROM edges WHERE id = $1', [id]);
    return (rowCount ?? 0) > 0;
  }

  // ─── QR Mapping Operations ───

  async createQRMapping(mapping: QRMapping): Promise<QRMapping> {
    const { rows } = await pool.query(
      `INSERT INTO qr_mappings (qr_id, node_id, created_at)
       VALUES ($1, $2, $3) RETURNING *`,
      [mapping.qrId, mapping.nodeId, mapping.createdAt]
    );
    return toQRMapping(rows[0]);
  }

  async getQRMapping(qrId: string): Promise<QRMapping | undefined> {
    const { rows } = await pool.query('SELECT * FROM qr_mappings WHERE qr_id = $1', [qrId]);
    return rows.length ? toQRMapping(rows[0]) : undefined;
  }

  async getQRMappingsByNode(nodeId: string): Promise<QRMapping[]> {
    const { rows } = await pool.query('SELECT * FROM qr_mappings WHERE node_id = $1', [nodeId]);
    return rows.map(toQRMapping);
  }

  async deleteQRMapping(qrId: string): Promise<boolean> {
    const { rowCount } = await pool.query('DELETE FROM qr_mappings WHERE qr_id = $1', [qrId]);
    return (rowCount ?? 0) > 0;
  }
}

// Singleton instance
export const dataStore = new DataStore();
