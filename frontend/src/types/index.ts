/**
 * TypeScript type definitions for NavIO
 */

export interface FloorPlan {
  id: string;
  name: string;
  description?: string;
  image_url: string;
  image_width: number;
  image_height: number;
  organization_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Node {
  id: string;
  floor_plan_id: string;
  x: number;
  y: number;
  node_type: string;
  name?: string;
  accessibility_level: string;
  created_at: string;
}

export interface Edge {
  id: string;
  floor_plan_id: string;
  source_node_id: string;
  target_node_id: string;
  weight: number;
  bidirectional: boolean;
  accessible: boolean;
  edge_type: string;
  created_at: string;
}

export interface POI {
  id: string;
  floor_plan_id: string;
  node_id?: string;
  name: string;
  description?: string;
  category?: string;
  x: number;
  y: number;
  icon: string;
  searchable: boolean;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface QRAnchor {
  id: string;
  floor_plan_id: string;
  node_id: string;
  code: string;
  x: number;
  y: number;
  qr_data: string;
  placement_notes?: string;
  active: boolean;
  scan_count: number;
  created_at: string;
  updated_at: string;
}

export interface Coordinate {
  x: number;
  y: number;
}

export interface RouteInstruction {
  step: number;
  action: string;
  distance: number;
}

export interface RoutePreferences {
  accessible_only?: boolean;
  avoid_stairs?: boolean;
  shortest_distance?: boolean;
}

export interface RouteRequest {
  floor_plan_id: string;
  start_node_id: string;
  end_node_id: string;
  preferences?: RoutePreferences;
}

export interface RouteResponse {
  success: boolean;
  floor_plan_id: string;
  start_node_id: string;
  end_node_id: string;
  path: string[];
  total_distance: number;
  estimated_time_seconds: number;
  coordinates: Coordinate[];
  instructions: RouteInstruction[];
  error?: string;
}

export interface FloorPlanWithGraph extends FloorPlan {
  nodes: Node[];
  edges: Edge[];
  pois: POI[];
  qr_anchors: QRAnchor[];
}

export interface QRScanResponse {
  success: boolean;
  floor_plan?: {
    id: string;
    name: string;
    image_url: string;
    image_width: number;
    image_height: number;
  };
  location?: {
    node_id: string;
    x: number;
    y: number;
    name?: string;
  };
  nearby_pois?: Array<{
    id: string;
    name: string;
    distance: number;
    category?: string;
  }>;
  error?: string;
}
