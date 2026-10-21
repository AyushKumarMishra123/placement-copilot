const readinessService = require('../services/readiness/readinessService');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * Get current placement readiness assessment for student
 * GET /api/readiness
 */
const getReadiness = async (req, res, next) => {
  try {
    const assessment = await readinessService.getLatestOrRecalculate(req.user.id);
    return successResponse(res, { assessment });
  } catch (error) {
    next(error);
  }
};

/**
 * Explicitly trigger server-side recalculation of readiness score
 * POST /api/readiness/recalculate
 */
const recalculateReadiness = async (req, res, next) => {
  try {
    const assessment = await readinessService.recalculate(req.user.id);
    return successResponse(res, { assessment }, 'Placement readiness recalculated successfully.', 200);
  } catch (error) {
    next(error);
  }
};

/**
 * Get assessment history for student
 * GET /api/readiness/history
 */
const getReadinessHistory = async (req, res, next) => {
  try {
    const history = await readinessService.getHistory(req.user.id);
    return successResponse(res, { history });
  } catch (error) {
    next(error);
  }
};

/**
 * Get specific assessment snapshot by ID
 * GET /api/readiness/:assessmentId
 */
const getReadinessById = async (req, res, next) => {
  try {
    const assessment = await readinessService.getById(req.params.assessmentId, req.user.id);
    return successResponse(res, { assessment });
  } catch (error) {
    if (error.statusCode === 404) {
      return errorResponse(res, 'Readiness assessment not found or access denied.', 'NOT_FOUND', 404);
    }
    next(error);
  }
};

module.exports = {
  getReadiness,
  recalculateReadiness,
  getReadinessHistory,
  getReadinessById
};
