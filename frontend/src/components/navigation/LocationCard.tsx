/**
 * LocationCard component for displaying a POI.
 */
import React from 'react';
import { POI } from '../../types';
import { getCategoryEmoji } from './utils';

interface LocationCardProps {
  poi: POI;
  isStart: boolean;
  isEnd: boolean;
  onClick: () => void;
}

const LocationCard: React.FC<LocationCardProps> = ({
  poi,
  isStart,
  isEnd,
  onClick,
}) => {
  const [isHovered, setIsHovered] = React.useState(false);

  const getBorderColor = () => {
    if (isStart) return '#10b981';
    if (isEnd) return '#ef4444';
    return 'transparent';
  };

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`${poi.name}${isStart ? ' - Starting point' : ''}${isEnd ? ' - Destination' : ''}`}
      style={{
        padding: '16px',
        background: 'white',
        borderRadius: '12px',
        boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.15)' : '0 2px 8px rgba(0,0,0,0.08)',
        cursor: 'pointer',
        transition: 'all 0.2s',
        border: '2px solid',
        borderColor: getBorderColor(),
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
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
        {(isStart || isEnd) && (
          <div style={{
            fontSize: '20px',
            flexShrink: 0,
          }}>
            {isStart ? '🚀' : '🎯'}
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationCard;
