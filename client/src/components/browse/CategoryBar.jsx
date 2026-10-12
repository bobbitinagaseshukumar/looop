import React, { useState, useEffect } from 'react';
import { LayoutGrid } from 'lucide-react';
import { CATEGORIES } from '../../constants/categories';
import itemService from '../../services/itemService';

export const CategoryBar = ({
  selectedCategory,
  onSelectCategory,
  categoryCounts: propCounts,
  totalItems
}) => {
  const [counts, setCounts] = useState(propCounts || {});

  useEffect(() => {
    if (propCounts && Object.keys(propCounts).length > 0) {
      setCounts(propCounts);
      return;
    }

    let isMounted = true;
    itemService
      .getCategories()
      .then((res) => {
        if (!isMounted) return;
        if (res && res.categoryCounts) {
          setCounts(res.categoryCounts);
        } else if (res && Array.isArray(res.categories)) {
          const map = {};
          res.categories.forEach((c) => {
            if (c.id && typeof c.count === 'number') {
              map[c.id] = c.count;
            }
          });
          setCounts(map);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [propCounts]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '8px',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}
      className="category-bar-scroll"
    >
      {/* "All Categories" Pill */}
      <button
        type="button"
        onClick={() => onSelectCategory('all')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '7px 14px',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.825rem',
          fontWeight: selectedCategory === 'all' ? 700 : 600,
          border: selectedCategory === 'all' ? '1px solid var(--color-primary-500)' : '1px solid var(--color-slate-200)',
          backgroundColor: selectedCategory === 'all' ? '#ecfdf5' : '#ffffff',
          color: selectedCategory === 'all' ? '#047857' : 'var(--color-slate-700)',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          boxShadow: selectedCategory === 'all' ? '0 1px 4px rgba(16, 185, 129, 0.15)' : 'none',
          transition: 'all var(--transition-fast)'
        }}
        className="category-pill-btn"
      >
        <LayoutGrid size={15} color={selectedCategory === 'all' ? '#059669' : 'var(--color-slate-500)'} />
        <span>All Items</span>
        {typeof totalItems === 'number' && totalItems > 0 && (
          <span
            style={{
              fontSize: '0.7rem',
              color: selectedCategory === 'all' ? '#059669' : 'var(--color-slate-400)',
              marginLeft: '2px',
              fontWeight: 500
            }}
          >
            {totalItems}
          </span>
        )}
      </button>

      {/* Category Pills */}
      {CATEGORIES.map((cat) => {
        const isSelected = selectedCategory === cat.id;
        const Icon = cat.icon;
        const itemCount = (counts && counts[cat.id] !== undefined)
          ? counts[cat.id]
          : (cat.count || 0);

        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelectCategory(cat.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.825rem',
              fontWeight: isSelected ? 700 : 600,
              border: isSelected ? '1px solid var(--color-primary-500)' : '1px solid var(--color-slate-200)',
              backgroundColor: isSelected ? '#ecfdf5' : '#ffffff',
              color: isSelected ? '#047857' : 'var(--color-slate-700)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              boxShadow: isSelected ? '0 1px 4px rgba(16, 185, 129, 0.15)' : 'none',
              transition: 'all var(--transition-fast)'
            }}
            className="category-pill-btn"
          >
            <Icon size={15} color={isSelected ? '#059669' : 'var(--color-slate-500)'} />
            <span>{cat.name}</span>
            {itemCount > 0 && (
              <span
                style={{
                  fontSize: '0.7rem',
                  color: isSelected ? '#059669' : 'var(--color-slate-400)',
                  marginLeft: '2px',
                  fontWeight: 500
                }}
              >
                {itemCount}
              </span>
            )}
          </button>
        );
      })}

      <style>{`
        .category-bar-scroll::-webkit-scrollbar {
          display: none;
        }
        .category-pill-btn:hover {
          border-color: var(--color-primary-300);
          background-color: #f8fafc;
        }
      `}</style>
    </div>
  );
};

export default CategoryBar;
