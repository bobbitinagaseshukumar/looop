const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const auth = require('../middleware/auth');

// All request routes require authentication
router.use(auth);

// POST /api/requests - Create request or offer
router.post('/', requestController.createRequest);

// GET /api/requests/my - Get requests made by the current user
router.get('/my', requestController.getMyRequests);

// GET /api/requests/received - Get requests received by the current user
router.get('/received', requestController.getReceivedRequests);

// GET /api/requests/:id - Get specific request details
router.get('/:id', requestController.getRequestById);

// PATCH /api/requests/:id/accept - Accept incoming request (owner only)
router.patch('/:id/accept', requestController.acceptRequest);

// PATCH /api/requests/:id/decline - Decline incoming request (owner only)
router.patch('/:id/decline', requestController.declineRequest);

// PATCH /api/requests/:id/cancel - Cancel own pending request (requester only)
router.patch('/:id/cancel', requestController.cancelRequest);

// PATCH & POST /api/requests/:id/taken - Mark item as taken, conclude handover, and delete chat messages from DB
router.patch('/:id/taken', requestController.markItemTaken);
router.post('/:id/taken', requestController.markItemTaken);

module.exports = router;
