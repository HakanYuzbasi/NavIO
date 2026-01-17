/**
 * Interactive Map Component
 * SVG-based map with zoom, pan, and route visualization
 */

import React, { useRef, useState, useEffect } from 'react';
import { Node, Edge, Venue } from '../types';

interface InteractiveMapProps {
  venue: Venue;
  nodes: Node[];
  edges: Edge[];
  route?: Node[];
  currentLocation?: Node;
  destination?: Node;
  onNodeClick?: (node: Node) => void;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  venue,
  nodes,
  edges,
  route,
  currentLocation,
  destination,
  onNodeClick,
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

  const renderEdges = () => {
    return edges.map(edge => {
      const fromNode = nodes.find(n => n.id === edge.fromNodeId);
      const toNode = nodes.find(n => n.id === edge.toNodeId);

      if (!fromNode || !toNode) return null;

      return (
        <line
          key={edge.id}
          x1={fromNode.x}
          y1={fromNode.y}
          x2={toNode.x}
          y2={toNode.y}
          stroke="#ddd"
          strokeWidth="2"
          strokeDasharray="5,5"
        />
      );
    });
  };

  const renderRoute = () => {
    if (!route || route.length < 2) return null;

    const pathData = route.map((node, index) => {
      if (index === 0) return `M ${node.x} ${node.y}`;
      return `L ${node.x} ${node.y}`;
    }).join(' ');

    return (
      <>
        <path
          d={pathData}
          stroke="#3b82f6"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Animated dots along the path */}
        <path
          d={pathData}
          stroke="#60a5fa"
          strokeWidth="4"
          fill="none"
          strokeDasharray="0,10"
          strokeLinecap="round"
        >
          <animate
            attributeName="stroke-dashoffset"
            from="0"
            to="10"
            dur="1s"
            repeatCount="indefinite"
          />
        </path>
      </>
    );
  };

  const renderNodes = () => {
    return nodes.map(node => {
      const isCurrent = currentLocation?.id === node.id;
      const isDestination = destination?.id === node.id;
      const isOnRoute = route?.some(n => n.id === node.id);

      let fill = '#6b7280'; // Default gray
      let radius = 6;

      if (isCurrent) {
        fill = '#10b981'; // Green for current location
        radius = 10;
      } else if (isDestination) {
        fill = '#ef4444'; // Red for destination
        radius = 10;
      } else if (isOnRoute) {
        fill = '#3b82f6'; // Blue for route nodes
        radius = 8;
      } else if (node.type === 'entrance') {
        fill = '#8b5cf6'; // Purple for entrances
      } else if (node.type === 'booth') {
        fill = '#f59e0b'; // Amber for booths
      }

      return (
        <g
          key={node.id}
          onClick={() => onNodeClick?.(node)}
          style={{ cursor: 'pointer' }}
        >
          <circle
            cx={node.x}
            cy={node.y}
            r={radius}
            fill={fill}
            stroke="white"
            strokeWidth="2"
          />
          {(isCurrent || isDestination) && (
            <circle
              cx={node.x}
              cy={node.y}
              r={radius + 5}
              fill="none"
              stroke={fill}
              strokeWidth="2"
              opacity="0.5"
            >
              <animate
                attributeName="r"
                from={radius + 5}
                to={radius + 15}
                dur="1.5s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                from="0.5"
                to="0"
                dur="1.5s"
                repeatCount="indefinite"
              />
            </circle>
          )}
          <text
            x={node.x}
            y={node.y - radius - 5}
            textAnchor="middle"
            fontSize="12"
            fill="#374151"
            fontWeight="500"
          >
            {node.name}
          </text>
        </g>
      );
    });
  };

  return (
    <div className="interactive-map">
      <svg
        ref={svgRef}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
      >
        {/* Background */}
        {venue.mapImageUrl ? (
          <image
            href={venue.mapImageUrl}
            x="0"
            y="0"
            width={venue.width || 1000}
            height={venue.height || 800}
            opacity="0.3"
          />
        ) : (
          <rect
            x="0"
            y="0"
            width={venue.width || 1000}
            height={venue.height || 800}
            fill="#f9fafb"
          />
        )}

        {/* Grid */}
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

        {/* Edges */}
        <g className="edges">{renderEdges()}</g>

        {/* Route */}
        <g className="route">{renderRoute()}</g>

        {/* Nodes */}
        <g className="nodes">{renderNodes()}</g>
      </svg>

      {/* Map Controls */}
      <div className="map-controls">
        <button onClick={handleZoomIn} title="Zoom In">+</button>
        <button onClick={handleZoomOut} title="Zoom Out">−</button>
        <button onClick={handleResetView} title="Reset View">⊙</button>
      </div>

      <style jsx>{`
        .interactive-map {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          background: #fff;
          border-radius: 8px;
        }

        svg {
          width: 100%;
          height: 100%;
          touch-action: none;
        }

        .map-controls {
          position: absolute;
          top: 16px;
          right: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .map-controls button {
          width: 40px;
          height: 40px;
          border: none;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          cursor: pointer;
          font-size: 20px;
          font-weight: bold;
          color: #374151;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .map-controls button:hover {
          background: #f3f4f6;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .map-controls button:active {
          transform: scale(0.95);
        }
      `}</style>
    </div>
  );
};

export default InteractiveMap;
