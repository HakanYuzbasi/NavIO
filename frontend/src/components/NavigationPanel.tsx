/**
 * Enhanced Modern UI Component
 *
 * Features:
 * - Modern card-based design
 * - Search functionality
 * - Category filters
 * - Responsive layout
 * - Smooth animations
 * - Loading states
 * - Better visual hierarchy
 */
import React, { useState, useMemo } from 'react';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'search' | 'route'>('search');

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

  const formatDistance = (distance: number): string => {
    const meters = Math.round(distance / 10);
    if (meters < 1000) {
      return `${meters}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return "< 1 min";
    }
    const minutes = Math.ceil(seconds / 60);
    return minutes === 1 ? "1 min" : `${minutes} mins`;
  };

  const getCategoryEmoji = (category?: string) => {
    const emojiMap: { [key: string]: string } = {
      'food': '🍽️',
      'beverages': '☕',
      'dessert': '🍰',
      'japanese': '🍱',
      'italian': '🍝',
      'mexican': '🌮',
      'chinese': '🥢',
      'american': '🍔',
      'booth': '🏪',
      'kiosk': '🏬',
      'room': '🏢',
      'entrance': '🚪',
      'exit': '🚶',
    };
    return emojiMap[category?.toLowerCase() || ''] || '📍';
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(to bottom, #f8fafc, #ffffff)',
    }}>
      {/* Header */}
      <div style={{
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
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        padding: '16px 20px 0',
        gap: '8px',
        borderBottom: '1px solid #e5e7eb',
      }}>
        <button
          onClick={() => setViewMode('search')}
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
      </div>

      {/* Content Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
      }}>
        {viewMode === 'search' ? (
          <>
            {/* Search Bar */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{
                position: 'relative',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                borderRadius: '12px',
                overflow: 'hidden',
              }}>
                <span style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '18px',
                }}>
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="Search locations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '14px 16px 14px 48px',
                    border: 'none',
                    fontSize: '15px',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Category Filter */}
            <div style={{
              marginBottom: '20px',
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
            }}>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '8px 16px',
                    background: selectedCategory === cat ? '#667eea' : '#f1f5f9',
                    color: selectedCategory === cat ? 'white' : '#475569',
                    border: 'none',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textTransform: 'capitalize',
                  }}
                >
                  {cat === 'all' ? '🏷️ All' : `${getCategoryEmoji(cat)} ${cat}`}
                </button>
              ))}
            </div>

            {/* Location Cards */}
            <div style={{
              display: 'grid',
              gap: '12px',
            }}>
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
                  <div
                    key={poi.id}
                    onClick={() => {
                      if (!startNodeId) {
                        setStartNodeId(poi.node_id!);
                      } else if (!endNodeId && poi.node_id !== startNodeId) {
                        setEndNodeId(poi.node_id!);
                        setViewMode('route');
                      }
                    }}
                    style={{
                      padding: '16px',
                      background: 'white',
                      borderRadius: '12px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      border: '2px solid',
                      borderColor:
                        poi.node_id === startNodeId ? '#10b981' :
                        poi.node_id === endNodeId ? '#ef4444' :
                        'transparent',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{
                        fontSize: '24px',
                        flexShrink: 0,
                      }}>
                        {getCategoryEmoji(poi.category)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '16px',
                          fontWeight: 600,
                          color: '#1e293b',
                          marginBottom: '4px',
                        }}>
                          {poi.name}
                        </div>
                        {poi.description && (
                          <div style={{
                            fontSize: '13px',
                            color: '#64748b',
                            marginBottom: '8px',
                          }}>
                            {poi.description}
                          </div>
                        )}
                        {poi.category && (
                          <div style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            background: '#f1f5f9',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 500,
                            color: '#475569',
                            textTransform: 'capitalize',
                          }}>
                            {poi.category}
                          </div>
                        )}
                      </div>
                      {(poi.node_id === startNodeId || poi.node_id === endNodeId) && (
                        <div style={{
                          fontSize: '20px',
                          flexShrink: 0,
                        }}>
                          {poi.node_id === startNodeId ? '🚀' : '🎯'}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <>
            {/* Route Planning */}
            {!route && (
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
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#475569',
                    }}>
                      🚀 From
                    </label>
                    <select
                      value={startNodeId}
                      onChange={(e) => setStartNodeId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '2px solid #e2e8f0',
                        borderRadius: '10px',
                        fontSize: '14px',
                        backgroundColor: 'white',
                        cursor: 'pointer',
                        outline: 'none',
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
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#475569',
                    }}>
                      🎯 To
                    </label>
                    <select
                      value={endNodeId}
                      onChange={(e) => setEndNodeId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '2px solid #e2e8f0',
                        borderRadius: '10px',
                        fontSize: '14px',
                        backgroundColor: 'white',
                        cursor: 'pointer',
                        outline: 'none',
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
                    onClick={handleCalculate}
                    disabled={!startNodeId || !endNodeId || loading}
                    style={{
                      width: '100%',
                      padding: '16px',
                      background: startNodeId && endNodeId
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                        : '#cbd5e1',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      cursor: startNodeId && endNodeId ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s',
                      boxShadow: startNodeId && endNodeId ? '0 4px 12px rgba(102, 126, 234, 0.4)' : 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (startNodeId && endNodeId && !loading) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.5)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (startNodeId && endNodeId && !loading) {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                      }
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
            )}

            {/* Route Result */}
            {route && route.success && (
              <div>
                {/* Summary Card */}
                <div style={{
                  padding: '20px',
                  background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
                  borderRadius: '16px',
                  marginBottom: '20px',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                  }}>
                    <div>
                      <div style={{
                        fontSize: '12px',
                        color: '#065f46',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginBottom: '4px',
                      }}>
                        Fastest Route
                      </div>
                      <div style={{
                        fontSize: '32px',
                        fontWeight: 'bold',
                        color: '#047857',
                      }}>
                        {formatTime(route.estimated_time_seconds)}
                      </div>
                    </div>
                    <div style={{
                      textAlign: 'right',
                    }}>
                      <div style={{
                        fontSize: '12px',
                        color: '#065f46',
                        marginBottom: '4px',
                      }}>
                        Distance
                      </div>
                      <div style={{
                        fontSize: '20px',
                        fontWeight: 'bold',
                        color: '#047857',
                      }}>
                        {formatDistance(route.total_distance)}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    paddingTop: '12px',
                    borderTop: '1px solid #6ee7b7',
                    fontSize: '13px',
                    color: '#065f46',
                  }}>
                    <span>🚶</span>
                    <span>Walking • {route.instructions.length} steps</span>
                  </div>
                </div>

                {/* Directions */}
                <div style={{
                  background: 'white',
                  borderRadius: '16px',
                  padding: '20px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}>
                  <h3 style={{
                    margin: '0 0 20px 0',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: '#1e293b',
                  }}>
                    Step-by-Step
                  </h3>

                  <div style={{ position: 'relative' }}>
                    {/* Timeline */}
                    <div style={{
                      position: 'absolute',
                      left: '15px',
                      top: '20px',
                      bottom: '20px',
                      width: '3px',
                      background: 'linear-gradient(to bottom, #10b981, #3b82f6, #ef4444)',
                      borderRadius: '2px',
                    }} />

                    {route.instructions.map((instruction, index) => {
                      const isFirst = index === 0;
                      const isLast = index === route.instructions.length - 1;

                      return (
                        <div
                          key={instruction.step}
                          style={{
                            position: 'relative',
                            paddingLeft: '56px',
                            paddingBottom: isLast ? '0' : '24px',
                          }}
                        >
                          {/* Step Icon */}
                          <div style={{
                            position: 'absolute',
                            left: '0',
                            top: '0',
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: isFirst ? '#10b981' : isLast ? '#ef4444' : '#3b82f6',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                            zIndex: 1,
                          }}>
                            {isFirst ? '🚀' : isLast ? '🎯' : index + 1}
                          </div>

                          {/* Step Content */}
                          <div style={{
                            background: '#f8fafc',
                            padding: '14px',
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                          }}>
                            <div style={{
                              fontSize: '14px',
                              fontWeight: 600,
                              color: '#1e293b',
                              marginBottom: instruction.distance > 0 ? '6px' : '0',
                            }}>
                              {instruction.action}
                            </div>
                            {instruction.distance > 0 && (
                              <div style={{
                                fontSize: '12px',
                                color: '#64748b',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}>
                                <span>📏</span>
                                <span>{formatDistance(instruction.distance)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* New Route Button */}
                  <button
                    onClick={() => {
                      setStartNodeId('');
                      setEndNodeId('');
                      setViewMode('search');
                    }}
                    style={{
                      width: '100%',
                      padding: '14px',
                      marginTop: '24px',
                      background: 'transparent',
                      color: '#667eea',
                      border: '2px solid #667eea',
                      borderRadius: '12px',
                      fontSize: '15px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#667eea';
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#667eea';
                    }}
                  >
                    🔄 Plan New Route
                  </button>
                </div>
              </div>
            )}

            {/* Error */}
            {route && !route.success && (
              <div style={{
                padding: '20px',
                background: '#fee2e2',
                borderRadius: '16px',
                border: '2px solid #fecaca',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '12px',
                }}>
                  <span style={{ fontSize: '24px' }}>⚠️</span>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: '#991b1b',
                  }}>
                    Couldn't find a route
                  </div>
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#b91c1c',
                  marginBottom: '16px',
                }}>
                  {route.error || 'Try selecting different locations'}
                </div>
                <button
                  onClick={() => {
                    setStartNodeId('');
                    setEndNodeId('');
                  }}
                  style={{
                    padding: '10px 20px',
                    background: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Try Again
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default NavigationPanel;
