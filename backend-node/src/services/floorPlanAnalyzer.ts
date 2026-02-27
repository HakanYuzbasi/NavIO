/**
 * Floor Plan Analysis Service
 * Automatic detection of booths, corridors, and navigation paths
 *
 * Priority: ACCURACY over speed
 * All detections include confidence scores
 * Multiple validation layers
 */

import { Node, Edge, NodeType, CreateNodeDTO, CreateEdgeDTO } from '../types';

export interface DetectedNode {
  name: string;
  type: NodeType;
  x: number;
  y: number;
  confidence: number; // 0-1 confidence score
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  validationFlags: {
    sizeValid: boolean;
    positionValid: boolean;
    isolationCheck: boolean;
  };
}

export interface DetectedEdge {
  fromNode: string; // Node name
  toNode: string;
  distance: number;
  confidence: number;
  validationFlags: {
    pathClear: boolean;
    distanceReasonable: boolean;
    angleValid: boolean;
  };
}

export interface AnalysisResult {
  nodes: DetectedNode[];
  edges: DetectedEdge[];
  metadata: {
    imageWidth: number;
    imageHeight: number;
    totalBooths: number;
    totalIntersections: number;
    totalEntrances: number;
    averageConfidence: number;
    analysisTime: number;
    warnings: string[];
  };
  qualityScore: number; // Overall quality 0-100
}

export interface ImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export class FloorPlanAnalyzer {
  // Color thresholds for detection
  private readonly BOOTH_COLOR_THRESHOLD = 230; // White booths
  private readonly CORRIDOR_COLOR_THRESHOLD = 180; // Brown corridors
  private readonly MIN_BOOTH_SIZE = 400; // Minimum pixels for booth
  private readonly MAX_BOOTH_SIZE = 50000; // Maximum pixels for booth
  private readonly MIN_CONFIDENCE = 0.7; // Minimum confidence to include

  /**
   * Main analysis function
   * Returns detected nodes and edges with confidence scores
   */
  async analyzeFloorPlan(imageData: ImageData): Promise<AnalysisResult> {
    const startTime = Date.now();
    const warnings: string[] = [];

    console.log('🔍 Starting floor plan analysis...');
    console.log(`Image size: ${imageData.width}x${imageData.height}`);

    // Step 1: Detect booths (white rectangles)
    const booths = this.detectBooths(imageData);
    console.log(`✓ Detected ${booths.length} potential booths`);

    // Step 2: Detect corridors and walkable areas
    const corridorMap = this.detectCorridors(imageData);
    console.log(`✓ Analyzed corridor structure`);

    // Step 3: Detect intersections (where corridors meet)
    const intersections = this.detectIntersections(corridorMap, imageData);
    console.log(`✓ Detected ${intersections.length} intersections`);

    // Step 4: Detect entrances (edge openings)
    const entrances = this.detectEntrances(corridorMap, imageData);
    console.log(`✓ Detected ${entrances.length} entrances`);

    // Step 5: Validate all detections
    const validatedBooths = this.validateNodes(booths, imageData);
    const validatedIntersections = this.validateNodes(intersections, imageData);
    const validatedEntrances = this.validateNodes(entrances, imageData);

    // Step 6: Combine all nodes
    const allNodes = [
      ...validatedBooths,
      ...validatedIntersections,
      ...validatedEntrances,
    ];

    // Step 7: Filter by confidence threshold
    const highConfidenceNodes = allNodes.filter(
      node => node.confidence >= this.MIN_CONFIDENCE
    );

    if (highConfidenceNodes.length < allNodes.length) {
      warnings.push(
        `Filtered ${allNodes.length - highConfidenceNodes.length} low-confidence nodes`
      );
    }

    // Step 8: Detect edges (walkable connections)
    const edges = this.detectEdges(highConfidenceNodes, corridorMap, imageData);
    console.log(`✓ Detected ${edges.length} potential edges`);

    // Step 9: Validate edges
    const validatedEdges = this.validateEdges(edges, highConfidenceNodes);

    // Step 10: Calculate quality metrics
    const avgConfidence =
      highConfidenceNodes.reduce((sum, n) => sum + n.confidence, 0) /
      highConfidenceNodes.length;

    const qualityScore = this.calculateQualityScore(
      highConfidenceNodes,
      validatedEdges,
      imageData
    );

    const analysisTime = Date.now() - startTime;

    console.log(`✓ Analysis complete in ${analysisTime}ms`);
    console.log(`Quality score: ${qualityScore}/100`);

    return {
      nodes: highConfidenceNodes,
      edges: validatedEdges,
      metadata: {
        imageWidth: imageData.width,
        imageHeight: imageData.height,
        totalBooths: validatedBooths.length,
        totalIntersections: validatedIntersections.length,
        totalEntrances: validatedEntrances.length,
        averageConfidence: avgConfidence,
        analysisTime,
        warnings,
      },
      qualityScore,
    };
  }

  /**
   * Detect booth locations (white rectangles)
   */
  private detectBooths(imageData: ImageData): DetectedNode[] {
    const booths: DetectedNode[] = [];
    const { data, width, height } = imageData;
    const visited = new Set<number>();

    // Scan image for white pixels
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const pixelIndex = y * width + x;

        if (visited.has(pixelIndex)) continue;

        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Check if pixel is white (booth)
        if (
          r > this.BOOTH_COLOR_THRESHOLD &&
          g > this.BOOTH_COLOR_THRESHOLD &&
          b > this.BOOTH_COLOR_THRESHOLD
        ) {
          // Flood fill to find booth boundaries
          const boothPixels = this.floodFill(
            x,
            y,
            imageData,
            visited,
            this.BOOTH_COLOR_THRESHOLD
          );

          // Skip if too small or too large
          if (
            boothPixels.length < this.MIN_BOOTH_SIZE ||
            boothPixels.length > this.MAX_BOOTH_SIZE
          ) {
            continue;
          }

          // Calculate booth center and bounding box
          const bounds = this.calculateBounds(boothPixels, width);
          const center = {
            x: bounds.x + bounds.width / 2,
            y: bounds.y + bounds.height / 2,
          };

          // Calculate confidence based on shape regularity
          const confidence = this.calculateBoothConfidence(
            boothPixels,
            bounds
          );

          booths.push({
            name: `Booth ${booths.length + 1}`,
            type: 'booth',
            x: Math.round(center.x),
            y: Math.round(center.y),
            confidence,
            boundingBox: bounds,
            validationFlags: {
              sizeValid: true,
              positionValid: true,
              isolationCheck: true,
            },
          });
        }
      }
    }

    return booths;
  }

  /**
   * Flood fill algorithm to find connected pixels
   */
  private floodFill(
    startX: number,
    startY: number,
    imageData: ImageData,
    visited: Set<number>,
    threshold: number
  ): { x: number; y: number }[] {
    const { data, width, height } = imageData;
    const pixels: { x: number; y: number }[] = [];
    const queue: { x: number; y: number }[] = [{ x: startX, y: startY }];

    while (queue.length > 0) {
      const { x, y } = queue.shift()!;

      if (x < 0 || x >= width || y < 0 || y >= height) continue;

      const pixelIndex = y * width + x;
      if (visited.has(pixelIndex)) continue;

      const idx = pixelIndex * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      if (r < threshold || g < threshold || b < threshold) continue;

      visited.add(pixelIndex);
      pixels.push({ x, y });

      // Add neighbors (4-connected)
      queue.push({ x: x + 1, y });
      queue.push({ x: x - 1, y });
      queue.push({ x, y: y + 1 });
      queue.push({ x, y: y - 1 });
    }

    return pixels;
  }

  /**
   * Calculate bounding box of pixels
   */
  private calculateBounds(
    pixels: { x: number; y: number }[],
    width: number
  ): { x: number; y: number; width: number; height: number } {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    for (const { x, y } of pixels) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /**
   * Calculate confidence score for booth detection
   * Based on shape regularity, size, and aspect ratio
   */
  private calculateBoothConfidence(
    pixels: { x: number; y: number }[],
    bounds: { x: number; y: number; width: number; height: number }
  ): number {
    // Calculate area ratio (how well pixels fill bounding box)
    const boundingBoxArea = bounds.width * bounds.height;
    const pixelArea = pixels.length;
    const fillRatio = pixelArea / boundingBoxArea;

    // Calculate aspect ratio (prefer reasonable rectangles)
    const aspectRatio = bounds.width / bounds.height;
    const aspectScore =
      aspectRatio > 0.3 && aspectRatio < 3 ? 1 : 0.5;

    // Combine scores
    let confidence = fillRatio * 0.6 + aspectScore * 0.4;

    // Bonus for good size
    if (pixelArea > 1000 && pixelArea < 20000) {
      confidence += 0.1;
    }

    return Math.min(1, confidence);
  }

  /**
   * Detect corridor map (walkable areas)
   */
  private detectCorridors(imageData: ImageData): boolean[][] {
    const { data, width, height } = imageData;
    const corridorMap: boolean[][] = Array(height)
      .fill(null)
      .map(() => Array(width).fill(false));

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Check if pixel is brown/corridor color
        const isCorridor =
          r < this.BOOTH_COLOR_THRESHOLD &&
          r > 100 &&
          Math.abs(r - g) < 50 &&
          Math.abs(r - b) < 80;

        corridorMap[y][x] = isCorridor;
      }
    }

    return corridorMap;
  }

  /**
   * Detect intersection points where corridors meet
   */
  private detectIntersections(
    corridorMap: boolean[][],
    imageData: ImageData
  ): DetectedNode[] {
    const intersections: DetectedNode[] = [];
    const height = corridorMap.length;
    const width = corridorMap[0].length;

    // Scan for intersection patterns
    for (let y = 20; y < height - 20; y += 10) {
      for (let x = 20; x < width - 20; x += 10) {
        if (!corridorMap[y][x]) continue;

        // Check if this is an intersection (3 or 4 way)
        const connectivityScore = this.calculateConnectivity(
          x,
          y,
          corridorMap
        );

        if (connectivityScore >= 3) {
          // This is likely an intersection
          intersections.push({
            name: `Junction ${intersections.length + 1}`,
            type: 'intersection',
            x,
            y,
            confidence: Math.min(1, connectivityScore / 4),
            validationFlags: {
              sizeValid: true,
              positionValid: true,
              isolationCheck: true,
            },
          });
        }
      }
    }

    // Remove duplicates (merge nearby intersections)
    return this.mergeDuplicateNodes(intersections, 30);
  }

  /**
   * Calculate connectivity (how many directions connect)
   */
  private calculateConnectivity(
    x: number,
    y: number,
    corridorMap: boolean[][]
  ): number {
    const directions = [
      { dx: 0, dy: -20 }, // North
      { dx: 20, dy: 0 }, // East
      { dx: 0, dy: 20 }, // South
      { dx: -20, dy: 0 }, // West
    ];

    let connectivity = 0;

    for (const { dx, dy } of directions) {
      const nx = x + dx;
      const ny = y + dy;

      if (
        ny >= 0 &&
        ny < corridorMap.length &&
        nx >= 0 &&
        nx < corridorMap[0].length &&
        corridorMap[ny][nx]
      ) {
        connectivity++;
      }
    }

    return connectivity;
  }

  /**
   * Detect entrance nodes (at map edges)
   */
  private detectEntrances(
    corridorMap: boolean[][],
    imageData: ImageData
  ): DetectedNode[] {
    const entrances: DetectedNode[] = [];
    const height = corridorMap.length;
    const width = corridorMap[0].length;

    // Scan edges for corridor openings
    const edges = [
      { start: { x: 0, y: 0 }, end: { x: width, y: 0 }, name: 'North' }, // Top
      { start: { x: 0, y: height - 1 }, end: { x: width, y: height - 1 }, name: 'South' }, // Bottom
      { start: { x: 0, y: 0 }, end: { x: 0, y: height }, name: 'West' }, // Left
      { start: { x: width - 1, y: 0 }, end: { x: width - 1, y: height }, name: 'East' }, // Right
    ];

    for (const edge of edges) {
      const edgeEntrances = this.scanEdgeForEntrances(
        edge.start,
        edge.end,
        corridorMap,
        edge.name
      );
      entrances.push(...edgeEntrances);
    }

    return this.mergeDuplicateNodes(entrances, 50);
  }

  /**
   * Scan edge for entrance openings
   */
  private scanEdgeForEntrances(
    start: { x: number; y: number },
    end: { x: number; y: number },
    corridorMap: boolean[][],
    edgeName: string
  ): DetectedNode[] {
    const entrances: DetectedNode[] = [];
    const isHorizontal = start.y === end.y;

    if (isHorizontal) {
      // Scan horizontal edge
      for (let x = start.x; x < end.x; x += 5) {
        const y = start.y;
        if (corridorMap[y]?.[x]) {
          entrances.push({
            name: `${edgeName} Entrance`,
            type: 'entrance',
            x,
            y,
            confidence: 0.8,
            validationFlags: {
              sizeValid: true,
              positionValid: true,
              isolationCheck: true,
            },
          });
        }
      }
    } else {
      // Scan vertical edge
      for (let y = start.y; y < end.y; y += 5) {
        const x = start.x;
        if (corridorMap[y]?.[x]) {
          entrances.push({
            name: `${edgeName} Entrance`,
            type: 'entrance',
            x,
            y,
            confidence: 0.8,
            validationFlags: {
              sizeValid: true,
              positionValid: true,
              isolationCheck: true,
            },
          });
        }
      }
    }

    return entrances;
  }

  /**
   * Merge duplicate nodes that are too close together
   */
  private mergeDuplicateNodes(
    nodes: DetectedNode[],
    threshold: number
  ): DetectedNode[] {
    const merged: DetectedNode[] = [];

    for (const node of nodes) {
      const existing = merged.find(
        m =>
          Math.sqrt(
            Math.pow(m.x - node.x, 2) + Math.pow(m.y - node.y, 2)
          ) < threshold
      );

      if (existing) {
        // Merge - keep higher confidence
        if (node.confidence > existing.confidence) {
          existing.x = node.x;
          existing.y = node.y;
          existing.confidence = node.confidence;
        }
      } else {
        merged.push(node);
      }
    }

    return merged;
  }

  /**
   * Validate detected nodes
   */
  private validateNodes(
    nodes: DetectedNode[],
    imageData: ImageData
  ): DetectedNode[] {
    return nodes.map(node => {
      const validationFlags = {
        sizeValid: true,
        positionValid:
          node.x >= 0 &&
          node.x < imageData.width &&
          node.y >= 0 &&
          node.y < imageData.height,
        isolationCheck: this.checkIsolation(node, nodes),
      };

      // Adjust confidence based on validation
      let adjustedConfidence = node.confidence;
      if (!validationFlags.isolationCheck) adjustedConfidence *= 0.8;
      if (!validationFlags.positionValid) adjustedConfidence = 0;

      return {
        ...node,
        confidence: adjustedConfidence,
        validationFlags,
      };
    });
  }

  /**
   * Check if node is not too close to other nodes of same type
   */
  private checkIsolation(
    node: DetectedNode,
    allNodes: DetectedNode[]
  ): boolean {
    const minDistance = node.type === 'booth' ? 40 : 20;

    for (const other of allNodes) {
      if (other === node || other.type !== node.type) continue;

      const distance = Math.sqrt(
        Math.pow(node.x - other.x, 2) + Math.pow(node.y - other.y, 2)
      );

      if (distance < minDistance) {
        return false;
      }
    }

    return true;
  }

  /**
   * Detect edges between nodes
   */
  private detectEdges(
    nodes: DetectedNode[],
    corridorMap: boolean[][],
    imageData: ImageData
  ): DetectedEdge[] {
    const edges: DetectedEdge[] = [];
    const maxDistance = 200; // Maximum edge length

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const node1 = nodes[i];
        const node2 = nodes[j];

        const distance = Math.sqrt(
          Math.pow(node1.x - node2.x, 2) + Math.pow(node1.y - node2.y, 2)
        );

        if (distance > maxDistance) continue;

        // Check if path is clear (follows corridor)
        const pathClear = this.isPathClear(
          node1,
          node2,
          corridorMap
        );

        if (pathClear) {
          edges.push({
            fromNode: node1.name,
            toNode: node2.name,
            distance,
            confidence: 0.9,
            validationFlags: {
              pathClear: true,
              distanceReasonable: distance < maxDistance,
              angleValid: true,
            },
          });
        }
      }
    }

    return edges;
  }

  /**
   * Check if path between two nodes follows corridor
   */
  private isPathClear(
    node1: DetectedNode,
    node2: DetectedNode,
    corridorMap: boolean[][]
  ): boolean {
    const steps = 20;
    let clearCount = 0;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = Math.round(node1.x + (node2.x - node1.x) * t);
      const y = Math.round(node1.y + (node2.y - node1.y) * t);

      if (
        y >= 0 &&
        y < corridorMap.length &&
        x >= 0 &&
        x < corridorMap[0].length &&
        corridorMap[y][x]
      ) {
        clearCount++;
      }
    }

    // Path is clear if at least 95% of points are in corridor (strict validation)
    return clearCount / steps > 0.95;
  }

  /**
   * Validate edges
   */
  private validateEdges(
    edges: DetectedEdge[],
    nodes: DetectedNode[]
  ): DetectedEdge[] {
    return edges.filter(edge => {
      // Ensure both nodes exist
      const fromExists = nodes.some(n => n.name === edge.fromNode);
      const toExists = nodes.some(n => n.name === edge.toNode);

      return fromExists && toExists && edge.validationFlags.pathClear;
    });
  }

  /**
   * Calculate overall quality score
   */
  private calculateQualityScore(
    nodes: DetectedNode[],
    edges: DetectedEdge[],
    imageData: ImageData
  ): number {
    if (nodes.length === 0) return 0;

    // Node confidence score
    const avgNodeConfidence =
      nodes.reduce((sum, n) => sum + n.confidence, 0) / nodes.length;

    // Edge coverage score
    const expectedEdges = nodes.length * 2; // Rough estimate
    const edgeCoverage = Math.min(1, edges.length / expectedEdges);

    // Connectivity score (is graph well connected?)
    const connectivityScore = edges.length > 0 ? 1 : 0;

    // Combine scores
    const quality =
      avgNodeConfidence * 0.5 +
      edgeCoverage * 0.3 +
      connectivityScore * 0.2;

    return Math.round(quality * 100);
  }
}

export const floorPlanAnalyzer = new FloorPlanAnalyzer();
