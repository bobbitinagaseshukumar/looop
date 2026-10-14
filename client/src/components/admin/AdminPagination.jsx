import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export const AdminPagination = ({
  page = 1,
  totalPages = 1,
  total = 0,
  limit = 15,
  onPageChange,
  onLimitChange,
  limitOptions = [5, 10, 15, 25, 50]
}) => {
  if (total === 0) return null;

  const actualTotalPages = Math.max(1, totalPages || 1);
  const startRecord = Math.min((page - 1) * limit + 1, total);
  const endRecord = Math.min(page * limit, total);

  // Generate visible page numbers (smart window around current page)
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    if (actualTotalPages <= maxVisible) {
      for (let i = 1; i <= actualTotalPages; i++) pages.push(i);
    } else {
      let start = Math.max(1, page - 2);
      let end = Math.min(actualTotalPages, start + maxVisible - 1);
      if (end - start < maxVisible - 1) {
        start = Math.max(1, end - maxVisible + 1);
      }
      for (let i = start; i <= end; i++) pages.push(i);
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        padding: '12px 18px',
        backgroundColor: '#1e293b',
        borderRadius: 'var(--radius-md)',
        border: '1px solid #334155',
        marginTop: '1.25rem',
        fontSize: '0.875rem',
        color: '#94a3b8',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box'
      }}
      className="admin-pagination-container"
    >
      {/* Left side: Record count & Page size selector */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          Showing <span style={{ color: '#f8fafc', fontWeight: 700 }}>{startRecord}</span> to{' '}
          <span style={{ color: '#f8fafc', fontWeight: 700 }}>{endRecord}</span> of{' '}
          <span style={{ color: '#38bdf8', fontWeight: 700 }}>{total}</span> members
        </div>

        {onLimitChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
            <span style={{ color: '#64748b' }}>Per page:</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              style={{
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: '#f8fafc',
                padding: '3px 8px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              {limitOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right side: Navigation Controls */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
        {/* First page button */}
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(1)}
          title="First Page"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px 8px',
            backgroundColor: page <= 1 ? 'rgba(15, 23, 42, 0.4)' : '#334155',
            color: page <= 1 ? '#475569' : '#f8fafc',
            border: '1px solid #334155',
            borderRadius: '6px',
            cursor: page <= 1 ? 'not-allowed' : 'pointer',
            fontSize: '0.8rem',
            opacity: page <= 1 ? 0.6 : 1,
            transition: 'all 0.2s ease'
          }}
        >
          <ChevronsLeft size={15} />
        </button>

        {/* Previous page button */}
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          title="Previous Page"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 12px',
            backgroundColor: page <= 1 ? 'rgba(15, 23, 42, 0.4)' : '#334155',
            color: page <= 1 ? '#475569' : '#f8fafc',
            border: '1px solid #334155',
            borderRadius: '6px',
            cursor: page <= 1 ? 'not-allowed' : 'pointer',
            fontSize: '0.8rem',
            fontWeight: 600,
            opacity: page <= 1 ? 0.6 : 1,
            transition: 'all 0.2s ease'
          }}
        >
          <ChevronLeft size={15} />
          <span>Previous</span>
        </button>

        {/* Page numbers */}
        {pageNumbers.map((p) => {
          const isCurrent = p === page;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              style={{
                minWidth: '32px',
                height: '32px',
                padding: '0 6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isCurrent ? '#0284c7' : '#0f172a',
                color: isCurrent ? '#ffffff' : '#cbd5e1',
                border: `1px solid ${isCurrent ? '#38bdf8' : '#334155'}`,
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: isCurrent ? 700 : 500,
                transition: 'all 0.2s ease'
              }}
            >
              {p}
            </button>
          );
        })}

        {/* Next page button */}
        <button
          type="button"
          disabled={page >= actualTotalPages}
          onClick={() => onPageChange(page + 1)}
          title="Next Page"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 12px',
            backgroundColor: page >= actualTotalPages ? 'rgba(15, 23, 42, 0.4)' : '#0284c7',
            color: page >= actualTotalPages ? '#475569' : '#ffffff',
            border: `1px solid ${page >= actualTotalPages ? '#334155' : '#0284c7'}`,
            borderRadius: '6px',
            cursor: page >= actualTotalPages ? 'not-allowed' : 'pointer',
            fontSize: '0.8rem',
            fontWeight: 700,
            opacity: page >= actualTotalPages ? 0.6 : 1,
            boxShadow: page >= actualTotalPages ? 'none' : '0 2px 6px rgba(2, 132, 199, 0.4)',
            transition: 'all 0.2s ease'
          }}
        >
          <span>Next</span>
          <ChevronRight size={15} />
        </button>

        {/* Last page button */}
        <button
          type="button"
          disabled={page >= actualTotalPages}
          onClick={() => onPageChange(actualTotalPages)}
          title="Last Page"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px 8px',
            backgroundColor: page >= actualTotalPages ? 'rgba(15, 23, 42, 0.4)' : '#334155',
            color: page >= actualTotalPages ? '#475569' : '#f8fafc',
            border: '1px solid #334155',
            borderRadius: '6px',
            cursor: page >= actualTotalPages ? 'not-allowed' : 'pointer',
            fontSize: '0.8rem',
            opacity: page >= actualTotalPages ? 0.6 : 1,
            transition: 'all 0.2s ease'
          }}
        >
          <ChevronsRight size={15} />
        </button>
      </div>
    </div>
  );
};

export default AdminPagination;
