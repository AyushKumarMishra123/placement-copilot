/**
 * Standard API Response utilities ensuring uniform contract across all endpoints.
 */

const successResponse = (res, data = {}, message = null, statusCode = 200) => {
  const payload = {
    success: true
  };

  if (message) {
    payload.message = message;
  }

  payload.data = data;
  return res.status(statusCode).json(payload);
};

const errorResponse = (res, message, code = 'INTERNAL_SERVER_ERROR', statusCode = 500, details = null) => {
  const payload = {
    success: false,
    message,
    code
  };

  if (details && process.env.NODE_ENV !== 'production') {
    payload.details = details;
  } else if (details && Array.isArray(details)) {
    // Return sanitized validation field messages
    payload.errors = details;
  }

  return res.status(statusCode).json(payload);
};

module.exports = {
  successResponse,
  errorResponse
};
