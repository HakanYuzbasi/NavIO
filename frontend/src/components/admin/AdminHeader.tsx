/**
 * AdminHeader component for the admin panel header.
 */
import React from 'react';

interface AdminHeaderProps {
  title?: string;
  onClose: () => void;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ title = 'Admin Panel', onClose }) => {
  return (
    <div style={{
      padding: '20px',
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <h2 style={{ margin: 0 }}>{title}</h2>
      <button
        onClick={onClose}
        aria-label="Close admin panel"
        style={{
          padding: '8px 16px',
          backgroundColor: '#ef4444',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        Close
      </button>
    </div>
  );
};

export default AdminHeader;
