/**
 * NodeList component for displaying navigation nodes in a table.
 */
import React from 'react';
import { Node } from '../../types';

interface NodeListProps {
  nodes: Node[];
  onEdit: (node: Node) => void;
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

const NodeList: React.FC<NodeListProps> = ({ nodes, onEdit, onDelete }) => {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ backgroundColor: '#f3f4f6' }}>
          <th style={tableHeaderStyle}>Name</th>
          <th style={tableHeaderStyle}>Type</th>
          <th style={tableHeaderStyle}>Position</th>
          <th style={tableHeaderStyle}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {nodes.map((node) => (
          <tr key={node.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
            <td style={tableCellStyle}>{node.name || '-'}</td>
            <td style={tableCellStyle}>{node.node_type}</td>
            <td style={tableCellStyle}>({node.x.toFixed(0)}, {node.y.toFixed(0)})</td>
            <td style={tableCellStyle}>
              <button
                onClick={() => onEdit(node)}
                aria-label={`Edit ${node.name || 'node'}`}
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
                onClick={() => onDelete(node.id)}
                aria-label={`Delete ${node.name || 'node'}`}
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

export default NodeList;
