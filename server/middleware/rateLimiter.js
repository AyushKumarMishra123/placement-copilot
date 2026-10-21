const rateLimit = require('express-rate-limit');
const { errorResponse } = require('../utils/apiResponse');

// Specific rate limit for sensitive authentication endpoints (prevent brute-force attacks)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return errorResponse(
      res,
      'Too many authentication attempts. Please try again after 15 minutes.',
      'RATE_LIMIT_EXCEEDED',
      429
    );
  },
  skip: () => process.env.NODE_ENV === 'test' // Skip rate limiting during automated test suites
});

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return errorResponse(
      res,
      'Too many requests. Please slow down and try again later.',
      'RATE_LIMIT_EXCEEDED',
      429
    );
  },
  skip: () => process.env.NODE_ENV === 'test'
});

module.exports = {
  authLimiter,
  apiLimiter
};
