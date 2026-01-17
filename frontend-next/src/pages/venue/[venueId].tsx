/**
 * Visitor Navigation Page
 * Main page for end users to navigate indoor venues
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import InteractiveMap from '../../components/InteractiveMap';
import QRScanner from '../../components/QRScanner';
import { Node, Venue, Edge, RouteResponse } from '../../types';
import { venueApi, nodeApi, edgeApi, routingApi } from '../../lib/api';

export default function VenueNavigationPage() {
  const router = useRouter();
  const { venueId, node: nodeIdFromQR } = router.query;

  const [venue, setVenue] = useState<Venue | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [currentLocation, setCurrentLocation] = useState<Node | null>(null);
  const [destination, setDestination] = useState<Node | null>(null);
  const [route, setRoute] = useState<RouteResponse | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showNodeSelector, setShowNodeSelector] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (venueId && typeof venueId === 'string') {
      loadVenueData(venueId);
    }
  }, [venueId]);

  useEffect(() => {
    if (nodeIdFromQR && typeof nodeIdFromQR === 'string' && nodes.length > 0) {
      const node = nodes.find(n => n.id === nodeIdFromQR);
      if (node) {
        setCurrentLocation(node);
      }
    }
  }, [nodeIdFromQR, nodes]);

  const loadVenueData = async (id: string) => {
    try {
      setLoading(true);
      const [venueData, nodesData, edgesData] = await Promise.all([
        venueApi.getById(id),
        nodeApi.getAll(id),
        edgeApi.getAll(id),
      ]);

      setVenue(venueData);
      setNodes(nodesData);
      setEdges(edgesData);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load venue data');
    } finally {
      setLoading(false);
    }
  };

  const handleQRScan = (data: string) => {
    try {
      // Parse QR code data (URL format: /venue/{venueId}?node={nodeId})
      const url = new URL(data, window.location.origin);
      const scannedNodeId = url.searchParams.get('node');

      if (scannedNodeId) {
        const node = nodes.find(n => n.id === scannedNodeId);
        if (node) {
          setCurrentLocation(node);
          setShowScanner(false);
        } else {
          setError('Invalid QR code - node not found');
        }
      }
    } catch (err) {
      setError('Invalid QR code format');
    }
  };

  const handleManualLocationSelect = (node: Node) => {
    setCurrentLocation(node);
    setShowNodeSelector(false);
  };

  const handleDestinationSelect = (node: Node) => {
    setDestination(node);
    setShowNodeSelector(false);

    if (currentLocation) {
      calculateRoute(currentLocation.id, node.id);
    }
  };

  const calculateRoute = async (startId: string, endId: string) => {
    if (!venueId || typeof venueId !== 'string') return;

    try {
      setLoading(true);
      const routeData = await routingApi.calculateRoute({
        venueId: venueId,
        startNodeId: startId,
        endNodeId: endId,
      });

      setRoute(routeData);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to calculate route');
      setRoute(null);
    } finally {
      setLoading(false);
    }
  };

  const handleClearRoute = () => {
    setRoute(null);
    setDestination(null);
  };

  const handleClearLocation = () => {
    setCurrentLocation(null);
    setRoute(null);
    setDestination(null);
  };

  const filteredNodes = nodes.filter(node =>
    node.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && !venue) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading venue...</p>
        <style jsx>{`
          .loading-screen {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            gap: 16px;
          }
          .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #e5e7eb;
            border-top-color: #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!venue) {
    return <div className="error">Venue not found</div>;
  }

  return (
    <>
      <Head>
        <title>{venue.name} - NaviO</title>
        <meta name="description" content={`Navigate ${venue.name}`} />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <div className="navigation-page">
        {/* Header */}
        <header className="header">
          <h1>{venue.name}</h1>
          {route && (
            <div className="route-info">
              <span>Distance: {route.totalDistance.toFixed(1)}m</span>
              <span>Time: {Math.ceil(route.estimatedTimeSeconds / 60)} min</span>
            </div>
          )}
        </header>

        {/* Map */}
        <div className="map-container">
          <InteractiveMap
            venue={venue}
            nodes={nodes}
            edges={edges}
            route={route?.path}
            currentLocation={currentLocation || undefined}
            destination={destination || undefined}
          />
        </div>

        {/* Controls */}
        <div className="controls">
          {error && (
            <div className="error-banner">
              {error}
              <button onClick={() => setError(null)}>✕</button>
            </div>
          )}

          {!currentLocation ? (
            <div className="action-buttons">
              <button
                className="btn btn-primary btn-large"
                onClick={() => setShowScanner(true)}
              >
                📷 Scan QR Code
              </button>
              <button
                className="btn btn-secondary btn-large"
                onClick={() => setShowNodeSelector(true)}
              >
                📍 I am near...
              </button>
            </div>
          ) : !destination ? (
            <div className="location-set">
              <div className="current-location">
                <span className="location-label">Current location:</span>
                <span className="location-name">{currentLocation.name}</span>
                <button className="btn-clear" onClick={handleClearLocation}>
                  Change
                </button>
              </div>
              <button
                className="btn btn-primary btn-large"
                onClick={() => setShowNodeSelector(true)}
              >
                🎯 Select Destination
              </button>
            </div>
          ) : (
            <div className="route-active">
              <div className="route-summary">
                <div className="route-point">
                  <span className="label">From:</span>
                  <span>{currentLocation.name}</span>
                </div>
                <div className="route-arrow">→</div>
                <div className="route-point">
                  <span className="label">To:</span>
                  <span>{destination.name}</span>
                </div>
              </div>
              <div className="action-buttons">
                <button className="btn btn-secondary" onClick={handleClearRoute}>
                  New Destination
                </button>
                <button className="btn btn-outline" onClick={handleClearLocation}>
                  New Starting Point
                </button>
              </div>
            </div>
          )}
        </div>

        {/* QR Scanner Modal */}
        {showScanner && (
          <QRScanner
            onScan={handleQRScan}
            onError={setError}
            onClose={() => setShowScanner(false)}
          />
        )}

        {/* Node Selector Modal */}
        {showNodeSelector && (
          <div className="modal-overlay" onClick={() => setShowNodeSelector(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{!currentLocation ? 'Select Current Location' : 'Select Destination'}</h2>
                <button onClick={() => setShowNodeSelector(false)}>✕</button>
              </div>

              <input
                type="text"
                className="search-input"
                placeholder="Search locations..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />

              <div className="node-list">
                {filteredNodes.map(node => (
                  <div
                    key={node.id}
                    className="node-item"
                    onClick={() =>
                      !currentLocation
                        ? handleManualLocationSelect(node)
                        : handleDestinationSelect(node)
                    }
                  >
                    <div className="node-icon">
                      {node.type === 'entrance' && '🚪'}
                      {node.type === 'booth' && '🏪'}
                      {node.type === 'intersection' && '🔀'}
                    </div>
                    <div className="node-info">
                      <div className="node-name">{node.name}</div>
                      <div className="node-type">{node.type}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .navigation-page {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: #f9fafb;
        }

        .header {
          background: white;
          padding: 16px 20px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .header h1 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          color: #111827;
        }

        .route-info {
          display: flex;
          gap: 16px;
          font-size: 14px;
          color: #6b7280;
        }

        .map-container {
          flex: 1;
          overflow: hidden;
        }

        .controls {
          background: white;
          border-top: 1px solid #e5e7eb;
          padding: 20px;
        }

        .error-banner {
          background: #fef2f2;
          color: #991b1b;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 14px;
        }

        .error-banner button {
          background: none;
          border: none;
          color: #991b1b;
          font-size: 18px;
          cursor: pointer;
        }

        .action-buttons {
          display: flex;
          gap: 12px;
        }

        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-large {
          padding: 16px 32px;
          font-size: 18px;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
          flex: 1;
        }

        .btn-primary:hover {
          background: #2563eb;
        }

        .btn-secondary {
          background: #f3f4f6;
          color: #374151;
          flex: 1;
        }

        .btn-secondary:hover {
          background: #e5e7eb;
        }

        .btn-outline {
          background: white;
          color: #6b7280;
          border: 1px solid #d1d5db;
        }

        .btn-outline:hover {
          background: #f9fafb;
        }

        .location-set {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .current-location {
          background: #f0fdf4;
          padding: 16px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .location-label {
          color: #059669;
          font-size: 14px;
        }

        .location-name {
          flex: 1;
          font-weight: 600;
          color: #047857;
        }

        .btn-clear {
          background: none;
          border: none;
          color: #059669;
          text-decoration: underline;
          cursor: pointer;
        }

        .route-active {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .route-summary {
          background: #eff6ff;
          padding: 16px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .route-point {
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .route-point .label {
          font-size: 12px;
          color: #1e40af;
          margin-bottom: 4px;
        }

        .route-point span:last-child {
          font-weight: 600;
          color: #1e3a8a;
        }

        .route-arrow {
          color: #3b82f6;
          font-size: 24px;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: flex-end;
          z-index: 1000;
        }

        .modal {
          background: white;
          width: 100%;
          max-height: 80vh;
          border-radius: 16px 16px 0 0;
          display: flex;
          flex-direction: column;
        }

        .modal-header {
          padding: 20px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
        }

        .modal-header button {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #6b7280;
        }

        .search-input {
          margin: 16px 20px;
          padding: 12px 16px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 16px;
          width: calc(100% - 40px);
        }

        .node-list {
          flex: 1;
          overflow-y: auto;
          padding: 0 20px 20px;
        }

        .node-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          margin-bottom: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .node-item:hover {
          background: #f9fafb;
          border-color: #3b82f6;
        }

        .node-icon {
          font-size: 32px;
        }

        .node-info {
          flex: 1;
        }

        .node-name {
          font-weight: 600;
          color: #111827;
          margin-bottom: 4px;
        }

        .node-type {
          font-size: 14px;
          color: #6b7280;
          text-transform: capitalize;
        }

        @media (min-width: 768px) {
          .modal {
            max-width: 500px;
            margin: 0 auto;
            border-radius: 16px;
            max-height: 600px;
          }

          .modal-overlay {
            align-items: center;
          }
        }
      `}</style>
    </>
  );
}
