import React from 'react';
import { X, Check } from 'lucide-react';
import FilterPanel from './FilterPanel';
import Button from '../common/Button';

export const MobileFilterDrawer = ({
  isOpen,
  onClose,
  filters,
  onFilterChange,
  onResetFilters,
  totalItems = 0,
  categoryCounts = {}
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        justifyContent: 'flex-end'
      }}
      className="mobile-filter-drawer-overlay"
    >
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(3px)'
        }}
        onClick={onClose}
      />

      {/* Drawer Pane */}
      <div
        style={{
          position: 'relative',
          width: '85%',
          maxWidth: '360px',
          backgroundColor: '#ffffff',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: 'var(--shadow-2xl)',
          zIndex: 101,
          animation: 'slideInRight 0.25s ease-out'
        }}
        className="mobile-filter-pane"
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--color-slate-200)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-slate-900)', margin: 0 }}>
            Filter Listings
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters drawer"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-slate-500)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: 'var(--radius-xs)'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Filter Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          <FilterPanel
            filters={filters}
            onFilterChange={onFilterChange}
            onResetFilters={onResetFilters}
            totalItems={totalItems}
            categoryCounts={categoryCounts}
            isMobile={true}
          />
        </div>

        {/* Drawer Footer Actions */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderTop: '1px solid var(--color-slate-200)',
            backgroundColor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <Button
            variant="outline"
            size="md"
            onClick={() => {
              onResetFilters();
            }}
            style={{ flex: 1 }}
          >
            Reset
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={onClose}
            style={{ flex: 2 }}
            iconRight={Check}
          >
            Apply ({totalItems})
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default MobileFilterDrawer;
