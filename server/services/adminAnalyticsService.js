const { getStartDateForRange } = require('./adminDashboardService');
const { query: pgQuery } = require('../config/postgres');

const analyticsCache = new Map();
const CACHE_TTL_MS = 30000;
const inflightAnalyticsPromises = new Map();

const invalidateAnalyticsCache = () => {
  analyticsCache.clear();
  inflightAnalyticsPromises.clear();
};

/**
 * Returns aggregated platform analytics using PostgreSQL data
 */
const getPlatformAnalytics = async (range = '30d') => {
  const cacheKey = `analytics_${range.toLowerCase()}`;
  const now = Date.now();

  const cached = analyticsCache.get(cacheKey);
  if (cached && (now - cached.timestamp) < CACHE_TTL_MS) {
    return cached.data;
  }

  if (inflightAnalyticsPromises.has(cacheKey)) {
    return inflightAnalyticsPromises.get(cacheKey);
  }

  const promise = (async () => {
    const startDate = getStartDateForRange(range);

    const totalsSql = `
      SELECT
        (SELECT COUNT(*)::int FROM users) AS "totalUsers",
        (SELECT COUNT(*)::int FROM users WHERE LOWER(role) = 'customer') AS "totalCustomers",
        (SELECT COUNT(*)::int FROM users WHERE LOWER(role) = 'admin') AS "totalAdmins",
        (SELECT COUNT(*)::int FROM items) AS "totalItems",
        (SELECT COUNT(*)::int FROM wanted_items) AS "totalWanted",
        (SELECT COUNT(*)::int FROM transactions) AS "totalTransactions",
        (SELECT COUNT(*)::int FROM reports) AS "totalReports";
    `;

    const catSql = `SELECT category as _id, COUNT(*)::int as count FROM items WHERE status = 'active' GROUP BY category ORDER BY count DESC LIMIT 10;`;
    const wantedCatSql = `SELECT category as _id, COUNT(*)::int as count FROM wanted_items GROUP BY category ORDER BY count DESC LIMIT 10;`;
    const typeSql = `SELECT sharing_type as _id, COUNT(*)::int as count FROM items WHERE status = 'active' GROUP BY sharing_type ORDER BY count DESC;`;
    const reportsStatusSql = `SELECT status as _id, COUNT(*)::int as count FROM reports GROUP BY status ORDER BY count DESC;`;
    const reportsTargetSql = `SELECT target_type as _id, COUNT(*)::int as count FROM reports GROUP BY target_type ORDER BY count DESC;`;
    const topCitiesSql = `SELECT city as _id, COUNT(*)::int as count FROM items WHERE city IS NOT NULL AND city != '' GROUP BY city ORDER BY count DESC LIMIT 10;`;

    const [totalsRes, catRes, wantedCatRes, typeRes, repStatusRes, repTargetRes, topCitiesRes] = await Promise.all([
      pgQuery(totalsSql).catch(() => ({ rows: [{}] })),
      pgQuery(catSql).catch(() => ({ rows: [] })),
      pgQuery(wantedCatSql).catch(() => ({ rows: [] })),
      pgQuery(typeSql).catch(() => ({ rows: [] })),
      pgQuery(reportsStatusSql).catch(() => ({ rows: [] })),
      pgQuery(reportsTargetSql).catch(() => ({ rows: [] })),
      pgQuery(topCitiesSql).catch(() => ({ rows: [] }))
    ]);

    const t = totalsRes.rows[0] || {};

    const result = {
      range,
      totals: {
        users: t.totalUsers ?? 0,
        customers: t.totalCustomers ?? 0,
        admins: t.totalAdmins ?? 0,
        items: t.totalItems ?? 0,
        wanted: t.totalWanted ?? 0,
        transactions: t.totalTransactions ?? 0,
        reports: t.totalReports ?? 0
      },
      trends: {
        users: [],
        items: [],
        transactions: [],
        requests: []
      },
      distributions: {
        itemsByCategory: (catRes.rows || []).map(c => ({ category: c._id || 'other', count: c.count })),
        wantedByCategory: (wantedCatRes.rows || []).map(c => ({ category: c._id || 'other', count: c.count })),
        sharingTypes: (typeRes.rows || []).map(s => ({ type: s._id || 'give_away', count: s.count })),
        reportsByStatus: (repStatusRes.rows || []).map(r => ({ status: r._id || 'PENDING', count: r.count })),
        reportsByTargetType: (repTargetRes.rows || []).map(r => ({ targetType: r._id || 'ITEM', count: r.count })),
        topCities: (topCitiesRes.rows || []).map(c => ({ city: c._id, count: c.count }))
      }
    };

    analyticsCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  })();

  inflightAnalyticsPromises.set(cacheKey, promise);
  try {
    return await promise;
  } finally {
    inflightAnalyticsPromises.delete(cacheKey);
  }
};

module.exports = {
  getPlatformAnalytics,
  invalidateAnalyticsCache
};
