/**
 * API client for NavIO backend
 */
import axios, { AxiosInstance } from 'axios';
import {
  FloorPlan,
  FloorPlanWithGraph,
  Node,
  Edge,
  POI,
  QRAnchor,
  RouteRequest,
  RouteResponse,
  QRScanResponse,
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

class NavIOAPI {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // Floor Plans
  async getFloorPlans(): Promise<FloorPlan[]> {
    const response = await this.client.get<FloorPlan[]>('/floor-plans');
    return response.data;
  }

  async getFloorPlan(id: string): Promise<FloorPlanWithGraph> {
    const response = await this.client.get<FloorPlanWithGraph>(`/floor-plans/${id}`);
    return response.data;
  }

  async createFloorPlan(data: {
    name: string;
    description?: string;
    image_width: number;
    image_height: number;
    organization_id?: string;
  }): Promise<FloorPlan> {
    const response = await this.client.post<FloorPlan>('/floor-plans', data);
    return response.data;
  }

  async updateFloorPlan(id: string, data: { name?: string; description?: string }): Promise<FloorPlan> {
    const response = await this.client.patch<FloorPlan>(`/floor-plans/${id}`, data);
    return response.data;
  }

  async deleteFloorPlan(id: string): Promise<void> {
    await this.client.delete(`/floor-plans/${id}`);
  }

  // Nodes
  async createNode(data: {
    floor_plan_id: string;
    x: number;
    y: number;
    node_type?: string;
    name?: string;
    accessibility_level?: string;
  }): Promise<Node> {
    const response = await this.client.post<Node>('/nodes', data);
    return response.data;
  }

  async getNode(id: string): Promise<Node> {
    const response = await this.client.get<Node>(`/nodes/${id}`);
    return response.data;
  }

  async getNodesByFloorPlan(floorPlanId: string): Promise<Node[]> {
    const response = await this.client.get<Node[]>(`/floor-plans/${floorPlanId}/nodes`);
    return response.data;
  }

  async updateNode(id: string, data: Partial<Node>): Promise<Node> {
    const response = await this.client.patch<Node>(`/nodes/${id}`, data);
    return response.data;
  }

  async deleteNode(id: string): Promise<void> {
    await this.client.delete(`/nodes/${id}`);
  }

  // Edges
  async createEdge(data: {
    floor_plan_id: string;
    source_node_id: string;
    target_node_id: string;
    weight?: number;
    bidirectional?: boolean;
    accessible?: boolean;
    edge_type?: string;
  }): Promise<Edge> {
    const response = await this.client.post<Edge>('/edges', data);
    return response.data;
  }

  async getEdge(id: string): Promise<Edge> {
    const response = await this.client.get<Edge>(`/edges/${id}`);
    return response.data;
  }

  async getEdgesByFloorPlan(floorPlanId: string): Promise<Edge[]> {
    const response = await this.client.get<Edge[]>(`/floor-plans/${floorPlanId}/edges`);
    return response.data;
  }

  async updateEdge(id: string, data: Partial<Edge>): Promise<Edge> {
    const response = await this.client.patch<Edge>(`/edges/${id}`, data);
    return response.data;
  }

  async deleteEdge(id: string): Promise<void> {
    await this.client.delete(`/edges/${id}`);
  }

  // POIs
  async createPOI(data: {
    floor_plan_id: string;
    name: string;
    x: number;
    y: number;
    description?: string;
    category?: string;
    icon?: string;
    searchable?: boolean;
    node_id?: string;
    metadata?: Record<string, any>;
  }): Promise<POI> {
    const response = await this.client.post<POI>('/pois', data);
    return response.data;
  }

  async getPOI(id: string): Promise<POI> {
    const response = await this.client.get<POI>(`/pois/${id}`);
    return response.data;
  }

  async getPOIsByFloorPlan(floorPlanId: string, searchableOnly: boolean = false): Promise<POI[]> {
    const response = await this.client.get<POI[]>(
      `/floor-plans/${floorPlanId}/pois`,
      { params: { searchable_only: searchableOnly } }
    );
    return response.data;
  }

  async updatePOI(id: string, data: Partial<POI>): Promise<POI> {
    const response = await this.client.patch<POI>(`/pois/${id}`, data);
    return response.data;
  }

  async deletePOI(id: string): Promise<void> {
    await this.client.delete(`/pois/${id}`);
  }

  // QR Anchors
  async createQRAnchor(data: {
    floor_plan_id: string;
    node_id: string;
    code: string;
    x: number;
    y: number;
    placement_notes?: string;
    qr_data?: string;
  }): Promise<QRAnchor> {
    const response = await this.client.post<QRAnchor>('/qr-anchors', data);
    return response.data;
  }

  async getQRAnchor(id: string): Promise<QRAnchor> {
    const response = await this.client.get<QRAnchor>(`/qr-anchors/${id}`);
    return response.data;
  }

  async getQRAnchorsByFloorPlan(floorPlanId: string, activeOnly: boolean = true): Promise<QRAnchor[]> {
    const response = await this.client.get<QRAnchor[]>(
      `/floor-plans/${floorPlanId}/qr-anchors`,
      { params: { active_only: activeOnly } }
    );
    return response.data;
  }

  async updateQRAnchor(id: string, data: Partial<QRAnchor>): Promise<QRAnchor> {
    const response = await this.client.patch<QRAnchor>(`/qr-anchors/${id}`, data);
    return response.data;
  }

  async deleteQRAnchor(id: string): Promise<void> {
    await this.client.delete(`/qr-anchors/${id}`);
  }

  // Navigation
  async calculateRoute(request: RouteRequest): Promise<RouteResponse> {
    const response = await this.client.post<RouteResponse>('/routes/calculate', request);
    return response.data;
  }

  async scanQRCode(qrCode: string): Promise<QRScanResponse> {
    const response = await this.client.post<QRScanResponse>('/qr/scan', { qr_code: qrCode });
    return response.data;
  }
}

export const api = new NavIOAPI();
export default api;
