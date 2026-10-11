const User = require('../models/User');
const Item = require('../models/Item');
const WantedItem = require('../models/WantedItem');
const Request = require('../models/Request');
const Transaction = require('../models/Transaction');
const Report = require('../models/Report');
const Review = require('../models/Review');
const AdminAuditLog = require('../models/AdminAuditLog');
const { query: pgQuery } = require('../config/postgres');

/**
 * Parses time range string into a Date filter
 */
const getStartDateForRange = (range = '30d') => {
  const now = new Date();
  switch (range.toLowerCase()) {
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case '12m':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    case 'all':
      return new Date(0);
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
};

const dashboardCache = new Map();
const CACHE_TTL_MS = 15000; // 15-second TTL to avoid duplicate database scans on fast page loads

const invalidateDashboardCache = () => {
  dashboardCache.clear();
};

/**
 * Returns comprehensive real PostgreSQL & MongoDB statistics for the admin dashboard
 */
const getDashboardOverview = async (range = '30d') => {
  const cacheKey = `dashboard_${range.toLowerCase()}`;
  const cached = dashboardCache.get(cacheKey);
  const now = Date.now();

  if (cached && (now - cached.timestamp) < CACHE_TTL_MS) {
    return cached.data;
  }

  const startDate = getStartDateForRange(range);

  let totalUsers = 0;
  let activeUsers = 0;
  let totalItems = 0;
  let availableItems = 0;
  let activeWantedItems = 0;
  let pendingRequests = 0;
  let activeTransactions = 0;
  let completedTransactions = 0;
  let openReports = 0;
  let totalReviews = 0;
  let newUsersInPeriod = 0;
  let newItemsInPeriod = 0;
  let completedInPeriod = 0;

  // 1. Query Neon PostgreSQL as PRIMARY authoritative platform statistics
  try {
    const [
      pgUsersTotalRes,
      pgUsersActiveRes,
      pgUsersNewRes,
      pgItemsTotalRes,
      pgItemsAvailRes,
      pgItemsNewRes,
      pgWantedActiveRes,
      pgReqPendingRes,
      pgTxActiveRes,
      pgTxCompletedRes,
      pgReportsOpenRes,
      pgReviewsTotalRes
    ] = await Promise.all([
      pgQuery('SELECT COUNT(*)::int as count FROM users;'),
      pgQuery("SELECT COUNT(*)::int as count FROM users WHERE account_status = 'active';"),
      pgQuery('SELECT COUNT(*)::int as count FROM users WHERE created_at >= $1;', [startDate]),
      pgQuery('SELECT COUNT(*)::int as count FROM items;'),
      pgQuery("SELECT COUNT(*)::int as count FROM items WHERE availability = 'Available' AND status = 'active';"),
      pgQuery('SELECT COUNT(*)::int as count FROM items WHERE created_at >= $1;', [startDate]),
      pgQuery("SELECT COUNT(*)::int as count FROM wanted_items WHERE status = 'ACTIVE';"),
      pgQuery("SELECT COUNT(*)::int as count FROM requests WHERE status = 'PENDING';"),
      pgQuery("SELECT COUNT(*)::int as count FROM transactions WHERE status IN ('PENDING_HANDOVER', 'HANDOVER_SCHEDULED', 'HANDED_OVER', 'ACTIVE', 'RETURN_PENDING');"),
      pgQuery("SELECT COUNT(*)::int as count FROM transactions WHERE status = 'COMPLETED';"),
      pgQuery("SELECT COUNT(*)::int as count FROM reports WHERE status IN ('PENDING', 'REVIEWED');"),
      pgQuery('SELECT COUNT(*)::int as count FROM reviews;')
    ]);

    if (pgUsersTotalRes?.rows?.[0]) totalUsers = pgUsersTotalRes.rows[0].count;
    if (pgUsersActiveRes?.rows?.[0]) activeUsers = pgUsersActiveRes.rows[0].count;
    if (pgUsersNewRes?.rows?.[0]) newUsersInPeriod = pgUsersNewRes.rows[0].count;
    if (pgItemsTotalRes?.rows?.[0]) totalItems = pgItemsTotalRes.rows[0].count;
    if (pgItemsAvailRes?.rows?.[0]) availableItems = pgItemsAvailRes.rows[0].count;
    if (pgItemsNewRes?.rows?.[0]) newItemsInPeriod = pgItemsNewRes.rows[0].count;
    if (pgWantedActiveRes?.rows?.[0]) activeWantedItems = pgWantedActiveRes.rows[0].count;
    if (pgReqPendingRes?.rows?.[0]) pendingRequests = pgReqPendingRes.rows[0].count;
    if (pgTxActiveRes?.rows?.[0]) activeTransactions = pgTxActiveRes.rows[0].count;
    if (pgTxCompletedRes?.rows?.[0]) completedTransactions = pgTxCompletedRes.rows[0].count;
    if (pgReportsOpenRes?.rows?.[0]) openReports = pgReportsOpenRes.rows[0].count;
    if (pgReviewsTotalRes?.rows?.[0]) totalReviews = pgReviewsTotalRes.rows[0].count;
  } catch (pgErr) {
    console.warn('[adminDashboardService] Neon PG stats error, checking Mongo fallback:', pgErr.message);
  }

  // 2. Secondary fallback to Mongo only if totalUsers is 0
  if (totalUsers === 0) {
    try {
      const [
        mUsers,
        mActiveUsers,
        mItems,
        mAvailItems,
        mWanted,
        mRequests,
        mTxActive,
        mTxComp,
        mReports,
        mReviews
      ] = await Promise.all([
        User.countDocuments().catch(() => 0),
        User.countDocuments({ accountStatus: 'active' }).catch(() => 0),
        Item.countDocuments().catch(() => 0),
        Item.countDocuments({ availability: 'Available', status: 'active' }).catch(() => 0),
        WantedItem.countDocuments({ status: 'ACTIVE' }).catch(() => 0),
        Request.countDocuments({ status: 'PENDING' }).catch(() => 0),
        Transaction.countDocuments({
          status: { $in: ['PENDING_HANDOVER', 'HANDOVER_SCHEDULED', 'HANDED_OVER', 'ACTIVE', 'RETURN_PENDING'] }
        }).catch(() => 0),
        Transaction.countDocuments({ status: 'COMPLETED' }).catch(() => 0),
        Report.countDocuments({ status: { $in: ['PENDING', 'REVIEWED'] } }).catch(() => 0),
        Review.countDocuments().catch(() => 0)
      ]);

      totalUsers = mUsers;
      activeUsers = mActiveUsers;
      totalItems = mItems;
      availableItems = mAvailItems;
      activeWantedItems = mWanted;
      pendingRequests = mRequests;
      activeTransactions = mTxActive;
      completedTransactions = mTxComp;
      openReports = mReports;
      totalReviews = mReviews;
    } catch {}
  }

  // Category Distribution aggregation from Neon PG
  let categoryDistribution = [];
  try {
    const pgCatRes = await pgQuery(
      "SELECT category, COUNT(*)::int as count FROM items WHERE status = 'active' GROUP BY category ORDER BY count DESC LIMIT 8;"
    );
    if (pgCatRes?.rows?.length > 0) {
      categoryDistribution = pgCatRes.rows.map(row => ({ category: row.category, count: row.count }));
    }
  } catch {
    // fallback to Mongo
  }

  if (categoryDistribution.length === 0) {
    const mongoCatAgg = await Item.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 }
    ]).catch(() => []);
    categoryDistribution = mongoCatAgg.map(c => ({ category: c._id || 'other', count: c.count }));
  }

  // Sharing Type Distribution aggregation from Neon PG
  let sharingTypeDistribution = [];
  try {
    const pgTypeRes = await pgQuery(
      "SELECT sharing_type as type, COUNT(*)::int as count FROM items WHERE status = 'active' GROUP BY sharing_type ORDER BY count DESC;"
    );
    if (pgTypeRes?.rows?.length > 0) {
      sharingTypeDistribution = pgTypeRes.rows.map(row => ({ type: row.type, count: row.count }));
    }
  } catch {
    // fallback to Mongo
  }

  if (sharingTypeDistribution.length === 0) {
    const mongoTypeAgg = await Item.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$sharingType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).catch(() => []);
    sharingTypeDistribution = mongoTypeAgg.map(s => ({ type: s._id || 'give_away', count: s.count }));
  }

  // Recent 5 Pending Moderation Reports
  const urgentReports = await Report.find({ status: { $in: ['PENDING', 'REVIEWED'] } })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('reporter', 'name email avatar')
    .populate('targetUser', 'name email avatar')
    .populate('targetItem', 'title category images')
    .lean()
    .catch(() => []);

  // Recent 5 Admin Audit Logs from Neon PG
  let recentAuditLogs = [];
  try {
    const pgAuditRes = await pgQuery(
      `SELECT a.*, u.name as admin_name, u.email as admin_email, u.avatar as admin_avatar
       FROM admin_audit_logs a
       LEFT JOIN users u ON a.admin_id = u.id
       ORDER BY a.created_at DESC LIMIT 5;`
    );
    if (pgAuditRes?.rows?.length > 0) {
      recentAuditLogs = pgAuditRes.rows.map(log => ({
        _id: log.id,
        id: log.id,
        action: log.action,
        targetType: log.target_type,
        targetId: log.target_id,
        targetTitle: log.target_title,
        metadata: log.metadata,
        createdAt: log.created_at,
        admin: {
          name: log.admin_name || 'System Admin',
          email: log.admin_email || '',
          avatar: log.admin_avatar || ''
        }
      }));
    }
  } catch {
    // fallback
  }

  if (recentAuditLogs.length === 0) {
    recentAuditLogs = await AdminAuditLog.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('admin', 'name email avatar')
      .lean()
      .catch(() => []);
  }

  // Calculate platform completion rate
  const totalCompletedOrCancelled = (completedTransactions + openReports) || 1;
  const completionRate = completedTransactions > 0
    ? Math.round((completedTransactions / totalCompletedOrCancelled) * 100)
    : 0;

  const result = {
    metrics: {
      totalUsers,
      activeUsers,
      totalItems,
      availableItems,
      activeWantedItems,
      pendingRequests,
      activeTransactions,
      completedTransactions,
      openReports,
      totalReviews,
      completionRate
    },
    periodMetrics: {
      range,
      newUsers: newUsersInPeriod,
      newItems: newItemsInPeriod,
      completedTransactions: completedInPeriod
    },
    distributions: {
      categories: categoryDistribution,
      sharingTypes: sharingTypeDistribution
    },
    urgentReports,
    recentAuditLogs
  };

  dashboardCache.set(cacheKey, { data: result, timestamp: Date.now() });
  return result;
};

module.exports = {
  getDashboardOverview,
  getStartDateForRange,
  invalidateDashboardCache
};

