import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Shield,
  UserCheck,
  UserX,
  Eye,
  EyeOff,
  Phone,
  Key,
  Copy,
  Check,
  Search,
  Filter,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import adminService from '../../services/adminService';
import AdminTable from '../../components/admin/AdminTable';
import AdminPagination from '../../components/admin/AdminPagination';
import AdminSearch from '../../components/admin/AdminSearch';
import AdminFilterBar from '../../components/admin/AdminFilterBar';
import StatusBadge from '../../components/admin/StatusBadge';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import Avatar from '../../components/common/Avatar';
import Spinner from '../../components/common/Spinner';

export const AdminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  // Password Visibility & Copy State
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  // User Details Modal State
  const [selectedUser, setSelectedUser] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [userDetailsData, setUserDetailsData] = useState(null);

  // Status Change Dialog State
  const [statusDialogTarget, setStatusDialogTarget] = useState(null);
  const [statusDialogAction, setStatusDialogAction] = useState('suspended');
  const [isStatusDialogLoading, setIsStatusDialogLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await adminService.getUsers({
        page,
        limit: 15,
        search,
        role: roleFilter,
        status: statusFilter
      });
      if (res?.success) {
        setUsers(res.data.users || []);
        setTotal(res.data.total || 0);
        setTotalPages(res.data.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setNotification({ type: 'error', message: 'Failed to retrieve registered users from database.' });
    } finally {
      setIsLoading(false);
    }
  }, [page, search, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpenDetails = async (user) => {
    setSelectedUser(user);
    setIsDetailsOpen(true);
    try {
      setDetailsLoading(true);
      const res = await adminService.getUserDetails(user._id);
      if (res?.success) {
        setUserDetailsData(res.data);
      }
    } catch (err) {
      console.error('Failed to load user details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleOpenStatusDialog = (user, targetAction) => {
    setStatusDialogTarget(user);
    setStatusDialogAction(targetAction);
  };

  const handleConfirmStatusChange = async (reason) => {
    if (!statusDialogTarget) return;
    try {
      setIsStatusDialogLoading(true);
      const res = await adminService.updateUserStatus(statusDialogTarget._id, {
        accountStatus: statusDialogAction,
        reason
      });
      if (res?.success) {
        setNotification({
          type: 'success',
          message: `User ${statusDialogTarget.name} has been ${statusDialogAction === 'suspended' ? 'suspended' : 'activated'}.`
        });
        setStatusDialogTarget(null);
        fetchUsers();
      }
    } catch (err) {
      console.error('Failed to update user status:', err);
      setNotification({
        type: 'error',
        message: err.response?.data?.message || 'Error updating account status.'
      });
    } finally {
      setIsStatusDialogLoading(false);
    }
  };

  const columns = [
    {
      header: 'User',
      accessor: 'name',
      render: (u) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Avatar src={u.avatar} name={u.name} size="sm" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 600, color: '#f8fafc' }}>{u.name}</span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{u.email}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Mobile / Phone',
      accessor: 'phone',
      render: (u) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: u.phone ? '#f1f5f9' : '#64748b' }}>
          <Phone size={13} style={{ color: u.phone ? '#10b981' : '#64748b', flexShrink: 0 }} />
          <span>{u.phone || '—'}</span>
        </div>
      )
    },
    {
      header: 'Password',
      render: (u) => {
        const isVisible = !!visiblePasswords[u._id];
        const pwd = u.plainPassword || u.password || '••••••••';
        const isCopied = copiedId === u._id;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                fontFamily: isVisible ? 'monospace' : 'inherit',
                fontSize: '0.8rem',
                color: isVisible ? '#38bdf8' : '#94a3b8',
                backgroundColor: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid #334155',
                padding: '2px 8px',
                borderRadius: '4px',
                maxWidth: '120px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontWeight: isVisible ? 600 : 400
              }}
            >
              {isVisible ? pwd : '••••••••'}
            </span>
            <button
              type="button"
              title={isVisible ? 'Hide Password' : 'Show Password'}
              onClick={() => setVisiblePasswords(prev => ({ ...prev, [u._id]: !prev[u._id] }))}
              style={{
                background: 'none',
                border: 'none',
                color: isVisible ? '#38bdf8' : '#64748b',
                cursor: 'pointer',
                padding: '3px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {isVisible ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
            {(u.plainPassword || (u.password && !u.password.startsWith('$2'))) && (
              <button
                type="button"
                title="Copy Password"
                onClick={() => {
                  navigator.clipboard.writeText(u.plainPassword || u.password);
                  setCopiedId(u._id);
                  setTimeout(() => setCopiedId(null), 2000);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: isCopied ? '#10b981' : '#64748b',
                  cursor: 'pointer',
                  padding: '3px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {isCopied ? <Check size={13} /> : <Copy size={13} />}
              </button>
            )}
          </div>
        );
      }
    },
    {
      header: 'Role',
      accessor: 'role',
      render: (u) => (
        <span
          style={{
            fontSize: '0.725rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            padding: '2px 8px',
            borderRadius: 'var(--radius-xs)',
            backgroundColor: u.role === 'admin' ? 'rgba(99, 102, 241, 0.2)' : '#334155',
            color: u.role === 'admin' ? '#818cf8' : '#cbd5e1'
          }}
        >
          {u.role}
        </span>
      )
    },
    {
      header: 'Account Status',
      accessor: 'accountStatus',
      render: (u) => <StatusBadge status={u.accountStatus || 'active'} />
    },
    {
      header: 'Member Since',
      accessor: 'createdAt',
      render: (u) => (
        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
          {new Date(u.createdAt).toLocaleDateString()}
        </span>
      )
    },
    {
      header: 'Circulation Activity',
      render: (u) => (
        <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem', color: '#cbd5e1' }}>
          <span>Items: {u.itemsCount || 0}</span>
          <span>•</span>
          <span>Completed: {u.completedTransactionsCount || 0}</span>
        </div>
      )
    },
    {
      header: 'Actions',
      align: 'right',
      render: (u) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            type="button"
            onClick={() => handleOpenDetails(u)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 10px',
              backgroundColor: '#334155',
              border: 'none',
              borderRadius: 'var(--radius-xs)',
              color: '#f8fafc',
              fontSize: '0.75rem',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <Eye size={13} />
            <span>Details</span>
          </button>

          {u.accountStatus === 'suspended' ? (
            <button
              type="button"
              onClick={() => handleOpenStatusDialog(u, 'active')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 10px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 'var(--radius-xs)',
                color: '#34d399',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <UserCheck size={13} />
              <span>Activate</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleOpenStatusDialog(u, 'suspended')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 10px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-xs)',
                color: '#f87171',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <UserX size={13} />
              <span>Suspend</span>
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Page Header */}
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', margin: '0 0 4px 0' }}>
          User Governance
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>
          Manage registered members, inspect circulation activity, and administer account standing.
        </p>
      </div>

      {notification && (
        <div
          style={{
            padding: '10px 16px',
            backgroundColor: notification.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            border: `1px solid ${notification.type === 'error' ? 'var(--color-danger)' : '#10b981'}`,
            borderRadius: 'var(--radius-sm)',
            color: notification.type === 'error' ? '#f87171' : '#34d399',
            fontSize: '0.85rem'
          }}
        >
          {notification.message}
        </div>
      )}

      {/* Filter and Search Bar */}
      <AdminFilterBar
        onReset={() => {
          setSearch('');
          setRoleFilter('');
          setStatusFilter('');
          setPage(1);
        }}
        hasActiveFilters={Boolean(search || roleFilter || statusFilter)}
      >
        <AdminSearch
          value={search}
          onChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
          placeholder="Search by name or email..."
        />

        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          style={{
            padding: '8px 12px',
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: 'var(--radius-sm)',
            color: '#f8fafc',
            fontSize: '0.85rem'
          }}
        >
          <option value="">All Roles</option>
          <option value="customer">Customer</option>
          <option value="admin">Administrator</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          style={{
            padding: '8px 12px',
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: 'var(--radius-sm)',
            color: '#f8fafc',
            fontSize: '0.85rem'
          }}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </AdminFilterBar>

      {/* Users Table */}
      <AdminTable
        columns={columns}
        data={users}
        isLoading={isLoading}
        emptyMessage="No registered users match your search criteria."
      />

      {/* Pagination */}
      <AdminPagination
        page={page}
        totalPages={totalPages}
        total={total}
        limit={15}
        onPageChange={(newPage) => setPage(newPage)}
      />

      {/* User Details Modal */}
      {isDetailsOpen && selectedUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px'
          }}
        >
          <div
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 'var(--radius-lg)',
              width: '100%',
              maxWidth: '650px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: 'var(--shadow-xl)',
              padding: '24px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Avatar src={selectedUser.avatar} name={selectedUser.name} size="md" />
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                    {selectedUser.name}
                  </h2>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{selectedUser.email}</span>
                </div>
              </div>
              <StatusBadge status={selectedUser.accountStatus || 'active'} />
            </div>

            {detailsLoading ? (
              <div style={{ padding: '36px', textAlign: 'center' }}>
                <Spinner size="md" />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.875rem' }}>
                {/* Customer Account & Authentication Credentials */}
                <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid #334155' }}>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#38bdf8', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Key size={15} /> Customer Account & Login Credentials
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Full Name</span>
                      <span style={{ color: '#f8fafc', fontWeight: 600 }}>{selectedUser.name}</span>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Email Address</span>
                      <span style={{ color: '#f8fafc', fontWeight: 600 }}>{selectedUser.email}</span>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Mobile / Phone Number</span>
                      <span style={{ color: (selectedUser.phone || userDetailsData?.user?.phone) ? '#10b981' : '#94a3b8', fontWeight: 600 }}>
                        {selectedUser.phone || userDetailsData?.user?.phone || 'Not provided'}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Account Password</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                        <span style={{ color: '#38bdf8', fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 600 }}>
                          {visiblePasswords['modal']
                            ? (selectedUser.plainPassword || userDetailsData?.user?.plainPassword || selectedUser.password || '••••••••')
                            : '••••••••'}
                        </span>
                        <button
                          type="button"
                          title={visiblePasswords['modal'] ? 'Hide' : 'Show'}
                          onClick={() => setVisiblePasswords(prev => ({ ...prev, modal: !prev.modal }))}
                          style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', padding: 0 }}
                        >
                          {visiblePasswords['modal'] ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        {(selectedUser.plainPassword || userDetailsData?.user?.plainPassword) && (
                          <button
                            type="button"
                            title="Copy Password"
                            onClick={() => {
                              navigator.clipboard.writeText(selectedUser.plainPassword || userDetailsData?.user?.plainPassword);
                              setCopiedId('modal');
                              setTimeout(() => setCopiedId(null), 2000);
                            }}
                            style={{ background: 'none', border: 'none', color: copiedId === 'modal' ? '#10b981' : '#94a3b8', cursor: 'pointer', padding: 0 }}
                          >
                            {copiedId === 'modal' ? <Check size={14} /> : <Copy size={14} />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Profile Overview */}
                <div style={{ backgroundColor: '#0f172a', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Location</span>
                      <span style={{ color: '#f8fafc' }}>
                        {selectedUser.city || 'Not specified'}, {selectedUser.state || ''}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Trust Score</span>
                      <span style={{ color: '#34d399', fontWeight: 600 }}>{selectedUser.trustScore || 95} / 100</span>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Registered</span>
                      <span style={{ color: '#cbd5e1' }}>{new Date(selectedUser.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>User ID</span>
                      <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontFamily: 'monospace' }}>{selectedUser._id}</span>
                    </div>
                  </div>
                </div>

                {/* Circulation Records */}
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
                    Recent Listings ({userDetailsData?.items?.length || 0})
                  </h3>
                  {userDetailsData?.items?.length === 0 ? (
                    <p style={{ color: '#64748b', fontSize: '0.8rem' }}>No listings created by this user.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {userDetailsData?.items?.slice(0, 5).map((item) => (
                        <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', backgroundColor: '#0f172a', borderRadius: 'var(--radius-xs)' }}>
                          <span style={{ color: '#cbd5e1' }}>{item.title}</span>
                          <StatusBadge status={item.status} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Moderation History */}
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
                    Moderation Reports Involving User ({userDetailsData?.reportsAgainst?.length || 0})
                  </h3>
                  {userDetailsData?.reportsAgainst?.length === 0 ? (
                    <p style={{ color: '#10b981', fontSize: '0.8rem' }}>✓ Clean standing. No reports filed against this user.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {userDetailsData?.reportsAgainst?.map((rep) => (
                        <div key={rep._id} style={{ padding: '8px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius-xs)' }}>
                          <span style={{ color: '#f87171', fontWeight: 600 }}>{rep.reason}</span>
                          <span style={{ color: '#94a3b8', fontSize: '0.75rem', display: 'block' }}>{rep.description}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setIsDetailsOpen(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#334155',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  color: '#f8fafc',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Suspension / Activation */}
      <ConfirmDialog
        isOpen={Boolean(statusDialogTarget)}
        title={statusDialogAction === 'suspended' ? `Suspend ${statusDialogTarget?.name}?` : `Reactivate ${statusDialogTarget?.name}?`}
        message={
          statusDialogAction === 'suspended'
            ? 'Suspended users will be immediately blocked from signing in, publishing listings, sending messages, or requesting items.'
            : 'Reactivating this user will restore their standard platform access privileges.'
        }
        confirmLabel={statusDialogAction === 'suspended' ? 'Suspend Account' : 'Reactivate Account'}
        confirmVariant={statusDialogAction === 'suspended' ? 'danger' : 'primary'}
        requireReason={statusDialogAction === 'suspended'}
        reasonPlaceholder="Specify violation (e.g. fraudulent listing, harassment, terms violation)..."
        isLoading={isStatusDialogLoading}
        onConfirm={handleConfirmStatusChange}
        onCancel={() => setStatusDialogTarget(null)}
      />
    </div>
  );
};

export default AdminUsersPage;
