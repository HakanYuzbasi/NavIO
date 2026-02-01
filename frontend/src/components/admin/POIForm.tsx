/**
 * POIForm component for creating/editing POIs.
 */
import React, { useState } from 'react';

interface POIFormData {
  name: string;
  category?: string;
  description?: string;
  x: number;
  y: number;
  node_id?: string;
}

interface POIFormProps {
  poi?: POIFormData;
  onSave: (data: POIFormData) => void;
  onCancel: () => void;
}

const POIForm: React.FC<POIFormProps> = ({ poi, onSave, onCancel }) => {
  const [formData, setFormData] = useState<POIFormData>(poi || {
    name: '',
    description: '',
    category: '',
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
      <h4>POI Details</h4>
      <div style={{ marginBottom: '16px' }}>
        <label
          htmlFor="poi-name"
          style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}
        >
          Name *
        </label>
        <input
          id="poi-name"
          type="text"
          value={formData.name || ''}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
      <div style={{ marginBottom: '16px' }}>
        <label
          htmlFor="poi-category"
          style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}
        >
          Category
        </label>
        <input
          id="poi-category"
          type="text"
          value={formData.category || ''}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          placeholder="e.g., food, beverages, dessert"
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
          htmlFor="poi-description"
          style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}
        >
          Description
        </label>
        <textarea
          id="poi-description"
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #d1d5db',
            boxSizing: 'border-box',
          }}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div>
          <label
            htmlFor="poi-x"
            style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}
          >
            X Position *
          </label>
          <input
            id="poi-x"
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
            htmlFor="poi-y"
            style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}
          >
            Y Position *
          </label>
          <input
            id="poi-y"
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

export default POIForm;
