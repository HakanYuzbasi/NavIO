/**
 * AdminPanel Component
 *
 * Provides admin-level access to:
 * - View and manage floor plans
 * - Add/Edit/Delete POIs (booths, rooms, locations)
 * - Add/Edit/Delete navigation nodes
 * - Add/Edit/Delete edges (paths)
 *
 * Refactored to use smaller, reusable components:
 * - AdminHeader: Panel header with close button
 * - AdminTabs: Tab navigation
 * - FloorPlanSelector: Floor plan dropdown
 * - POIList/POIForm: POI management
 * - NodeList/NodeForm: Node management
 * - EdgeList: Edge display
 */
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { FloorPlan, POI, Node, Edge } from '../types';
import VisualPOIEditor from './VisualPOIEditor';
import {
  AdminHeader,
  AdminTabs,
  FloorPlanSelector,
  POIForm,
  POIList,
  NodeForm,
  NodeList,
  EdgeList,
  AdminTabType,
} from './admin';

interface AdminPanelProps {
  selectedFloorPlanId?: string;
  onClose: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ selectedFloorPlanId, onClose }) => {
  const [activeTab, setActiveTab] = useState<AdminTabType>('pois');
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
        await api.updatePOI(editingItem.id, poiData);
      } else {
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

  const tabs = [
    { id: 'pois' as const, label: 'POIs', count: pois.length },
    { id: 'nodes' as const, label: 'Nodes', count: nodes.length },
    { id: 'edges' as const, label: 'Edges', count: edges.length },
  ];

  const handleCancelEdit = () => {
    setEditingItem(null);
    setIsAdding(false);
  };

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
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-panel-title"
    >
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
        <AdminHeader onClose={onClose} />

        <FloorPlanSelector
          floorPlans={floorPlans}
          selectedFloorPlan={selectedFloorPlan}
          onSelect={setSelectedFloorPlan}
        />

        <AdminTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabs={tabs}
        />

        {/* Error Display */}
        {error && (
          <div
            style={{ padding: '12px', backgroundColor: '#fee2e2', margin: '16px', borderRadius: '4px' }}
            role="alert"
          >
            <p style={{ margin: 0, color: '#991b1b' }}>{error}</p>
          </div>
        )}

        {/* Content Area */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
          {/* POIs Tab */}
          {activeTab === 'pois' && (
            <div id="pois-panel" role="tabpanel">
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
                  onCancel={handleCancelEdit}
                />
              ) : (
                <POIList
                  pois={pois}
                  onEdit={setEditingItem}
                  onDelete={handleDeletePOI}
                />
              )}
            </div>
          )}

          {/* Nodes Tab */}
          {activeTab === 'nodes' && (
            <div id="nodes-panel" role="tabpanel">
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
                  onCancel={handleCancelEdit}
                />
              ) : (
                <NodeList
                  nodes={nodes}
                  onEdit={setEditingItem}
                  onDelete={handleDeleteNode}
                />
              )}
            </div>
          )}

          {/* Edges Tab */}
          {activeTab === 'edges' && (
            <div id="edges-panel" role="tabpanel">
              <h3>Path Connections (Edges)</h3>
              <EdgeList edges={edges} nodes={nodes} />
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
            loadPOIs();
          }}
        />
      )}
    </div>
  );
};

export default AdminPanel;
