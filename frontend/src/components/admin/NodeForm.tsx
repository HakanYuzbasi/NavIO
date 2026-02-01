/**
 * NodeForm component for creating/editing navigation nodes.
 */
import React, { useState } from 'react';

interface NodeFormData {
  name?: string;
  node_type: string;
  x: number;
  y: number;
  accessibility_level?: string;
}

interface NodeFormProps {
  node?: NodeFormData;
  onSave: (data: NodeFormData) => void;
  onCancel: () => void;
}

const NODE_TYPES = [
  { value: 'waypoint', label: 'Waypoint' },
  { value: 'entrance', label: 'Entrance' },
  { value: 'exit', label: 'Exit' },
  { value: 'stairs', label: 'Stairs' },
  { value: 'elevator', label: 'Elevator' },
  { value: 'intersection', label: 'Intersection' },
];

const NodeForm: React.FC<NodeFormProps> = ({ node, onSave, onCancel }) => {
  const [formData, setFormData] = useState<NodeFormData>(node || {
    name: '',
    node_type: 'waypoint',
    x: 0,
    y: 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{ backgroundColor: '#f9fafb', padding: '20px', borderRadius: '8px' }}
    >
      <h4>Node Details</h4>
      <div style={{ marginBottom: '16px' }}>
        <label
          htmlFor="node-name"
          style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}
        >
          Name
        </label>
        <input
          id="node-name"
          type="text"
          value={formData.name || ''}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Waypoint 1, Main Entrance"
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #d1d5db',
            boxSizing: 'border-box',
          }}
        />
      </div>
      <div style={{ marginBottom: '16px' }}>
        <label
          htmlFor="node-type"
          style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}
        >
          Type *
        </label>
        <select
          id="node-type"
          value={formData.node_type || 'waypoint'}
          onChange={(e) => setFormData({ ...formData, node_type: e.target.value })}
          required
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #d1d5db',
            boxSizing: 'border-box',
          }}
        >
          {NODE_TYPES.map(type => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div>
          <label
            htmlFor="node-x"
            style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}
          >
            X Position *
          </label>
          <input
            id="node-x"
            type="number"
            value={formData.x || 0}
            onChange={(e) => setFormData({ ...formData, x: parseFloat(e.target.value) })}
            required
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #d1d5db',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div>
          <label
            htmlFor="node-y"
            style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}
          >
            Y Position *
          </label>
          <input
            id="node-y"
            type="number"
            value={formData.y || 0}
            onChange={(e) => setFormData({ ...formData, y: parseFloat(e.target.value) })}
            required
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #d1d5db',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          type="submit"
          style={{
            padding: '8px 16px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default NodeForm;
