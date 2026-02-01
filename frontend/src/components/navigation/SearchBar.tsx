/**
 * SearchBar component for location search.
 */
import React from 'react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search locations...',
}) => {
  return (
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
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Search locations"
          style={{
            width: '100%',
            padding: '14px 16px 14px 48px',
            border: 'none',
            fontSize: '15px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>
    </div>
  );
};

export default SearchBar;
