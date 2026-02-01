/**
 * RouteResult component for displaying calculated route.
 */
import React from 'react';
import { RouteResponse } from '../../types';
import { formatDistance, formatTime } from './utils';

interface RouteResultProps {
  route: RouteResponse;
  onNewRoute: () => void;
}

const RouteResult: React.FC<RouteResultProps> = ({ route, onNewRoute }) => {
  const [buttonHovered, setButtonHovered] = React.useState(false);

  if (!route.success) {
    return (
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
          onClick={onNewRoute}
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
    );
  }

  return (
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
          <div style={{ textAlign: 'right' }}>
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
          onClick={onNewRoute}
          onMouseEnter={() => setButtonHovered(true)}
          onMouseLeave={() => setButtonHovered(false)}
          style={{
            width: '100%',
            padding: '14px',
            marginTop: '24px',
            background: buttonHovered ? '#667eea' : 'transparent',
            color: buttonHovered ? 'white' : '#667eea',
            border: '2px solid #667eea',
            borderRadius: '12px',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          🔄 Plan New Route
        </button>
      </div>
    </div>
  );
};

export default RouteResult;
