import { useState, useEffect } from 'react';
import FloorPlanMap from './components/FloorPlanMap';
import NavigationPanel from './components/NavigationPanel';
import AdminPanel from './components/AdminPanel';
import api from './services/api';
import { FloorPlanWithGraph, RouteResponse } from './types';

function App() {
  const [floorPlans, setFloorPlans] = useState<FloorPlanWithGraph[]>([]);
  const [selectedFloorPlan, setSelectedFloorPlan] = useState<FloorPlanWithGraph | null>(null);
  const [route, setRoute] = useState<RouteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  // Load floor plans on mount
  useEffect(() => {
    loadFloorPlans();
  }, []);

  const loadFloorPlans = async () => {
    try {
      setLoading(true);
      const plans = await api.getFloorPlans();
      setFloorPlans(plans as FloorPlanWithGraph[]);

      // Load first floor plan with full graph data
      if (plans.length > 0) {
        const fullPlan = await api.getFloorPlan(plans[0].id);
        setSelectedFloorPlan(fullPlan);
      }
    } catch (err) {
      console.error('Failed to load floor plans:', err);
      setError('Failed to load floor plans');
    } finally {
      setLoading(false);
    }
  };

  const handleFloorPlanChange = async (floorPlanId: string) => {
    try {
      setLoading(true);
      const fullPlan = await api.getFloorPlan(floorPlanId);
      setSelectedFloorPlan(fullPlan);
      setRoute(null); // Clear current route
    } catch (err) {
      console.error('Failed to load floor plan:', err);
      setError('Failed to load floor plan');
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateRoute = async (startNodeId: string, endNodeId: string) => {
    if (!selectedFloorPlan) return;

    try {
      setLoading(true);
      setError(null);

      const routeResponse = await api.calculateRoute({
        floor_plan_id: selectedFloorPlan.id,
        start_node_id: startNodeId,
        end_node_id: endNodeId,
        preferences: {
          accessible_only: false,
          avoid_stairs: false,
          shortest_distance: true,
        },
      });

      setRoute(routeResponse);

      if (!routeResponse.success) {
        setError(routeResponse.error || 'Failed to calculate route');
      }
    } catch (err) {
      console.error('Failed to calculate route:', err);
      setError('Failed to calculate route');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <header
        style={{
          backgroundColor: '#1f2937',
          color: 'white',
          padding: '16px 24px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>
          NavIO - Indoor Wayfinding
        </h1>
        <button
          onClick={() => setShowAdminPanel(true)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          ⚙️ Admin Panel
        </button>
      </header>

      {/* Main Content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <aside
          style={{
            width: '400px',
            backgroundColor: '#ffffff',
            borderRight: '1px solid #e5e7eb',
            overflowY: 'auto',
            padding: '24px',
          }}
        >
          {/* Floor Plan Selector */}
          <div style={{ marginBottom: '24px' }}>
            <label
              htmlFor="floorplan"
              style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}
            >
              Select Floor Plan:
            </label>
            <select
              id="floorplan"
              value={selectedFloorPlan?.id || ''}
              onChange={(e) => handleFloorPlanChange(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #d1d5db',
              }}
            >
              {floorPlans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </select>
          </div>

          {/* Error Display */}
          {error && (
            <div
              style={{
                padding: '12px',
                backgroundColor: '#fee2e2',
                borderRadius: '6px',
                marginBottom: '16px',
              }}
            >
              <p style={{ margin: 0, color: '#991b1b' }}>{error}</p>
            </div>
          )}

          {/* Navigation Panel */}
          {selectedFloorPlan && (
            <NavigationPanel
              pois={selectedFloorPlan.pois}
              nodes={selectedFloorPlan.nodes}
              onCalculateRoute={handleCalculateRoute}
              route={route}
              loading={loading}
            />
          )}
        </aside>

        {/* Map Area */}
        <main style={{ flex: 1, position: 'relative' }}>
          {loading && !selectedFloorPlan && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: '18px', color: '#6b7280' }}>Loading...</p>
            </div>
          )}

          {selectedFloorPlan && (
            <FloorPlanMap
              floorPlan={selectedFloorPlan}
              route={route}
              showNodes={true}
              showEdges={true}
              showPOIs={true}
            />
          )}

          {!loading && !selectedFloorPlan && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: '18px', color: '#6b7280' }}>
                No floor plans available. Please create one to get started.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Admin Panel */}
      {showAdminPanel && (
        <AdminPanel
          selectedFloorPlanId={selectedFloorPlan?.id}
          onClose={() => {
            setShowAdminPanel(false);
            // Reload floor plans to reflect any changes
            loadFloorPlans();
          }}
        />
      )}
    </div>
  );
}

export default App;
