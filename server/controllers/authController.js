const User = require('../models/User');
const { registerSchema, loginSchema } = require('../validators/authValidator');
const { generateToken } = require('../utils/jwt');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * Register a new student or admin user
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorDetails = parseResult.error.errors.map((e) => e.message);
      return errorResponse(
        res,
        errorDetails[0] || 'Validation failed',
        'VALIDATION_FAILED',
        400,
        errorDetails
      );
    }

    const { name, email, password, role } = parseResult.data;
    const normalizedEmail = email.toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return errorResponse(
        res,
        'An account with this email address already exists.',
        'AUTH_EMAIL_EXISTS',
        409
      );
    }

    // Securely hash password using bcryptjs
    const passwordHash = await User.hashPassword(password);

    // Enforce administrative security: ordinary registration cannot grant admin role
    let assignedRole = 'student';
    if (role === 'admin') {
      const expectedSecret = process.env.ADMIN_REGISTRATION_SECRET || 'msot_admin_secret_placement_copilot_2026';
      if (req.body.adminSecretCode && req.body.adminSecretCode === expectedSecret) {
        assignedRole = 'admin';
      } else {
        return errorResponse(
          res,
          'Unauthorized administrator registration. Valid administrative authorization code required.',
          'FORBIDDEN_ADMIN_REGISTRATION',
          403
        );
      }
    }

    // Persist new user in database
    const newUser = await User.create({
      name,
      email: normalizedEmail,
      passwordHash,
      role: assignedRole
    });

    // Generate authenticated JWT session
    const token = generateToken({
      id: newUser._id.toString(),
      role: newUser.role
    });

    return successResponse(
      res,
      {
        user: newUser.toJSON(),
        token
      },
      'Registration successful',
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Login existing user
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorDetails = parseResult.error.errors.map((e) => e.message);
      return errorResponse(
        res,
        errorDetails[0] || 'Validation failed',
        'VALIDATION_FAILED',
        400,
        errorDetails
      );
    }

    const { email, password } = parseResult.data;
    const normalizedEmail = email.toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return errorResponse(
        res,
        'Invalid email or password.',
        'AUTH_INVALID_CREDENTIALS',
        401
      );
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return errorResponse(
        res,
        'Invalid email or password.',
        'AUTH_INVALID_CREDENTIALS',
        401
      );
    }

    const token = generateToken({
      id: user._id.toString(),
      role: user.role
    });

    return successResponse(
      res,
      {
        user: user.toJSON(),
        token
      },
      'Login successful',
      200
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Logout authenticated user
 * POST /api/auth/logout
 */
const logout = async (req, res) => {
  return successResponse(res, {}, 'Logged out successfully');
};

/**
 * Get current authenticated user profile
 * GET /api/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) {
      return errorResponse(res, 'User not found', 'AUTH_USER_NOT_FOUND', 404);
    }

    return successResponse(res, { user });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  getMe
};
