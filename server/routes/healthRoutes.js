const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

/**
 * Health check endpoint for monitoring and deployment readiness
 * GET /api/health
 */
router.get('/', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  const isHealthy = dbState === 1 || process.env.NODE_ENV === 'test';

  return res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    message: isHealthy ? 'Placement Copilot API is running' : 'Database connection unavailable',
    environment: process.env.NODE_ENV || 'development',
    database: dbStatusMap[dbState] || 'unknown',
    aiProvider: (process.env.AI_PROVIDER || 'rules_only').toLowerCase(),
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
