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
   *
   * @param dto - QR mapping data
   * @returns Created QR mapping
   */
  async createQRMapping(dto: CreateQRMappingDTO): Promise<QRMapping> {
    // Validate that the node exists
    const node = dataStore.getNode(dto.nodeId);
    if (!node) {
      throw new Error('Node not found');
    }

    // Check if QR ID already exists
    const existing = dataStore.getQRMapping(dto.qrId);
    if (existing) {
      throw new Error('QR ID already exists');
    }

    const mapping: QRMapping = {
      qrId: dto.qrId,
      nodeId: dto.nodeId,
      createdAt: new Date(),
    };

    return dataStore.createQRMapping(mapping);
  }

  /**
   * Generate a QR mapping with auto-generated ID
   *
   * @param nodeId - Node to map to
   * @returns Created QR mapping
   */
  async generateQRForNode(nodeId: string): Promise<QRMapping> {
    const qrId = this.generateQRId();
    return this.createQRMapping({ qrId, nodeId });
  }

  /**
   * Get QR mapping by QR ID
   *
   * @param qrId - QR identifier
   * @returns QR mapping or undefined
   */
  async getQRMapping(qrId: string): Promise<QRMapping | undefined> {
    return dataStore.getQRMapping(qrId);
  }

  /**
   * Get all QR codes for a specific node
   *
   * @param nodeId - Node identifier
   * @returns Array of QR mappings
   */
  async getQRMappingsByNode(nodeId: string): Promise<QRMapping[]> {
    return dataStore.getQRMappingsByNode(nodeId);
  }

  /**
   * Delete a QR mapping
   *
   * @param qrId - QR identifier
   * @returns Success status
   */
  async deleteQRMapping(qrId: string): Promise<boolean> {
    return dataStore.deleteQRMapping(qrId);
  }

  /**
   * Generate QR URL for a venue and node
   *
   * @param venueId - Venue identifier
   * @param nodeId - Node identifier
   * @param baseUrl - Base URL of the frontend application
   * @returns Full QR code URL
   */
  generateQRUrl(venueId: string, nodeId: string, baseUrl: string): string {
    return `${baseUrl}/venue/${venueId}?node=${nodeId}`;
  }

  /**
   * Bulk generate QR codes for all nodes in a venue
   *
   * @param venueId - Venue identifier
   * @returns Array of created QR mappings
   */
  async generateQRCodesForVenue(venueId: string): Promise<QRMapping[]> {
    const nodes = dataStore.getNodesByVenue(venueId);
    const mappings: QRMapping[] = [];

    for (const node of nodes) {
      // Check if node already has a QR code
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
