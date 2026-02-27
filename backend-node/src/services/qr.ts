/**
 * QR Code Service
 * Handles QR code generation and mapping to nodes
 */

import { QRMapping, CreateQRMappingDTO } from '../types';
import { dataStore } from '../models/store';
import { v4 as uuidv4 } from 'uuid';

export class QRService {
  /**
   * Generate a unique QR ID
   */
  private generateQRId(): string {
    return `qr_${uuidv4()}`;
  }

  /**
   * Create a QR code mapping to a node
   */
  async createQRMapping(dto: CreateQRMappingDTO): Promise<QRMapping> {
    const node = await dataStore.getNode(dto.nodeId);
    if (!node) {
      throw new Error('Node not found');
    }

    const existing = await dataStore.getQRMapping(dto.qrId);
    if (existing) {
      throw new Error('QR ID already exists');
    }

    const mapping: QRMapping = {
      qrId: dto.qrId,
      nodeId: dto.nodeId,
      createdAt: new Date(),
    };

    return await dataStore.createQRMapping(mapping);
  }

  /**
   * Generate a QR mapping with auto-generated ID
   */
  async generateQRForNode(nodeId: string): Promise<QRMapping> {
    const qrId = this.generateQRId();
    return this.createQRMapping({ qrId, nodeId });
  }

  /**
   * Get QR mapping by QR ID
   */
  async getQRMapping(qrId: string): Promise<QRMapping | undefined> {
    return await dataStore.getQRMapping(qrId);
  }

  /**
   * Get all QR codes for a specific node
   */
  async getQRMappingsByNode(nodeId: string): Promise<QRMapping[]> {
    return await dataStore.getQRMappingsByNode(nodeId);
  }

  /**
   * Delete a QR mapping
   */
  async deleteQRMapping(qrId: string): Promise<boolean> {
    return await dataStore.deleteQRMapping(qrId);
  }

  /**
   * Generate QR URL for a venue and node
   */
  generateQRUrl(venueId: string, nodeId: string, baseUrl: string): string {
    return `${baseUrl}/venue/${venueId}?node=${nodeId}`;
  }

  /**
   * Bulk generate QR codes for all nodes in a venue
   */
  async generateQRCodesForVenue(venueId: string): Promise<QRMapping[]> {
    const nodes = await dataStore.getNodesByVenue(venueId);
    const mappings: QRMapping[] = [];

    for (const node of nodes) {
      const existing = await this.getQRMappingsByNode(node.id);
      if (existing.length === 0) {
        const mapping = await this.generateQRForNode(node.id);
        mappings.push(mapping);
      }
    }

    return mappings;
  }
}

export const qrService = new QRService();
