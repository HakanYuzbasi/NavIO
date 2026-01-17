/**
 * Core Data Types for NaviO MVP
 * Production-ready type definitions
 */

export type NodeType = 'entrance' | 'booth' | 'intersection';

export interface Venue {
  id: string;
  name: string;
  mapImageUrl?: string;
  width?: number;
  height?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Node {
  id: string;
  venueId: string;
  name: string;
  type: NodeType;
  x: number;
  y: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Edge {
  id: string;
  venueId: string;
  fromNodeId: string;
  toNodeId: string;
  distance: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface QRMapping {
  qrId: string;
  nodeId: string;
  createdAt: Date;
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

export interface CreateQRMappingDTO {
  qrId: string;
  nodeId: string;
}

export interface Graph {
  nodes: Map<string, GraphNode>;
  edges: Map<string, Edge[]>;
}

export interface GraphNode {
  id: string;
  x: number;
  y: number;
  neighbors: { nodeId: string; distance: number }[];
}
