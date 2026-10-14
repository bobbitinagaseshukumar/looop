const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Request = require('../models/Request');
const Item = require('../models/Item');
const conversationService = require('../services/conversationService');
const notificationService = require('../services/notificationService');
const Review = require('../models/Review');
const environmentalImpactService = require('../services/environmentalImpactService');
const pointsService = require('../services/pointsService');

/**
 * Transaction Controller
 * Coordinates item handover, borrowing, returns, and completion lifecycles
 */

// 1. Get user transactions with search, filter, and sorting (GET /api/transactions)
exports.getMyTransactions = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const { status, type, search, sort = 'newest' } = req.query;

    const query = {
      $or: [{ owner: userId }, { recipient: userId }]
    };

    // Filter by Status
    if (status && status !== 'all' && status !== 'ALL') {
      const s = status.toUpperCase();
      if (s === 'ACTIVE') {
        query.status = { $in: ['HANDED_OVER', 'ACTIVE'] };
      } else if (s === 'PENDING' || s === 'PENDING_HANDOVER') {
        query.status = 'PENDING_HANDOVER';
      } else if (s === 'SCHEDULED' || s === 'HANDOVER_SCHEDULED') {
        query.status = 'HANDOVER_SCHEDULED';
      } else if (s === 'RETURN_PENDING') {
        query.status = 'RETURN_PENDING';
      } else if (s === 'COMPLETED') {
        query.status = 'COMPLETED';
      } else if (s === 'CANCELLED') {
        query.status = 'CANCELLED';
      } else {
        query.status = s;
      }
    }

    // Filter by Type
    if (type && type !== 'all' && type !== 'ALL') {
      query.type = type.toUpperCase();
    }

    // Sorting
    let sortOptions = { createdAt: -1 };
    if (sort === 'oldest') {
      sortOptions = { createdAt: 1 };
    } else if (sort === 'updated') {
      sortOptions = { updatedAt: -1 };
    }

    let transactions = await Transaction.find(query)
      .populate('item', 'title images category condition sharingType location availability status')
      .populate('offeredItem', 'title images category condition location availability')
      .populate('owner', 'name avatar trustScore rating')
      .populate('recipient', 'name avatar trustScore rating')
      .populate('request', 'message type status')
      .sort(sortOptions);

    // Search by item title
    if (search && search.trim()) {
      const term = search.trim().toLowerCase();
      transactions = transactions.filter((t) => {
        const itemTitle = t.item?.title?.toLowerCase() || '';
        const offeredTitle = t.offeredItem?.title?.toLowerCase() || '';
        return itemTitle.includes(term) || offeredTitle.includes(term);
      });
    }

    const formatted = transactions.map((t) => ({
      ...t.toObject(),
      id: t._id
    }));

    return res.status(200).json({
      success: true,
      count: formatted.length,
      transactions: formatted
    });
  } catch (error) {
    console.error('Error in getMyTransactions:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve transactions.'
    });
  }
};

// 2. Get Transaction Summary Statistics (GET /api/transactions/summary)
exports.getTransactionSummary = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const userQuery = { $or: [{ owner: userId }, { recipient: userId }] };

    const [active, pendingHandover, scheduled, returnPending, completed, total] = await Promise.all([
      Transaction.countDocuments({ ...userQuery, status: { $in: ['HANDED_OVER', 'ACTIVE'] } }),
      Transaction.countDocuments({ ...userQuery, status: 'PENDING_HANDOVER' }),
      Transaction.countDocuments({ ...userQuery, status: 'HANDOVER_SCHEDULED' }),
      Transaction.countDocuments({ ...userQuery, status: 'RETURN_PENDING' }),
      Transaction.countDocuments({ ...userQuery, status: 'COMPLETED' }),
      Transaction.countDocuments(userQuery)
    ]);

    return res.status(200).json({
      success: true,
      summary: {
        active,
        pendingHandover,
        scheduled,
        returnPending,
        completed,
        total
      }
    });
  } catch (error) {
    console.error('Error in getTransactionSummary:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve transaction summary.'
    });
  }
};

// 3. Get Single Transaction by ID (GET /api/transactions/:id)
exports.getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    const transaction = await Transaction.findById(id)
      .populate('item', 'title images category condition sharingType location availability status')
      .populate('offeredItem', 'title images category condition location availability description')
      .populate('owner', 'name avatar trustScore rating')
      .populate('recipient', 'name avatar trustScore rating')
      .populate('request', 'message type status expectedReturnDate createdAt')
      .populate('conversation');

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    // Authorization: User must be owner or recipient or admin
    const isOwner = transaction.owner?._id?.toString() === userId?.toString();
    const isRecipient = transaction.recipient?._id?.toString() === userId?.toString();
    const isAdmin = req.user?.role === 'admin' || req.user?.role === 'ADMIN';

    if (!isOwner && !isRecipient && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this transaction.'
      });
    }

    // Auto-link conversation if transaction does not have it yet
    let conversationId = transaction.conversation?._id || transaction.conversation;
    if (!conversationId && transaction.request) {
      try {
        const conv = await conversationService.getOrCreateConversationForRequest({
          requestId: transaction.request?._id || transaction.request,
          transactionId: transaction._id
        });
        if (conv) {
          conversationId = conv._id;
          transaction.conversation = conv;
        }
      } catch (convErr) {
        console.warn('Could not auto-create conversation for transaction:', convErr.message);
      }
    }

    // Check real review status and eligibility for completed transactions
    let reviewStatus = {
      canReview: false,
      reviewedByCurrentUser: false,
      myReview: null,
      otherUserReview: null,
      reviews: []
    };

    if (transaction.status === 'COMPLETED') {
      try {
        const txReviews = await Review.find({ transaction: transaction._id })
          .populate('reviewer', 'name avatar city state verified')
          .populate('reviewee', 'name avatar city state verified')
          .sort({ createdAt: -1 });

        const myRev = txReviews.find(
          (r) => r.reviewer?._id?.toString() === userId?.toString()
        ) || null;

        const otherRev = txReviews.find(
          (r) => r.reviewer?._id?.toString() !== userId?.toString()
        ) || null;

        const isParticipant = isOwner || isRecipient;

        reviewStatus = {
          canReview: isParticipant && !myRev,
          reviewedByCurrentUser: !!myRev,
          myReview: myRev,
          otherUserReview: otherRev,
          reviews: txReviews
        };
      } catch (revErr) {
        console.warn('Could not load reviews for transaction:', revErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      transaction: {
        ...transaction.toObject(),
        id: transaction._id,
        conversationId: conversationId || null,
        reviewStatus
      }
    });
  } catch (error) {
    console.error('Error in getTransactionById:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to load transaction details.'
    });
  }
};

// 4. Schedule or Update Handover Details (PATCH /api/transactions/:id/handover)
exports.updateHandover = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    const isOwner = transaction.owner.toString() === userId?.toString();
    const isRecipient = transaction.recipient.toString() === userId?.toString();
    if (!isOwner && !isRecipient && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only transaction participants can update handover details.'
      });
    }

    // State validation
    if (transaction.status !== 'PENDING_HANDOVER' && transaction.status !== 'HANDOVER_SCHEDULED') {
      return res.status(400).json({
        success: false,
        message: `Handover cannot be scheduled because the transaction is already ${transaction.status.toLowerCase().replace('_', ' ')}.`
      });
    }

    const {
      handoverMethod,
      handoverDate,
      handoverTime,
      handoverLocation,
      handoverNotes
    } = req.body;

    if (handoverMethod && ['In Person', 'Pickup', 'Other'].includes(handoverMethod)) {
      transaction.handoverMethod = handoverMethod;
    }

    if (handoverDate) {
      const parsedDate = new Date(handoverDate);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid handover date.' });
      }
      transaction.handoverDate = parsedDate;
    }

    if (typeof handoverTime === 'string') {
      transaction.handoverTime = handoverTime.trim();
    }

    if (handoverLocation && typeof handoverLocation === 'object') {
      transaction.handoverLocation = {
        city: (handoverLocation.city || transaction.handoverLocation?.city || '').trim(),
        locality: (handoverLocation.locality || transaction.handoverLocation?.locality || '').trim(),
        meetingArea: (handoverLocation.meetingArea || transaction.handoverLocation?.meetingArea || '').trim(),
        notes: (handoverLocation.notes || transaction.handoverLocation?.notes || '').trim()
      };
    }

    if (typeof handoverNotes === 'string') {
      transaction.handoverNotes = handoverNotes.trim();
    }

    // Update status to HANDOVER_SCHEDULED
    transaction.status = 'HANDOVER_SCHEDULED';

    // If handover details changed, reset both confirmations
    transaction.handoverConfirmedByOwner = false;
    transaction.handoverConfirmedByRecipient = false;

    await transaction.save();

    await transaction.populate([
      { path: 'item', select: 'title images category condition sharingType location availability status' },
      { path: 'offeredItem', select: 'title images category condition location availability' },
      { path: 'owner', select: 'name avatar trustScore rating' },
      { path: 'recipient', select: 'name avatar trustScore rating' },
      { path: 'request', select: 'message type status expectedReturnDate' }
    ]);

    // Trigger handover scheduled notification for the other participant
    const otherId = isOwner ? transaction.recipient?._id || transaction.recipient : transaction.owner?._id || transaction.owner;
    notificationService.notifyHandoverScheduled({
      transaction,
      item: transaction.item,
      actor: req.user,
      recipientId: otherId
    }).catch((err) => console.error('Notification trigger error:', err.message));

    return res.status(200).json({
      success: true,
      message: 'Handover details updated successfully.',
      transaction: {
        ...transaction.toObject(),
        id: transaction._id
      }
    });
  } catch (error) {
    console.error('Error in updateHandover:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to update handover details.'
    });
  }
};

// 5. Confirm Handover by Owner or Recipient (PATCH /api/transactions/:id/handover/confirm)
exports.confirmHandover = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    const isOwner = transaction.owner.toString() === userId?.toString();
    const isRecipient = transaction.recipient.toString() === userId?.toString();
    if (!isOwner && !isRecipient && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only transaction participants can confirm handover.'
      });
    }

    // State machine check
    if (transaction.status !== 'PENDING_HANDOVER' && transaction.status !== 'HANDOVER_SCHEDULED') {
      return res.status(400).json({
        success: false,
        message: `Handover confirmation is not allowed because this transaction is ${transaction.status.toLowerCase().replace('_', ' ')}.`
      });
    }

    if (isOwner) {
      transaction.handoverConfirmedByOwner = true;
    }
    if (isRecipient) {
      transaction.handoverConfirmedByRecipient = true;
    }

    let bothConfirmed = transaction.handoverConfirmedByOwner && transaction.handoverConfirmedByRecipient;

    if (bothConfirmed) {
      transaction.handoverConfirmedAt = new Date();

      if (transaction.type === 'BORROW') {
        // Borrow moves to ACTIVE
        transaction.status = 'ACTIVE';
        if (transaction.item) {
          await Item.findByIdAndUpdate(transaction.item, { availability: 'Unavailable' });
        }
      } else {
        // FREE, GIVEAWAY, and EXCHANGE move to COMPLETED upon confirmed handover
        transaction.status = 'COMPLETED';
        transaction.completedAt = new Date();

        if (transaction.item) {
          await Item.findByIdAndUpdate(transaction.item, { availability: 'Unavailable' });
        }
        if (transaction.offeredItem) {
          await Item.findByIdAndUpdate(transaction.offeredItem, { availability: 'Unavailable' });
        }

        // Also update linked request to COMPLETED
        if (transaction.request) {
          await Request.findByIdAndUpdate(transaction.request, { status: 'COMPLETED', completedAt: new Date() });
        }
      }
    } else {
      transaction.status = 'HANDOVER_SCHEDULED';
    }

    await transaction.save();

    // Trigger environmental impact creation and points award if transaction reached COMPLETED
    if (transaction.status === 'COMPLETED') {
      environmentalImpactService.createImpactForTransaction(transaction._id).catch((err) => {
        console.error('[ImpactHook] Handover impact creation failed:', err.message);
      });
      pointsService.awardPointsForTransaction(transaction._id).catch((err) => {
        console.error('[PointsHook] Award points error:', err.message);
      });
    }

    await transaction.populate([
      { path: 'item', select: 'title images category condition sharingType location availability status' },
      { path: 'offeredItem', select: 'title images category condition location availability' },
      { path: 'owner', select: 'name avatar trustScore rating' },
      { path: 'recipient', select: 'name avatar trustScore rating' },
      { path: 'request', select: 'message type status expectedReturnDate' }
    ]);

    const confirmationMsg = bothConfirmed
      ? transaction.type === 'BORROW'
        ? 'Handover confirmed by both parties. Borrowing is now active!'
        : 'Handover confirmed by both parties. Transaction completed!'
      : isOwner
      ? 'You confirmed handing over the item. Waiting for recipient confirmation.'
      : 'You confirmed receiving the item. Waiting for owner confirmation.';

    // Trigger handover confirmed notification
    const otherPartnerId = isOwner ? transaction.recipient?._id || transaction.recipient : transaction.owner?._id || transaction.owner;
    notificationService.notifyHandoverConfirmed({
      transaction,
      item: transaction.item,
      actor: req.user,
      recipientId: otherPartnerId,
      bothConfirmed
    }).catch((err) => console.error('Notification trigger error:', err.message));

    return res.status(200).json({
      success: true,
      message: confirmationMsg,
      transaction: {
        ...transaction.toObject(),
        id: transaction._id
      }
    });
  } catch (error) {
    console.error('Error in confirmHandover:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to confirm handover.'
    });
  }
};

// 6. Start Return Process for Borrow (PATCH /api/transactions/:id/return)
exports.startReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    // Only recipient (borrower) can start return, or owner/admin
    const isRecipient = transaction.recipient.toString() === userId?.toString();
    if (!isRecipient && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only the borrower can initiate the return of the item.'
      });
    }

    if (transaction.type !== 'BORROW') {
      return res.status(400).json({
        success: false,
        message: 'Returns are only applicable for borrow transactions.'
      });
    }

    if (transaction.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: `Transaction cannot be returned because it is currently ${transaction.status.toLowerCase().replace('_', ' ')}.`
      });
    }

    const { returnDate, returnNotes } = req.body || {};

    transaction.status = 'RETURN_PENDING';
    transaction.returnConfirmedByBorrower = true; // borrower initiating return counts as confirmation
    transaction.returnConfirmedByOwner = false;

    if (returnDate) {
      const parsed = new Date(returnDate);
      if (!isNaN(parsed.getTime())) transaction.returnDate = parsed;
    }
    if (typeof returnNotes === 'string') {
      transaction.returnNotes = returnNotes.trim();
    }

    await transaction.save();

    await transaction.populate([
      { path: 'item', select: 'title images category condition sharingType location availability status' },
      { path: 'offeredItem', select: 'title images category condition location availability' },
      { path: 'owner', select: 'name avatar trustScore rating' },
      { path: 'recipient', select: 'name avatar trustScore rating' },
      { path: 'request', select: 'message type status expectedReturnDate' }
    ]);

    // Trigger return started notification for owner
    notificationService.notifyReturnStarted({
      transaction,
      item: transaction.item,
      actor: req.user
    }).catch((err) => console.error('Notification trigger error:', err.message));

    return res.status(200).json({
      success: true,
      message: 'Return initiated. Waiting for owner to confirm receiving the item back.',
      transaction: {
        ...transaction.toObject(),
        id: transaction._id
      }
    });
  } catch (error) {
    console.error('Error in startReturn:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to initiate return.'
    });
  }
};

// 7. Confirm Return by Owner or Borrower (PATCH /api/transactions/:id/return/confirm)
exports.confirmReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    const isOwner = transaction.owner.toString() === userId?.toString();
    const isRecipient = transaction.recipient.toString() === userId?.toString();

    if (!isOwner && !isRecipient && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only transaction participants can confirm return.'
      });
    }

    if (transaction.type !== 'BORROW') {
      return res.status(400).json({
        success: false,
        message: 'Returns are only applicable for borrow transactions.'
      });
    }

    if (transaction.status !== 'RETURN_PENDING' && transaction.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: `Return cannot be confirmed because transaction is ${transaction.status.toLowerCase().replace('_', ' ')}.`
      });
    }

    if (isOwner) {
      transaction.returnConfirmedByOwner = true;
    }
    if (isRecipient) {
      transaction.returnConfirmedByBorrower = true;
    }

    // If owner confirms receipt, the return is complete!
    if (transaction.returnConfirmedByOwner) {
      transaction.status = 'COMPLETED';
      transaction.returnConfirmedAt = new Date();
      transaction.returnedAt = new Date();
      transaction.completedAt = new Date();

      // Make original item Available again in community
      if (transaction.item) {
        await Item.findByIdAndUpdate(transaction.item, { availability: 'Available' });
      }

      // Mark request completed as well
      if (transaction.request) {
        await Request.findByIdAndUpdate(transaction.request, { status: 'COMPLETED', completedAt: new Date() });
      }
    } else {
      transaction.status = 'RETURN_PENDING';
    }

    await transaction.save();

    // Trigger environmental impact creation and points award if borrow reached COMPLETED
    if (transaction.status === 'COMPLETED') {
      environmentalImpactService.createImpactForTransaction(transaction._id).catch((err) => {
        console.error('[ImpactHook] Return impact creation failed:', err.message);
      });
      pointsService.awardPointsForTransaction(transaction._id).catch((err) => {
        console.error('[PointsHook] Award points error:', err.message);
      });
    }

    await transaction.populate([
      { path: 'item', select: 'title images category condition sharingType location availability status' },
      { path: 'offeredItem', select: 'title images category condition location availability' },
      { path: 'owner', select: 'name avatar trustScore rating' },
      { path: 'recipient', select: 'name avatar trustScore rating' },
      { path: 'request', select: 'message type status expectedReturnDate' }
    ]);

    const msg = transaction.status === 'COMPLETED'
      ? 'Item return confirmed! Transaction completed successfully.'
      : 'Return confirmation registered. Waiting for final confirmation.';

    // Trigger return confirmed / transaction completed notification
    const isCompleted = transaction.status === 'COMPLETED';
    const returnPartnerId = isOwner ? transaction.recipient?._id || transaction.recipient : transaction.owner?._id || transaction.owner;
    notificationService.notifyReturnConfirmed({
      transaction,
      item: transaction.item,
      actor: req.user,
      recipientId: returnPartnerId,
      completed: isCompleted
    }).catch((err) => console.error('Notification trigger error:', err.message));

    return res.status(200).json({
      success: true,
      message: msg,
      transaction: {
        ...transaction.toObject(),
        id: transaction._id
      }
    });
  } catch (error) {
    console.error('Error in confirmReturn:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to confirm return.'
    });
  }
};

// 8. Explicit Customer Receipt Confirmation (PATCH /api/transactions/:id/confirm-receipt)
exports.confirmCustomerReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    const isRecipient = transaction.recipient.toString() === userId?.toString();
    if (!isRecipient && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only the recipient customer can confirm receiving the product.'
      });
    }

    transaction.handoverConfirmedByRecipient = true;
    transaction.customerConfirmedAt = new Date();

    if (transaction.type === 'BORROW') {
      transaction.status = 'ACTIVE';
      if (transaction.item) {
        await Item.findByIdAndUpdate(transaction.item, { availability: 'Unavailable' });
      }
    } else {
      transaction.status = 'COMPLETED';
      transaction.completedAt = new Date();
      if (transaction.item) {
        await Item.findByIdAndUpdate(transaction.item, { availability: 'Unavailable' });
      }
      if (transaction.request) {
        await Request.findByIdAndUpdate(transaction.request, { status: 'COMPLETED', completedAt: new Date() });
      }

      // Permanently delete all chat messages from database upon item handover completion
      try {
        const Conversation = require('../models/Conversation');
        const Message = require('../models/Message');
        const conv = await Conversation.findOne({
          $or: [
            { transaction: transaction._id },
            { request: transaction.request }
          ]
        });
        if (conv) {
          await Message.deleteMany({ conversation: conv._id });
          await Conversation.findByIdAndUpdate(conv._id, {
            status: 'CLOSED',
            lastMessageText: '[Item Taken - Chat securely deleted from database]',
            lastMessage: null
          });
          const { query: pgQuery } = require('../config/postgres');
          await pgQuery('DELETE FROM messages WHERE conversation_id = $1', [conv._id.toString()]).catch(() => {});
        }
      } catch (delErr) {
        console.warn('[Transaction Complete Message Clean Error]:', delErr.message);
      }
    }

    await transaction.save();

    if (transaction.status === 'COMPLETED') {
      environmentalImpactService.createImpactForTransaction(transaction._id).catch(() => {});
      pointsService.awardPointsForTransaction(transaction._id).catch((err) => {
        console.error('[PointsHook] Award points error:', err.message);
      });
    }

    await transaction.populate([
      { path: 'item', select: 'title images category condition sharingType location availability status' },
      { path: 'owner', select: 'name avatar trustScore rating' },
      { path: 'recipient', select: 'name avatar trustScore rating' }
    ]);

    return res.status(200).json({
      success: true,
      message: transaction.status === 'COMPLETED'
        ? 'Product receipt confirmed! Transaction completed and points awarded.'
        : 'Product receipt confirmed! Borrowing is now active.',
      transaction: {
        ...transaction.toObject(),
        id: transaction._id
      }
    });
  } catch (error) {
    console.error('Error in confirmCustomerReceipt:', error);
    return res.status(500).json({ success: false, message: 'Unable to confirm receipt.' });
  }
};

