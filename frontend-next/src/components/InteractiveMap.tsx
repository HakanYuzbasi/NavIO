/**
 * Interactive Map Component
 * SVG-based map with zoom, pan, and route visualization
 * Shows clean navigation like airport wayfinding - no waypoint dots, only key decision points
 */

import React, { useRef, useState, useEffect } from 'react';
import { Node, Edge, Venue } from '../types';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { cn } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface TurnPoint {
  node: Node;
  type: 'start' | 'turn-left' | 'turn-right' | 'destination';
  instruction: string;
}

interface InteractiveMapProps {
  venue: Venue;
  nodes: Node[];
  edges: Edge[];
  route?: Node[];
  currentLocation?: Node;
  destination?: Node;
  onNodeClick?: (node: Node) => void;
  turnPoints?: TurnPoint[]; // Key navigation points to highlight
  uiTopOffset?: number;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  venue,
  nodes,
  edges,
  route,
  currentLocation,
  destination,
  onNodeClick,
  turnPoints,
  uiTopOffset,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 1000, height: 800 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const topOffsetPx = uiTopOffset ?? 16;

  useEffect(() => {
    if (venue.width && venue.height) {
      setViewBox({ x: 0, y: 0, width: venue.width, height: venue.height });
    }
  }, [venue]);

  // SOTA Auto-Fit Route
  useEffect(() => {
    if (route && route.length > 0) {
      const xs = route.map(n => n.x);
      const ys = route.map(n => n.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      const width = (maxX - minX) || 100;
      const height = (maxY - minY) || 100;
      const padding = 150;

      setViewBox({
        x: minX - padding / 2,
        y: minY - padding / 2,
        width: width + padding,
        height: height + padding,
      });
      setZoom(1);
    }
  }, [route]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsPanning(true);
      setStartPan({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;

    const dx = (e.clientX - startPan.x) * (1 / zoom);
    const dy = (e.clientY - startPan.y) * (1 / zoom);

    setViewBox(prev => ({
      ...prev,
      x: prev.x - dx,
      y: prev.y - dy,
    }));

    setStartPan({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1.1 : 0.9;
    const newZoom = Math.max(0.5, Math.min(5, zoom * delta));

    setZoom(newZoom);
    setViewBox(prev => ({
      ...prev,
      width: (venue.width || 1000) / newZoom,
      height: (venue.height || 800) / newZoom,
    }));
  };

  const handleZoomIn = () => {
    const newZoom = Math.min(5, zoom * 1.2);
    setZoom(newZoom);
    setViewBox(prev => ({
      ...prev,
      width: (venue.width || 1000) / newZoom,
      height: (venue.height || 800) / newZoom,
    }));
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(0.5, zoom / 1.2);
    setZoom(newZoom);
    setViewBox(prev => ({
      ...prev,
      width: (venue.width || 1000) / newZoom,
      height: (venue.height || 800) / newZoom,
    }));
  };

  const handleResetView = () => {
    setZoom(1);
    setViewBox({ x: 0, y: 0, width: venue.width || 1000, height: venue.height || 800 });
  };

  // Don't render edges (network graph) - keep the map clean like airport wayfinding
  const renderEdges = () => {
    // Only show edges in admin/debug mode, not in navigation mode
    return null;
  };

  const renderRoute = () => {
    if (!route || route.length < 2) return null;

    const pathData = route.map((node, index) => {
      if (index === 0) return `M ${node.x} ${node.y}`;
      return `L ${node.x} ${node.y}`;
    }).join(' ');

    // Scale factor: keeps markers/labels at a consistent screen-pixel size
    // regardless of the current zoom level. When zoomed in viewBox shrinks,
    // so s < 1 → SVG sizes shrink → same apparent px. Vice-versa for zoom out.
    const s = viewBox.width / (venue.width || 1000);

    return (
      <g className="route-path">
        {/* Route casing */}
        <path
          d={pathData}
          stroke="rgba(255, 255, 255, 0.95)"
          strokeWidth={16 * s}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Main route line */}
        <path
          d={pathData}
          stroke="#2563eb"
          strokeWidth={10 * s}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Subtle motion layer */}
        <path
          d={pathData}
          stroke="url(#routeFlowGradient)"
          strokeWidth={6 * s}
          fill="none"
          strokeDasharray={`${7 * s},${12 * s}`}
          strokeLinecap="round"
          className="animate-energy-flow"
          opacity={0.95}
        />

        {turnPoints && turnPoints.map((tp, index) => {
          if (tp.type === 'start' || tp.type === 'destination') return null;
          return (
            <g key={`turn-${index}`} transform={`translate(${tp.node.x}, ${tp.node.y})`}>
              <g transform={`scale(${s})`}>
                <circle cx={0} cy={0} r={9} fill="#f59e0b" stroke="white" strokeWidth={2.5} />
                <text
                  x={0}
                  y={3}
                  textAnchor="middle"
                  fontSize="10"
                  fill="white"
                  fontWeight="900"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {tp.type === 'turn-left' ? 'L' : 'R'}
                </text>
              </g>
            </g>
          );
        })}
      </g>
    );
  };

  const renderFocusMarkers = () => {
    const s = viewBox.width / (venue.width || 1000);

    return (
      <>
        {currentLocation && (
          <g transform={`translate(${currentLocation.x}, ${currentLocation.y})`}>
            <g transform={`scale(${s})`}>
              <circle cx={0} cy={0} r={16} fill="rgba(16,185,129,0.18)" />
              <circle cx={0} cy={0} r={9} fill="#10b981" stroke="white" strokeWidth={3} />
              <circle cx={0} cy={0} r={3.5} fill="white" />
              <g transform="translate(0, -23)">
                <rect x={-24} y={-9} width={48} height={16} rx={8} fill="rgba(15,23,42,0.9)" />
                <text x={0} y={2} textAnchor="middle" fontSize="8" fill="white" fontWeight="700">
                  START
                </text>
              </g>
            </g>
          </g>
        )}

        {destination && (
          <g transform={`translate(${destination.x}, ${destination.y})`}>
            <g transform={`scale(${s})`}>
              <circle cx={0} cy={0} r={16} fill="rgba(37,99,235,0.2)" />
              <circle cx={0} cy={0} r={9} fill="#2563eb" stroke="white" strokeWidth={3} />
              <path d="M-3 -2 L3 -2 L1 4 L-1 4 Z" fill="white" />
              <g transform="translate(0, -23)">
                <rect x={-20} y={-9} width={40} height={16} rx={8} fill="rgba(15,23,42,0.9)" />
                <text x={0} y={2} textAnchor="middle" fontSize="8" fill="white" fontWeight="700">
                  END
                </text>
              </g>
            </g>
          </g>
        )}
      </>
    );
  };

  const renderNodes = () => {
    const hasDestinationNodes = nodes.some(node => node.type === 'booth' || node.type === 'entrance');
    const candidateNodes = hasDestinationNodes
      ? nodes.filter(node =>
        node.type === 'booth' || node.type === 'entrance' ||
        currentLocation?.id === node.id || destination?.id === node.id
      )
      : nodes;

    // When destination-style nodes exist, keep one marker per visible label.
    // If not, fall back to all nodes so the map never appears empty.
    const visibleNodes: Node[] = [];
    if (hasDestinationNodes) {
      const seenNames = new Set<string>();
      for (const node of candidateNodes) {
        if (currentLocation?.id === node.id || destination?.id === node.id) {
          visibleNodes.push(node);
          seenNames.add(node.name);
        } else if (!seenNames.has(node.name)) {
          seenNames.add(node.name);
          visibleNodes.push(node);
        }
      }
    } else {
      visibleNodes.push(...candidateNodes);
    }

    // Scale factor for consistent node marker size across zoom levels
    const s = viewBox.width / (venue.width || 1000);

    return visibleNodes.map(node => {
      if (currentLocation?.id === node.id || destination?.id === node.id) return null;

      // Only hide nodes that have an explicit turn point marker rendered on the map
      if (turnPoints) {
        const hasTurnPointMarker = turnPoints.some(tp => tp.node.id === node.id);
        if (hasTurnPointMarker) return null;
      }

      let fill = '#6b7280'; // Gray for inactive booths
      let radius = 4;

      if (node.type === 'entrance') {
        fill = '#f59e0b'; // Amber for entrances
        radius = 6;
      } else if (node.type === 'intersection') {
        fill = '#60a5fa'; // Blue for generic waypoints/intersections
        radius = 3;
      } else if (node.type === 'booth') {
        fill = '#9ca3af'; // Light gray for booths (subtle, not distracting)
        radius = 3;
      }

      return (
        <g
          key={node.id}
          onClick={() => onNodeClick?.(node)}
          style={{ cursor: 'pointer' }}
          className="node-group"
        >
          <circle
            cx={node.x}
            cy={node.y}
            r={radius * s}
            fill={fill}
            stroke="white"
            strokeWidth={1 * s}
            opacity={0.7}
          />
        </g>
      );
    });
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
      <svg
        ref={svgRef}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className={cn(
          "w-full h-full touch-none transition-opacity duration-300",
          isPanning ? "cursor-grabbing" : "cursor-grab"
        )}
      >
        <defs>
          <linearGradient id="routeFlowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#bfdbfe" />
            <stop offset="50%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
        </defs>

        {/* Background */}
        {venue.mapImageUrl ? (
          <image
            href={venue.mapImageUrl.startsWith('http') ? venue.mapImageUrl : `${API_URL}${venue.mapImageUrl}`}
            x="0"
            y="0"
            width={venue.width || 1000}
            height={venue.height || 800}
            preserveAspectRatio="xMidYMid meet"
          />
        ) : (
          <>
            <rect
              x="0"
              y="0"
              width={venue.width || 1000}
              height={venue.height || 800}
              fill="currentColor"
              className="text-slate-50 dark:text-slate-900"
            />
            {/* Grid - only show when no image */}
            <defs>
              <pattern
                id="grid"
                width="50"
                height="50"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 50 0 L 0 0 0 50"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect
              x="0"
              y="0"
              width={venue.width || 1000}
              height={venue.height || 800}
              fill="url(#grid)"
            />
          </>
        )}

        {/* Edges */}
        <g className="edges">{renderEdges()}</g>

        {/* Route */}
        <g className="route">{renderRoute()}</g>

        <g className="nodes">{renderNodes()}</g>
        <g className="focus-markers">{renderFocusMarkers()}</g>
      </svg>

      {!venue.mapImageUrl && nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="px-5 py-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-700/70 text-sm font-semibold text-slate-500 dark:text-slate-300 shadow-lg">
            No map image or nodes available yet.
          </div>
        </div>
      )}

      {/* Live Navigation Status */}
      {route && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-slate-900/85 backdrop-blur-md rounded-full border border-slate-700/80 text-white text-[10px] font-bold uppercase tracking-wider">
          Route Active
        </div>
      )}

      <div
        className="absolute left-4 px-3 py-1.5 rounded-full bg-white/90 dark:bg-slate-800/90 border border-slate-200/70 dark:border-slate-700/70 text-[11px] font-semibold text-slate-600 dark:text-slate-300 shadow-sm pointer-events-none"
        style={{ top: `${topOffsetPx}px` }}
      >
        Drag to pan, scroll to zoom
      </div>

      {/* Map Controls */}
      <div className="absolute right-4 flex flex-col gap-2" style={{ top: `${topOffsetPx}px` }}>
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="w-10 h-10 flex items-center justify-center bg-white/95 dark:bg-slate-800/95 rounded-full shadow-lg hover:bg-white dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
        >
          <ZoomIn size={20} />
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="w-10 h-10 flex items-center justify-center bg-white/95 dark:bg-slate-800/95 rounded-full shadow-lg hover:bg-white dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
        >
          <ZoomOut size={20} />
        </button>
        <button
          onClick={handleResetView}
          title="Reset View"
          className="w-10 h-10 flex items-center justify-center bg-white/95 dark:bg-slate-800/95 rounded-full shadow-lg hover:bg-white dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
        >
          <Maximize size={20} />
        </button>
      </div>
    </div>
  );
};

export default InteractiveMap;
