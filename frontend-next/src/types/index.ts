/**
 * Frontend Type Definitions
 * Matches backend API types
 */

export type NodeType = 'entrance' | 'booth' | 'intersection';

export interface Venue {
  id: string;
  name: string;
  mapImageUrl?: string;
  width?: number;
  height?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Node {
  id: string;
  venueId: string;
  name: string;
  type: NodeType;
  x: number;
  y: number;
  createdAt: string;
  updatedAt: string;
}

export interface Edge {
  id: string;
  venueId: string;
  fromNodeId: string;
  toNodeId: string;
  distance: number;
  createdAt: string;
  updatedAt: string;
}

export interface QRMapping {
  qrId: string;
  nodeId: string;
  createdAt: string;
}

export interface RouteRequest {
  venueId: string;
  startNodeId: string;
  endNodeId: string;
}

export interface RouteResponse {
  path: Node[];
  totalDistance: number;
  estimatedTimeSeconds: number;
}

export interface CreateVenueDTO {
  name: string;
  mapImageUrl?: string;
  width?: number;
  height?: number;
}

export interface CreateNodeDTO {
  venueId: string;
  name: string;
  type: NodeType;
  x: number;
  y: number;
}

export interface CreateEdgeDTO {
  venueId: string;
  fromNodeId: string;
  toNodeId: string;
  distance: number;
}
