const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');
const { errorResponse } = require('../utils/apiResponse');

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'Authentication token missing or invalid', 'AUTH_TOKEN_MISSING', 401);
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return errorResponse(res, 'Session expired. Please log in again.', 'AUTH_TOKEN_EXPIRED', 401);
      }
      return errorResponse(res, 'Invalid authentication token.', 'AUTH_TOKEN_INVALID', 401);
    }

    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) {
      return errorResponse(res, 'User account no longer exists.', 'AUTH_USER_NOT_FOUND', 401);
    }

    // Attach authenticated user identity to request
    req.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role
    };

    next();
  } catch (error) {
    return errorResponse(res, 'Authentication verification failed', 'AUTH_ERROR', 401);
  }
};

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Authentication required', 'AUTH_REQUIRED', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return errorResponse(
        res,
        'Access denied. You do not have permission to perform this action.',
        'FORBIDDEN_ROLE',
        403
      );
    }

    next();
  };
};

module.exports = {
  requireAuth,
  requireRole
};
