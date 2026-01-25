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
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 1000, height: 800 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

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
      const padding = 150; // Spacious margin for 3D tilt

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

    return (
      <g className="energy-path">
        {/* SOTA Liquid Core */}
        <path
          d={pathData}
          stroke="rgba(79, 70, 229, 0.8)"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: 'drop-shadow(0 0 8px rgba(99, 102, 241, 0.6))' }}
        />
        {/* Pulsing Energy Flow */}
        <path
          d={pathData}
          stroke="url(#energyGradient)"
          strokeWidth="4"
          fill="none"
          strokeDasharray="4,16"
          strokeLinecap="round"
          className="animate-energy-flow"
        />

        {/* Improved Turn Markers */}
        {turnPoints && turnPoints.map((tp, index) => (
          <g key={`turn-${index}`} className="marker-group drop-shadow-lg">
            {/* Soft Outer Glow */}
            <circle
              cx={tp.node.x}
              cy={tp.node.y}
              r={tp.type === 'start' || tp.type === 'destination' ? 16 : 12}
              fill={tp.type === 'start' ? 'rgba(16, 185, 129, 0.2)' : tp.type === 'destination' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(245, 158, 11, 0.2)'}
            />
            {/* Main Ring */}
            <circle
              cx={tp.node.x}
              cy={tp.node.y}
              r={tp.type === 'start' || tp.type === 'destination' ? 12 : 10}
              fill={
                tp.type === 'start' ? '#10b981' :
                  tp.type === 'destination' ? '#6366f1' :
                    '#f59e0b'
              }
              stroke="white"
              strokeWidth="2.5"
            />
            <text
              x={tp.node.x}
              y={tp.node.y + 4}
              textAnchor="middle"
              fontSize="12"
              fill="white"
              fontWeight="900"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {tp.type === 'start' ? '↑' :
                tp.type === 'destination' ? '★' :
                  tp.type === 'turn-left' ? '←' : '→'}
            </text>

            {/* Instruction Label (Mini) */}
            <g transform={`translate(${tp.node.x}, ${tp.node.y - 25})`}>
              <rect
                x="-40"
                y="-10"
                width="80"
                height="18"
                rx="9"
                fill="rgba(31, 41, 55, 0.9)"
              />
              <text
                textAnchor="middle"
                fontSize="8"
                fill="white"
                fontWeight="bold"
                y="2"
              >
                {tp.type === 'start' ? 'DEPART' : tp.type === 'destination' ? 'ARRIVE' : tp.instruction.toUpperCase()}
              </text>
            </g>
          </g>
        ))}
      </g>
    );
  };

  const renderNodes = () => {
    // Only show booth and entrance nodes - hide waypoints for clean navigation UI
    // Like airport wayfinding, users only need to see destinations, not the routing network
    // CRITICAL: Deduplicate by name - each booth may have multiple entrance nodes
    // but we only want to show ONE marker per booth
    const boothNodes = nodes.filter(node =>
      node.type === 'booth' || node.type === 'entrance' ||
      currentLocation?.id === node.id || destination?.id === node.id
    );

    // Deduplicate by name - keep only one node per unique name
    const seenNames = new Set<string>();
    const visibleNodes: Node[] = [];

    for (const node of boothNodes) {
      // Always include current location and destination (even if duplicate name)
      if (currentLocation?.id === node.id || destination?.id === node.id) {
        visibleNodes.push(node);
        seenNames.add(node.name);
      } else if (!seenNames.has(node.name)) {
        seenNames.add(node.name);
        visibleNodes.push(node);
      }
    }

    return visibleNodes.map(node => {
      const isCurrent = currentLocation?.id === node.id;
      const isDestination = destination?.id === node.id;

      // Don't render current/destination here if turnPoints are provided (they're rendered in route)
      if (turnPoints && (isCurrent || isDestination)) {
        return null;
      }

      // Skip rendering if this node is part of the active route (handled by turnPoints)
      if (turnPoints && route?.some(n => n.id === node.id)) {
        return null;
      }

      let fill = '#6b7280'; // Gray for inactive booths
      let radius = 4;

      if (node.type === 'entrance') {
        fill = '#f59e0b'; // Amber for entrances
        radius = 6;
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
            r={radius}
            fill={fill}
            stroke="white"
            strokeWidth="1"
            opacity={0.7}
          />
        </g>
      );
    });
  };

  return (
    <div
      className="relative w-full h-full overflow-hidden bg-slate-50 dark:bg-slate-900 rounded-3xl shadow-inner border-4 border-white/50 dark:border-slate-800"
      style={{
        perspective: '1200px',
      }}
    >
      <svg
        ref={svgRef}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className={cn(
          "w-full h-full touch-none transition-transform duration-1000 ease-out",
          isPanning ? "cursor-grabbing" : "cursor-grab"
        )}
        style={{
          transform: route ? 'rotateX(25deg) scale(1.1) translateY(-20px)' : 'rotateX(0deg) scale(1)',
          transformOrigin: 'center bottom',
          filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.1))',
        }}
      >
        <defs>
          <linearGradient id="energyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>
          <filter id="markerGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
            <feOffset in="blur" dx="0" dy="0" result="offsetBlur" />
            <feFlood floodColor="#6366f1" floodOpacity="0.5" result="glowColor" />
            <feComposite in="glowColor" in2="offsetBlur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
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
      </svg>

      {/* SOTA Bottom Ambient Overlay (Glass) */}
      {route && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-indigo-600/90 backdrop-blur-md rounded-full shadow-2xl border border-white/20 text-white text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">
          Digital Twin Active
        </div>
      )}

      {/* Map Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-800 rounded-lg shadow-md hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
        >
          <ZoomIn size={20} />
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-800 rounded-lg shadow-md hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
        >
          <ZoomOut size={20} />
        </button>
        <button
          onClick={handleResetView}
          title="Reset View"
          className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-800 rounded-lg shadow-md hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
        >
          <Maximize size={20} />
        </button>
      </div>
    </div>
  );
};

export default InteractiveMap;
