const interviewSessionService = require('../services/interview/interviewSessionService');
const {
  startInterviewSchema,
  submitAnswerSchema,
  skipQuestionSchema
} = require('../validators/interviewValidator');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * Start or resume an active mock interview
 * POST /api/interviews
 */
const startInterview = async (req, res, next) => {
  try {
    const parseResult = startInterviewSchema.safeParse(req.body);
    if (!parseResult.success) {
      return errorResponse(
        res,
        parseResult.error.errors[0]?.message || 'Invalid interview parameters',
        'VALIDATION_FAILED',
        400,
        parseResult.error.errors.map((e) => e.message)
      );
    }

    const session = await interviewSessionService.startSession(req.user.id, parseResult.data);
    return successResponse(res, { session }, 'Mock interview session initialized successfully', 201);
  } catch (err) {
    next(err);
  }
};

/**
 * Get all interview sessions for the authenticated user
 * GET /api/interviews
 */
const getInterviews = async (req, res, next) => {
  try {
    const interviews = await interviewSessionService.getUserInterviews(req.user.id);
    return successResponse(res, { interviews });
  } catch (err) {
    next(err);
  }
};

/**
 * Get single interview session by ID
 * GET /api/interviews/:id
 */
const getInterviewById = async (req, res, next) => {
  try {
    const session = await interviewSessionService.getSessionById(req.user.id, req.params.id);
    return successResponse(res, { session });
  } catch (err) {
    if (err.code === 'SESSION_NOT_FOUND') {
      return errorResponse(res, 'Interview session not found or unauthorized', 'SESSION_NOT_FOUND', 404);
    }
    next(err);
  }
};

/**
 * Submit answer for a question
 * POST /api/interviews/:id/answer
 */
const submitAnswer = async (req, res, next) => {
  try {
    const parseResult = submitAnswerSchema.safeParse(req.body);
    if (!parseResult.success) {
      return errorResponse(
        res,
        parseResult.error.errors[0]?.message || 'Invalid answer payload',
        'VALIDATION_FAILED',
        400
      );
    }

    const session = await interviewSessionService.submitAnswer(
      req.user.id,
      req.params.id,
      parseResult.data
    );
    return successResponse(res, { session }, 'Answer submitted successfully');
  } catch (err) {
    if (err.code === 'SESSION_NOT_FOUND') {
      return errorResponse(res, err.message, err.code, 404);
    }
    if (err.code === 'SESSION_EXPIRED' || err.code === 'INVALID_QUESTION_ID') {
      return errorResponse(res, err.message, err.code, 400);
    }
    next(err);
  }
};

/**
 * Skip a question
 * POST /api/interviews/:id/skip
 */
const skipQuestion = async (req, res, next) => {
  try {
    const parseResult = skipQuestionSchema.safeParse(req.body);
    if (!parseResult.success) {
      return errorResponse(
        res,
        parseResult.error.errors[0]?.message || 'Invalid skip payload',
        'VALIDATION_FAILED',
        400
      );
    }

    const session = await interviewSessionService.skipQuestion(
      req.user.id,
      req.params.id,
      parseResult.data
    );
    return successResponse(res, { session }, 'Question skipped');
  } catch (err) {
    if (err.code === 'SESSION_NOT_FOUND') {
      return errorResponse(res, err.message, err.code, 404);
    }
    if (err.code === 'SESSION_EXPIRED' || err.code === 'INVALID_QUESTION_ID') {
      return errorResponse(res, err.message, err.code, 400);
    }
    next(err);
  }
};

/**
 * Complete interview session and evaluate
 * POST /api/interviews/:id/complete
 */
const completeInterview = async (req, res, next) => {
  try {
    const session = await interviewSessionService.completeSession(req.user.id, req.params.id);
    return successResponse(res, { session }, 'Interview completed and evaluated successfully');
  } catch (err) {
    if (err.code === 'SESSION_NOT_FOUND') {
      return errorResponse(res, err.message, err.code, 404);
    }
    next(err);
  }
};

/**
 * Retry failed evaluation
 * POST /api/interviews/:id/evaluate
 */
const retryEvaluation = async (req, res, next) => {
  try {
    const session = await interviewSessionService.retryEvaluation(req.user.id, req.params.id);
    return successResponse(res, { session }, 'Interview evaluation completed successfully');
  } catch (err) {
    if (err.code === 'SESSION_NOT_FOUND') {
      return errorResponse(res, err.message, err.code, 404);
    }
    next(err);
  }
};

module.exports = {
  startInterview,
  getInterviews,
  getInterviewById,
  submitAnswer,
  skipQuestion,
  completeInterview,
  retryEvaluation
};
