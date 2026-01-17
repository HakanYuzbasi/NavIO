/**
 * In-Memory Data Store
 * Production Note: Replace with PostgreSQL/MongoDB for production
 */

import { Venue, Node, Edge, QRMapping } from '../types';

class DataStore {
  private venues: Map<string, Venue> = new Map();
  private nodes: Map<string, Node> = new Map();
  private edges: Map<string, Edge> = new Map();
  private qrMappings: Map<string, QRMapping> = new Map();

  // Indexes for faster lookups
  private nodesByVenue: Map<string, Set<string>> = new Map();
  private edgesByVenue: Map<string, Set<string>> = new Map();
  private edgesByNode: Map<string, Set<string>> = new Map();

  // Venue Operations
  createVenue(venue: Venue): Venue {
    this.venues.set(venue.id, venue);
    this.nodesByVenue.set(venue.id, new Set());
    this.edgesByVenue.set(venue.id, new Set());
    return venue;
  }

  getVenue(id: string): Venue | undefined {
    return this.venues.get(id);
  }

  getAllVenues(): Venue[] {
    return Array.from(this.venues.values());
  }

  updateVenue(id: string, updates: Partial<Venue>): Venue | undefined {
    const venue = this.venues.get(id);
    if (!venue) return undefined;

    const updated = { ...venue, ...updates, updatedAt: new Date() };
    this.venues.set(id, updated);
    return updated;
  }

  deleteVenue(id: string): boolean {
    // Delete all related data
    const nodes = this.nodesByVenue.get(id) || new Set();
    nodes.forEach(nodeId => {
      this.deleteNode(nodeId);
    });

    const edges = this.edgesByVenue.get(id) || new Set();
    edges.forEach(edgeId => {
      this.edges.delete(edgeId);
    });

    this.nodesByVenue.delete(id);
    this.edgesByVenue.delete(id);
    return this.venues.delete(id);
  }

  // Node Operations
  createNode(node: Node): Node {
    this.nodes.set(node.id, node);

    const venueNodes = this.nodesByVenue.get(node.venueId) || new Set();
    venueNodes.add(node.id);
    this.nodesByVenue.set(node.venueId, venueNodes);

    this.edgesByNode.set(node.id, new Set());
    return node;
  }

  getNode(id: string): Node | undefined {
    return this.nodes.get(id);
  }

  getNodesByVenue(venueId: string): Node[] {
    const nodeIds = this.nodesByVenue.get(venueId) || new Set();
    return Array.from(nodeIds).map(id => this.nodes.get(id)).filter(Boolean) as Node[];
  }

  updateNode(id: string, updates: Partial<Node>): Node | undefined {
    const node = this.nodes.get(id);
    if (!node) return undefined;

    const updated = { ...node, ...updates, updatedAt: new Date() };
    this.nodes.set(id, updated);
    return updated;
  }

  deleteNode(id: string): boolean {
    const node = this.nodes.get(id);
    if (!node) return false;

    // Remove from venue index
    const venueNodes = this.nodesByVenue.get(node.venueId);
    if (venueNodes) {
      venueNodes.delete(id);
    }

    // Delete all edges connected to this node
    const edgeIds = this.edgesByNode.get(id) || new Set();
    edgeIds.forEach(edgeId => {
      this.edges.delete(edgeId);
    });
    this.edgesByNode.delete(id);

    // Remove QR mappings
    for (const [qrId, mapping] of this.qrMappings.entries()) {
      if (mapping.nodeId === id) {
        this.qrMappings.delete(qrId);
      }
    }

    return this.nodes.delete(id);
  }

  // Edge Operations
  createEdge(edge: Edge): Edge {
    this.edges.set(edge.id, edge);

    const venueEdges = this.edgesByVenue.get(edge.venueId) || new Set();
    venueEdges.add(edge.id);
    this.edgesByVenue.set(edge.venueId, venueEdges);

    // Add to both nodes' edge lists
    const fromEdges = this.edgesByNode.get(edge.fromNodeId) || new Set();
    fromEdges.add(edge.id);
    this.edgesByNode.set(edge.fromNodeId, fromEdges);

    const toEdges = this.edgesByNode.get(edge.toNodeId) || new Set();
    toEdges.add(edge.id);
    this.edgesByNode.set(edge.toNodeId, toEdges);

    return edge;
  }

  getEdge(id: string): Edge | undefined {
    return this.edges.get(id);
  }

  getEdgesByVenue(venueId: string): Edge[] {
    const edgeIds = this.edgesByVenue.get(venueId) || new Set();
    return Array.from(edgeIds).map(id => this.edges.get(id)).filter(Boolean) as Edge[];
  }

  getEdgesByNode(nodeId: string): Edge[] {
    const edgeIds = this.edgesByNode.get(nodeId) || new Set();
    return Array.from(edgeIds).map(id => this.edges.get(id)).filter(Boolean) as Edge[];
  }

  deleteEdge(id: string): boolean {
    const edge = this.edges.get(id);
    if (!edge) return false;

    // Remove from venue index
    const venueEdges = this.edgesByVenue.get(edge.venueId);
    if (venueEdges) {
      venueEdges.delete(id);
    }

    // Remove from node indexes
    const fromEdges = this.edgesByNode.get(edge.fromNodeId);
    if (fromEdges) {
      fromEdges.delete(id);
    }

    const toEdges = this.edgesByNode.get(edge.toNodeId);
    if (toEdges) {
      toEdges.delete(id);
    }

    return this.edges.delete(id);
  }

  // QR Mapping Operations
  createQRMapping(mapping: QRMapping): QRMapping {
    this.qrMappings.set(mapping.qrId, mapping);
    return mapping;
  }

  getQRMapping(qrId: string): QRMapping | undefined {
    return this.qrMappings.get(qrId);
  }

  getQRMappingsByNode(nodeId: string): QRMapping[] {
    return Array.from(this.qrMappings.values())
      .filter(mapping => mapping.nodeId === nodeId);
  }

  deleteQRMapping(qrId: string): boolean {
    return this.qrMappings.delete(qrId);
  }

  // Utility
  clear(): void {
    this.venues.clear();
    this.nodes.clear();
    this.edges.clear();
    this.qrMappings.clear();
    this.nodesByVenue.clear();
    this.edgesByVenue.clear();
    this.edgesByNode.clear();
  }
}

// Singleton instance
export const dataStore = new DataStore();
