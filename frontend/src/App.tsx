import { useEffect, useCallback } from 'react';
import FloorPlanMap from './components/FloorPlanMap';
import NavigationPanel from './components/NavigationPanel';
import AdminPanel from './components/AdminPanel';
import { useNavigationStore } from './store';

function App() {
  // Use Zustand store for all state
  const {
    floorPlans,
    selectedFloorPlan,
    isLoadingFloorPlans,
    route,
    error,
    showAdminPanel,
    showNodes,
    showEdges,
    showPOIs,
    loadFloorPlans,
    selectFloorPlan,
    calculateRoute,
    setShowAdminPanel,
    setError,
    refreshCurrentFloorPlan,
  } = useNavigationStore();

  // Load floor plans on mount
  useEffect(() => {
    loadFloorPlans();
  }, [loadFloorPlans]);

  // Handler for floor plan selection
  const handleFloorPlanChange = useCallback(
    (floorPlanId: string) => {
      selectFloorPlan(floorPlanId);
    },
    [selectFloorPlan]
  );

  // Handler for route calculation
  const handleCalculateRoute = useCallback(
    (startNodeId: string, endNodeId: string) => {
      calculateRoute(startNodeId, endNodeId);
    },
    [calculateRoute]
  );

  // Handler for closing admin panel
  const handleCloseAdminPanel = useCallback(() => {
    setShowAdminPanel(false);
    refreshCurrentFloorPlan();
  }, [setShowAdminPanel, refreshCurrentFloorPlan]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close admin panel
      if (e.key === 'Escape' && showAdminPanel) {
        handleCloseAdminPanel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAdminPanel, handleCloseAdminPanel]);

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}
      role="application"
      aria-label="NavIO Indoor Wayfinding Application"
    >
      {/* Skip link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only"
        style={{
          position: 'absolute',
          left: '-9999px',
          top: 'auto',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        }}
        onFocus={(e) => {
          e.currentTarget.style.position = 'static';
          e.currentTarget.style.width = 'auto';
          e.currentTarget.style.height = 'auto';
        }}
        onBlur={(e) => {
          e.currentTarget.style.position = 'absolute';
          e.currentTarget.style.left = '-9999px';
          e.currentTarget.style.width = '1px';
          e.currentTarget.style.height = '1px';
        }}
      >
        Skip to main content
      </a>

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
        role="banner"
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
          aria-label="Open admin panel"
          aria-haspopup="dialog"
        >
          <span aria-hidden="true">⚙️</span> Admin Panel
        </button>
      </header>

      {/* Main Content */}
      <div
        style={{ display: 'flex', flex: 1, overflow: 'hidden' }}
        role="main"
      >
        {/* Sidebar */}
        <aside
          style={{
            width: '400px',
            backgroundColor: '#ffffff',
            borderRight: '1px solid #e5e7eb',
            overflowY: 'auto',
            padding: '24px',
          }}
          aria-label="Navigation controls"
        >
          {/* Floor Plan Selector */}
          <div style={{ marginBottom: '24px' }}>
            <label
              htmlFor="floorplan-select"
              style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 'bold',
              }}
            >
              Select Floor Plan:
            </label>
            <select
              id="floorplan-select"
              value={selectedFloorPlan?.id || ''}
              onChange={(e) => handleFloorPlanChange(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #d1d5db',
              }}
              aria-describedby="floorplan-description"
            >
              <option value="" disabled>
                Choose a floor plan
              </option>
              {floorPlans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </select>
            <span id="floorplan-description" className="sr-only">
              Select a floor plan to view and navigate
            </span>
          </div>

          {/* Error Display */}
          {error && (
            <div
              role="alert"
              aria-live="polite"
              style={{
                padding: '12px',
                backgroundColor: '#fee2e2',
                borderRadius: '6px',
                marginBottom: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <p style={{ margin: 0, color: '#991b1b' }}>{error}</p>
              <button
                onClick={() => setError(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  fontSize: '16px',
                }}
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          )}

          {/* Navigation Panel */}
          {selectedFloorPlan && (
            <NavigationPanel
              pois={selectedFloorPlan.pois}
              nodes={selectedFloorPlan.nodes}
              onCalculateRoute={handleCalculateRoute}
              route={route}
              loading={isLoadingFloorPlans}
            />
          )}
        </aside>

        {/* Map Area */}
        <main
          id="main-content"
          style={{ flex: 1, position: 'relative' }}
          aria-label="Floor plan map"
          tabIndex={-1}
        >
          {isLoadingFloorPlans && !selectedFloorPlan && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
              }}
              role="status"
              aria-live="polite"
            >
              <p style={{ fontSize: '18px', color: '#6b7280' }}>
                Loading floor plans...
              </p>
            </div>
          )}

          {selectedFloorPlan && (
            <FloorPlanMap
              floorPlan={selectedFloorPlan}
              route={route}
              showNodes={showNodes}
              showEdges={showEdges}
              showPOIs={showPOIs}
            />
          )}

          {!isLoadingFloorPlans && !selectedFloorPlan && (
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
                No floor plans available. Please create one using the Admin
                Panel to get started.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Admin Panel Modal */}
      {showAdminPanel && (
        <AdminPanel
          selectedFloorPlanId={selectedFloorPlan?.id}
          onClose={handleCloseAdminPanel}
        />
      )}
    </div>
  );
}

export default App;
