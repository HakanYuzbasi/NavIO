/**
 * Floor Plan Analyzer Component
 * Automatic detection with admin review interface
 *
 * Features:
 * - Upload and analyze floor plan images
 * - Visual display of detected nodes and edges
 * - Confidence scoring for each detection
 * - Approve/reject/modify individual detections
 * - Batch approval for high-confidence detections
 * - Manual correction tools
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  floorPlanAnalysisApi,
  DetectedNode,
  DetectedEdge,
  AnalysisResult,
} from '../lib/api';

interface FloorPlanAnalyzerProps {
  venueId: string;
  onNodesApproved: (nodes: DetectedNode[]) => void;
  onEdgesApproved: (edges: DetectedEdge[]) => void;
}

export const FloorPlanAnalyzer: React.FC<FloorPlanAnalyzerProps> = ({
  venueId,
  onNodesApproved,
  onEdgesApproved,
}) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<Set<number>>(new Set());
  const [selectedEdges, setSelectedEdges] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setError(null);
  };

  const analyzeFloorPlan = async () => {
    if (!imageFile || !canvasRef.current || !imageRef.current) return;

    try {
      setAnalyzing(true);
      setError(null);

      console.log('🔍 Starting floor plan analysis...');

      // Wait for image to load
      await new Promise((resolve) => {
        if (imageRef.current!.complete) {
          resolve(null);
        } else {
          imageRef.current!.onload = resolve;
        }
      });

      // Draw image to canvas to extract pixel data
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      const img = imageRef.current;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      ctx.drawImage(img, 0, 0);

      // Get pixel data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = Array.from(imageData.data);

      console.log(`📊 Image size: ${canvas.width}x${canvas.height}`);
      console.log(`📦 Pixel data size: ${pixels.length} bytes`);

      // Send to backend for analysis
      const result = await floorPlanAnalysisApi.analyzeImage(
        pixels,
        canvas.width,
        canvas.height
      );

      console.log('✅ Analysis complete!');
      console.log(`📍 Detected ${result.nodes.length} nodes`);
      console.log(`🔗 Detected ${result.edges.length} edges`);
      console.log(`⭐ Quality score: ${result.qualityScore}/100`);

      setAnalysisResult(result);

      // Auto-select high-confidence detections
      const highConfNodes = new Set(
        result.nodes
          .map((n, i) => ({ ...n, index: i }))
          .filter(n => n.confidence >= 0.8)
          .map(n => n.index)
      );
      const highConfEdges = new Set(
        result.edges
          .map((e, i) => ({ ...e, index: i }))
          .filter(e => e.confidence >= 0.8)
          .map(e => e.index)
      );

      setSelectedNodes(highConfNodes);
      setSelectedEdges(highConfEdges);

    } catch (err: any) {
      console.error('Analysis error:', err);
      setError(err.message || 'Failed to analyze floor plan');
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleNodeSelection = (index: number) => {
    const newSelection = new Set(selectedNodes);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedNodes(newSelection);
  };

  const toggleEdgeSelection = (index: number) => {
    const newSelection = new Set(selectedEdges);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedEdges(newSelection);
  };

  const selectAllHighConfidence = (minConfidence: number) => {
    if (!analysisResult) return;

    const nodes = new Set(
      analysisResult.nodes
        .map((n, i) => ({ ...n, index: i }))
        .filter(n => n.confidence >= minConfidence)
        .map(n => n.index)
    );

    const edges = new Set(
      analysisResult.edges
        .map((e, i) => ({ ...e, index: i }))
        .filter(e => e.confidence >= minConfidence)
        .map(e => e.index)
    );

    setSelectedNodes(nodes);
    setSelectedEdges(edges);
  };

  const approveSelected = () => {
    if (!analysisResult) return;

    const approvedNodes = Array.from(selectedNodes).map(
      i => analysisResult.nodes[i]
    );
    const approvedEdges = Array.from(selectedEdges).map(
      i => analysisResult.edges[i]
    );

    console.log('✅ Approving detections:');
    console.log(`  - Nodes: ${approvedNodes.length}`);
    console.log(`  - Edges: ${approvedEdges.length}`);

    onNodesApproved(approvedNodes);
    onEdgesApproved(approvedEdges);
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.9) return '#10b981'; // Green
    if (confidence >= 0.8) return '#3b82f6'; // Blue
    if (confidence >= 0.7) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  const getConfidenceLabel = (confidence: number): string => {
    if (confidence >= 0.9) return 'Excellent';
    if (confidence >= 0.8) return 'Good';
    if (confidence >= 0.7) return 'Fair';
    return 'Low';
  };

  return (
    <div className="floor-plan-analyzer">
      <div className="upload-section">
        <h3>📤 Upload Floor Plan</h3>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="file-input"
        />

        {imageUrl && (
          <>
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Floor plan"
              className="preview-image"
              style={{ maxWidth: '100%', marginTop: '16px' }}
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            <button
              onClick={analyzeFloorPlan}
              disabled={analyzing}
              className="btn btn-primary analyze-btn"
            >
              {analyzing ? '🔍 Analyzing...' : '🚀 Analyze Floor Plan'}
            </button>
          </>
        )}
      </div>

      {error && (
        <div className="error-box">
          <strong>Error:</strong> {error}
        </div>
      )}

      {analysisResult && (
        <div className="results-section">
          <div className="results-header">
            <h3>📊 Analysis Results</h3>
            <div className="quality-score">
              <span className="label">Quality Score:</span>
              <span
                className="score"
                style={{
                  color: getConfidenceColor(analysisResult.qualityScore / 100),
                }}
              >
                {analysisResult.qualityScore}/100
              </span>
            </div>
          </div>

          <div className="metadata-grid">
            <div className="metadata-item">
              <span className="label">Image Size:</span>
              <span>
                {analysisResult.metadata.imageWidth}×
                {analysisResult.metadata.imageHeight}
              </span>
            </div>
            <div className="metadata-item">
              <span className="label">Analysis Time:</span>
              <span>{analysisResult.metadata.analysisTime}ms</span>
            </div>
            <div className="metadata-item">
              <span className="label">Avg Confidence:</span>
              <span>
                {(analysisResult.metadata.averageConfidence * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="statistics">
            <div className="stat-card">
              <div className="stat-icon">🏪</div>
              <div className="stat-value">{analysisResult.metadata.totalBooths}</div>
              <div className="stat-label">Booths</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🔀</div>
              <div className="stat-value">
                {analysisResult.metadata.totalIntersections}
              </div>
              <div className="stat-label">Intersections</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🚪</div>
              <div className="stat-value">
                {analysisResult.metadata.totalEntrances}
              </div>
              <div className="stat-label">Entrances</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🔗</div>
              <div className="stat-value">{analysisResult.edges.length}</div>
              <div className="stat-label">Edges</div>
            </div>
          </div>

          {analysisResult.metadata.warnings.length > 0 && (
            <div className="warnings">
              <strong>⚠️ Warnings:</strong>
              <ul>
                {analysisResult.metadata.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="actions">
            <button
              onClick={() => selectAllHighConfidence(0.9)}
              className="btn btn-secondary"
            >
              ✅ Select Excellent (≥90%)
            </button>
            <button
              onClick={() => selectAllHighConfidence(0.8)}
              className="btn btn-secondary"
            >
              ✅ Select Good (≥80%)
            </button>
            <button
              onClick={() => selectAllHighConfidence(0.7)}
              className="btn btn-secondary"
            >
              ✅ Select Fair (≥70%)
            </button>
          </div>

          <div className="detection-lists">
            <div className="detection-section">
              <h4>
                📍 Detected Nodes ({selectedNodes.size}/{analysisResult.nodes.length}{' '}
                selected)
              </h4>
              <div className="detection-list">
                {analysisResult.nodes.map((node, i) => (
                  <div
                    key={i}
                    className={`detection-item ${selectedNodes.has(i) ? 'selected' : ''}`}
                    onClick={() => toggleNodeSelection(i)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedNodes.has(i)}
                      onChange={() => toggleNodeSelection(i)}
                    />
                    <div className="detection-info">
                      <div className="detection-name">{node.name}</div>
                      <div className="detection-meta">
                        {node.type} • ({node.x}, {node.y})
                      </div>
                    </div>
                    <div
                      className="confidence-badge"
                      style={{ backgroundColor: getConfidenceColor(node.confidence) }}
                    >
                      {(node.confidence * 100).toFixed(0)}%{' '}
                      {getConfidenceLabel(node.confidence)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="detection-section">
              <h4>
                🔗 Detected Edges ({selectedEdges.size}/{analysisResult.edges.length}{' '}
                selected)
              </h4>
              <div className="detection-list">
                {analysisResult.edges.map((edge, i) => (
                  <div
                    key={i}
                    className={`detection-item ${selectedEdges.has(i) ? 'selected' : ''}`}
                    onClick={() => toggleEdgeSelection(i)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedEdges.has(i)}
                      onChange={() => toggleEdgeSelection(i)}
                    />
                    <div className="detection-info">
                      <div className="detection-name">
                        {edge.fromNode} → {edge.toNode}
                      </div>
                      <div className="detection-meta">
                        {edge.distance.toFixed(1)}m
                      </div>
                    </div>
                    <div
                      className="confidence-badge"
                      style={{ backgroundColor: getConfidenceColor(edge.confidence) }}
                    >
                      {(edge.confidence * 100).toFixed(0)}%{' '}
                      {getConfidenceLabel(edge.confidence)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="approve-section">
            <button
              onClick={approveSelected}
              className="btn btn-primary btn-large"
              disabled={selectedNodes.size === 0 && selectedEdges.size === 0}
            >
              ✅ Approve Selected ({selectedNodes.size} nodes, {selectedEdges.size}{' '}
              edges)
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .floor-plan-analyzer {
          padding: 20px;
        }

        .upload-section {
          background: #f9fafb;
          padding: 24px;
          border-radius: 8px;
          margin-bottom: 24px;
        }

        .upload-section h3 {
          margin-top: 0;
          margin-bottom: 16px;
        }

        .file-input {
          display: block;
          width: 100%;
          padding: 12px;
          border: 2px dashed #d1d5db;
          border-radius: 8px;
          cursor: pointer;
        }

        .analyze-btn {
          margin-top: 16px;
          width: 100%;
        }

        .error-box {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #991b1b;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 24px;
        }

        .results-section {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 24px;
        }

        .results-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 2px solid #e5e7eb;
        }

        .results-header h3 {
          margin: 0;
        }

        .quality-score {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .quality-score .label {
          font-weight: 500;
          color: #6b7280;
        }

        .quality-score .score {
          font-size: 24px;
          font-weight: bold;
        }

        .metadata-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .metadata-item {
          display: flex;
          justify-content: space-between;
          padding: 12px;
          background: #f9fafb;
          border-radius: 6px;
        }

        .metadata-item .label {
          font-weight: 500;
          color: #6b7280;
        }

        .statistics {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
        }

        .stat-icon {
          font-size: 32px;
          margin-bottom: 8px;
        }

        .stat-value {
          font-size: 32px;
          font-weight: bold;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 14px;
          opacity: 0.9;
        }

        .warnings {
          background: #fffbeb;
          border: 1px solid #fcd34d;
          color: #92400e;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 24px;
        }

        .warnings ul {
          margin: 8px 0 0 0;
          padding-left: 20px;
        }

        .actions {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #2563eb;
        }

        .btn-secondary {
          background: #f3f4f6;
          color: #374151;
        }

        .btn-secondary:hover {
          background: #e5e7eb;
        }

        .btn-large {
          padding: 16px 32px;
          font-size: 18px;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .detection-lists {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }

        .detection-section h4 {
          margin-top: 0;
          margin-bottom: 16px;
          color: #111827;
        }

        .detection-list {
          max-height: 400px;
          overflow-y: auto;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
        }

        .detection-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border-bottom: 1px solid #e5e7eb;
          cursor: pointer;
          transition: background 0.2s;
        }

        .detection-item:hover {
          background: #f9fafb;
        }

        .detection-item.selected {
          background: #eff6ff;
        }

        .detection-item:last-child {
          border-bottom: none;
        }

        .detection-info {
          flex: 1;
        }

        .detection-name {
          font-weight: 500;
          color: #111827;
          margin-bottom: 4px;
        }

        .detection-meta {
          font-size: 14px;
          color: #6b7280;
        }

        .confidence-badge {
          padding: 4px 12px;
          border-radius: 12px;
          color: white;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
        }

        .approve-section {
          text-align: center;
        }

        @media (max-width: 768px) {
          .detection-lists {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default FloorPlanAnalyzer;
