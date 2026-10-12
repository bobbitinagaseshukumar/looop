import React from 'react';
import { RotateCcw, Filter, Check } from 'lucide-react';
import {
  CATEGORIES,
  SHARING_TYPES,
  CONDITIONS,
  DISTANCE_OPTIONS,
  AVAILABILITY_OPTIONS
} from '../../constants/categories';

export const FilterPanel = ({
  filters,
  onFilterChange,
  onResetFilters,
  totalItems = 0,
  categoryCounts = {},
  isMobile = false
}) => {
  const {
    category = 'all',
    sharingType = 'all',
    condition = 'all',
    city = '',
    distance = 'all',
    availability = 'available'
  } = filters;

  const hasActiveFilters =
    category !== 'all' ||
    sharingType !== 'all' ||
    condition !== 'all' ||
    (city && city !== 'all') ||
    distance !== 'all' ||
    availability !== 'available';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        padding: isMobile ? '0' : '1.5rem',
        backgroundColor: isMobile ? 'transparent' : '#ffffff',
        borderRadius: isMobile ? '0' : 'var(--radius-xl)',
        border: isMobile ? 'none' : '1px solid var(--color-slate-200)',
        boxShadow: isMobile ? 'none' : '0 2px 8px rgba(15, 23, 42, 0.03)'
      }}
      className="filter-panel-container"
    >
      {/* Panel Header */}
      {!isMobile && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid var(--color-slate-100)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={17} color="var(--color-primary-600)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-slate-900)', margin: 0 }}>
              Filter Items
            </h3>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '0.75rem',
                color: 'var(--color-primary-700)',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              className="reset-filters-btn"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          )}
        </div>
      )}

      {/* 1. Category Filter */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label
          htmlFor="filter-category"
          style={{
            fontSize: '0.8rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--color-slate-500)'
          }}
        >
          Category
        </label>
        <select
          id="filter-category"
          value={category}
          onChange={(e) => onFilterChange('category', e.target.value)}
          style={{
            width: '100%',
            padding: '9px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-slate-300)',
            backgroundColor: '#f8fafc',
            color: 'var(--color-slate-900)',
            fontSize: '0.875rem',
            fontWeight: 500,
            outline: 'none'
          }}
          className="filter-select"
        >
          <option value="all">
            All Categories{totalItems > 0 ? ` (${totalItems})` : ''}
          </option>
          {CATEGORIES.map((c) => {
            const count = (categoryCounts && categoryCounts[c.id] !== undefined)
              ? categoryCounts[c.id]
              : (c.count || 0);
            return (
              <option key={c.id} value={c.id}>
                {c.name}{count > 0 ? ` (${count})` : ''}
              </option>
            );
          })}
        </select>
      </div>

      {/* 2. Sharing Type Filter */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span
          style={{
            fontSize: '0.8rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--color-slate-500)'
          }}
        >
          Sharing Type
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {SHARING_TYPES.map((type) => {
            const isChecked = sharingType === type.id;
            return (
              <label
                key={type.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  padding: '5px 8px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: isChecked ? '#ecfdf5' : 'transparent',
                  color: isChecked ? '#047857' : 'var(--color-slate-700)',
                  fontWeight: isChecked ? 700 : 500,
                  fontSize: '0.85rem',
                  transition: 'background-color var(--transition-fast)'
                }}
                className="filter-radio-row"
              >
                <input
                  type="radio"
                  name="sharingType"
                  value={type.id}
                  checked={isChecked}
                  onChange={() => onFilterChange('sharingType', type.id)}
                  style={{ accentColor: '#059669' }}
                />
                <span>{type.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* 3. Condition Filter */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label
          htmlFor="filter-condition"
          style={{
            fontSize: '0.8rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--color-slate-500)'
          }}
        >
          Condition
        </label>
        <select
          id="filter-condition"
          value={condition}
          onChange={(e) => onFilterChange('condition', e.target.value)}
          style={{
            width: '100%',
            padding: '9px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-slate-300)',
            backgroundColor: '#f8fafc',
            color: 'var(--color-slate-900)',
            fontSize: '0.875rem',
            fontWeight: 500,
            outline: 'none'
          }}
          className="filter-select"
        >
          {CONDITIONS.map((cond) => (
            <option key={cond.id} value={cond.id}>
              {cond.label}
            </option>
          ))}
        </select>
      </div>

      {/* City / Locality Filter */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label
          htmlFor="filter-city"
          style={{
            fontSize: '0.8rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--color-slate-500)'
          }}
        >
          City / Locality
        </label>
        <input
          id="filter-city"
          type="text"
          placeholder="e.g. Bengaluru, Guntur, Mumbai"
          value={city === 'all' ? '' : city}
          onChange={(e) => onFilterChange('city', e.target.value)}
          style={{
            width: '100%',
            padding: '9px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-slate-300)',
            backgroundColor: '#f8fafc',
            color: 'var(--color-slate-900)',
            fontSize: '0.875rem',
            fontWeight: 500,
            outline: 'none'
          }}
          className="filter-select"
        />
      </div>

      {/* 4. Distance Filter */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label
          htmlFor="filter-distance"
          style={{
            fontSize: '0.8rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--color-slate-500)'
          }}
        >
          Distance Radius
        </label>
        <select
          id="filter-distance"
          value={distance}
          onChange={(e) => onFilterChange('distance', e.target.value)}
          style={{
            width: '100%',
            padding: '9px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-slate-300)',
            backgroundColor: '#f8fafc',
            color: 'var(--color-slate-900)',
            fontSize: '0.875rem',
            fontWeight: 500,
            outline: 'none'
          }}
          className="filter-select"
        >
          {DISTANCE_OPTIONS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      {/* 5. Availability Filter */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span
          style={{
            fontSize: '0.8rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--color-slate-500)'
          }}
        >
          Availability
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {AVAILABILITY_OPTIONS.map((avail) => {
            const isChecked = availability === avail.id;
            return (
              <label
                key={avail.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  padding: '5px 8px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: isChecked ? '#ecfdf5' : 'transparent',
                  color: isChecked ? '#047857' : 'var(--color-slate-700)',
                  fontWeight: isChecked ? 700 : 500,
                  fontSize: '0.85rem'
                }}
                className="filter-radio-row"
              >
                <input
                  type="radio"
                  name="availability"
                  value={avail.id}
                  checked={isChecked}
                  onChange={() => onFilterChange('availability', avail.id)}
                  style={{ accentColor: '#059669' }}
                />
                <span>{avail.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      <style>{`
        .filter-select:focus {
          border-color: var(--color-primary-500) !important;
          background-color: #ffffff !important;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
        }
        .filter-radio-row:hover {
          background-color: var(--color-slate-100);
        }
        .reset-filters-btn:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
};

export default FilterPanel;
