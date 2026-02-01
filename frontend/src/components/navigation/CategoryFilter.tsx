/**
 * CategoryFilter component for filtering POIs by category.
 */
import React from 'react';
import { getCategoryEmoji } from './utils';

interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategory,
  onCategoryChange,
}) => {
  return (
    <div
      style={{
        marginBottom: '20px',
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
      }}
      role="group"
      aria-label="Category filters"
    >
      {categories.map(cat => (
        <button
          key={cat}
          onClick={() => onCategoryChange(cat)}
          aria-pressed={selectedCategory === cat}
          style={{
            padding: '8px 16px',
            background: selectedCategory === cat ? '#667eea' : '#f1f5f9',
            color: selectedCategory === cat ? 'white' : '#475569',
            border: 'none',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s',
            textTransform: 'capitalize',
          }}
        >
          {cat === 'all' ? '🏷️ All' : `${getCategoryEmoji(cat)} ${cat}`}
        </button>
      ))}
    </div>
  );
};

export default CategoryFilter;
