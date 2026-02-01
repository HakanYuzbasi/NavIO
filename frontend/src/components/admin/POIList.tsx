/**
 * POIList component for displaying POIs in a table.
 */
import React from 'react';
import { POI } from '../../types';

interface POIListProps {
  pois: POI[];
  onEdit: (poi: POI) => void;
  onDelete: (id: string) => void;
}

const tableHeaderStyle: React.CSSProperties = {
  padding: '12px',
  textAlign: 'left',
  borderBottom: '1px solid #e5e7eb',
};

const tableCellStyle: React.CSSProperties = {
  padding: '12px',
};

const POIList: React.FC<POIListProps> = ({ pois, onEdit, onDelete }) => {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ backgroundColor: '#f3f4f6' }}>
          <th style={tableHeaderStyle}>Name</th>
          <th style={tableHeaderStyle}>Category</th>
          <th style={tableHeaderStyle}>Position</th>
          <th style={tableHeaderStyle}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {pois.map((poi) => (
          <tr key={poi.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
            <td style={tableCellStyle}>{poi.name}</td>
            <td style={tableCellStyle}>{poi.category || '-'}</td>
            <td style={tableCellStyle}>({poi.x.toFixed(0)}, {poi.y.toFixed(0)})</td>
            <td style={tableCellStyle}>
              <button
                onClick={() => onEdit(poi)}
                aria-label={`Edit ${poi.name}`}
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
                onClick={() => onDelete(poi.id)}
                aria-label={`Delete ${poi.name}`}
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
  );
};

export default POIList;
