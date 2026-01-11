/**
 * Visual POI Editor Component
 *
 * Provides a visual interface to place and adjust POIs on the floor plan
 * by clicking and dragging directly on the map.
 */
import React, { useState, useEffect } from 'react';
import FloorPlanMap from './FloorPlanMap';
import api from '../services/api';
import { FloorPlanWithGraph, POI } from '../types';

interface VisualPOIEditorProps {
  floorPlanId: string;
  onClose: () => void;
}

const VisualPOIEditor: React.FC<VisualPOIEditorProps> = ({ floorPlanId, onClose }) => {
  const [floorPlan, setFloorPlan] = useState<FloorPlanWithGraph | null>(null);
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
  const [message, setMessage] = useState<string>('');
  const [mode, setMode] = useState<'select' | 'place'>('select');

  useEffect(() => {
    loadFloorPlan();
  }, [floorPlanId]);

  const loadFloorPlan = async () => {
    try {
      const data = await api.getFloorPlan(floorPlanId);
      setFloorPlan(data);
    } catch (err) {
      console.error('Failed to load floor plan:', err);
    }
  };

  const handleMapClick = (x: number, y: number) => {
    if (mode === 'place' && selectedPOI) {
      // Update POI position
      updatePOIPosition(selectedPOI.id, x, y);
    } else {
      setMessage(`Clicked at: (${Math.round(x)}, ${Math.round(y)})`);
    }
  };

  const handlePOIDrag = async (poiId: string, x: number, y: number) => {
    await updatePOIPosition(poiId, x, y);
  };

  const updatePOIPosition = async (poiId: string, x: number, y: number) => {
    try {
      await api.updatePOI(poiId, { x, y });
      setMessage(`Updated POI position to (${Math.round(x)}, ${Math.round(y)})`);
      // Reload floor plan to show updated position
      loadFloorPlan();
    } catch (err) {
      setMessage('Failed to update POI position');
    }
  };

  if (!floorPlan) {
    return <div>Loading...</div>;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        zIndex: 1000,
      }}
    >
      {/* Sidebar */}
      <div
        style={{
          width: '350px',
          backgroundColor: 'white',
          overflowY: 'auto',
          padding: '20px',
          boxShadow: '2px 0 10px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ margin: '0 0 10px 0' }}>Visual POI Editor</h2>
          <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
            {floorPlan.name}
          </p>
        </div>

        {/* Instructions */}
        <div
          style={{
            padding: '12px',
            backgroundColor: '#eff6ff',
            borderRadius: '6px',
            marginBottom: '20px',
            border: '1px solid #3b82f6',
          }}
        >
          <h4 style={{ margin: '0 0 8px 0', color: '#1e40af' }}>How to use:</h4>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px' }}>
            <li>Click a POI to select it</li>
            <li>Drag POIs to reposition them</li>
            <li>Click on the map to get coordinates</li>
            <li>Use the list below to select POIs</li>
          </ul>
        </div>

        {/* Mode Toggle */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Mode:
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setMode('select')}
              style={{
                flex: 1,
                padding: '8px',
                backgroundColor: mode === 'select' ? '#3b82f6' : '#e5e7eb',
                color: mode === 'select' ? 'white' : 'black',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Select
            </button>
            <button
              onClick={() => setMode('place')}
              style={{
                flex: 1,
                padding: '8px',
                backgroundColor: mode === 'place' ? '#3b82f6' : '#e5e7eb',
                color: mode === 'place' ? 'white' : 'black',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Place
            </button>
          </div>
          {mode === 'place' && (
            <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#666' }}>
              Select a POI below, then click on the map to place it.
            </p>
          )}
        </div>

        {/* Message Display */}
        {message && (
          <div
            style={{
              padding: '10px',
              backgroundColor: '#d1fae5',
              borderRadius: '4px',
              marginBottom: '20px',
              fontSize: '13px',
            }}
          >
            {message}
          </div>
        )}

        {/* POI List */}
        <div>
          <h3 style={{ margin: '0 0 12px 0' }}>POIs ({floorPlan.pois.length})</h3>
          <div style={{ maxHeight: 'calc(100vh - 500px)', overflowY: 'auto' }}>
            {floorPlan.pois.map((poi) => (
              <div
                key={poi.id}
                onClick={() => {
                  setSelectedPOI(poi);
                  setMessage(`Selected: ${poi.name}`);
                }}
                style={{
                  padding: '12px',
                  backgroundColor: selectedPOI?.id === poi.id ? '#dbeafe' : '#f9fafb',
                  borderRadius: '6px',
                  marginBottom: '8px',
                  cursor: 'pointer',
                  border:
                    selectedPOI?.id === poi.id
                      ? '2px solid #3b82f6'
                      : '1px solid #e5e7eb',
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{poi.name}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  Position: ({Math.round(poi.x)}, {Math.round(poi.y)})
                </div>
                {poi.category && (
                  <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                    Category: {poi.category}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            marginTop: '20px',
          }}
        >
          Close Editor
        </button>
      </div>

      {/* Map Area */}
      <div style={{ flex: 1, position: 'relative' }}>
        {floorPlan && (
          <FloorPlanMap
            floorPlan={floorPlan}
            onMapClick={handleMapClick}
            onPOIDrag={handlePOIDrag}
            showNodes={false}
            showEdges={false}
            showPOIs={true}
            placementMode={mode === 'place'}
          />
        )}
      </div>
    </div>
  );
};

export default VisualPOIEditor;
