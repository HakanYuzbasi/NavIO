/**
 * NavigationPanel Component - Google Maps Style
 *
 * Provides intuitive navigation UI without technical coordinates
 */
import React, { useState } from 'react';
import { POI, Node, RouteResponse } from '../types';

interface NavigationPanelProps {
  pois: POI[];
  nodes: Node[];
  currentLocation?: { nodeId: string; name?: string };
  onCalculateRoute: (startNodeId: string, endNodeId: string) => void;
  route?: RouteResponse | null;
  loading?: boolean;
}

const NavigationPanel: React.FC<NavigationPanelProps> = ({
  pois,
  nodes,
  currentLocation,
  onCalculateRoute,
  route,
  loading,
}) => {
  const [startNodeId, setStartNodeId] = useState<string>(currentLocation?.nodeId || '');
  const [endNodeId, setEndNodeId] = useState<string>('');

  const handleCalculate = () => {
    if (startNodeId && endNodeId) {
      onCalculateRoute(startNodeId, endNodeId);
    }
  };

  // Convert distance units to meters (assume 1 unit = 1 pixel, 1 meter ≈ 10 pixels)
  const formatDistance = (distance: number): string => {
    const meters = Math.round(distance / 10);
    if (meters < 1000) {
      return `${meters} meters`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  };

  // Format time in a friendly way
  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return "less than 1 min";
    }
    const minutes = Math.ceil(seconds / 60);
    if (minutes === 1) {
      return "1 min";
    }
    if (minutes < 60) {
      return `${minutes} mins`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    if (remainingMins === 0) {
      return `${hours} ${hours === 1 ? 'hr' : 'hrs'}`;
    }
    return `${hours} hr ${remainingMins} min`;
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{
          margin: '0 0 8px 0',
          fontSize: '20px',
          fontWeight: 'bold',
          color: '#1f2937'
        }}>
          Where to?
        </h2>
        <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
          Choose your destination and we'll show you the way
        </p>
      </div>

      {/* Current Location Badge */}
      {currentLocation && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#dbeafe',
            borderRadius: '8px',
            marginBottom: '20px',
            border: '1px solid #93c5fd',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>📍</span>
            <div>
              <div style={{ fontSize: '12px', color: '#1e40af', fontWeight: 500 }}>
                You are here
              </div>
              <div style={{ fontSize: '14px', color: '#1e3a8a', fontWeight: 'bold' }}>
                {currentLocation.name || 'Current Location'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Start Location */}
      <div style={{ marginBottom: '16px' }}>
        <label
          htmlFor="start"
          style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '600',
            fontSize: '14px',
            color: '#374151'
          }}
        >
          🚀 Starting from
        </label>
        <select
          id="start"
          value={startNodeId}
          onChange={(e) => setStartNodeId(e.target.value)}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            border: '2px solid #e5e7eb',
            fontSize: '14px',
            backgroundColor: 'white',
            cursor: 'pointer',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
          onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
        >
          <option value="">Choose your starting point...</option>
          {pois.length > 0 && (
            <optgroup label="🏪 Locations">
              {pois
                .filter((poi) => poi.node_id)
                .map((poi) => (
                  <option key={poi.id} value={poi.node_id!}>
                    {poi.name}
                    {poi.category ? ` • ${poi.category}` : ''}
                  </option>
                ))}
            </optgroup>
          )}
          {nodes.filter((node) => node.name).length > 0 && (
            <optgroup label="🚪 Entrances & Exits">
              {nodes
                .filter((node) => node.name)
                .map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.name}
                    {node.node_type !== 'waypoint' ? ` • ${node.node_type}` : ''}
                  </option>
                ))}
            </optgroup>
          )}
        </select>
      </div>

      {/* Destination */}
      <div style={{ marginBottom: '20px' }}>
        <label
          htmlFor="end"
          style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '600',
            fontSize: '14px',
            color: '#374151'
          }}
        >
          🎯 Going to
        </label>
        <select
          id="end"
          value={endNodeId}
          onChange={(e) => setEndNodeId(e.target.value)}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            border: '2px solid #e5e7eb',
            fontSize: '14px',
            backgroundColor: 'white',
            cursor: 'pointer',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
          onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
        >
          <option value="">Choose your destination...</option>
          {pois.length > 0 && (
            <optgroup label="🏪 Locations">
              {pois
                .filter((poi) => poi.node_id)
                .map((poi) => (
                  <option key={poi.id} value={poi.node_id!}>
                    {poi.name}
                    {poi.category ? ` • ${poi.category}` : ''}
                  </option>
                ))}
            </optgroup>
          )}
          {nodes.filter((node) => node.name).length > 0 && (
            <optgroup label="🚪 Entrances & Exits">
              {nodes
                .filter((node) => node.name)
                .map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.name}
                    {node.node_type !== 'waypoint' ? ` • ${node.node_type}` : ''}
                  </option>
                ))}
            </optgroup>
          )}
        </select>
      </div>

      {/* Get Directions Button */}
      <button
        onClick={handleCalculate}
        disabled={!startNodeId || !endNodeId || loading}
        style={{
          width: '100%',
          padding: '14px',
          backgroundColor: startNodeId && endNodeId ? '#3b82f6' : '#9ca3af',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: startNodeId && endNodeId ? 'pointer' : 'not-allowed',
          transition: 'all 0.2s',
          boxShadow: startNodeId && endNodeId ? '0 2px 8px rgba(59, 130, 246, 0.3)' : 'none',
        }}
        onMouseEnter={(e) => {
          if (startNodeId && endNodeId && !loading) {
            e.currentTarget.style.backgroundColor = '#2563eb';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }
        }}
        onMouseLeave={(e) => {
          if (startNodeId && endNodeId && !loading) {
            e.currentTarget.style.backgroundColor = '#3b82f6';
            e.currentTarget.style.transform = 'translateY(0)';
          }
        }}
      >
        {loading ? '⏳ Finding best route...' : '🧭 Get Directions'}
      </button>

      {/* Route Information */}
      {route && route.success && (
        <div style={{ marginTop: '24px' }}>
          {/* Trip Summary */}
          <div
            style={{
              padding: '16px',
              backgroundColor: '#f0fdf4',
              borderRadius: '12px',
              marginBottom: '20px',
              border: '2px solid #86efac',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#15803d', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Fastest Route
                </div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#15803d' }}>
                  {formatTime(route.estimated_time_seconds)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '12px', color: '#16a34a' }}>
                  Distance
                </div>
                <div style={{ fontSize: '18px', fontWeight: '600', color: '#15803d' }}>
                  {formatDistance(route.total_distance)}
                </div>
              </div>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              color: '#16a34a',
              paddingTop: '8px',
              borderTop: '1px solid #bbf7d0'
            }}>
              <span>🚶</span>
              <span>Walking directions • {route.instructions.length} steps</span>
            </div>
          </div>

          {/* Turn-by-Turn Directions */}
          <div>
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#1f2937'
            }}>
              Step-by-Step Directions
            </h3>

            <div style={{ position: 'relative' }}>
              {/* Timeline line */}
              <div style={{
                position: 'absolute',
                left: '15px',
                top: '10px',
                bottom: '10px',
                width: '2px',
                backgroundColor: '#e5e7eb'
              }} />

              {route.instructions.map((instruction, index) => {
                const isFirst = index === 0;
                const isLast = index === route.instructions.length - 1;

                return (
                  <div
                    key={instruction.step}
                    style={{
                      position: 'relative',
                      paddingLeft: '48px',
                      paddingBottom: isLast ? '0' : '20px',
                    }}
                  >
                    {/* Step number badge */}
                    <div
                      style={{
                        position: 'absolute',
                        left: '0',
                        top: '0',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: isFirst ? '#10b981' : isLast ? '#ef4444' : '#3b82f6',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        zIndex: 1,
                      }}
                    >
                      {isFirst ? '🚀' : isLast ? '🎯' : instruction.step}
                    </div>

                    {/* Instruction content */}
                    <div style={{
                      backgroundColor: 'white',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                    }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#1f2937',
                        marginBottom: '4px'
                      }}>
                        {instruction.action}
                      </div>
                      {instruction.distance > 0 && (
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          {formatDistance(instruction.distance)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {route && !route.success && (
        <div
          style={{
            marginTop: '20px',
            padding: '16px',
            backgroundColor: '#fee2e2',
            borderRadius: '8px',
            border: '2px solid #fecaca',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#991b1b', marginBottom: '4px' }}>
                Couldn't find a route
              </div>
              <div style={{ fontSize: '13px', color: '#b91c1c' }}>
                {route.error || 'Try selecting different start and end locations'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NavigationPanel;
