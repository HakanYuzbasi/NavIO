/**
 * RoutePlanner component for selecting start and end locations.
 */
import React from 'react';
import { POI } from '../../types';
import { getCategoryEmoji } from './utils';

interface RoutePlannerProps {
  pois: POI[];
  startNodeId: string;
  endNodeId: string;
  onStartChange: (nodeId: string) => void;
  onEndChange: (nodeId: string) => void;
  onCalculate: () => void;
  loading?: boolean;
}

const RoutePlanner: React.FC<RoutePlannerProps> = ({
  pois,
  startNodeId,
  endNodeId,
  onStartChange,
  onEndChange,
  onCalculate,
  loading,
}) => {
  const [buttonHovered, setButtonHovered] = React.useState(false);
  const isValid = startNodeId && endNodeId;

  return (
    <>
      <div style={{
        padding: '20px',
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        marginBottom: '20px',
      }}>
        <h3 style={{
          margin: '0 0 20px 0',
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#1e293b',
        }}>
          Plan Your Route
        </h3>

        {/* Start Location */}
        <div style={{ marginBottom: '16px' }}>
          <label
            htmlFor="start-location"
            style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#475569',
            }}
          >
            🚀 From
          </label>
          <select
            id="start-location"
            value={startNodeId}
            onChange={(e) => onStartChange(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #e2e8f0',
              borderRadius: '10px',
              fontSize: '14px',
              backgroundColor: 'white',
              cursor: 'pointer',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          >
            <option value="">Choose starting point...</option>
            {pois.filter(poi => poi.node_id).map(poi => (
              <option key={poi.id} value={poi.node_id!}>
                {getCategoryEmoji(poi.category)} {poi.name}
              </option>
            ))}
          </select>
        </div>

        {/* End Location */}
        <div style={{ marginBottom: '20px' }}>
          <label
            htmlFor="end-location"
            style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#475569',
            }}
          >
            🎯 To
          </label>
          <select
            id="end-location"
            value={endNodeId}
            onChange={(e) => onEndChange(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #e2e8f0',
              borderRadius: '10px',
              fontSize: '14px',
              backgroundColor: 'white',
              cursor: 'pointer',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          >
            <option value="">Choose destination...</option>
            {pois.filter(poi => poi.node_id && poi.node_id !== startNodeId).map(poi => (
              <option key={poi.id} value={poi.node_id!}>
                {getCategoryEmoji(poi.category)} {poi.name}
              </option>
            ))}
          </select>
        </div>

        {/* Calculate Button */}
        <button
          onClick={onCalculate}
          disabled={!isValid || loading}
          onMouseEnter={() => setButtonHovered(true)}
          onMouseLeave={() => setButtonHovered(false)}
          style={{
            width: '100%',
            padding: '16px',
            background: isValid
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              : '#cbd5e1',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: isValid ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
            boxShadow: isValid
              ? (buttonHovered && !loading
                ? '0 6px 16px rgba(102, 126, 234, 0.5)'
                : '0 4px 12px rgba(102, 126, 234, 0.4)')
              : 'none',
            transform: buttonHovered && isValid && !loading ? 'translateY(-2px)' : 'translateY(0)',
          }}
        >
          {loading ? '⏳ Finding route...' : '🧭 Get Directions'}
        </button>
      </div>

      {/* Quick Tip */}
      <div style={{
        padding: '16px',
        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
        borderRadius: '12px',
        fontSize: '13px',
        color: '#78350f',
        lineHeight: '1.6',
      }}>
        <strong>💡 Tip:</strong> You can also select locations from the Search tab by clicking on them!
      </div>
    </>
  );
};

export default RoutePlanner;
