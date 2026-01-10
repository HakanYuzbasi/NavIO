/**
 * NavigationPanel Component
 *
 * Provides UI for selecting start/end points and displaying navigation instructions
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

  return (
    <div style={{ padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
      <h2 style={{ margin: '0 0 20px 0', fontSize: '24px', fontWeight: 'bold' }}>
        Navigation
      </h2>

      {currentLocation && (
        <div
          style={{
            padding: '12px',
            backgroundColor: '#dbeafe',
            borderRadius: '6px',
            marginBottom: '16px',
          }}
        >
          <p style={{ margin: 0, fontWeight: 'bold' }}>
            📍 Current Location: {currentLocation.name || 'Unknown'}
          </p>
        </div>
      )}

      <div style={{ marginBottom: '16px' }}>
        <label
          htmlFor="start"
          style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}
        >
          Start Location:
        </label>
        <select
          id="start"
          value={startNodeId}
          onChange={(e) => setStartNodeId(e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #d1d5db',
          }}
        >
          <option value="">Select start point...</option>
          <optgroup label="Points of Interest">
            {pois
              .filter((poi) => poi.node_id)
              .map((poi) => (
                <option key={poi.id} value={poi.node_id!}>
                  {poi.name} ({poi.category || 'POI'})
                </option>
              ))}
          </optgroup>
          <optgroup label="Navigation Nodes">
            {nodes
              .filter((node) => node.name)
              .map((node) => (
                <option key={node.id} value={node.id}>
                  {node.name} ({node.node_type})
                </option>
              ))}
          </optgroup>
        </select>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label
          htmlFor="end"
          style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}
        >
          Destination:
        </label>
        <select
          id="end"
          value={endNodeId}
          onChange={(e) => setEndNodeId(e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #d1d5db',
          }}
        >
          <option value="">Select destination...</option>
          <optgroup label="Points of Interest">
            {pois
              .filter((poi) => poi.node_id)
              .map((poi) => (
                <option key={poi.id} value={poi.node_id!}>
                  {poi.name} ({poi.category || 'POI'})
                </option>
              ))}
          </optgroup>
          <optgroup label="Navigation Nodes">
            {nodes
              .filter((node) => node.name)
              .map((node) => (
                <option key={node.id} value={node.id}>
                  {node.name} ({node.node_type})
                </option>
              ))}
          </optgroup>
        </select>
      </div>

      <button
        onClick={handleCalculate}
        disabled={!startNodeId || !endNodeId || loading}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: startNodeId && endNodeId ? '#3b82f6' : '#9ca3af',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontWeight: 'bold',
          cursor: startNodeId && endNodeId ? 'pointer' : 'not-allowed',
        }}
      >
        {loading ? 'Calculating...' : 'Calculate Route'}
      </button>

      {route && route.success && (
        <div style={{ marginTop: '24px' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: 'bold' }}>
            Route Information
          </h3>

          <div
            style={{
              padding: '12px',
              backgroundColor: '#ffffff',
              borderRadius: '6px',
              marginBottom: '16px',
            }}
          >
            <p style={{ margin: '0 0 8px 0' }}>
              <strong>Distance:</strong> {route.total_distance.toFixed(1)} units
            </p>
            <p style={{ margin: 0 }}>
              <strong>Estimated Time:</strong>{' '}
              {Math.ceil(route.estimated_time_seconds / 60)} minutes
            </p>
          </div>

          <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 'bold' }}>
            Directions:
          </h4>

          <ol style={{ margin: 0, paddingLeft: '20px' }}>
            {route.instructions.map((instruction) => (
              <li
                key={instruction.step}
                style={{
                  marginBottom: '12px',
                  lineHeight: '1.5',
                }}
              >
                <div>
                  <strong>{instruction.action}</strong>
                </div>
                {instruction.distance > 0 && (
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>
                    {instruction.distance.toFixed(1)} units
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {route && !route.success && (
        <div
          style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: '#fee2e2',
            borderRadius: '6px',
          }}
        >
          <p style={{ margin: 0, color: '#991b1b' }}>
            <strong>Error:</strong> {route.error || 'Failed to calculate route'}
          </p>
        </div>
      )}
    </div>
  );
};

export default NavigationPanel;
