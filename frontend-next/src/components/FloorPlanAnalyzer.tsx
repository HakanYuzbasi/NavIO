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

import React, { useState, useRef } from 'react';
import {
  floorPlanAnalysisApi,
  DetectedNode,
  DetectedEdge,
  AnalysisResult,
} from '../lib/api';
import { cn } from '@/lib/utils';
import { Upload, Search, Check, AlertTriangle, Info, MapPin, Share2 } from 'lucide-react';

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
    if (confidence >= 0.9) return 'bg-green-500'; // Green
    if (confidence >= 0.8) return 'bg-blue-500'; // Blue
    if (confidence >= 0.7) return 'bg-amber-500'; // Amber
    return 'bg-red-500'; // Red
  };

  const getConfidenceTextColor = (confidence: number): string => {
    if (confidence >= 0.9) return 'text-green-700 bg-green-50'; // Green
    if (confidence >= 0.8) return 'text-blue-700 bg-blue-50'; // Blue
    if (confidence >= 0.7) return 'text-amber-700 bg-amber-50'; // Amber
    return 'text-red-700 bg-red-50'; // Red
  };

  const getConfidenceLabel = (confidence: number): string => {
    if (confidence >= 0.9) return 'Excellent';
    if (confidence >= 0.8) return 'Good';
    if (confidence >= 0.7) return 'Fair';
    return 'Low';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Upload Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-primary-100 rounded-lg text-primary-600">
            <Upload size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Upload Floor Plan</h3>
            <p className="text-slate-500 text-sm">Upload an image of your venue to automatically detect paths and nodes.</p>
          </div>
        </div>

        <div className="relative border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer group">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="p-4 bg-slate-100 rounded-full group-hover:scale-110 transition-transform duration-300">
              <Upload className="text-slate-400 group-hover:text-primary-500 transition-colors" size={32} />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-slate-700 group-hover:text-primary-600 transition-colors">Click to upload or drag and drop</p>
              <p className="text-sm text-slate-400">SVG, PNG, JPG or GIF (max. 10MB)</p>
            </div>
          </div>
        </div>

        {imageUrl && (
          <div className="mt-8 space-y-6">
            <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-md">
              <img
                ref={imageRef}
                src={imageUrl}
                alt="Floor plan"
                className="w-full h-auto object-contain bg-slate-50"
              />
            </div>

            <canvas ref={canvasRef} style={{ display: 'none' }} />

            <button
              onClick={analyzeFloorPlan}
              disabled={analyzing}
              className={cn(
                "w-full py-4 rounded-xl font-bold text-white shadow-lg shadow-primary-500/20 transition-all flex items-center justify-center gap-3",
                analyzing
                  ? "bg-slate-400 cursor-not-allowed"
                  : "bg-primary-600 hover:bg-primary-700 hover:scale-[1.02]"
              )}
            >
              {analyzing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Analyzing Structure...
                </>
              ) : (
                <>
                  <Search size={20} />
                  Analyze Floor Plan
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
          <AlertTriangle size={20} />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {analysisResult && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Search className="text-primary-500" size={20} />
                Analysis Results
              </h3>
              <p className="text-slate-500 text-sm">Review identified elements and confidence scores.</p>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200">
              <span className="text-sm font-medium text-slate-500">Quality Score:</span>
              <span
                className={cn(
                  "font-bold text-lg",
                  analysisResult.qualityScore >= 80 ? "text-green-600" :
                    analysisResult.qualityScore >= 50 ? "text-amber-600" : "text-red-600"
                )}
              >
                {analysisResult.qualityScore}/100
              </span>
            </div>
          </div>

          <div className="p-6 bg-slate-50 border-b border-slate-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Booths', value: analysisResult.metadata.totalBooths, icon: '🏪' },
                { label: 'Intersections', value: analysisResult.metadata.totalIntersections, icon: '🔀' },
                { label: 'Entrances', value: analysisResult.metadata.totalEntrances, icon: '🚪' },
                { label: 'Edges', value: analysisResult.edges.length, icon: '🔗' },
              ].map((stat) => (
                <div key={stat.label} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="text-2xl">{stat.icon}</div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {analysisResult.metadata.warnings.length > 0 && (
            <div className="mx-6 mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2 text-amber-800 font-semibold">
                <AlertTriangle size={18} />
                Warnings
              </div>
              <ul className="list-disc list-inside text-sm text-amber-700 space-y-1">
                {analysisResult.metadata.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="p-6">
            <div className="flex flex-wrap gap-3 mb-6">
              {[
                { label: 'Excellent (≥90%)', score: 0.9, color: 'bg-green-100 text-green-700 hover:bg-green-200' },
                { label: 'Good (≥80%)', score: 0.8, color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
                { label: 'Fair (≥70%)', score: 0.7, color: 'bg-amber-100 text-amber-700 hover:bg-amber-200' },
              ].map((action) => (
                <button
                  key={action.score}
                  onClick={() => selectAllHighConfidence(action.score)}
                  className={cn("px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2", action.color)}
                >
                  <Check size={14} />
                  Select {action.label}
                </button>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Nodes List */}
              <div className="space-y-4">
                <h4 className="font-bold text-slate-900 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <MapPin size={18} className="text-primary-500" />
                    Detected Nodes
                  </span>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                    {selectedNodes.size}/{analysisResult.nodes.length} selected
                  </span>
                </h4>

                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto bg-slate-50/50">
                  {analysisResult.nodes.map((node, i) => (
                    <div
                      key={i}
                      onClick={() => toggleNodeSelection(i)}
                      className={cn(
                        "p-3 border-b border-slate-100 cursor-pointer flex items-center gap-3 transition-colors hover:bg-white",
                        selectedNodes.has(i) ? "bg-primary-50 hover:bg-primary-50" : ""
                      )}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                        selectedNodes.has(i) ? "bg-primary-600 border-primary-600 text-white" : "border-slate-300 bg-white"
                      )}>
                        {selectedNodes.has(i) && <Check size={12} />}
                      </div>

                      <div className="flex-1">
                        <p className="font-medium text-slate-900 text-sm">{node.name}</p>
                        <p className="text-xs text-slate-500">{node.type} • ({node.x}, {node.y})</p>
                      </div>

                      <div className={cn("px-2 py-1 rounded-md text-xs font-bold", getConfidenceTextColor(node.confidence))}>
                        {(node.confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Edges List */}
              <div className="space-y-4">
                <h4 className="font-bold text-slate-900 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Share2 size={18} className="text-primary-500" />
                    Detected Edges
                  </span>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                    {selectedEdges.size}/{analysisResult.edges.length} selected
                  </span>
                </h4>

                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto bg-slate-50/50">
                  {analysisResult.edges.map((edge, i) => (
                    <div
                      key={i}
                      onClick={() => toggleEdgeSelection(i)}
                      className={cn(
                        "p-3 border-b border-slate-100 cursor-pointer flex items-center gap-3 transition-colors hover:bg-white",
                        selectedEdges.has(i) ? "bg-primary-50 hover:bg-primary-50" : ""
                      )}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                        selectedEdges.has(i) ? "bg-primary-600 border-primary-600 text-white" : "border-slate-300 bg-white"
                      )}>
                        {selectedEdges.has(i) && <Check size={12} />}
                      </div>

                      <div className="flex-1">
                        <p className="font-medium text-slate-900 text-sm">{edge.fromNode} → {edge.toNode}</p>
                        <p className="text-xs text-slate-500">{edge.distance.toFixed(1)}m</p>
                      </div>

                      <div className={cn("px-2 py-1 rounded-md text-xs font-bold", getConfidenceTextColor(edge.confidence))}>
                        {(edge.confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200 flex justify-center">
              <button
                onClick={approveSelected}
                disabled={selectedNodes.size === 0 && selectedEdges.size === 0}
                className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
              >
                <Check size={20} />
                Approve Selected ({selectedNodes.size + selectedEdges.size} items)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloorPlanAnalyzer;
