const express = require('express');
const router = express.Router();
const { getDBStatus } = require('../config/db');
const { getPostgresStatus } = require('../config/postgres');

/**
 * @route   GET /api/health
 * @desc    System health and connectivity verification
 * @access  Public
 */
router.get('/', (req, res) => {
  const mongoStatus = getDBStatus();
  const pgStatus = getPostgresStatus();
  const uptimeSeconds = Math.floor(process.uptime());

  const isHealthy = pgStatus.isConnected || mongoStatus.isConnected;

  res.status(isHealthy ? 200 : 503).json({
    success: true,
    message: 'Looop backend is running',
    data: {
      service: 'Looop API',
      tagline: 'Share. Reuse. Connect.',
      status: isHealthy ? 'healthy' : 'degraded',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      uptime: `${uptimeSeconds} seconds`,
      database: pgStatus.isConnected ? 'Connected' : (mongoStatus.isConnected ? 'Connected' : 'Disconnected'),
      postgres: pgStatus,
      mongodb: mongoStatus,
      version: '1.0.0'
    }
  });
});

/**
 * @route   POST /api/health/echo
 * @desc    Echo test to verify POST request capability and JSON parsing
 * @access  Public
 */
router.post('/echo', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Echo test successful',
    data: {
      received: req.body,
      serverTime: new Date().toISOString()
    }
  });
});

module.exports = router;
