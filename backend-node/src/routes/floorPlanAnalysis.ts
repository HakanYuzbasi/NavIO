/**
 * Floor Plan Analysis Routes
 * API endpoints for automatic floor plan detection
 */

import { Router, Request, Response } from 'express';
import { floorPlanAnalyzer, ImageData } from '../services/floorPlanAnalyzer';

const router = Router();

/**
 * POST /api/analyze/floor-plan
 * Analyze uploaded floor plan image
 *
 * Expects image data as base64 or binary
 * Returns detected nodes and edges with confidence scores
 */
router.post('/floor-plan', async (req: Request, res: Response) => {
  try {
    const { imageDataUrl, width, height } = req.body;

    if (!imageDataUrl || !width || !height) {
      return res.status(400).json({
        error: 'imageDataUrl, width, and height are required',
      });
    }

    // Convert base64 to image data
    // Note: In production, use a proper image processing library like 'canvas' or 'sharp'
    // For now, we expect pre-processed image data from the frontend

    console.log(`Analyzing floor plan: ${width}x${height}`);

    // For demonstration, create mock image data
    // In production, the frontend will send actual pixel data
    const mockImageData: ImageData = {
      data: new Uint8ClampedArray(width * height * 4),
      width,
      height,
    };

    // Parse image data from base64
    // This is simplified - in production use proper image decoding
    const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, '');

    // Note: Actual image processing would happen here
    // The frontend will use Canvas API to extract pixel data

    // For now, return success with instruction
    return res.status(200).json({
      message: 'Image received. Please use the browser-based analysis endpoint.',
      instruction: 'Use Canvas API in frontend to extract pixel data and send to /api/analyze/floor-plan-data',
    });

  } catch (error: any) {
    console.error('Floor plan analysis error:', error);
    res.status(500).json({
      error: 'Failed to analyze floor plan',
      details: error.message,
    });
  }
});

/**
 * POST /api/analyze/floor-plan-data
 * Analyze floor plan from pixel data
 *
 * Expects raw pixel data extracted by Canvas API
 */
router.post('/floor-plan-data', async (req: Request, res: Response) => {
  try {
    const { pixels, width, height } = req.body;

    if (!pixels || !width || !height) {
      return res.status(400).json({
        error: 'pixels (array), width, and height are required',
      });
    }

    console.log(`Analyzing floor plan data: ${width}x${height}`);

    // Convert array to Uint8ClampedArray
    const imageData: ImageData = {
      data: new Uint8ClampedArray(pixels),
      width,
      height,
    };

    // Run analysis
    const analysisResult = await floorPlanAnalyzer.analyzeFloorPlan(imageData);

    // Log results
    console.log(`✓ Analysis complete:`);
    console.log(`  - Nodes detected: ${analysisResult.nodes.length}`);
    console.log(`  - Edges detected: ${analysisResult.edges.length}`);
    console.log(`  - Quality score: ${analysisResult.qualityScore}/100`);
    console.log(`  - Average confidence: ${(analysisResult.metadata.averageConfidence * 100).toFixed(1)}%`);

    return res.status(200).json(analysisResult);

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
 *
 * Allows admin to approve/reject/modify detections
 */
router.post('/validate-detection', async (req: Request, res: Response) => {
  try {
    const { type, detection, action, modifications } = req.body;

    if (!type || !detection || !action) {
      return res.status(400).json({
        error: 'type, detection, and action are required',
      });
    }

    if (!['node', 'edge'].includes(type)) {
      return res.status(400).json({
        error: 'type must be "node" or "edge"',
      });
    }

    if (!['approve', 'reject', 'modify'].includes(action)) {
      return res.status(400).json({
        error: 'action must be "approve", "reject", or "modify"',
      });
    }

    // Process validation
    const result = {
      type,
      action,
      original: detection,
      modified: action === 'modify' ? modifications : detection,
      timestamp: new Date().toISOString(),
    };

    console.log(`✓ Detection ${action}ed: ${type} - ${detection.name || 'unnamed'}`);

    return res.status(200).json(result);

  } catch (error: any) {
    console.error('Validation error:', error);
    res.status(500).json({
      error: 'Failed to validate detection',
      details: error.message,
    });
  }
});

/**
 * POST /api/analyze/batch-validate
 * Validate multiple detections at once
 *
 * Allows admin to approve all high-confidence detections
 */
router.post('/batch-validate', async (req: Request, res: Response) => {
  try {
    const { nodes, edges, action, minConfidence } = req.body;

    if (!action) {
      return res.status(400).json({
        error: 'action is required',
      });
    }

    const threshold = minConfidence || 0.8;

    const approvedNodes = nodes?.filter((n: any) => n.confidence >= threshold) || [];
    const approvedEdges = edges?.filter((e: any) => e.confidence >= threshold) || [];

    console.log(`✓ Batch validation:`);
    console.log(`  - Approved nodes: ${approvedNodes.length}/${nodes?.length || 0}`);
    console.log(`  - Approved edges: ${approvedEdges.length}/${edges?.length || 0}`);

    return res.status(200).json({
      approvedNodes,
      approvedEdges,
      rejectedNodes: (nodes?.length || 0) - approvedNodes.length,
      rejectedEdges: (edges?.length || 0) - approvedEdges.length,
      threshold,
    });

  } catch (error: any) {
    console.error('Batch validation error:', error);
    res.status(500).json({
      error: 'Failed to batch validate',
      details: error.message,
    });
  }
});

export default router;
