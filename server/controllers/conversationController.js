const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Request = require('../models/Request');
const Transaction = require('../models/Transaction');
const conversationService = require('../services/conversationService');
const notificationService = require('../services/notificationService');
const { getIO, isUserOnline, checkRateLimit } = require('../sockets');

/**
 * Conversation Controller
 * Handles conversation listing, message streams, sending, read tracking, and context.
 */

// 1. Get All Conversations for Authenticated User (GET /api/conversations)
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const { search, page = 1, limit = 30 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 30));

    // Base query: conversations where authenticated user is a participant
    const query = { participants: userId };

    const conversations = await Conversation.find(query)
      .populate('participants', 'name avatar trustScore rating email')
      .populate('item', 'title images category sharingType condition availability status location')
      .populate('request', 'status type expectedReturnDate')
      .populate('transaction', 'status type handoverDate expectedReturnDate handoverLocation')
      .sort({ lastMessageAt: -1 });

    // Batch aggregate unread counts for all retrieved conversations in 1 single query
    const convIds = conversations.map((c) => c._id);
    const unreadMap = new Map();

    if (convIds.length > 0) {
      const targetUserId = mongoose.Types.ObjectId.isValid(userId)
        ? new mongoose.Types.ObjectId(userId)
        : userId;

      const unreadAgg = await Message.aggregate([
        {
          $match: {
            conversation: { $in: convIds },
            readBy: { $ne: targetUserId }
          }
        },
        {
          $group: {
            _id: '$conversation',
            count: { $sum: 1 }
          }
        }
      ]);

      unreadAgg.forEach((item) => {
        unreadMap.set(item._id.toString(), item.count);
      });
    }

    // Format conversations with unread count, active partner, and online presence
    let formatted = conversations.map((conv) => {
      const convObj = conv.toObject();
      const otherParticipant = convObj.participants?.find(
        (p) => p._id?.toString() !== userId.toString()
      ) || null;

      const unreadCount = unreadMap.get(conv._id.toString()) || 0;
      const isOnline = otherParticipant ? isUserOnline(otherParticipant._id) : false;

      return {
        ...convObj,
        id: conv._id,
        otherParticipant,
        unreadCount,
        isOnline
      };
    });

    // Optional Search Filtering (by participant name or item title)
    if (search && typeof search === 'string' && search.trim()) {
      const searchLower = search.trim().toLowerCase();
      formatted = formatted.filter((c) => {
        const participantMatch = c.otherParticipant?.name?.toLowerCase().includes(searchLower);
        const itemMatch = c.item?.title?.toLowerCase().includes(searchLower);
        return participantMatch || itemMatch;
      });
    }

    const total = formatted.length;
    const paginated = formatted.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    return res.status(200).json({
      success: true,
      conversations: paginated,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1
    });
  } catch (error) {
    console.error('Error in getConversations:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve conversations.'
    });
  }
};

// 2. Get Single Conversation by ID (GET /api/conversations/:id)
exports.getConversationById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found.'
      });
    }

    const conv = await Conversation.findById(id)
      .populate('participants', 'name avatar trustScore rating email')
      .populate('item', 'title images category sharingType condition availability status location owner')
      .populate('request', 'status type expectedReturnDate offeredItem requester owner')
      .populate('transaction', 'status type handoverDate handoverTime handoverLocation handoverNotes expectedReturnDate returnDate status');

    if (!conv) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found.'
      });
    }

    // Security Authorization: Must be participant
    const isParticipant = conv.participants.some(
      (p) => (p._id || p).toString() === userId.toString()
    );

    if (!isParticipant && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this conversation.'
      });
    }

    const convObj = conv.toObject();
    const otherParticipant = convObj.participants?.find(
      (p) => p._id?.toString() !== userId.toString()
    ) || null;

    const unreadCount = await Message.countDocuments({
      conversation: conv._id,
      readBy: { $ne: userId }
    });

    const isOnline = otherParticipant ? isUserOnline(otherParticipant._id) : false;

    return res.status(200).json({
      success: true,
      conversation: {
        ...convObj,
        id: conv._id,
        otherParticipant,
        unreadCount,
        isOnline
      }
    });
  } catch (error) {
    console.error('Error in getConversationById:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load conversation details.'
    });
  }
};

// 3. Get Conversation by Request ID (GET /api/conversations/request/:requestId)
exports.getConversationByRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user?.id || req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(404).json({ success: false, message: 'Invalid request ID' });
    }

    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    // Verify user is requester or owner
    const isRequester = request.requester.toString() === userId.toString();
    const isOwner = request.owner.toString() === userId.toString();
    if (!isRequester && !isOwner && req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (request.status !== 'ACCEPTED' && request.status !== 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: 'Conversation is only available for accepted requests.'
      });
    }

    // Ensure conversation exists or create it
    const conversation = await conversationService.getOrCreateConversationForRequest({
      requestId: request._id,
      transactionId: request.transaction
    });

    return res.status(200).json({
      success: true,
      conversationId: conversation._id,
      conversation
    });
  } catch (error) {
    console.error('Error in getConversationByRequest:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to retrieve conversation for request.'
    });
  }
};

// 4. Get Conversation by Transaction ID (GET /api/conversations/transaction/:transactionId)
exports.getConversationByTransaction = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const userId = req.user?.id || req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(transactionId)) {
      return res.status(404).json({ success: false, message: 'Invalid transaction ID' });
    }

    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    // Verify user is owner or recipient
    const isOwner = transaction.owner.toString() === userId.toString();
    const isRecipient = transaction.recipient.toString() === userId.toString();
    if (!isOwner && !isRecipient && req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    // Retrieve or create conversation for the transaction's request
    const conversation = await conversationService.getOrCreateConversationForRequest({
      requestId: transaction.request,
      transactionId: transaction._id
    });

    return res.status(200).json({
      success: true,
      conversationId: conversation._id,
      conversation
    });
  } catch (error) {
    console.error('Error in getConversationByTransaction:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to retrieve conversation for transaction.'
    });
  }
};

// 5. Get Paginated Messages (GET /api/conversations/:id/messages)
exports.getMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 30));

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    // Verify user authorization
    await conversationService.verifyParticipant(id, userId);

    const totalMessages = await Message.countDocuments({ conversation: id });
    const totalPages = Math.ceil(totalMessages / limit) || 1;

    // Fetch messages sorted newest first for pagination, then reverse for display
    const messages = await Message.find({ conversation: id })
      .populate('sender', 'name avatar trustScore rating')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Return chronological order
    const ordered = messages.reverse().map((m) => ({
      ...m.toObject(),
      id: m._id
    }));

    return res.status(200).json({
      success: true,
      messages: ordered,
      page,
      totalPages,
      totalMessages,
      hasMore: page < totalPages
    });
  } catch (error) {
    console.error('Error in getMessages:', error);
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to load messages.'
    });
  }
};

// 6. Send Message via REST Fallback (POST /api/conversations/:id/messages)
exports.sendMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;
    const { text } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ success: false, message: 'Message text is required.' });
    }

    const trimmedText = text.trim();
    if (!trimmedText) {
      return res.status(400).json({ success: false, message: 'Message text cannot be empty.' });
    }

    if (trimmedText.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Message cannot exceed 2000 characters.'
      });
    }

    // Message Rate Limiting
    if (!checkRateLimit(userId)) {
      return res.status(429).json({
        success: false,
        message: 'Please slow down and try again.'
      });
    }

    // Verify conversation access
    const conversation = await conversationService.verifyParticipant(id, userId);

    if (conversation.status === 'CLOSED') {
      return res.status(400).json({
        success: false,
        message: 'This conversation has been closed.'
      });
    }

    // Save authoritative server-persisted message
    const newMessage = new Message({
      conversation: conversation._id,
      sender: userId,
      text: trimmedText,
      readBy: [userId]
    });

    await newMessage.save();

    // Update conversation metadata
    conversation.lastMessage = newMessage._id;
    conversation.lastMessageText = trimmedText;
    conversation.lastMessageAt = newMessage.createdAt;
    await conversation.save();

    // Populate sender details
    await newMessage.populate({
      path: 'sender',
      select: 'name avatar trustScore rating'
    });

    const formattedMessage = {
      ...newMessage.toObject(),
      id: newMessage._id
    };

    // Trigger notification for the other participant
    const otherParticipantId = conversation.participants.find(
      (p) => (p._id || p).toString() !== userId.toString()
    );
    if (otherParticipantId) {
      notificationService.notifyNewMessage({
        conversation,
        message: formattedMessage,
        sender: newMessage.sender,
        recipientId: otherParticipantId
      }).catch((err) => console.error('Message notification error:', err.message));
    }

    // Emit Socket.IO event to active room if Socket.IO is initialized
    const io = getIO();
    if (io) {
      io.to(`conversation:${id}`).emit('new_message', {
        conversationId: id,
        message: formattedMessage
      });
    }

    return res.status(201).json({
      success: true,
      message: formattedMessage
    });
  } catch (error) {
    console.error('Error in sendMessage:', error);
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to send message.'
    });
  }
};

// 7. Mark Messages as Read (PATCH /api/conversations/:id/read)
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    await conversationService.verifyParticipant(id, userId);

    const result = await Message.updateMany(
      {
        conversation: id,
        readBy: { $ne: userId }
      },
      {
        $addToSet: { readBy: userId }
      }
    );

    // Emit real-time read event to conversation room
    const io = getIO();
    if (io) {
      io.to(`conversation:${id}`).emit('messages_read', {
        conversationId: id,
        userId,
        readAt: new Date()
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Conversation marked as read.',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error in markAsRead:', error);
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to update read status.'
    });
  }
};

// 8. Global Unread Messages Count (GET /api/conversations/unread-count)
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(200).json({ success: true, unreadCount: 0 });
    }

    // Check Neon PostgreSQL first
    try {
      const { query: pgQuery } = require('../config/postgres');
      const pgRes = await pgQuery(
        `SELECT COUNT(*)::int as count FROM messages m
         JOIN conversations c ON m.conversation_id = c.id
         WHERE (c.participant_one = $1 OR c.participant_two = $1)
           AND m.sender_id != $1 AND m.is_read = false;`,
        [String(userId)]
      );
      if (pgRes?.rows?.[0]) {
        return res.status(200).json({ success: true, unreadCount: pgRes.rows[0].count });
      }
    } catch {}

    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(200).json({ success: true, unreadCount: 0 });
    }

    // Find conversations where user is participant
    const conversations = await Conversation.find({ participants: userId }).select('_id');
    const convIds = conversations.map((c) => c._id);

    const unreadCount = await Message.countDocuments({
      conversation: { $in: convIds },
      readBy: { $ne: userId }
    });

    return res.status(200).json({
      success: true,
      unreadCount
    });
  } catch (error) {
    return res.status(200).json({
      success: true,
      unreadCount: 0
    });
  }
};
