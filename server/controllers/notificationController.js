const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const NotificationPreference = require('../models/NotificationPreference');
const notificationService = require('../services/notificationService');

/**
 * LOOOP Notification Controller
 * Manages notification feeds, category filtering, unread counting,
 * read states, soft dismissal, and user preferences.
 */

// Category to notification type mapping
const CATEGORY_MAP = {
  REQUESTS: [
    'REQUEST_RECEIVED',
    'REQUEST_ACCEPTED',
    'REQUEST_DECLINED',
    'REQUEST_CANCELLED'
  ],
  TRANSACTIONS: [
    'TRANSACTION_CREATED',
    'HANDOVER_SCHEDULED',
    'HANDOVER_CONFIRMED',
    'RETURN_STARTED',
    'RETURN_CONFIRMED',
    'TRANSACTION_COMPLETED'
  ],
  MESSAGES: ['NEW_MESSAGE'],
  MATCHING: ['WANTED_MATCH', 'WANTED_RESPONSE'],
  ITEMS: ['ITEM_UPDATED', 'ITEM_UNAVAILABLE'],
  SAFETY: ['REPORT_UPDATE'],
  ACCOUNT: ['SECURITY_ALERT'],
  IMPACT: ['IMPACT_MILESTONE'],
  SYSTEM: ['REVIEW_RECEIVED']
};

// 1. Get Paginated Notifications with Filters (GET /api/notifications)
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const { page = 1, limit = 20, read, type, category } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

    // Base query: scoped strictly to recipient and non-deleted notifications
    const query = {
      recipient: userId,
      deletedAt: null
    };

    // Read/Unread Filter
    if (read === 'false' || read === false) {
      query.isRead = false;
    } else if (read === 'true' || read === true) {
      query.isRead = true;
    }

    // Category Filter
    if (category && typeof category === 'string' && category.toLowerCase() !== 'all') {
      const upperCat = category.toUpperCase();
      if (CATEGORY_MAP[upperCat]) {
        query.category = upperCat;
      }
    }

    // Type Filter (if explicitly provided)
    if (type && typeof type === 'string' && type.toLowerCase() !== 'all') {
      const upperType = type.toUpperCase();
      if (CATEGORY_MAP[upperType]) {
        query.category = upperType;
      } else {
        query.type = upperType;
      }
    }

    const [notifications, totalCount, unreadCount] = await Promise.all([
      Notification.find(query)
        .populate('actor', 'name avatar trustScore rating')
        .populate('relatedItem', 'title images category sharingType condition availability')
        .populate('relatedRequest', 'status type')
        .populate('relatedTransaction', 'status type handoverDate')
        .populate('relatedConversation', '_id')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Notification.countDocuments(query),
      Notification.countDocuments({ recipient: userId, isRead: false, deletedAt: null })
    ]);

    const formatted = notifications.map((n) => ({
      ...n.toObject(),
      id: n._id
    }));

    return res.status(200).json({
      success: true,
      notifications: formatted,
      total: totalCount,
      unreadCount,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalCount / limitNum) || 1,
      hasMore: pageNum * limitNum < totalCount
    });
  } catch (error) {
    console.error('Error in getNotifications:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve notifications.'
    });
  }
};

// 2. Get Unread Notification Count (GET /api/notifications/unread-count)
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(200).json({ success: true, count: 0 });
    }

    // Check Neon PostgreSQL first
    try {
      const { query: pgQuery } = require('../config/postgres');
      const pgRes = await pgQuery(
        'SELECT COUNT(*)::int as count FROM notifications WHERE recipient_id = $1 AND is_read = false;',
        [String(userId)]
      );
      if (pgRes?.rows?.[0]) {
        return res.status(200).json({ success: true, count: pgRes.rows[0].count });
      }
    } catch {}

    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(200).json({ success: true, count: 0 });
    }

    const count = await Notification.countDocuments({
      recipient: userId,
      isRead: false,
      deletedAt: null
    });

    return res.status(200).json({
      success: true,
      count
    });
  } catch (error) {
    return res.status(200).json({ success: true, count: 0 });
  }
};

// 3. Mark Single Notification as Read (PATCH /api/notifications/:id/read)
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    const notification = await Notification.findOne({ _id: id, deletedAt: null });
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    // Access control: Only recipient can mark their notification as read
    if (notification.recipient.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to modify this notification.'
      });
    }

    // Idempotent update
    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
      notification: {
        ...notification.toObject(),
        id: notification._id
      }
    });
  } catch (error) {
    console.error('Error in markAsRead:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to update notification.'
    });
  }
};

// 4. Mark All User Notifications as Read (PATCH /api/notifications/read-all)
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const result = await Notification.updateMany(
      { recipient: userId, isRead: false, deletedAt: null },
      { $set: { isRead: true, readAt: new Date() } }
    );

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
      updatedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error in markAllAsRead:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to mark all notifications as read.'
    });
  }
};

// 5. Dismiss / Soft Delete Notification (DELETE /api/notifications/:id)
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    const notification = await Notification.findOne({ _id: id, deletedAt: null });
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    // Access control: Only recipient can delete their notification
    if (notification.recipient.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this notification.'
      });
    }

    // Business Rule: Essential security and audit-related notifications cannot be deleted
    if (notification.category === 'ACCOUNT' || notification.type === 'SECURITY_ALERT') {
      return res.status(403).json({
        success: false,
        message: 'Critical account security alerts cannot be dismissed.'
      });
    }

    // Soft delete notification (never deletes related entity or audit records)
    notification.deletedAt = new Date();
    await notification.save();

    return res.status(200).json({
      success: true,
      message: 'Notification dismissed successfully.'
    });
  } catch (error) {
    console.error('Error in deleteNotification:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to dismiss notification.'
    });
  }
};

// 6. Get Recent Notifications Preview (GET /api/notifications/recent)
exports.getRecentNotifications = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(200).json({ success: true, notifications: [] });
    }

    const notifications = await Notification.find({ recipient: userId, deletedAt: null })
      .populate('actor', 'name avatar trustScore rating')
      .populate('relatedItem', 'title images category sharingType')
      .sort({ createdAt: -1 })
      .limit(5);

    const formatted = notifications.map((n) => ({
      ...n.toObject(),
      id: n._id
    }));

    return res.status(200).json({
      success: true,
      notifications: formatted
    });
  } catch (error) {
    console.error('Error in getRecentNotifications:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve recent notifications.'
    });
  }
};

// 7. Get Notification Preferences (GET /api/notifications/preferences)
exports.getPreferences = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const preferences = await notificationService.getPreferences(userId);

    return res.status(200).json({
      success: true,
      preferences
    });
  } catch (error) {
    console.error('Error in getPreferences:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve notification preferences.'
    });
  }
};

// 8. Update Notification Preferences (PATCH /api/notifications/preferences)
exports.updatePreferences = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const allowedKeys = ['inApp', 'browser', 'categories', 'quietHours'];
    const bodyKeys = Object.keys(req.body);

    // Whitelist check
    const hasInvalidKey = bodyKeys.some((k) => !allowedKeys.includes(k));
    if (hasInvalidKey) {
      return res.status(400).json({
        success: false,
        message: 'Invalid preference field provided.'
      });
    }

    let pref = await NotificationPreference.findOne({ user: userId });
    if (!pref) {
      pref = new NotificationPreference({ user: userId });
    }

    const { inApp, browser, categories, quietHours } = req.body;

    if (typeof inApp === 'boolean') {
      pref.inApp = inApp;
    }

    if (typeof browser === 'boolean') {
      pref.browser = browser;
    }

    if (categories && typeof categories === 'object') {
      const allowedCategories = [
        'requests',
        'transactions',
        'messages',
        'matching',
        'items',
        'safety',
        'account',
        'impact',
        'system'
      ];

      for (const catKey of Object.keys(categories)) {
        if (!allowedCategories.includes(catKey)) {
          return res.status(400).json({
            success: false,
            message: `Unknown notification category: ${catKey}`
          });
        }
        if (typeof categories[catKey] === 'boolean') {
          // Essential security rule: account security notifications cannot be disabled
          if (catKey === 'account') {
            pref.categories[catKey] = true;
          } else {
            pref.categories[catKey] = categories[catKey];
          }
        }
      }
    }

    if (quietHours && typeof quietHours === 'object') {
      if (typeof quietHours.enabled === 'boolean') {
        pref.quietHours.enabled = quietHours.enabled;
      }
      if (typeof quietHours.start === 'string') {
        if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(quietHours.start)) {
          return res.status(400).json({
            success: false,
            message: 'Quiet hours start time must be in HH:mm format (e.g. 22:00).'
          });
        }
        pref.quietHours.start = quietHours.start;
      }
      if (typeof quietHours.end === 'string') {
        if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(quietHours.end)) {
          return res.status(400).json({
            success: false,
            message: 'Quiet hours end time must be in HH:mm format (e.g. 07:00).'
          });
        }
        pref.quietHours.end = quietHours.end;
      }
      if (typeof quietHours.timezone === 'string') {
        pref.quietHours.timezone = quietHours.timezone;
      }
    }

    // Force account category to remain true
    if (pref.categories) {
      pref.categories.account = true;
    }

    await pref.save();

    return res.status(200).json({
      success: true,
      message: 'Notification preferences updated successfully.',
      preferences: pref
    });
  } catch (error) {
    console.error('Error in updatePreferences:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update notification preferences.'
    });
  }
};
