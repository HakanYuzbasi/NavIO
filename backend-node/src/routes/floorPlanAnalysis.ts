/**
 * Floor Plan Analysis Routes
 * API endpoints for automatic floor plan detection
 *
 * Uses the accurate detector (Union-Find connected component labeling)
 * that matches the Python scipy.ndimage.label algorithm.
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import {
  analyzeFloorPlan,
  detectBooths,
  detectWalkableAreas,
  createAnnotatedImage,
  generateNavigationGraph,
  DetectedBooth,
} from '../services/accurateDetector';

const router = Router();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `analysis-${uniqueId}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

/**
 * POST /api/analyze/image
 * Upload and analyze a floor plan image
 *
 * Uses the accurate Union-Find connected component algorithm
 * Returns detected booths with coordinates
 */
router.post('/image', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({
        error: 'No image file provided',
        hint: 'Send a file with key "image" in multipart/form-data',
      });
      return;
    }

    const imagePath = req.file.path;
    console.log(`Analyzing uploaded image: ${req.file.originalname}`);

    // Run accurate detection
    const result = await analyzeFloorPlan(imagePath);

    // Convert booths to nodes format for frontend compatibility
    const nodes = result.booths.map((booth) => ({
      name: `Booth ${booth.id}`,
      type: 'booth' as const,
      x: booth.centerX,
      y: booth.centerY,
      confidence: booth.fillRatio, // Use fill ratio as confidence
      boundingBox: {
        x: booth.centerX - booth.width / 2,
        y: booth.centerY - booth.height / 2,
        width: booth.width,
        height: booth.height,
      },
      validationFlags: {
        sizeValid: true,
        positionValid: true,
        isolationCheck: true,
      },
    }));

    res.status(200).json({
      success: true,
      nodes,
      edges: [], // Will be calculated based on walkable areas
      metadata: {
        imageWidth: result.imageWidth,
        imageHeight: result.imageHeight,
        totalBooths: result.booths.length,
        totalIntersections: 0,
        totalEntrances: 0,
        averageConfidence: result.booths.length > 0
          ? result.booths.reduce((sum, b) => sum + b.fillRatio, 0) / result.booths.length
          : 0,
        analysisTime: result.analysisTimeMs,
        warnings: [],
        walkablePercentage: result.walkableArea?.percentage || 0,
      },
      qualityScore: Math.round(
        (result.booths.length > 0 ? 80 : 0) +
        (result.walkableArea ? 20 : 0)
      ),
      file: {
        path: imagePath,
        filename: req.file.filename,
        url: `/uploads/${req.file.filename}`,
      },
    });

    return;
  } catch (error: any) {
    console.error('Analysis error:', error);
    res.status(500).json({
      error: 'Failed to analyze floor plan',
      details: error.message,
    });
  }
});

/**
 * POST /api/analyze/from-path
 * Analyze a floor plan from an existing file path
 */
router.post('/from-path', async (req: Request, res: Response) => {
  try {
    const { imagePath } = req.body;

    if (!imagePath) {
      res.status(400).json({
        error: 'imagePath is required',
      });
      return;
    }

    if (!fs.existsSync(imagePath)) {
      res.status(404).json({
        error: 'Image file not found',
        path: imagePath,
      });
      return;
    }

    console.log(`Analyzing image from path: ${imagePath}`);

    const result = await analyzeFloorPlan(imagePath);

    res.status(200).json({
      success: true,
      booths: result.booths,
      boothCount: result.booths.length,
      imageWidth: result.imageWidth,
      imageHeight: result.imageHeight,
      walkablePercentage: result.walkableArea?.percentage || 0,
      analysisTimeMs: result.analysisTimeMs,
    });

    return;
  } catch (error: any) {
    console.error('Analysis error:', error);
    res.status(500).json({
      error: 'Failed to analyze floor plan',
      details: error.message,
    });
  }
});

/**
 * POST /api/analyze/detect-booths
 * Detect only booths (without walkable areas)
 */
router.post('/detect-booths', upload.single('image'), async (req: Request, res: Response) => {
  try {
    let imagePath: string;

    if (req.file) {
      imagePath = req.file.path;
    } else if (req.body.imagePath) {
      imagePath = req.body.imagePath;
      if (!fs.existsSync(imagePath)) {
        res.status(404).json({ error: 'Image file not found' });
        return;
      }
    } else {
      res.status(400).json({
        error: 'Provide either an image file or imagePath in body',
      });
      return;
    }

    console.log(`Detecting booths in: ${imagePath}`);

    const booths = await detectBooths(imagePath);

    res.status(200).json({
      success: true,
      booths,
      count: booths.length,
      categories: {
        small: booths.filter((b) => b.category === 'small').length,
        medium: booths.filter((b) => b.category === 'medium').length,
        large: booths.filter((b) => b.category === 'large').length,
      },
    });

    return;
  } catch (error: any) {
    console.error('Booth detection error:', error);
    res.status(500).json({
      error: 'Failed to detect booths',
      details: error.message,
    });
  }
});

/**
 * POST /api/analyze/annotate
 * Create an annotated image with red dots at booth centers
 */
router.post('/annotate', upload.single('image'), async (req: Request, res: Response) => {
  try {
    let imagePath: string;

    if (req.file) {
      imagePath = req.file.path;
    } else if (req.body.imagePath) {
      imagePath = req.body.imagePath;
      if (!fs.existsSync(imagePath)) {
        res.status(404).json({ error: 'Image file not found' });
        return;
      }
    } else {
      res.status(400).json({
        error: 'Provide either an image file or imagePath in body',
      });
      return;
    }

    const dotRadius = parseInt(req.body.dotRadius) || 3;

    // Generate output path
    const baseName = path.basename(imagePath, path.extname(imagePath));
    const outputPath = path.join(uploadsDir, `${baseName}_annotated.png`);

    console.log(`Creating annotated image: ${outputPath}`);

    const boothCount = await createAnnotatedImage(imagePath, outputPath, dotRadius);

    res.status(200).json({
      success: true,
      boothCount,
      annotatedImage: {
        path: outputPath,
        url: `/uploads/${path.basename(outputPath)}`,
      },
    });

    return;
  } catch (error: any) {
    console.error('Annotation error:', error);
    res.status(500).json({
      error: 'Failed to create annotated image',
      details: error.message,
    });
  }
});

/**
 * POST /api/analyze/floor-plan-data
 * Analyze floor plan from raw pixel data (Canvas API)
 * Kept for backwards compatibility with existing frontend
 */
router.post('/floor-plan-data', async (req: Request, res: Response) => {
  try {
    const { pixels, width, height } = req.body;

    if (!pixels || !width || !height) {
      res.status(400).json({
        error: 'pixels (array), width, and height are required',
      });
      return;
    }

    console.log(`Analyzing floor plan data: ${width}x${height}`);

    // Convert pixels array to grayscale and detect booths
    const grayscale = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const offset = i * 4;
      // Convert RGB to grayscale
      grayscale[i] = Math.round(
        pixels[offset] * 0.299 +
        pixels[offset + 1] * 0.587 +
        pixels[offset + 2] * 0.114
      );
    }

    // Binary threshold
    const binary = new Uint8Array(width * height);
    for (let i = 0; i < grayscale.length; i++) {
      binary[i] = grayscale[i] > 180 ? 1 : 0;
    }

    // Union-Find connected component labeling
    class UnionFind {
      parent: number[];
      rank: number[];

      constructor(size: number) {
        this.parent = Array.from({ length: size }, (_, i) => i);
        this.rank = new Array(size).fill(0);
      }

      find(x: number): number {
        if (this.parent[x] !== x) {
          this.parent[x] = this.find(this.parent[x]);
        }
        return this.parent[x];
      }

      union(x: number, y: number): void {
        const px = this.find(x);
        const py = this.find(y);
        if (px === py) return;
        if (this.rank[px] < this.rank[py]) {
          this.parent[px] = py;
        } else if (this.rank[px] > this.rank[py]) {
          this.parent[py] = px;
        } else {
          this.parent[py] = px;
          this.rank[px]++;
        }
      }
    }

    const uf = new UnionFind(width * height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (binary[idx] === 0) continue;
        if (x > 0 && binary[idx - 1]) uf.union(idx, idx - 1);
        if (y > 0 && binary[idx - width]) uf.union(idx, idx - width);
      }
    }

    interface Region {
      minX: number;
      maxX: number;
      minY: number;
      maxY: number;
      count: number;
    }

    const regions = new Map<number, Region>();

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (binary[idx] === 0) continue;
        const root = uf.find(idx);
        if (!regions.has(root)) {
          regions.set(root, { minX: x, maxX: x, minY: y, maxY: y, count: 0 });
        }
        const r = regions.get(root)!;
        r.minX = Math.min(r.minX, x);
        r.maxX = Math.max(r.maxX, x);
        r.minY = Math.min(r.minY, y);
        r.maxY = Math.max(r.maxY, y);
        r.count++;
      }
    }

    const nodes: any[] = [];
    regions.forEach((r) => {
      const w = r.maxX - r.minX + 1;
      const h = r.maxY - r.minY + 1;
      const fillRatio = r.count / (w * h);

      if (r.count < 10) return;
      if (w < 5 || h < 5) return;
      if (w > width * 0.95 || h > height * 0.95) return;
      if (fillRatio < 0.3) return;

      nodes.push({
        name: `Booth ${nodes.length + 1}`,
        type: 'booth',
        x: Math.round((r.minX + r.maxX) / 2),
        y: Math.round((r.minY + r.maxY) / 2),
        confidence: fillRatio,
        boundingBox: { x: r.minX, y: r.minY, width: w, height: h },
        validationFlags: { sizeValid: true, positionValid: true, isolationCheck: true },
      });
    });

    console.log(`Detected ${nodes.length} booths from pixel data`);

    res.status(200).json({
      nodes,
      edges: [],
      metadata: {
        imageWidth: width,
        imageHeight: height,
        totalBooths: nodes.length,
        totalIntersections: 0,
        totalEntrances: 0,
        averageConfidence: nodes.length > 0
          ? nodes.reduce((sum, n) => sum + n.confidence, 0) / nodes.length
          : 0,
        analysisTime: 0,
        warnings: [],
      },
      qualityScore: nodes.length > 0 ? 85 : 0,
    });

    return;
  } catch (error: any) {
    console.error('Floor plan analysis error:', error);
    res.status(500).json({
      error: 'Failed to analyze floor plan',
      details: error.message,
    });
  }
});

/**
 * POST /api/analyze/validate-detection
 * Validate a single detected node or edge
 */
router.post('/validate-detection', async (req: Request, res: Response) => {
  try {
    const { type, detection, action, modifications } = req.body;

    if (!type || !detection || !action) {
      res.status(400).json({
        error: 'type, detection, and action are required',
      });
      return;
    }

    if (!['node', 'edge'].includes(type)) {
      res.status(400).json({ error: 'type must be "node" or "edge"' });
      return;
    }

    if (!['approve', 'reject', 'modify'].includes(action)) {
      res.status(400).json({
        error: 'action must be "approve", "reject", or "modify"',
      });
      return;
    }

    const result = {
      type,
      action,
      original: detection,
      modified: action === 'modify' ? modifications : detection,
      timestamp: new Date().toISOString(),
    };

    console.log(`Detection ${action}ed: ${type} - ${detection.name || 'unnamed'}`);

    res.status(200).json(result);

    return;
  } catch (error: any) {
    console.error('Validation error:', error);
    res.status(500).json({
      error: 'Failed to validate detection',
      details: error.message,
    });
  }
});

/**
 * POST /api/analyze/navigation-graph
 * Generate a navigation graph for walkable corridor routing.
 * Returns waypoint nodes in walkable areas and booth entrance points.
 * Edges only connect nodes with clear walkable paths between them.
 */
router.post('/navigation-graph', upload.single('image'), async (req: Request, res: Response) => {
  try {
    let imagePath: string;

    if (req.file) {
      imagePath = req.file.path;
    } else if (req.body.imagePath) {
      imagePath = req.body.imagePath;
      if (!fs.existsSync(imagePath)) {
        res.status(404).json({ error: 'Image file not found' });
        return;
      }
    } else {
      res.status(400).json({
        error: 'Provide either an image file or imagePath in body',
      });
      return;
    }

    // OPTIMIZED: Default to 15px grid spacing for better corridor detection
    // Smaller grid catches more narrow corridors and creates more direct paths
    const gridSpacing = parseInt(req.body.gridSpacing) || 15;

    console.log(`Generating navigation graph for: ${imagePath}`);

    const navGraph = await generateNavigationGraph(imagePath, gridSpacing);

    // Convert to frontend-compatible format
    // Now uses simplified structure: 'booth' (destinations) and 'waypoint' (routing)
    const nodes = navGraph.nodes.map((node) => ({
      name: node.boothName || (node.type === 'booth' ? `Booth ${node.boothId}` : `Waypoint ${node.id}`),
      type: node.type,
      x: node.x,
      y: node.y,
      navNodeId: node.id,
      navNodeType: node.type,
      boothId: node.boothId,
      boothName: node.boothName,
      confidence: 1.0,
      validationFlags: {
        sizeValid: true,
        positionValid: true,
        isolationCheck: true,
      },
    }));

    const edges = navGraph.edges.map((edge) => ({
      fromNode: `node-${edge.fromId}`,
      toNode: `node-${edge.toId}`,
      fromNodeIndex: edge.fromId,
      toNodeIndex: edge.toId,
      distance: edge.distance,
      confidence: 1.0,
      validationFlags: {
        pathClear: true,
        distanceReasonable: true,
        angleValid: true,
      },
    }));

    res.status(200).json({
      success: true,
      nodes,
      edges,
      booths: navGraph.booths,
      metadata: {
        totalWaypoints: navGraph.nodes.filter(n => n.type === 'waypoint').length,
        totalBooths: navGraph.nodes.filter(n => n.type === 'booth').length,
        totalEdges: navGraph.edges.length,
        gridSpacing,
      },
      file: req.file ? {
        path: imagePath,
        filename: req.file.filename,
        url: `/uploads/${req.file.filename}`,
      } : undefined,
    });

    return;
  } catch (error: any) {
    console.error('Navigation graph generation error:', error);
    res.status(500).json({
      error: 'Failed to generate navigation graph',
      details: error.message,
    });
  }
});

/**
 * POST /api/analyze/batch-validate
 * Validate multiple detections at once
 */
router.post('/batch-validate', async (req: Request, res: Response) => {
  try {
    const { nodes, edges, action, minConfidence } = req.body;

    if (!action) {
      res.status(400).json({ error: 'action is required' });
      return;
    }

    const threshold = minConfidence || 0.8;

    const approvedNodes = nodes?.filter((n: any) => n.confidence >= threshold) || [];
    const approvedEdges = edges?.filter((e: any) => e.confidence >= threshold) || [];

    console.log(`Batch validation: ${approvedNodes.length} nodes, ${approvedEdges.length} edges approved`);

    res.status(200).json({
      approvedNodes,
      approvedEdges,
      rejectedNodes: (nodes?.length || 0) - approvedNodes.length,
      rejectedEdges: (edges?.length || 0) - approvedEdges.length,
      threshold,
    });

    return;
  } catch (error: any) {
    console.error('Batch validation error:', error);
    res.status(500).json({
      error: 'Failed to batch validate',
      details: error.message,
    });
  }
});

export default router;
