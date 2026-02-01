/**
 * AdminTabs component for tab navigation in admin panel.
 */
import React from 'react';

export type AdminTabType = 'pois' | 'nodes' | 'edges' | 'floorplans';

interface TabConfig {
  id: AdminTabType;
  label: string;
  count?: number;
}

interface AdminTabsProps {
  activeTab: AdminTabType;
  onTabChange: (tab: AdminTabType) => void;
  tabs: TabConfig[];
}

const AdminTabs: React.FC<AdminTabsProps> = ({ activeTab, onTabChange, tabs }) => {
  return (
    <div
      style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '8px' }}
      role="tablist"
      aria-label="Admin sections"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={`${tab.id}-panel`}
          style={{
            padding: '8px 16px',
            backgroundColor: activeTab === tab.id ? '#3b82f6' : '#e5e7eb',
            color: activeTab === tab.id ? 'white' : 'black',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {tab.label} {tab.count !== undefined && `(${tab.count})`}
        </button>
      ))}
    </div>
  );
};

export default AdminTabs;
