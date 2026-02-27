/**
 * Core Data Types for NaviO MVP
 * Production-ready type definitions
 */

export type NodeType = 'entrance' | 'booth' | 'intersection' | 'waypoint';

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

export interface DirectionStep {
  instruction: string;
  distance: number;
  landmark?: string;
}

export interface RouteResponse {
  path: Node[];
  totalDistance: number;
  estimatedTimeSeconds: number;
  directions?: DirectionStep[];
  simpleDirections?: string;
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

export type QueueStatus = 'waiting' | 'active' | 'done' | 'cancelled';

export interface QueueEntry {
  id: string;
  boothId: string;
  visitorName?: string;
  visitorPhone?: string;
  status: QueueStatus;
  position: number;
  joinedAt: Date;
  calledAt?: Date;
  completedAt?: Date;
  dwellSeconds?: number;
}

export interface ScanEvent {
  id: string;
  visitorId?: string;
  boothId: string;
  scannedAt: Date;
}
