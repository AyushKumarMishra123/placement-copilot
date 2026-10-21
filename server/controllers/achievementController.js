const achievementAssessmentService = require('../services/achievements/achievementAssessmentService');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * POST /api/achievements/assess
 * Submit Co-Curricular Assessment
 */
const assessAchievements = async (req, res, next) => {
  try {
    const { participationStatus, targetRole, academicYear, achievements } = req.body;

    if (!participationStatus) {
      return errorResponse(
        res,
        'participationStatus is required ("achievements", "activities_no_formal", or "none_want_to_improve").',
        'MISSING_FIELD',
        400
      );
    }

    const assessment = await achievementAssessmentService.assessAchievements({
      userId: req.user.id,
      participationStatus,
      targetRole,
      academicYear,
      achievements
    });

    return successResponse(
      res,
      { assessment },
      'Co-curricular achievement assessment completed successfully.',
      201
    );
  } catch (err) {
    if (err.status) {
      return errorResponse(res, err.message, 'ASSESSMENT_FAILED', err.status);
    }
    next(err);
  }
};

/**
 * GET /api/achievements/latest
 * Get latest co-curricular achievement assessment
 */
const getLatestAssessment = async (req, res, next) => {
  try {
    const assessment = await achievementAssessmentService.getLatestAssessment(req.user.id);
    return successResponse(
      res,
      { assessment: assessment || null },
      assessment ? 'Latest assessment retrieved.' : 'No assessment found.'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/achievements/history
 * Get co-curricular assessment history
 */
const getAssessmentHistory = async (req, res, next) => {
  try {
    const history = await achievementAssessmentService.getAssessmentHistory(req.user.id);
    return successResponse(res, { history }, 'Assessment history retrieved.');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  assessAchievements,
  getLatestAssessment,
  getAssessmentHistory
};
