/**
 * Utility functions for navigation components.
 */

export const formatDistance = (distance: number): string => {
  const meters = Math.round(distance / 10);
  if (meters < 1000) {
    return `${meters}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
};

export const formatTime = (seconds: number): string => {
  if (seconds < 60) {
    return "< 1 min";
  }
  const minutes = Math.ceil(seconds / 60);
  return minutes === 1 ? "1 min" : `${minutes} mins`;
};

export const getCategoryEmoji = (category?: string): string => {
  const emojiMap: { [key: string]: string } = {
    'food': '🍽️',
    'beverages': '☕',
    'dessert': '🍰',
    'japanese': '🍱',
    'italian': '🍝',
    'mexican': '🌮',
    'chinese': '🥢',
    'american': '🍔',
    'booth': '🏪',
    'kiosk': '🏬',
    'room': '🏢',
    'entrance': '🚪',
    'exit': '🚶',
  };
  return emojiMap[category?.toLowerCase() || ''] || '📍';
};

export const styles = {
  // Common colors
  primaryGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  successGradient: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
  warningGradient: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',

  // Common styles
  card: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },

  button: {
    primary: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      fontWeight: 'bold' as const,
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    secondary: {
      background: 'transparent',
      color: '#667eea',
      border: '2px solid #667eea',
      borderRadius: '12px',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
  },
};
