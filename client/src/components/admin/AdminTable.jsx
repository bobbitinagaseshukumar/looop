import React from 'react';
import Spinner from '../common/Spinner';

export const AdminTable = ({
  columns = [],
  data = [],
  isLoading = false,
  emptyMessage = 'No records found.',
  keyExtractor = (item, index) => item._id || item.id || index
}) => {
  return (
    <div
      style={{
        backgroundColor: '#1e293b',
        borderRadius: 'var(--radius-md)',
        border: '1px solid #334155',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)'
      }}
    >
      <div
        style={{
          overflowX: 'auto',
          width: '100%',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'thin'
        }}
        className="admin-table-scroll"
      >
        <table
          style={{
            width: '100%',
            minWidth: '980px',
            borderCollapse: 'collapse',
            textAlign: 'left',
            fontSize: '0.875rem'
          }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: '#090d16',
                borderBottom: '1px solid #334155',
                color: '#94a3b8',
                fontWeight: 600,
                textTransform: 'uppercase',
                fontSize: '0.725rem',
                letterSpacing: '0.05em'
              }}
            >
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  style={{
                    padding: '14px 16px',
                    whiteSpace: 'nowrap',
                    textAlign: col.align || 'left',
                    width: col.width || 'auto'
                  }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody style={{ divideY: '1px solid #334155' }}>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, rIdx) => (
                <tr key={rIdx} style={{ borderBottom: '1px solid #2d3748' }}>
                  {columns.map((col, cIdx) => (
                    <td key={cIdx} style={{ padding: '14px 16px' }}>
                      <div
                        style={{
                          height: '16px',
                          borderRadius: '6px',
                          backgroundColor: '#334155',
                          opacity: 0.5,
                          animation: 'pulse 1.5s ease-in-out infinite',
                          width: cIdx === 0 ? '65%' : cIdx === 1 ? '85%' : '50%'
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: '48px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((item, rowIdx) => (
                <tr
                  key={keyExtractor(item, rowIdx)}
                  style={{
                    borderBottom: '1px solid #2d3748',
                    transition: 'background-color var(--transition-fast)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(51, 65, 85, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {columns.map((col, colIdx) => (
                    <td
                      key={colIdx}
                      style={{
                        padding: '14px 16px',
                        color: '#f8fafc',
                        verticalAlign: 'middle',
                        textAlign: col.align || 'left'
                      }}
                    >
                      {col.render ? col.render(item, rowIdx) : item[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <style>{`
        .admin-table-scroll::-webkit-scrollbar {
          height: 7px;
        }
        .admin-table-scroll::-webkit-scrollbar-track {
          background: #0f172a;
        }
        .admin-table-scroll::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 4px;
        }
        .admin-table-scroll::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
      `}</style>
    </div>
  );
};

export default AdminTable;
