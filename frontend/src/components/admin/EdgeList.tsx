/**
 * EdgeList component for displaying path connections.
 */
import React from 'react';
import { Edge, Node } from '../../types';

interface EdgeListProps {
  edges: Edge[];
  nodes: Node[];
}

const tableHeaderStyle: React.CSSProperties = {
  padding: '12px',
  textAlign: 'left',
  borderBottom: '1px solid #e5e7eb',
};

const tableCellStyle: React.CSSProperties = {
  padding: '12px',
};

const EdgeList: React.FC<EdgeListProps> = ({ edges, nodes }) => {
  const getNodeName = (nodeId: string): string => {
    const node = nodes.find(n => n.id === nodeId);
    return node?.name || 'Node';
  };

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ backgroundColor: '#f3f4f6' }}>
          <th style={tableHeaderStyle}>From Node</th>
          <th style={tableHeaderStyle}>To Node</th>
          <th style={tableHeaderStyle}>Type</th>
          <th style={tableHeaderStyle}>Accessible</th>
        </tr>
      </thead>
      <tbody>
        {edges.map((edge) => (
          <tr key={edge.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
            <td style={tableCellStyle}>{getNodeName(edge.source_node_id)}</td>
            <td style={tableCellStyle}>{getNodeName(edge.target_node_id)}</td>
            <td style={tableCellStyle}>{edge.edge_type}</td>
            <td style={tableCellStyle}>{edge.accessible ? '✅' : '❌'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default EdgeList;
