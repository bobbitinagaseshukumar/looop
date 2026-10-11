const mongoose = require('mongoose');
const User = require('../models/User');
const Item = require('../models/Item');
const WantedItem = require('../models/WantedItem');
const Request = require('../models/Request');
const Transaction = require('../models/Transaction');
const Report = require('../models/Report');
const Review = require('../models/Review');
const Category = require('../models/Category');
const AdminSetting = require('../models/AdminSetting');
const AdminAuditLog = require('../models/AdminAuditLog');
const adminDashboardService = require('../services/adminDashboardService');
const adminAnalyticsService = require('../services/adminAnalyticsService');
const { logAction } = require('../services/adminAuditService');
const notificationService = require('../services/notificationService');
const uploadRulesService = require('../services/uploadRulesService');
const locationRulesService = require('../services/locationRulesService');
const { query: pgQuery } = require('../config/postgres');

// Default platform configuration values
const DEFAULT_SETTINGS = {
  defaultMatchThreshold: 60,
  defaultSearchRadiusKm: 25,
  itemsPerPage: 20,
  maintenanceMode: false
};

// -------------------------------------------------------------
// 1. DASHBOARD & OVERVIEW
// -------------------------------------------------------------
exports.getDashboard = async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    const range = req.query.range || '30d';
    const data = await adminDashboardService.getDashboardOverview(range);
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching admin dashboard:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to aggregate admin dashboard statistics.'
    });
  }
};

// -------------------------------------------------------------
// 2. REAL ANALYTICS
// -------------------------------------------------------------
exports.getAnalytics = async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    const range = req.query.range || '30d';
    const data = await adminAnalyticsService.getPlatformAnalytics(range);
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching platform analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate platform analytics.'
    });
  }
};

// -------------------------------------------------------------
// 3. USERS MANAGEMENT
// -------------------------------------------------------------
exports.getUsers = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    // 1. Query Neon PostgreSQL database first
    try {
      let whereSql = 'WHERE 1=1';
      const params = [];
      let paramIdx = 1;

      if (req.query.search) {
        whereSql += ` AND (name ILIKE $${paramIdx} OR email ILIKE $${paramIdx})`;
        params.push(`%${req.query.search.trim()}%`);
        paramIdx++;
      }
      if (req.query.role && ['customer', 'admin'].includes(req.query.role.toLowerCase())) {
        whereSql += ` AND LOWER(role) = $${paramIdx++}`;
        params.push(req.query.role.toLowerCase());
      }
      if (req.query.status && ['active', 'suspended'].includes(req.query.status.toLowerCase())) {
        whereSql += ` AND LOWER(account_status) = $${paramIdx++}`;
        params.push(req.query.status.toLowerCase());
      }

      const countRes = await pgQuery(`SELECT COUNT(*)::int as total FROM users ${whereSql};`, params);
      const pgTotal = countRes?.rows?.[0]?.total || 0;

      const dataSql = `
        SELECT 
          u.id, u.name, u.email, u.role, u.avatar, u.bio, u.city, u.locality, u.state,
          u.account_status AS "accountStatus", u.trust_score AS "trustScore",
          u.rating, u.reviews_count AS "reviewsCount", u.verified, u.created_at AS "createdAt",
          (SELECT COUNT(*)::int FROM items WHERE owner_id = u.id) AS "itemsCount",
          (SELECT COUNT(*)::int FROM transactions WHERE (owner_id = u.id OR recipient_id = u.id) AND status = 'COMPLETED') AS "completedTransactionsCount"
        FROM users u
        ${whereSql}
        ORDER BY u.created_at DESC
        LIMIT $${paramIdx++} OFFSET $${paramIdx++};
      `;

      const dataRes = await pgQuery(dataSql, [...params, limit, skip]);

      if (dataRes && dataRes.rows && dataRes.rows.length > 0) {
        const enrichedUsers = dataRes.rows.map(row => ({
          _id: row.id,
          id: row.id,
          name: row.name,
          email: row.email,
          role: row.role,
          avatar: row.avatar || '',
          city: row.city || '',
          state: row.state || '',
          accountStatus: row.accountStatus || 'active',
          trustScore: row.trustScore || 95,
          rating: row.rating || 0,
          verified: row.verified !== false,
          createdAt: row.createdAt,
          itemsCount: row.itemsCount || 0,
          completedTransactionsCount: row.completedTransactionsCount || 0
        }));

        return res.status(200).json({
          success: true,
          data: {
            users: enrichedUsers,
            page,
            limit,
            total: pgTotal,
            totalPages: Math.ceil(pgTotal / limit) || 1
          }
        });
      }
    } catch (pgUserErr) {
      console.warn('[adminController] getUsers PG notice:', pgUserErr.message);
    }

    // 2. Fallback to MongoDB
    const query = {};
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ name: searchRegex }, { email: searchRegex }];
    }
    if (req.query.role && ['customer', 'admin'].includes(req.query.role.toLowerCase())) {
      query.role = req.query.role.toLowerCase();
    }
    if (req.query.status && ['active', 'suspended'].includes(req.query.status.toLowerCase())) {
      query.accountStatus = req.query.status.toLowerCase();
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .catch(() => []),
      User.countDocuments(query).catch(() => 0)
    ]);

    const enrichedUsers = users.map(u => ({
      ...u,
      id: u._id,
      itemsCount: 0,
      completedTransactionsCount: 0
    }));

    return res.status(200).json({
      success: true,
      data: {
        users: enrichedUsers,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    });
  } catch (error) {
    console.error('Error fetching users for admin:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve registered users.'
    });
  }
};

exports.getUserDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Try Neon PostgreSQL
    try {
      const pgUserRes = await pgQuery(
        'SELECT id, name, email, role, avatar, bio, city, locality, state, account_status AS "accountStatus", trust_score AS "trustScore", rating, reviews_count AS "reviewsCount", verified, created_at AS "createdAt" FROM users WHERE id = $1 LIMIT 1',
        [id]
      );
      if (pgUserRes?.rows?.[0]) {
        const user = pgUserRes.rows[0];
        user._id = user.id;

        const [itemsRes, wantedRes] = await Promise.all([
          pgQuery('SELECT * FROM items WHERE owner_id = $1 ORDER BY created_at DESC LIMIT 10', [id]).catch(() => ({ rows: [] })),
          pgQuery('SELECT * FROM wanted_items WHERE requester_id = $1 ORDER BY created_at DESC LIMIT 10', [id]).catch(() => ({ rows: [] }))
        ]);

        return res.status(200).json({
          success: true,
          data: {
            user,
            items: itemsRes.rows || [],
            wantedItems: wantedRes.rows || [],
            transactions: [],
            reviews: [],
            reportsAgainst: []
          }
        });
      }
    } catch {}

    // 2. Fallback to Mongo
    const user = await User.findById(id).select('-password').lean().catch(() => null);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const [items, wantedItems] = await Promise.all([
      Item.find({ owner: id }).sort({ createdAt: -1 }).limit(10).lean().catch(() => []),
      WantedItem.find({ requester: id }).sort({ createdAt: -1 }).limit(10).lean().catch(() => [])
    ]);

    return res.status(200).json({
      success: true,
      data: {
        user,
        items,
        wantedItems,
        transactions: [],
        reviews: [],
        reportsAgainst: []
      }
    });
  } catch (error) {
    console.error('Error fetching admin user details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve user details.'
    });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { accountStatus, reason = '' } = req.body;

    if (!['active', 'suspended'].includes(accountStatus)) {
      return res.status(400).json({ success: false, message: 'Status must be active or suspended.' });
    }

    const adminId = req.admin?._id || req.admin?.id;
    if (adminId && String(adminId) === String(id) && accountStatus === 'suspended') {
      return res.status(400).json({
        success: false,
        message: 'You cannot suspend your own administrative account.'
      });
    }

    // Update Neon PG
    try {
      await pgQuery('UPDATE users SET account_status = $1, updated_at = NOW() WHERE id = $2', [accountStatus, id]);
    } catch (pgErr) {
      console.warn('[adminController] updateUserStatus PG notice:', pgErr.message);
    }

    // Update Mongo if exists
    if (mongoose.connection && mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(id)) {
      await User.findByIdAndUpdate(id, { accountStatus }).catch(() => {});
    }

    adminDashboardService.invalidateDashboardCache();
    adminAnalyticsService.invalidateAnalyticsCache();

    return res.status(200).json({
      success: true,
      message: `User account has been ${accountStatus === 'suspended' ? 'suspended' : 'activated'} successfully.`,
      user: {
        id,
        accountStatus
      }
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update user status.'
    });
  }
};

// -------------------------------------------------------------
// 4. ITEMS & MODERATION
// -------------------------------------------------------------

// -------------------------------------------------------------
// 4. ITEMS & MODERATION
// -------------------------------------------------------------
exports.getItems = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const query = {};

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ title: searchRegex }, { description: searchRegex }, { brand: searchRegex }];
    }

    if (req.query.category && req.query.category !== 'all') {
      query.category = req.query.category.toLowerCase();
    }

    if (req.query.sharingType && req.query.sharingType !== 'all') {
      query.sharingType = req.query.sharingType.toLowerCase();
    }

    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status;
    }

    if (req.query.condition && req.query.condition !== 'all') {
      query.condition = req.query.condition;
    }

    const [items, total] = await Promise.all([
      Item.find(query)
        .populate('owner', 'name email avatar trustScore')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Item.countDocuments(query)
    ]);

    // Privacy safeguard: strip exact private addresses
    const sanitizedItems = items.map(item => {
      const loc = item.location || {};
      return {
        ...item,
        location: {
          city: loc.city || '',
          locality: loc.locality || '',
          state: loc.state || ''
        }
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        items: sanitizedItems,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching admin items:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve listings.'
    });
  }
};

exports.getItemDetails = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid item ID format.' });
    }

    const item = await Item.findById(id).populate('owner', 'name email avatar trustScore accountStatus').lean();
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }

    const [requestsCount, activeTx, reports] = await Promise.all([
      Request.countDocuments({ item: id }),
      Transaction.findOne({
        item: id,
        status: { $in: ['PENDING_HANDOVER', 'HANDOVER_SCHEDULED', 'HANDED_OVER', 'ACTIVE', 'RETURN_PENDING'] }
      }).lean(),
      Report.find({ targetItem: id }).populate('reporter', 'name email').lean()
    ]);

    return res.status(200).json({
      success: true,
      data: {
        item,
        requestsCount,
        hasActiveTransaction: !!activeTx,
        activeTransaction: activeTx,
        reports
      }
    });
  } catch (error) {
    console.error('Error fetching admin item details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve item details.'
    });
  }
};

exports.moderateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason = '' } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid item ID format.' });
    }

    if (!['hide', 'remove', 'restore'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Action must be hide, remove, or restore.' });
    }

    const item = await Item.findById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }

    // Safety constraint: Cannot remove or hide item if involved in an active transaction!
    if (['hide', 'remove'].includes(action)) {
      const activeTx = await Transaction.findOne({
        item: id,
        status: { $in: ['PENDING_HANDOVER', 'HANDOVER_SCHEDULED', 'HANDED_OVER', 'ACTIVE', 'RETURN_PENDING'] }
      });
      if (activeTx) {
        return res.status(409).json({
          success: false,
          message: 'Cannot moderate or remove this item because it is currently involved in an active transaction.'
        });
      }
    }

    let newStatus = item.status;
    let newAvailability = item.availability;
    let auditAction = 'ITEM_MODERATED';

    if (action === 'hide') {
      newStatus = 'suspended';
      newAvailability = 'Unavailable';
      auditAction = 'ITEM_HIDDEN';
    } else if (action === 'remove') {
      newStatus = 'removed';
      newAvailability = 'Unavailable';
      auditAction = 'ITEM_REMOVED';
    } else if (action === 'restore') {
      newStatus = 'active';
      newAvailability = 'Available';
      auditAction = 'ITEM_RESTORED';
    }

    item.status = newStatus;
    item.availability = newAvailability;
    await item.save();

    // Log to AdminAuditLog
    await logAction({
      adminId: req.admin._id,
      action: auditAction,
      targetType: 'ITEM',
      targetId: item._id,
      targetTitle: item.title,
      metadata: { action, reason, previousStatus: item.status },
      ipAddress: req.ip
    });

    // Notify item owner safely
    try {
      await notificationService.createNotification({
        recipient: item.owner,
        type: 'ITEM_UPDATED',
        title: 'Listing Moderation Update',
        message: `Your listing "${item.title}" has been ${action === 'restore' ? 'restored to active listings' : action === 'hide' ? 'hidden from public search' : 'removed by moderation'}.`,
        link: '/my-items'
      });
    } catch (notifErr) {
      // non-critical
    }

    return res.status(200).json({
      success: true,
      message: `Item has been successfully ${action === 'restore' ? 'restored' : action === 'hide' ? 'hidden' : 'removed'}.`,
      item: {
        id: item._id,
        title: item.title,
        status: item.status,
        availability: item.availability
      }
    });
  } catch (error) {
    console.error('Error moderating item:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update item moderation status.'
    });
  }
};

exports.approveItem = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid item ID format.' });
    }

    const item = await Item.findById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }

    item.approvalStatus = 'APPROVED';
    item.status = 'active';
    item.availability = 'Available';
    item.rejectionReason = '';
    await item.save();

    await logAction({
      adminId: req.admin._id,
      action: 'ITEM_APPROVED',
      targetType: 'ITEM',
      targetId: item._id,
      targetTitle: item.title,
      ipAddress: req.ip
    });

    try {
      await notificationService.createNotification({
        recipient: item.owner,
        type: 'ITEM_UPDATED',
        title: 'Listing Approved!',
        message: `Your listing "${item.title}" has been approved by admin and is now live!`,
        link: `/items/${item._id}`
      });
    } catch (notifErr) {
      // non-critical
    }

    return res.status(200).json({
      success: true,
      message: 'Item has been approved and published to the marketplace.',
      item
    });
  } catch (error) {
    console.error('Error approving item:', error);
    return res.status(500).json({ success: false, message: 'Failed to approve item.' });
  }
};

exports.rejectItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = '' } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid item ID format.' });
    }

    const item = await Item.findById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }

    item.approvalStatus = 'REJECTED';
    item.status = 'rejected';
    item.availability = 'Unavailable';
    item.rejectionReason = reason || 'Item does not meet platform reuse criteria.';
    await item.save();

    await logAction({
      adminId: req.admin._id,
      action: 'ITEM_REJECTED',
      targetType: 'ITEM',
      targetId: item._id,
      targetTitle: item.title,
      metadata: { reason },
      ipAddress: req.ip
    });

    try {
      await notificationService.createNotification({
        recipient: item.owner,
        type: 'ITEM_UPDATED',
        title: 'Listing Needs Revision',
        message: `Your listing "${item.title}" was not approved. Reason: ${item.rejectionReason}`,
        link: '/my-items'
      });
    } catch (notifErr) {
      // non-critical
    }

    return res.status(200).json({
      success: true,
      message: 'Item rejected.',
      item
    });
  } catch (error) {
    console.error('Error rejecting item:', error);
    return res.status(500).json({ success: false, message: 'Failed to reject item.' });
  }
};

exports.getUploadRules = async (req, res) => {
  try {
    const rules = await uploadRulesService.getUploadRules();
    return res.status(200).json({ success: true, rules });
  } catch (error) {
    console.error('Error getting upload rules:', error);
    return res.status(500).json({ success: false, message: 'Failed to get upload rules.' });
  }
};

exports.updateUploadRules = async (req, res) => {
  try {
    const adminId = req.admin?._id || req.user?._id;
    const rules = await uploadRulesService.updateUploadRules(req.body, adminId);
    await logAction({
      adminId,
      action: 'UPLOAD_RULES_UPDATED',
      targetType: 'SETTINGS',
      metadata: rules,
      ipAddress: req.ip
    });
    return res.status(200).json({
      success: true,
      message: 'Product upload rules updated successfully.',
      rules
    });
  } catch (error) {
    console.error('Error updating upload rules:', error);
    return res.status(500).json({ success: false, message: 'Failed to update upload rules.' });
  }
};

exports.getLocationRules = async (req, res) => {
  try {
    const rules = await locationRulesService.getLocationRules();
    return res.status(200).json({ success: true, rules });
  } catch (error) {
    console.error('Error getting location rules:', error);
    return res.status(500).json({ success: false, message: 'Failed to get location rules.' });
  }
};

exports.updateLocationRules = async (req, res) => {
  try {
    const adminId = req.admin?._id || req.user?._id;
    const rules = await locationRulesService.updateLocationRules(req.body, adminId);
    await logAction({
      adminId,
      action: 'LOCATION_RULES_UPDATED',
      targetType: 'SETTINGS',
      metadata: rules,
      ipAddress: req.ip
    });
    return res.status(200).json({
      success: true,
      message: 'Location governance rules updated successfully.',
      rules
    });
  } catch (error) {
    console.error('Error updating location rules:', error);
    return res.status(500).json({ success: false, message: 'Failed to update location rules.' });
  }
};


// -------------------------------------------------------------
// 5. WANTED ITEMS MONITORING
// -------------------------------------------------------------
exports.getWantedItems = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const query = {};

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ title: searchRegex }, { description: searchRegex }];
    }

    if (req.query.category && req.query.category !== 'all') {
      query.category = req.query.category.toLowerCase();
    }

    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status.toUpperCase();
    }

    const [wantedItems, total] = await Promise.all([
      WantedItem.find(query)
        .populate('requester', 'name email avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      WantedItem.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      data: {
        wantedItems,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching wanted items for admin:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve wanted requests.'
    });
  }
};

// -------------------------------------------------------------
// 6. REQUESTS MONITORING
// -------------------------------------------------------------
exports.getRequests = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const query = {};

    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status.toUpperCase();
    }

    if (req.query.type && req.query.type !== 'all') {
      query.type = req.query.type.toUpperCase();
    }

    const [requests, total] = await Promise.all([
      Request.find(query)
        .populate('item', 'title category images')
        .populate('requester', 'name email avatar')
        .populate('owner', 'name email avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Request.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      data: {
        requests,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching admin requests:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve requests.'
    });
  }
};

exports.getRequestDetails = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid request ID format.' });
    }

    const request = await Request.findById(id)
      .populate('item')
      .populate('requester', 'name email avatar')
      .populate('owner', 'name email avatar')
      .populate('offeredItem', 'title category images')
      .populate('transaction')
      .lean();

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    return res.status(200).json({
      success: true,
      data: request
    });
  } catch (error) {
    console.error('Error fetching request details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve request details.'
    });
  }
};

// -------------------------------------------------------------
// 7. TRANSACTIONS MONITORING
// -------------------------------------------------------------
exports.getTransactions = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const query = {};

    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status.toUpperCase();
    }

    if (req.query.type && req.query.type !== 'all') {
      query.type = req.query.type.toUpperCase();
    }

    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .populate('item', 'title category images')
        .populate('owner', 'name email avatar')
        .populate('recipient', 'name email avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Transaction.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      data: {
        transactions,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching admin transactions:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve transactions.'
    });
  }
};

exports.getTransactionDetails = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid transaction ID format.' });
    }

    const transaction = await Transaction.findById(id)
      .populate('item')
      .populate('owner', 'name email avatar')
      .populate('recipient', 'name email avatar')
      .populate('request')
      .lean();

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    const reviews = await Review.find({ transaction: id })
      .populate('reviewer', 'name avatar')
      .populate('reviewee', 'name avatar')
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        transaction,
        reviews
      }
    });
  } catch (error) {
    console.error('Error fetching transaction details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve transaction details.'
    });
  }
};

// -------------------------------------------------------------
// 8. REPORTS & MODERATION
// -------------------------------------------------------------
exports.getReports = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const query = {};

    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status.toUpperCase();
    }

    if (req.query.targetType && req.query.targetType !== 'all') {
      query.targetType = req.query.targetType.toUpperCase();
    }

    const [reports, total] = await Promise.all([
      Report.find(query)
        .populate('reporter', 'name email avatar')
        .populate('targetUser', 'name email avatar accountStatus')
        .populate('targetItem', 'title category images status')
        .populate('resolvedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Report.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      data: {
        reports,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching reports for admin:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve reports.'
    });
  }
};

exports.getReportDetails = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid report ID format.' });
    }

    const report = await Report.findById(id)
      .populate('reporter', 'name email avatar')
      .populate('targetUser', 'name email avatar accountStatus')
      .populate('targetItem')
      .populate('resolvedBy', 'name email')
      .lean();

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }

    return res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error fetching report details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve report details.'
    });
  }
};

exports.resolveReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, action, resolutionNotes = '', actionTaken = 'NO_VIOLATION' } = req.body;
    const targetStatus = (status || (action === 'RESOLVE' ? 'RESOLVED' : action === 'DISMISS' ? 'DISMISSED' : '')).toUpperCase();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid report ID format.' });
    }

    if (!['REVIEWED', 'RESOLVED', 'DISMISSED'].includes(targetStatus)) {
      return res.status(400).json({ success: false, message: 'Status must be REVIEWED, RESOLVED, or DISMISSED.' });
    }

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }

    const adminId = req.admin?._id || req.user?._id || req.user?.id;

    report.status = targetStatus;
    report.resolutionNotes = resolutionNotes;
    report.actionTaken = actionTaken;
    report.resolvedBy = adminId;
    report.resolvedAt = new Date();
    await report.save();

    // Log to AdminAuditLog
    await logAction({
      adminId,
      action: targetStatus === 'DISMISSED' ? 'REPORT_DISMISSED' : 'REPORT_RESOLVED',
      targetType: 'REPORT',
      targetId: report._id,
      targetTitle: `Report on ${report.targetType}`,
      metadata: { status: targetStatus, actionTaken, resolutionNotes },
      ipAddress: req.ip
    });

    // Notify reporter that their report has been reviewed and resolved
    try {
      await notificationService.createNotification({
        recipient: report.reporter,
        type: 'REPORT_UPDATE',
        title: 'Moderation Report Update',
        message: 'Your community report has been reviewed by platform moderation. Thank you for keeping LOOOP safe!',
        link: '/about'
      });
    } catch (notifErr) {
      // non-critical
    }

    return res.status(200).json({
      success: true,
      message: `Report has been updated to ${status}.`,
      report
    });
  } catch (error) {
    console.error('Error resolving report:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update report resolution.'
    });
  }
};

// -------------------------------------------------------------
// 9. CATEGORIES MANAGEMENT
// -------------------------------------------------------------
exports.getCategories = async (req, res) => {
  try {
    // Sync seed categories if Category collection is empty
    const count = await Category.countDocuments();
    if (count === 0) {
      const defaultCategories = [
        { name: 'Books', slug: 'books', description: 'Literature, novels, textbooks, exam prep, non-fiction', icon: 'BookOpen', subcategories: ['Engineering', 'School', 'Competitive Exams', 'Fiction', 'Non-Fiction', 'Other'] },
        { name: 'Electronics', slug: 'electronics', description: 'Gadgets, peripherals, chargers, hardware accessories', icon: 'Cpu', subcategories: ['Headphones', 'Chargers', 'Keyboards', 'Computer Accessories', 'Audio & Speakers', 'Other'] },
        { name: 'Study Materials', slug: 'education', description: 'Notes, calculators, drafting tools, reference materials', icon: 'GraduationCap', subcategories: ['Scientific Calculators', 'Course Notes', 'Lab Equipment', 'Stationery Bundles', 'Drawing Boards', 'Other'] },
        { name: 'Furniture', slug: 'furniture', description: 'Study tables, chairs, bookshelves, ergonomic seating', icon: 'Armchair', subcategories: ['Study Desks', 'Office Chairs', 'Bookshelves', 'Lamps & Lighting', 'Side Tables', 'Other'] },
        { name: 'Clothing', slug: 'clothing', description: 'Jackets, seasonal wear, formals, reusable garments', icon: 'Shirt', subcategories: ['Winter Jackets', 'Formal Attire', 'Casual Wear', 'Shoes & Footwear', 'Sportswear', 'Other'] },
        { name: 'Sports', slug: 'sports', description: 'Fitness equipment, balls, racquets, outdoor gear', icon: 'Activity', subcategories: ['Gym & Dumbbells', 'Badminton & Tennis', 'Football & Basketball', 'Bicycle Gear', 'Yoga & Fitness', 'Other'] },
        { name: 'Tools', slug: 'tools', description: 'Hand tools, DIY hardware, electrical meters, drills', icon: 'Wrench', subcategories: ['Hand Tool Sets', 'Power Drills', 'Multimeters', 'Gardening Tools', 'Hardware Kits', 'Other'] },
        { name: 'Home Items', slug: 'home', description: 'Kitchenware, small appliances, storage containers', icon: 'Home', subcategories: ['Electric Kettles', 'Cookware', 'Storage Organizers', 'Bedding & Linen', 'Tableware', 'Other'] },
        { name: 'Accessories', slug: 'accessories', description: 'Backpacks, bags, travel cases, smart watches', icon: 'Watch', subcategories: ['Backpacks & Laptop Bags', 'Watches', 'Eyewear & Cases', 'Travel Luggage', 'Other'] },
        { name: 'Vehicles / Mobility', slug: 'mobility', description: 'Bicycles, skateboards, roller skates, helmets', icon: 'Bike', subcategories: ['Bicycles', 'Skateboards', 'Helmets & Locks', 'Cycle Accessories', 'Other'] },
        { name: 'Other', slug: 'other', description: 'General unused useful items, creative supplies', icon: 'Package', subcategories: ['Board Games & Hobbies', 'Art Supplies', 'Musical Instruments', 'Miscellaneous', 'Other'] }
      ];
      await Category.insertMany(defaultCategories);
    }

    const categories = await Category.find().sort({ name: 1 }).lean();

    // Aggregate real item counts per category
    const itemCounts = await Item.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    const countMap = new Map(itemCounts.map(c => [(c._id || '').toLowerCase(), c.count]));

    const enriched = categories.map(cat => ({
      ...cat,
      itemCount: countMap.get(cat.slug) || countMap.get(cat.name.toLowerCase()) || 0
    }));

    return res.status(200).json({
      success: true,
      count: enriched.length,
      categories: enriched
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve categories.'
    });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, description = '', icon = 'FolderTree', subcategories = [] } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Category name must be at least 2 characters.' });
    }

    const cleanName = name.trim();
    const slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Case-insensitive duplicate check
    const existing = await Category.findOne({ name: { $regex: new RegExp(`^${cleanName}$`, 'i') } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'A category with this name already exists.' });
    }

    const newCategory = await Category.create({
      name: cleanName,
      slug,
      description: description.trim(),
      icon: icon.trim() || 'FolderTree',
      subcategories: Array.isArray(subcategories) ? subcategories.filter(s => !!s && s.trim()) : [],
      status: 'ACTIVE'
    });

    await logAction({
      adminId: req.admin._id,
      action: 'CATEGORY_CREATED',
      targetType: 'CATEGORY',
      targetId: newCategory._id,
      targetTitle: newCategory.name,
      metadata: { name: cleanName, slug },
      ipAddress: req.ip
    });

    return res.status(201).json({
      success: true,
      message: 'Category created successfully.',
      category: newCategory
    });
  } catch (error) {
    console.error('Error creating category:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create category.'
    });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, icon, subcategories, status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid category ID format.' });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    if (name && name.trim().length >= 2) {
      const cleanName = name.trim();
      const existing = await Category.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${cleanName}$`, 'i') }
      });
      if (existing) {
        return res.status(409).json({ success: false, message: 'Another category with this name already exists.' });
      }
      category.name = cleanName;
    }

    if (description !== undefined) category.description = description.trim();
    if (icon !== undefined) category.icon = icon.trim();
    if (Array.isArray(subcategories)) category.subcategories = subcategories.filter(s => !!s && s.trim());
    if (status && ['ACTIVE', 'INACTIVE'].includes(status)) category.status = status;

    await category.save();

    await logAction({
      adminId: req.admin._id,
      action: 'CATEGORY_UPDATED',
      targetType: 'CATEGORY',
      targetId: category._id,
      targetTitle: category.name,
      metadata: { name: category.name, status: category.status },
      ipAddress: req.ip
    });

    return res.status(200).json({
      success: true,
      message: 'Category updated successfully.',
      category
    });
  } catch (error) {
    console.error('Error updating category:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update category.'
    });
  }
};

exports.toggleCategoryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid category ID format.' });
    }

    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be ACTIVE or INACTIVE.' });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    category.status = status;
    await category.save();

    await logAction({
      adminId: req.admin._id,
      action: status === 'ACTIVE' ? 'CATEGORY_ACTIVATED' : 'CATEGORY_DEACTIVATED',
      targetType: 'CATEGORY',
      targetId: category._id,
      targetTitle: category.name,
      metadata: { status },
      ipAddress: req.ip
    });

    return res.status(200).json({
      success: true,
      message: `Category ${category.name} has been set to ${status}.`,
      category
    });
  } catch (error) {
    console.error('Error toggling category status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update category status.'
    });
  }
};

// -------------------------------------------------------------
// 10. PLATFORM SETTINGS
// -------------------------------------------------------------
exports.getSettings = async (req, res) => {
  try {
    const settingsList = await AdminSetting.find().lean();
    const settingsMap = { ...DEFAULT_SETTINGS };

    settingsList.forEach(s => {
      settingsMap[s.key] = s.value;
    });

    return res.status(200).json({
      success: true,
      settings: settingsMap
    });
  } catch (error) {
    console.error('Error fetching admin settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve platform settings.'
    });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const {
      defaultMatchThreshold,
      defaultSearchRadiusKm,
      itemsPerPage,
      maintenanceMode
    } = req.body;

    const updates = {};

    if (defaultMatchThreshold !== undefined) {
      const val = parseInt(defaultMatchThreshold, 10);
      if (isNaN(val) || val < 10 || val > 100) {
        return res.status(400).json({ success: false, message: 'Default match threshold must be between 10 and 100.' });
      }
      updates.defaultMatchThreshold = val;
    }

    if (defaultSearchRadiusKm !== undefined) {
      const val = parseInt(defaultSearchRadiusKm, 10);
      if (isNaN(val) || val < 1 || val > 200) {
        return res.status(400).json({ success: false, message: 'Default search radius must be between 1 km and 200 km.' });
      }
      updates.defaultSearchRadiusKm = val;
    }

    if (itemsPerPage !== undefined) {
      const val = parseInt(itemsPerPage, 10);
      if (isNaN(val) || val < 5 || val > 100) {
        return res.status(400).json({ success: false, message: 'Items per page must be between 5 and 100.' });
      }
      updates.itemsPerPage = val;
    }

    if (maintenanceMode !== undefined) {
      updates.maintenanceMode = Boolean(maintenanceMode);
    }

    // Upsert into AdminSetting collection
    for (const [key, value] of Object.entries(updates)) {
      await AdminSetting.findOneAndUpdate(
        { key },
        { key, value, updatedBy: req.admin._id },
        { upsert: true, new: true }
      );
    }

    await logAction({
      adminId: req.admin._id,
      action: 'SETTINGS_UPDATED',
      targetType: 'SETTINGS',
      metadata: updates,
      ipAddress: req.ip
    });

    return res.status(200).json({
      success: true,
      message: 'Platform configuration saved successfully.',
      settings: updates
    });
  } catch (error) {
    console.error('Error saving admin settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update platform settings.'
    });
  }
};

// -------------------------------------------------------------
// 11. AUDIT LOGS
// -------------------------------------------------------------
exports.getAuditLogs = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const query = {};

    if (req.query.targetType && req.query.targetType !== 'all') {
      query.targetType = req.query.targetType.toUpperCase();
    }

    if (req.query.action && req.query.action !== 'all') {
      query.action = req.query.action;
    }

    const [logs, total] = await Promise.all([
      AdminAuditLog.find(query)
        .populate('admin', 'name email avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AdminAuditLog.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      data: {
        logs,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit trail.'
    });
  }
};

// -------------------------------------------------------------
// 12. ADMIN POINTS CONFIGURATION & MANUAL COMPLETION
// -------------------------------------------------------------
exports.getPointsSettings = async (req, res) => {
  try {
    const pointsService = require('../services/pointsService');
    const settings = await pointsService.getPointsSettings();
    return res.status(200).json({
      success: true,
      settings
    });
  } catch (err) {
    console.error('Error in getPointsSettings:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch points settings.'
    });
  }
};

exports.updatePointsSettings = async (req, res) => {
  try {
    const { reusePoints, borrowPoints, returnPoints, enabled } = req.body;
    const adminId = req.admin?._id || req.user?._id;

    const updates = {};
    if (reusePoints !== undefined) updates.points_reuse = Number(reusePoints);
    if (borrowPoints !== undefined) updates.points_borrow = Number(borrowPoints);
    if (returnPoints !== undefined) updates.points_return_borrow = Number(returnPoints);
    if (enabled !== undefined) updates.points_enabled = Boolean(enabled);

    for (const [key, value] of Object.entries(updates)) {
      await AdminSetting.findOneAndUpdate(
        { key },
        { key, value, updatedBy: adminId },
        { upsert: true, new: true }
      );
    }

    await logAction({
      adminId,
      action: 'POINTS_SETTINGS_UPDATED',
      targetType: 'SETTINGS',
      metadata: updates,
      ipAddress: req.ip
    });

    return res.status(200).json({
      success: true,
      message: 'Points configuration updated successfully.',
      settings: updates
    });
  } catch (err) {
    console.error('Error in updatePointsSettings:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to update points settings.'
    });
  }
};

exports.adminCompleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const pointsService = require('../services/pointsService');

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    transaction.status = 'COMPLETED';
    transaction.completedAt = new Date();
    transaction.adminConfirmedAt = new Date();
    await transaction.save();

    if (transaction.item) {
      await Item.findByIdAndUpdate(transaction.item, { availability: 'Unavailable' });
    }
    if (transaction.request) {
      await Request.findByIdAndUpdate(transaction.request, { status: 'COMPLETED', completedAt: new Date() });
    }

    // Award points safely and idempotently
    const pointsResult = await pointsService.awardPointsForTransaction(transaction._id);

    await logAction({
      adminId: req.admin?._id || req.user?._id,
      action: 'TRANSACTION_ADMIN_COMPLETED',
      targetType: 'TRANSACTION',
      targetId: transaction._id,
      metadata: { pointsResult },
      ipAddress: req.ip
    });

    return res.status(200).json({
      success: true,
      message: 'Transaction manually marked COMPLETED by Admin. Points process executed.',
      transaction,
      pointsResult
    });
  } catch (err) {
    console.error('Error in adminCompleteTransaction:', err);
    return res.status(500).json({
      success: false,
      message: 'Admin transaction completion failed.'
    });
  }
};

// -------------------------------------------------------------
// 13. EMAIL SYSTEM DIAGNOSTICS & GOVERNANCE
// -------------------------------------------------------------
const emailService = require('../services/emailService');

exports.getEmailDiagnostics = async (req, res) => {
  try {
    const health = await emailService.getHealthStatus();

    // Fetch recent 20 sanitized outbox records
    let recentOutbox = [];
    try {
      const outboxRes = await pgQuery(
        `SELECT id, event_type, recipient_email, template_key, status, attempt_count, next_attempt_at, provider_message_id, last_error_code, last_error_message, created_at, sent_at, delivered_at 
         FROM email_outbox 
         ORDER BY created_at DESC 
         LIMIT 20`
      );
      recentOutbox = outboxRes.rows;
    } catch (dbErr) {
      console.warn('[Admin Email Diagnostics] Outbox fetch warning:', dbErr.message);
    }

    return res.status(200).json({
      success: true,
      diagnostics: {
        provider: health.providerName,
        deliveryEnabled: health.deliveryEnabled,
        statusState: health.statusState,
        isReady: health.isReady,
        details: health.details,
        senderEmail: health.senderEmail,
        outboxStats: health.outboxStats,
        recentOutbox,
        timestamp: health.timestamp
      }
    });
  } catch (error) {
    console.error('Error fetching email diagnostics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve email system diagnostics.'
    });
  }
};

exports.sendTestEmail = async (req, res) => {
  try {
    const { testRecipientEmail } = req.body;
    if (!testRecipientEmail) {
      return res.status(400).json({ success: false, message: 'Test recipient email address is required.' });
    }

    const result = await emailService.sendAdminTestEmail({ testRecipientEmail });

    await logAction({
      adminId: req.admin?._id || req.user?._id || 'admin',
      action: 'ADMIN_EMAIL_TEST_DISPATCH',
      targetType: 'EMAIL_SERVICE',
      targetId: testRecipientEmail,
      metadata: { success: result.success, statusState: result.statusState, errorCode: result.errorCode },
      ipAddress: req.ip
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        statusState: result.statusState,
        message: result.message || `Test email failed: Provider state is ${result.statusState}`
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Test email successfully queued and dispatched through authorized provider.',
      result
    });
  } catch (error) {
    console.error('Error sending admin test email:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to dispatch admin test email.'
    });
  }
};

exports.processEmailOutboxQueue = async (req, res) => {
  try {
    const result = await emailService.processOutboxQueue(20);
    return res.status(200).json({
      success: true,
      message: 'Email outbox queue processing completed.',
      result
    });
  } catch (error) {
    console.error('Error processing email outbox queue:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process email outbox queue.'
    });
  }
};


