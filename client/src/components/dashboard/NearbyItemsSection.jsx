import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ArrowRight, AlertCircle, RefreshCw, PackageOpen } from 'lucide-react';
import ItemCard from '../common/ItemCard';
import { CardSkeleton } from '../common/Skeleton';
import Button from '../common/Button';
import EmptyState from '../common/EmptyState';

export const NearbyItemsSection = ({ items, loading, error, onRetry }) => {
  const safeItems = Array.isArray(items)
    ? items
    : Array.isArray(items?.items)
    ? items.items
    : [];

  return (
    <div>
      {/* Section Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-slate-900)', margin: 0 }}>
              Community Items
            </h2>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#047857',
                backgroundColor: '#ecfdf5',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)'
              }}
            >
              <MapPin size={11} />
              <span>All Locations</span>
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-slate-500)', margin: '4px 0 0 0' }}>
            Available for giveaway, borrow, or exchange from community members
          </p>
        </div>

        <Link
          to="/browse"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '0.875rem',
            color: 'var(--color-primary-700)',
            fontWeight: 700,
            textDecoration: 'none'
          }}
          className="see-all-nearby-link"
        >
          <span>See All ({safeItems.length})</span>
          <ArrowRight size={15} />
        </Link>
      </div>

      {/* Loading Skeleton State */}
      {loading && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1.25rem'
          }}
        >
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {/* Error State with Retry */}
      {!loading && error && (
        <div
          style={{
            padding: '2rem',
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid #fee2e2',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#fef2f2',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <AlertCircle size={24} />
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#991b1b', margin: 0 }}>
            Unable to load nearby items
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-slate-600)', margin: 0, maxWidth: '400px' }}>
            We encountered an issue communicating with the items service. Please verify your connection or try again.
          </p>
          <Button variant="secondary" size="sm" iconLeft={RefreshCw} onClick={onRetry}>
            Retry
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && safeItems.length === 0 && (
        <EmptyState
          icon={PackageOpen}
          title="No nearby items yet"
          description="Be the first in your neighborhood to share an unused item with your community."
          actionLabel="Share an Item"
          onAction={() => window.location.href = '/customer/share'}
        />
      )}

      {/* Populated Items Grid */}
      {!loading && !error && safeItems.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1.25rem'
          }}
          className="nearby-items-grid"
        >
          {safeItems.slice(0, 6).map((item) => (
            <ItemCard key={item._id || item.id} item={item} />
          ))}
        </div>
      )}

      <style>{`
        .see-all-nearby-link:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
};

export default NearbyItemsSection;
