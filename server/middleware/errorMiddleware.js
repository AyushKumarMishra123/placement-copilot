const { errorResponse } = require('../utils/apiResponse');

// 404 Route Not Found Handler
const notFoundHandler = (req, res, next) => {
  return errorResponse(
    res,
    `Route ${req.method} ${req.originalUrl} not found`,
    'ROUTE_NOT_FOUND',
    404
  );
};

// Centralized Express Global Error Handler
const errorHandler = (err, req, res, next) => {
  // If response has already started sending, delegate to Express default handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return errorResponse(res, 'Resource not found or invalid identifier format', 'INVALID_ID_FORMAT', 400);
  }

  // Handle Mongoose Duplicate Key Error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return errorResponse(
      res,
      `A record with this ${field} already exists.`,
      'DUPLICATE_RESOURCE',
      409
    );
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return errorResponse(
      res,
      messages.join(', ') || 'Validation error',
      'VALIDATION_FAILED',
      400,
      messages
    );
  }

  // Handle JSON Syntax Error in request body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return errorResponse(res, 'Malformed JSON payload in request body', 'INVALID_JSON_PAYLOAD', 400);
  }

  // Log server internal errors safely
  if (process.env.NODE_ENV !== 'test') {
    console.error('[Unhandled Server Error]:', {
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  const userSafeMessage =
    process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'An unexpected error occurred. Please try again later.'
      : err.message || 'Internal Server Error';

  return errorResponse(
    res,
    userSafeMessage,
    err.code || 'INTERNAL_SERVER_ERROR',
    statusCode
  );
};

module.exports = {
  notFoundHandler,
  errorHandler
};
