/**
 * NavigationPanel - Main navigation component.
 *
 * Features:
 * - Modern card-based design
 * - Search functionality
 * - Category filters
 * - Responsive layout
 * - Smooth animations
 * - Loading states
 * - Better visual hierarchy
 *
 * Refactored to use smaller, reusable components:
 * - SearchBar: Search input
 * - CategoryFilter: Category filter buttons
 * - LocationCard: POI display card
 * - RoutePlanner: Route planning form
 * - RouteResult: Route display with instructions
 */
import React, { useState, useMemo } from 'react';
import { POI, Node, RouteResponse } from '../types';
import {
  SearchBar,
  CategoryFilter,
  LocationCard,
  RoutePlanner,
  RouteResult,
} from './navigation';

interface NavigationPanelProps {
  pois: POI[];
  nodes: Node[];
  currentLocation?: { nodeId: string; name?: string };
  onCalculateRoute: (startNodeId: string, endNodeId: string) => void;
  route?: RouteResponse | null;
  loading?: boolean;
}

type ViewMode = 'search' | 'route';

const NavigationPanel: React.FC<NavigationPanelProps> = ({
  pois,
  currentLocation,
  onCalculateRoute,
  route,
  loading,
}) => {
  const [startNodeId, setStartNodeId] = useState<string>(currentLocation?.nodeId || '');
  const [endNodeId, setEndNodeId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('search');

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    pois.forEach(poi => {
      if (poi.category) cats.add(poi.category);
    });
    return ['all', ...Array.from(cats)];
  }, [pois]);

  // Filter POIs based on search and category
  const filteredPOIs = useMemo(() => {
    return pois.filter(poi => {
      const matchesSearch = poi.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (poi.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
      const matchesCategory = selectedCategory === 'all' || poi.category === selectedCategory;
      return matchesSearch && matchesCategory && poi.node_id;
    });
  }, [pois, searchTerm, selectedCategory]);

  const handleCalculate = () => {
    if (startNodeId && endNodeId) {
      setViewMode('route');
      onCalculateRoute(startNodeId, endNodeId);
    }
  };

  const handleLocationClick = (poi: POI) => {
    if (!poi.node_id) return;

    if (!startNodeId) {
      setStartNodeId(poi.node_id);
    } else if (!endNodeId && poi.node_id !== startNodeId) {
      setEndNodeId(poi.node_id);
      setViewMode('route');
    }
  };

  const handleNewRoute = () => {
    setStartNodeId('');
    setEndNodeId('');
    setViewMode('search');
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(to bottom, #f8fafc, #ffffff)',
    }}>
      {/* Header */}
      <header style={{
        padding: '24px 20px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      }}>
        <h2 style={{
          margin: '0 0 8px 0',
          fontSize: '24px',
          fontWeight: 'bold',
        }}>
          🧭 NavIO
        </h2>
        <p style={{
          margin: 0,
          fontSize: '14px',
          opacity: 0.9,
        }}>
          Find your way in seconds
        </p>
      </header>

      {/* Tab Navigation */}
      <nav
        style={{
          display: 'flex',
          padding: '16px 20px 0',
          gap: '8px',
          borderBottom: '1px solid #e5e7eb',
        }}
        role="tablist"
        aria-label="Navigation views"
      >
        <button
          onClick={() => setViewMode('search')}
          role="tab"
          aria-selected={viewMode === 'search'}
          aria-controls="search-panel"
          style={{
            flex: 1,
            padding: '12px',
            background: viewMode === 'search' ? '#667eea' : 'transparent',
            color: viewMode === 'search' ? 'white' : '#64748b',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          🔍 Search
        </button>
        <button
          onClick={() => setViewMode('route')}
          role="tab"
          aria-selected={viewMode === 'route'}
          aria-controls="route-panel"
          style={{
            flex: 1,
            padding: '12px',
            background: viewMode === 'route' ? '#667eea' : 'transparent',
            color: viewMode === 'route' ? 'white' : '#64748b',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          🗺️ Route
        </button>
      </nav>

      {/* Content Area */}
      <main style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
      }}>
        {viewMode === 'search' ? (
          <div id="search-panel" role="tabpanel" aria-labelledby="search-tab">
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
            />

            <CategoryFilter
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
            />

            {/* Location Cards */}
            <div style={{ display: 'grid', gap: '12px' }}>
              {filteredPOIs.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: '#94a3b8',
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
                  <div style={{ fontSize: '16px', fontWeight: 500 }}>No locations found</div>
                  <div style={{ fontSize: '14px', marginTop: '8px' }}>Try a different search term</div>
                </div>
              ) : (
                filteredPOIs.map(poi => (
                  <LocationCard
                    key={poi.id}
                    poi={poi}
                    isStart={poi.node_id === startNodeId}
                    isEnd={poi.node_id === endNodeId}
                    onClick={() => handleLocationClick(poi)}
                  />
                ))
              )}
            </div>
          </div>
        ) : (
          <div id="route-panel" role="tabpanel" aria-labelledby="route-tab">
            {!route && (
              <RoutePlanner
                pois={pois}
                startNodeId={startNodeId}
                endNodeId={endNodeId}
                onStartChange={setStartNodeId}
                onEndChange={setEndNodeId}
                onCalculate={handleCalculate}
                loading={loading}
              />
            )}

            {route && (
              <RouteResult
                route={route}
                onNewRoute={handleNewRoute}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default NavigationPanel;
