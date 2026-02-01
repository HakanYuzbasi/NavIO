/**
 * FloorPlanSelector component for selecting a floor plan.
 */
import React from 'react';
import { FloorPlan } from '../../types';

interface FloorPlanSelectorProps {
  floorPlans: FloorPlan[];
  selectedFloorPlan: string;
  onSelect: (floorPlanId: string) => void;
}

const FloorPlanSelector: React.FC<FloorPlanSelectorProps> = ({
  floorPlans,
  selectedFloorPlan,
  onSelect,
}) => {
  return (
    <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
      <label
        htmlFor="floor-plan-select"
        style={{ fontWeight: 'bold', marginRight: '8px' }}
      >
        Select Floor Plan:
      </label>
      <select
        id="floor-plan-select"
        value={selectedFloorPlan}
        onChange={(e) => onSelect(e.target.value)}
        style={{
          padding: '8px',
          borderRadius: '4px',
          border: '1px solid #d1d5db',
        }}
      >
        {floorPlans.map((fp) => (
          <option key={fp.id} value={fp.id}>
            {fp.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default FloorPlanSelector;
