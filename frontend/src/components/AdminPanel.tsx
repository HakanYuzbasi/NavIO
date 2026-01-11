/**
 * AdminPanel Component
 *
 * Provides admin-level access to:
 * - View and manage floor plans
 * - Add/Edit/Delete POIs (booths, rooms, locations)
 * - Add/Edit/Delete navigation nodes
 * - Add/Edit/Delete edges (paths)
 */
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { FloorPlan, POI, Node, Edge } from '../types';
import VisualPOIEditor from './VisualPOIEditor';

interface AdminPanelProps {
  selectedFloorPlanId?: string;
  onClose: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ selectedFloorPlanId, onClose }) => {
  const [activeTab, setActiveTab] = useState<'pois' | 'nodes' | 'edges' | 'floorplans'>('pois');
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);
  const [selectedFloorPlan, setSelectedFloorPlan] = useState<string>(selectedFloorPlanId || '');
  const [pois, setPois] = useState<POI[]>([]);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [showVisualEditor, setShowVisualEditor] = useState(false);

  // Load floor plans
  useEffect(() => {
    loadFloorPlans();
  }, []);

  // Load data when floor plan changes
  useEffect(() => {
    if (selectedFloorPlan) {
      loadPOIs();
      loadNodes();
      loadEdges();
    }
  }, [selectedFloorPlan]);

  const loadFloorPlans = async () => {
    try {
      const plans = await api.getFloorPlans();
      setFloorPlans(plans);
      if (plans.length > 0 && !selectedFloorPlan) {
        setSelectedFloorPlan(plans[0].id);
      }
    } catch (err) {
      setError('Failed to load floor plans');
    }
  };

  const loadPOIs = async () => {
    if (!selectedFloorPlan) return;
    try {
      const data = await api.getPOIsByFloorPlan(selectedFloorPlan, false);
      setPois(data);
    } catch (err) {
      setError('Failed to load POIs');
    }
  };

  const loadNodes = async () => {
    if (!selectedFloorPlan) return;
    try {
      const data = await api.getNodesByFloorPlan(selectedFloorPlan);
      setNodes(data);
    } catch (err) {
      setError('Failed to load nodes');
    }
  };

  const loadEdges = async () => {
    if (!selectedFloorPlan) return;
    try {
      const data = await api.getEdgesByFloorPlan(selectedFloorPlan);
      setEdges(data);
    } catch (err) {
      setError('Failed to load edges');
    }
  };

  const handleSavePOI = async (poiData: any) => {
    try {
      if (editingItem && editingItem.id) {
        // Update existing
        await api.updatePOI(editingItem.id, poiData);
      } else {
        // Create new
        await api.createPOI({
          ...poiData,
          floor_plan_id: selectedFloorPlan,
        });
      }
      setEditingItem(null);
      setIsAdding(false);
      loadPOIs();
    } catch (err) {
      setError('Failed to save POI');
    }
  };

  const handleDeletePOI = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this POI?')) return;
    try {
      await api.deletePOI(id);
      loadPOIs();
    } catch (err) {
      setError('Failed to delete POI');
    }
  };

  const handleSaveNode = async (nodeData: any) => {
    try {
      if (editingItem && editingItem.id) {
        await api.updateNode(editingItem.id, nodeData);
      } else {
        await api.createNode({
          ...nodeData,
          floor_plan_id: selectedFloorPlan,
        });
      }
      setEditingItem(null);
      setIsAdding(false);
      loadNodes();
    } catch (err) {
      setError('Failed to save node');
    }
  };

  const handleDeleteNode = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this node?')) return;
    try {
      await api.deleteNode(id);
      loadNodes();
    } catch (err) {
      setError('Failed to delete node');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        width: '90%',
        maxWidth: '1200px',
        height: '90%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 style={{ margin: 0 }}>Admin Panel</h2>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>

        {/* Floor Plan Selector */}
        <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
          <label style={{ fontWeight: 'bold', marginRight: '8px' }}>
            Select Floor Plan:
          </label>
          <select
            value={selectedFloorPlan}
            onChange={(e) => setSelectedFloorPlan(e.target.value)}
            style={{
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #d1d5db',
            }}
          >
            {floorPlans.map((fp) => (
              <option key={fp.id} value={fp.id}>
                {fp.name}
              </option>
            ))}
          </select>
        </div>

        {/* Tabs */}
        <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('pois')}
            style={{
              padding: '8px 16px',
              backgroundColor: activeTab === 'pois' ? '#3b82f6' : '#e5e7eb',
              color: activeTab === 'pois' ? 'white' : 'black',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            POIs ({pois.length})
          </button>
          <button
            onClick={() => setActiveTab('nodes')}
            style={{
              padding: '8px 16px',
              backgroundColor: activeTab === 'nodes' ? '#3b82f6' : '#e5e7eb',
              color: activeTab === 'nodes' ? 'white' : 'black',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Nodes ({nodes.length})
          </button>
          <button
            onClick={() => setActiveTab('edges')}
            style={{
              padding: '8px 16px',
              backgroundColor: activeTab === 'edges' ? '#3b82f6' : '#e5e7eb',
              color: activeTab === 'edges' ? 'white' : 'black',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Edges ({edges.length})
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div style={{ padding: '12px', backgroundColor: '#fee2e2', margin: '16px', borderRadius: '4px' }}>
            <p style={{ margin: 0, color: '#991b1b' }}>{error}</p>
          </div>
        )}

        {/* Content Area */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
          {/* POIs Tab */}
          {activeTab === 'pois' && (
            <div>
              <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Points of Interest (Booths, Rooms, Locations)</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setShowVisualEditor(true)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#8b5cf6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                    }}
                  >
                    🎯 Visual Editor
                  </button>
                  <button
                    onClick={() => {
                      setIsAdding(true);
                      setEditingItem({ name: '', description: '', category: '', x: 0, y: 0 });
                    }}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    + Add New POI
                  </button>
                </div>
              </div>

              {(isAdding || editingItem) && activeTab === 'pois' ? (
                <POIForm
                  poi={editingItem}
                  onSave={handleSavePOI}
                  onCancel={() => {
                    setEditingItem(null);
                    setIsAdding(false);
                  }}
                />
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f3f4f6' }}>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Name</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Category</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Position</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pois.map((poi) => (
                      <tr key={poi.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '12px' }}>{poi.name}</td>
                        <td style={{ padding: '12px' }}>{poi.category || '-'}</td>
                        <td style={{ padding: '12px' }}>({poi.x.toFixed(0)}, {poi.y.toFixed(0)})</td>
                        <td style={{ padding: '12px' }}>
                          <button
                            onClick={() => setEditingItem(poi)}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              marginRight: '8px',
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeletePOI(poi.id)}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Nodes Tab */}
          {activeTab === 'nodes' && (
            <div>
              <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
                <h3>Navigation Nodes</h3>
                <button
                  onClick={() => {
                    setIsAdding(true);
                    setEditingItem({ name: '', node_type: 'waypoint', x: 0, y: 0 });
                  }}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  + Add New Node
                </button>
              </div>

              {(isAdding || editingItem) && activeTab === 'nodes' ? (
                <NodeForm
                  node={editingItem}
                  onSave={handleSaveNode}
                  onCancel={() => {
                    setEditingItem(null);
                    setIsAdding(false);
                  }}
                />
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f3f4f6' }}>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Name</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Type</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Position</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nodes.map((node) => (
                      <tr key={node.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '12px' }}>{node.name || '-'}</td>
                        <td style={{ padding: '12px' }}>{node.node_type}</td>
                        <td style={{ padding: '12px' }}>({node.x.toFixed(0)}, {node.y.toFixed(0)})</td>
                        <td style={{ padding: '12px' }}>
                          <button
                            onClick={() => setEditingItem(node)}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              marginRight: '8px',
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteNode(node.id)}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Edges Tab */}
          {activeTab === 'edges' && (
            <div>
              <h3>Path Connections (Edges)</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6' }}>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>From Node</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>To Node</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Type</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Accessible</th>
                  </tr>
                </thead>
                <tbody>
                  {edges.map((edge) => {
                    const sourceNode = nodes.find(n => n.id === edge.source_node_id);
                    const targetNode = nodes.find(n => n.id === edge.target_node_id);
                    return (
                      <tr key={edge.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '12px' }}>{sourceNode?.name || 'Node'}</td>
                        <td style={{ padding: '12px' }}>{targetNode?.name || 'Node'}</td>
                        <td style={{ padding: '12px' }}>{edge.edge_type}</td>
                        <td style={{ padding: '12px' }}>{edge.accessible ? '✅' : '❌'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Visual POI Editor */}
      {showVisualEditor && selectedFloorPlan && (
        <VisualPOIEditor
          floorPlanId={selectedFloorPlan}
          onClose={() => {
            setShowVisualEditor(false);
            // Reload POIs to reflect any changes
            loadPOIs();
          }}
        />
      )}
    </div>
  );
};

// POI Form Component
const POIForm: React.FC<{
  poi: any;
  onSave: (data: any) => void;
  onCancel: () => void;
}> = ({ poi, onSave, onCancel }) => {
  const [formData, setFormData] = useState(poi || {});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} style={{ backgroundColor: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
      <h4>POI Details</h4>
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Name *</label>
        <input
          type="text"
          value={formData.name || ''}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
        />
      </div>
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Category</label>
        <input
          type="text"
          value={formData.category || ''}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          placeholder="e.g., food, beverages, dessert"
          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
        />
      </div>
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Description</label>
        <textarea
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>X Position *</label>
          <input
            type="number"
            value={formData.x || 0}
            onChange={(e) => setFormData({ ...formData, x: parseFloat(e.target.value) })}
            required
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Y Position *</label>
          <input
            type="number"
            value={formData.y || 0}
            onChange={(e) => setFormData({ ...formData, y: parseFloat(e.target.value) })}
            required
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
          />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          type="submit"
          style={{
            padding: '8px 16px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

// Node Form Component
const NodeForm: React.FC<{
  node: any;
  onSave: (data: any) => void;
  onCancel: () => void;
}> = ({ node, onSave, onCancel }) => {
  const [formData, setFormData] = useState(node || {});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} style={{ backgroundColor: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
      <h4>Node Details</h4>
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Name</label>
        <input
          type="text"
          value={formData.name || ''}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Waypoint 1, Main Entrance"
          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
        />
      </div>
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Type *</label>
        <select
          value={formData.node_type || 'waypoint'}
          onChange={(e) => setFormData({ ...formData, node_type: e.target.value })}
          required
          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
        >
          <option value="waypoint">Waypoint</option>
          <option value="entrance">Entrance</option>
          <option value="exit">Exit</option>
          <option value="stairs">Stairs</option>
          <option value="elevator">Elevator</option>
          <option value="intersection">Intersection</option>
        </select>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>X Position *</label>
          <input
            type="number"
            value={formData.x || 0}
            onChange={(e) => setFormData({ ...formData, x: parseFloat(e.target.value) })}
            required
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Y Position *</label>
          <input
            type="number"
            value={formData.y || 0}
            onChange={(e) => setFormData({ ...formData, y: parseFloat(e.target.value) })}
            required
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
          />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          type="submit"
          style={{
            padding: '8px 16px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default AdminPanel;
