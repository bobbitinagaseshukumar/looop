import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Package,
  Repeat,
  AlertTriangle,
  HelpCircle,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Layers,
  FileText,
  RefreshCw
} from 'lucide-react';
import adminService from '../../services/adminService';
import AdminStatCard from '../../components/admin/AdminStatCard';
import { BarDistributionChart } from '../../components/admin/SimpleChart';
import StatusBadge from '../../components/admin/StatusBadge';
import Spinner from '../../components/common/Spinner';

export const AdminDashboard = () => {
  const [range, setRange] = useState('30d');
  const [data, setData] = useState(() => {
    try {
      const cached = localStorage.getItem('looop_admin_dashboard_cache');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(() => {
    try {
      return !localStorage.getItem('looop_admin_dashboard_cache');
    } catch {
      return true;
    }
  });
  const [error, setError] = useState('');

  const fetchDashboard = async (selectedRange, silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      setError('');
      const res = await adminService.getDashboard(selectedRange);
      const payload = res?.success && res?.data ? res.data : (res?.data || (res?.metrics ? res : null));
      if (payload) {
        setData(payload);
        try {
          localStorage.setItem('looop_admin_dashboard_cache', JSON.stringify(payload));
        } catch {}
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      if (!data) {
        setError('Unable to load real dashboard statistics. Please ensure the backend is running.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // If cached data is present, fetch silently in background without showing loading dots
    const hasCache = !!data;
    fetchDashboard(range, hasCache);
  }, [range]);

  const metrics = data?.metrics || {};
  const distributions = data?.distributions || {};
  const urgentReports = data?.urgentReports || [];
  const recentAuditLogs = data?.recentAuditLogs || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Page Header with Time Range Filter */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ffffff', margin: '0 0 4px 0' }}>
            Platform Overview
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '4px' }}>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
              Real-time Neon Database statistics, platform governance, and moderation status.
            </p>
            {data?.metrics ? (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '20px',
                padding: '2px 10px',
                fontSize: '0.75rem',
                fontWeight: 600
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
                Neon Database Live ({metrics.totalUsers ?? 0} Users)
              </span>
            ) : (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: error ? 'rgba(239, 68, 68, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                color: error ? '#f87171' : '#fbbf24',
                border: `1px solid ${error ? 'rgba(239, 68, 68, 0.3)' : 'rgba(251, 191, 36, 0.3)'}`,
                borderRadius: '20px',
                padding: '2px 10px',
                fontSize: '0.75rem',
                fontWeight: 600
              }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: error ? '#ef4444' : '#f59e0b',
                  display: 'inline-block'
                }} />
                {isLoading ? 'Connecting to Neon Database...' : 'Neon Connection Failed'}
              </span>
            )}
          </div>
        </div>

        {/* Time Range Selector & Sync Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => fetchDashboard(range)}
            disabled={isLoading}
            title="Refresh database statistics from Neon PostgreSQL"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              backgroundColor: '#1e293b',
              color: '#38bdf8',
              border: '1px solid #334155',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all var(--transition-fast)'
            }}
          >
            <RefreshCw size={14} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
            Sync Neon
          </button>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#1e293b',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid #334155',
              padding: '2px'
            }}
          >
            {[
              { label: '7 Days', val: '7d' },
              { label: '30 Days', val: '30d' },
              { label: '90 Days', val: '90d' },
              { label: '12 Months', val: '12m' },
              { label: 'All Time', val: 'all' }
            ].map((tab) => (
              <button
                key={tab.val}
                type="button"
                onClick={() => setRange(tab.val)}
                style={{
                  padding: '6px 12px',
                  border: 'none',
                  borderRadius: 'var(--radius-xs)',
                  backgroundColor: range === tab.val ? 'var(--color-primary-600)' : 'transparent',
                  color: range === tab.val ? '#ffffff' : '#94a3b8',
                  fontSize: '0.8rem',
                  fontWeight: range === tab.val ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!isLoading && (metrics.totalUsers === 0 || metrics.totalUsers === undefined) && (
        <div
          style={{
            padding: '14px 18px',
            backgroundColor: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: 'var(--radius-sm)',
            color: '#38bdf8',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap'
          }}
        >
          <span>Connecting to Neon PostgreSQL database... Click to refresh live platform records.</span>
          <button
            onClick={() => fetchDashboard(range)}
            style={{
              padding: '6px 14px',
              backgroundColor: 'var(--color-primary-600)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 'var(--radius-xs)',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Re-sync Live Data
          </button>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--color-danger)',
            borderRadius: 'var(--radius-sm)',
            color: '#f87171',
            fontSize: '0.875rem'
          }}
        >
          {error}
        </div>
      )}

      {/* Main Metric Cards Grid (Real Neon Database Values) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem'
        }}
      >
        <AdminStatCard
          title="Total Users"
          value={metrics.totalUsers}
          subtitle={`${metrics.totalCustomers ?? 0} Customer${(metrics.totalCustomers === 1 ? '' : 's')} • ${metrics.totalAdmins ?? 4} Admins`}
          icon={Users}
          color="var(--color-primary-400)"
          link="/admin/users"
          isLoading={isLoading}
        />
        <AdminStatCard
          title="Total Listings"
          value={metrics.totalItems}
          subtitle={`${metrics.availableItems || 0} currently available`}
          icon={Package}
          color="#38bdf8"
          link="/admin/items"
          isLoading={isLoading}
        />
        <AdminStatCard
          title="Wanted Requests"
          value={metrics.activeWantedItems}
          subtitle="Community requests seeking items"
          icon={HelpCircle}
          color="#fbbf24"
          link="/admin/items"
          isLoading={isLoading}
        />
        <AdminStatCard
          title="Pending Requests"
          value={metrics.pendingRequests}
          subtitle="Awaiting owner review"
          icon={FileText}
          color="#a78bfa"
          link="/admin/requests"
          isLoading={isLoading}
        />
        <AdminStatCard
          title="Active Exchanges"
          value={metrics.activeTransactions}
          subtitle="Handovers & active borrows"
          icon={Repeat}
          color="#34d399"
          link="/admin/transactions"
          isLoading={isLoading}
        />
        <AdminStatCard
          title="Completed Transactions"
          value={metrics.completedTransactions}
          subtitle={`${metrics.completionRate || 0}% completion success rate`}
          icon={CheckCircle2}
          color="#10b981"
          link="/admin/transactions"
          isLoading={isLoading}
        />
        <AdminStatCard
          title="Open Reports"
          value={metrics.openReports}
          subtitle={metrics.openReports > 0 ? 'Requires administrative review' : 'No pending reports'}
          icon={AlertTriangle}
          color="var(--color-danger)"
          alert={metrics.openReports > 0}
          link="/admin/reports"
          isLoading={isLoading}
        />
        <AdminStatCard
          title="Verified Reviews"
          value={metrics.totalReviews}
          subtitle="Community trust ratings"
          icon={ShieldCheck}
          color="#f472b6"
          isLoading={isLoading}
        />
      </div>

      {/* Middle Row: Visualizations & Distributions */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '1.5rem'
        }}
      >
        {/* Category Breakdown */}
        <div
          style={{
            backgroundColor: '#1e293b',
            borderRadius: 'var(--radius-md)',
            border: '1px solid #334155',
            padding: '1.5rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} color="var(--color-primary-400)" />
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                Listings by Category
              </h2>
            </div>
            <Link to="/admin/items" style={{ color: 'var(--color-primary-400)', fontSize: '0.8rem', textDecoration: 'none' }}>
              View all
            </Link>
          </div>

          <BarDistributionChart
            items={(distributions.categories || []).map((c) => ({
              label: c.category,
              count: c.count
            }))}
            color="var(--color-primary-400)"
            emptyMessage="No listings categorized yet."
          />
        </div>

        {/* Sharing Types Distribution */}
        <div
          style={{
            backgroundColor: '#1e293b',
            borderRadius: 'var(--radius-md)',
            border: '1px solid #334155',
            padding: '1.5rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Repeat size={18} color="#34d399" />
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                Sharing Model Breakdown
              </h2>
            </div>
          </div>

          <BarDistributionChart
            items={(distributions.sharingTypes || []).map((s) => ({
              label: s.type.replace(/_/g, ' '),
              count: s.count
            }))}
            color="#34d399"
            emptyMessage="No active listings."
          />
        </div>
      </div>

      {/* Bottom Row: Moderation Queue & Recent Audit Activity */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '1.5rem'
        }}
      >
        {/* Urgent Moderation Queue */}
        <div
          style={{
            backgroundColor: '#1e293b',
            borderRadius: 'var(--radius-md)',
            border: '1px solid #334155',
            padding: '1.5rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} color="var(--color-danger)" />
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                Moderation Queue
              </h2>
            </div>
            <Link
              to="/admin/reports"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: 'var(--color-primary-400)',
                fontSize: '0.8rem',
                textDecoration: 'none'
              }}
            >
              <span>Manage all</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {urgentReports.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
              ✓ All reports have been reviewed. Moderation queue is clean.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {urgentReports.map((rep) => (
                <div
                  key={rep._id}
                  style={{
                    padding: '10px 12px',
                    backgroundColor: '#0f172a',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid #334155',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <StatusBadge status={rep.status} />
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc' }}>
                        {rep.targetType}: {rep.targetItem?.title || rep.targetUser?.name || 'Entity'}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      Reason: {rep.reason}
                    </span>
                  </div>

                  <Link
                    to={`/admin/reports`}
                    style={{
                      padding: '4px 10px',
                      backgroundColor: 'rgba(99, 102, 241, 0.15)',
                      color: 'var(--color-primary-400)',
                      borderRadius: 'var(--radius-xs)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      textDecoration: 'none'
                    }}
                  >
                    Review
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Admin Audit Logs */}
        <div
          style={{
            backgroundColor: '#1e293b',
            borderRadius: 'var(--radius-md)',
            border: '1px solid #334155',
            padding: '1.5rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} color="#818cf8" />
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                Recent Security Audit Trail
              </h2>
            </div>
            <Link
              to="/admin/audit-logs"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: 'var(--color-primary-400)',
                fontSize: '0.8rem',
                textDecoration: 'none'
              }}
            >
              <span>Full audit log</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {recentAuditLogs.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
              No administrative audit entries yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recentAuditLogs.map((log) => (
                <div
                  key={log._id}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#0f172a',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid #334155',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1' }}>
                      {log.action.replace(/_/g, ' ')}
                    </span>
                    <span style={{ fontSize: '0.725rem', color: '#64748b' }}>
                      by {log.admin?.name || 'Administrator'} • {new Date(log.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-xs)',
                      backgroundColor: '#1e293b',
                      color: '#94a3b8'
                    }}
                  >
                    {log.targetType}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
