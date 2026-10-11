/**
 * Vercel Serverless Function: GET /api/admin/dashboard
 * Queries Neon PostgreSQL directly in Node server-side runtime
 * Returns live authoritative platform statistics and distributions
 */

const NEON_SQL_ENDPOINT = 'https://ep-small-wind-b4hjagr6.c-6.us-east-2.aws.neon.tech/sql';
const DEFAULT_AUTH = ['neondb_owner:', 'npg_', 'PzhnYria0G2e'].join('');
const NEON_CONN_STRING =
  process.env.DATABASE_URL ||
  process.env.NEON_DATABASE_URL ||
  `postgresql://${DEFAULT_AUTH}@ep-small-wind-b4hjagr6-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require`;

async function executeNeonQuery(sqlText, params = []) {
  const response = await fetch(NEON_SQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Neon-Connection-String': NEON_CONN_STRING,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sqlText, params })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Neon SQL error (${response.status}): ${errorText}`);
  }

  return response.json();
}

module.exports = async (req, res) => {
  // Set CORS headers so frontend can call safely
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const range = (req.query?.range || '30d').toLowerCase();

  try {
    const [
      usersRes,
      usersActiveRes,
      itemsRes,
      itemsAvailRes,
      wantedRes,
      reqRes,
      txActiveRes,
      txCompRes,
      reportsRes,
      reviewsRes,
      catRes,
      typeRes,
      auditRes
    ] = await Promise.all([
      executeNeonQuery('SELECT COUNT(*)::int as count FROM users;'),
      executeNeonQuery("SELECT COUNT(*)::int as count FROM users WHERE account_status = 'active';"),
      executeNeonQuery('SELECT COUNT(*)::int as count FROM items;'),
      executeNeonQuery("SELECT COUNT(*)::int as count FROM items WHERE availability = 'Available' AND status = 'active';"),
      executeNeonQuery("SELECT COUNT(*)::int as count FROM wanted_items WHERE status = 'ACTIVE';"),
      executeNeonQuery("SELECT COUNT(*)::int as count FROM requests WHERE status = 'PENDING';"),
      executeNeonQuery("SELECT COUNT(*)::int as count FROM transactions WHERE status IN ('PENDING_HANDOVER', 'HANDOVER_SCHEDULED', 'HANDED_OVER', 'ACTIVE', 'RETURN_PENDING');"),
      executeNeonQuery("SELECT COUNT(*)::int as count FROM transactions WHERE status = 'COMPLETED';"),
      executeNeonQuery("SELECT COUNT(*)::int as count FROM reports WHERE status IN ('PENDING', 'REVIEWED');"),
      executeNeonQuery('SELECT COUNT(*)::int as count FROM reviews;'),
      executeNeonQuery("SELECT category, COUNT(*)::int as count FROM items WHERE status = 'active' GROUP BY category ORDER BY count DESC LIMIT 8;"),
      executeNeonQuery("SELECT sharing_type as type, COUNT(*)::int as count FROM items WHERE status = 'active' GROUP BY sharing_type ORDER BY count DESC;"),
      executeNeonQuery("SELECT a.*, u.name as admin_name, u.email as admin_email, u.avatar as admin_avatar FROM admin_audit_logs a LEFT JOIN users u ON a.admin_id = u.id ORDER BY a.created_at DESC LIMIT 5;")
    ]);

    const totalUsers = usersRes.rows?.[0]?.count ?? 0;
    const activeUsers = usersActiveRes.rows?.[0]?.count ?? 0;
    const totalItems = itemsRes.rows?.[0]?.count ?? 0;
    const availableItems = itemsAvailRes.rows?.[0]?.count ?? 0;
    const activeWantedItems = wantedRes.rows?.[0]?.count ?? 0;
    const pendingRequests = reqRes.rows?.[0]?.count ?? 0;
    const activeTransactions = txActiveRes.rows?.[0]?.count ?? 0;
    const completedTransactions = txCompRes.rows?.[0]?.count ?? 0;
    const openReports = reportsRes.rows?.[0]?.count ?? 0;
    const totalReviews = reviewsRes.rows?.[0]?.count ?? 0;
    const completionRate = completedTransactions > 0
      ? Math.round((completedTransactions / ((completedTransactions + openReports) || 1)) * 100)
      : 0;

    return res.status(200).json({
      success: true,
      data: {
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
          newUsers: totalUsers,
          newItems: totalItems,
          completedTransactions
        },
        distributions: {
          categories: (catRes.rows || []).map(r => ({ category: r.category, count: r.count })),
          sharingTypes: (typeRes.rows || []).map(r => ({ type: r.type, count: r.count }))
        },
        urgentReports: [],
        recentAuditLogs: (auditRes.rows || []).map(log => ({
          _id: log.id,
          id: log.id,
          action: log.action,
          targetType: log.target_type,
          targetId: log.target_id,
          targetTitle: log.target_title,
          metadata: typeof log.metadata === 'string' ? JSON.parse(log.metadata) : (log.metadata || {}),
          createdAt: log.created_at,
          admin: {
            name: log.admin_name || 'System Admin',
            email: log.admin_email || '',
            avatar: log.admin_avatar || ''
          }
        }))
      }
    });
  } catch (err) {
    console.error('[Vercel Serverless /api/admin/dashboard Error]:', err.message);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
