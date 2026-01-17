/**
 * Admin Panel
 * Venue and navigation graph management
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Venue, Node, Edge, NodeType } from '../types';
import { venueApi, nodeApi, edgeApi, qrApi } from '../lib/api';

export default function AdminPage() {
  const router = useRouter();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'venues' | 'nodes' | 'edges' | 'qr'>('venues');

  // Form states
  const [venueName, setVenueName] = useState('');
  const [venueMapUrl, setVenueMapUrl] = useState('');
  const [venueWidth, setVenueWidth] = useState('1000');
  const [venueHeight, setVenueHeight] = useState('800');

  const [nodeName, setNodeName] = useState('');
  const [nodeType, setNodeType] = useState<NodeType>('booth');
  const [nodeX, setNodeX] = useState('');
  const [nodeY, setNodeY] = useState('');

  const [edgeFrom, setEdgeFrom] = useState('');
  const [edgeTo, setEdgeTo] = useState('');
  const [edgeDistance, setEdgeDistance] = useState('');

  useEffect(() => {
    loadVenues();
  }, []);

  useEffect(() => {
    if (selectedVenue) {
      loadVenueData(selectedVenue.id);
    }
  }, [selectedVenue]);

  const loadVenues = async () => {
    try {
      const data = await venueApi.getAll();
      setVenues(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loadVenueData = async (venueId: string) => {
    try {
      setLoading(true);
      const [nodesData, edgesData] = await Promise.all([
        nodeApi.getAll(venueId),
        edgeApi.getAll(venueId),
      ]);
      setNodes(nodesData);
      setEdges(edgesData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const venue = await venueApi.create({
        name: venueName,
        mapImageUrl: venueMapUrl || undefined,
        width: parseInt(venueWidth),
        height: parseInt(venueHeight),
      });
      setVenues([...venues, venue]);
      setVenueName('');
      setVenueMapUrl('');
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVenue) return;

    try {
      setLoading(true);
      const node = await nodeApi.create({
        venueId: selectedVenue.id,
        name: nodeName,
        type: nodeType,
        x: parseFloat(nodeX),
        y: parseFloat(nodeY),
      });
      setNodes([...nodes, node]);
      setNodeName('');
      setNodeX('');
      setNodeY('');
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEdge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVenue) return;

    try {
      setLoading(true);
      const edge = await edgeApi.create({
        venueId: selectedVenue.id,
        fromNodeId: edgeFrom,
        toNodeId: edgeTo,
        distance: parseFloat(edgeDistance),
      });
      setEdges([...edges, edge]);
      setEdgeFrom('');
      setEdgeTo('');
      setEdgeDistance('');
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQRCodes = async () => {
    if (!selectedVenue) return;

    try {
      setLoading(true);
      const result = await qrApi.generateForVenue(selectedVenue.id);
      alert(`Generated ${result.count} QR codes!`);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewVenue = (venue: Venue) => {
    router.push(`/venue/${venue.id}`);
  };

  const handleDeleteNode = async (nodeId: string) => {
    if (!confirm('Delete this node?')) return;

    try {
      await nodeApi.delete(nodeId);
      setNodes(nodes.filter(n => n.id !== nodeId));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteEdge = async (edgeId: string) => {
    if (!confirm('Delete this edge?')) return;

    try {
      await edgeApi.delete(edgeId);
      setEdges(edges.filter(e => e.id !== edgeId));
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <>
      <Head>
        <title>Admin Panel - NaviO</title>
      </Head>

      <div className="admin-page">
        <header className="header">
          <h1>🛠 Admin Panel</h1>
        </header>

        <div className="container">
          {error && (
            <div className="error-banner">
              {error}
              <button onClick={() => setError(null)}>✕</button>
            </div>
          )}

          <div className="two-column">
            {/* Venue Selection */}
            <div className="sidebar">
              <h2>Venues</h2>
              <div className="venue-list">
                {venues.map(venue => (
                  <div
                    key={venue.id}
                    className={`venue-item ${selectedVenue?.id === venue.id ? 'active' : ''}`}
                    onClick={() => setSelectedVenue(venue)}
                  >
                    <div className="venue-name">{venue.name}</div>
                    <button
                      className="btn-small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewVenue(venue);
                      }}
                    >
                      View
                    </button>
                  </div>
                ))}
              </div>

              <form onSubmit={handleCreateVenue} className="form">
                <h3>Create Venue</h3>
                <input
                  type="text"
                  placeholder="Venue name"
                  value={venueName}
                  onChange={e => setVenueName(e.target.value)}
                  required
                />
                <input
                  type="text"
                  placeholder="Map image URL (optional)"
                  value={venueMapUrl}
                  onChange={e => setVenueMapUrl(e.target.value)}
                />
                <div className="form-row">
                  <input
                    type="number"
                    placeholder="Width"
                    value={venueWidth}
                    onChange={e => setVenueWidth(e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Height"
                    value={venueHeight}
                    onChange={e => setVenueHeight(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  Create Venue
                </button>
              </form>
            </div>

            {/* Main Content */}
            <div className="main-content">
              {!selectedVenue ? (
                <div className="empty-state">
                  <p>Select a venue to manage its navigation graph</p>
                </div>
              ) : (
                <>
                  <div className="tabs">
                    <button
                      className={activeTab === 'nodes' ? 'active' : ''}
                      onClick={() => setActiveTab('nodes')}
                    >
                      Nodes ({nodes.length})
                    </button>
                    <button
                      className={activeTab === 'edges' ? 'active' : ''}
                      onClick={() => setActiveTab('edges')}
                    >
                      Edges ({edges.length})
                    </button>
                    <button
                      className={activeTab === 'qr' ? 'active' : ''}
                      onClick={() => setActiveTab('qr')}
                    >
                      QR Codes
                    </button>
                  </div>

                  {activeTab === 'nodes' && (
                    <div className="tab-content">
                      <form onSubmit={handleCreateNode} className="form">
                        <h3>Create Node</h3>
                        <input
                          type="text"
                          placeholder="Node name"
                          value={nodeName}
                          onChange={e => setNodeName(e.target.value)}
                          required
                        />
                        <select
                          value={nodeType}
                          onChange={e => setNodeType(e.target.value as NodeType)}
                        >
                          <option value="booth">Booth</option>
                          <option value="entrance">Entrance</option>
                          <option value="intersection">Intersection</option>
                        </select>
                        <div className="form-row">
                          <input
                            type="number"
                            placeholder="X coordinate"
                            value={nodeX}
                            onChange={e => setNodeX(e.target.value)}
                            required
                          />
                          <input
                            type="number"
                            placeholder="Y coordinate"
                            value={nodeY}
                            onChange={e => setNodeY(e.target.value)}
                            required
                          />
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                          Create Node
                        </button>
                      </form>

                      <div className="list">
                        {nodes.map(node => (
                          <div key={node.id} className="list-item">
                            <div className="list-item-info">
                              <div className="list-item-name">{node.name}</div>
                              <div className="list-item-meta">
                                {node.type} • ({node.x}, {node.y})
                              </div>
                            </div>
                            <button
                              className="btn-danger"
                              onClick={() => handleDeleteNode(node.id)}
                            >
                              Delete
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'edges' && (
                    <div className="tab-content">
                      <form onSubmit={handleCreateEdge} className="form">
                        <h3>Create Edge</h3>
                        <select
                          value={edgeFrom}
                          onChange={e => setEdgeFrom(e.target.value)}
                          required
                        >
                          <option value="">From node...</option>
                          {nodes.map(node => (
                            <option key={node.id} value={node.id}>
                              {node.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={edgeTo}
                          onChange={e => setEdgeTo(e.target.value)}
                          required
                        >
                          <option value="">To node...</option>
                          {nodes.map(node => (
                            <option key={node.id} value={node.id}>
                              {node.name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          placeholder="Distance (meters)"
                          value={edgeDistance}
                          onChange={e => setEdgeDistance(e.target.value)}
                          required
                          step="0.1"
                        />
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                          Create Edge
                        </button>
                      </form>

                      <div className="list">
                        {edges.map(edge => {
                          const fromNode = nodes.find(n => n.id === edge.fromNodeId);
                          const toNode = nodes.find(n => n.id === edge.toNodeId);
                          return (
                            <div key={edge.id} className="list-item">
                              <div className="list-item-info">
                                <div className="list-item-name">
                                  {fromNode?.name} → {toNode?.name}
                                </div>
                                <div className="list-item-meta">
                                  Distance: {edge.distance}m
                                </div>
                              </div>
                              <button
                                className="btn-danger"
                                onClick={() => handleDeleteEdge(edge.id)}
                              >
                                Delete
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {activeTab === 'qr' && (
                    <div className="tab-content">
                      <div className="qr-section">
                        <h3>QR Code Generation</h3>
                        <p>
                          Generate QR codes for all nodes in this venue. Each QR code will
                          link to this venue with the specific node as the starting location.
                        </p>
                        <button
                          className="btn btn-primary"
                          onClick={handleGenerateQRCodes}
                          disabled={loading || nodes.length === 0}
                        >
                          Generate QR Codes for All Nodes
                        </button>

                        <div className="info-box">
                          <strong>How it works:</strong>
                          <ul>
                            <li>Print QR codes and place them at corresponding physical locations</li>
                            <li>Visitors scan QR codes to set their current location</li>
                            <li>QR codes contain URLs like: /venue/{selectedVenue.id}?node=NODE_ID</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .admin-page {
          min-height: 100vh;
          background: #f9fafb;
        }

        .header {
          background: white;
          padding: 20px;
          border-bottom: 1px solid #e5e7eb;
        }

        .header h1 {
          margin: 0;
          font-size: 24px;
        }

        .container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px;
        }

        .error-banner {
          background: #fef2f2;
          color: #991b1b;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
        }

        .error-banner button {
          background: none;
          border: none;
          color: #991b1b;
          cursor: pointer;
        }

        .two-column {
          display: grid;
          grid-template-columns: 300px 1fr;
          gap: 20px;
        }

        .sidebar {
          background: white;
          padding: 20px;
          border-radius: 8px;
          height: fit-content;
        }

        .sidebar h2 {
          margin-top: 0;
          font-size: 18px;
        }

        .venue-list {
          margin-bottom: 20px;
        }

        .venue-item {
          padding: 12px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          margin-bottom: 8px;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .venue-item:hover {
          background: #f9fafb;
        }

        .venue-item.active {
          background: #eff6ff;
          border-color: #3b82f6;
        }

        .venue-name {
          font-weight: 500;
        }

        .btn-small {
          padding: 4px 12px;
          font-size: 14px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .btn-small:hover {
          background: #2563eb;
        }

        .main-content {
          background: white;
          padding: 20px;
          border-radius: 8px;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #6b7280;
        }

        .tabs {
          display: flex;
          gap: 4px;
          border-bottom: 2px solid #e5e7eb;
          margin-bottom: 20px;
        }

        .tabs button {
          padding: 12px 24px;
          border: none;
          background: none;
          cursor: pointer;
          font-size: 16px;
          font-weight: 500;
          color: #6b7280;
          border-bottom: 2px solid transparent;
          margin-bottom: -2px;
        }

        .tabs button.active {
          color: #3b82f6;
          border-bottom-color: #3b82f6;
        }

        .tab-content {
          padding: 20px 0;
        }

        .form {
          background: #f9fafb;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }

        .form h3 {
          margin-top: 0;
          font-size: 16px;
        }

        .form input,
        .form select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          margin-bottom: 12px;
          font-size: 14px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          width: 100%;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #2563eb;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .list-item {
          padding: 16px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .list-item-info {
          flex: 1;
        }

        .list-item-name {
          font-weight: 500;
          margin-bottom: 4px;
        }

        .list-item-meta {
          font-size: 14px;
          color: #6b7280;
        }

        .btn-danger {
          padding: 6px 16px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        .btn-danger:hover {
          background: #dc2626;
        }

        .qr-section {
          max-width: 600px;
        }

        .qr-section h3 {
          margin-top: 0;
        }

        .qr-section p {
          color: #6b7280;
          margin-bottom: 20px;
        }

        .info-box {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 8px;
          padding: 16px;
          margin-top: 20px;
        }

        .info-box strong {
          display: block;
          margin-bottom: 12px;
          color: #1e40af;
        }

        .info-box ul {
          margin: 0;
          padding-left: 20px;
          color: #1e3a8a;
        }

        .info-box li {
          margin-bottom: 8px;
        }
      `}</style>
    </>
  );
}
