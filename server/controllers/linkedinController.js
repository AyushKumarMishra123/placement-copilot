const linkedinReviewService = require('../services/linkedin/linkedinReviewService');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * POST /api/linkedin/analyze
 * Analyze LinkedIn profile via URL, structured text, or manual inputs
 */
const analyzeProfile = async (req, res, next) => {
  try {
    const { inputMethod = 'url', url, profileData, targetRole } = req.body;

    const review = await linkedinReviewService.analyzeProfile({
      userId: req.user.id,
      inputMethod,
      url,
      profileData,
      targetRole
    });

    return successResponse(
      res,
      { review },
      'LinkedIn profile analyzed successfully.',
      201
    );
  } catch (err) {
    if (err.code === 'LINKEDIN_AUTH_RESTRICTED') {
      return res.status(422).json({
        success: false,
        message: err.message,
        errorCode: 'LINKEDIN_AUTH_RESTRICTED',
        suggestedAction: 'USE_PDF_OR_MANUAL'
      });
    }
    if (err.status) {
      return errorResponse(res, err.message, 'LINKEDIN_ANALYSIS_FAILED', err.status);
    }
    next(err);
  }
};

/**
 * POST /api/linkedin/upload-pdf
 * Upload LinkedIn Profile PDF (downloaded via "Save to PDF")
 */
const uploadPdfAndAnalyze = async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return errorResponse(res, 'Please upload a valid LinkedIn PDF file.', 'MISSING_FILE', 400);
    }

    if (req.file.mimetype !== 'application/pdf') {
      return errorResponse(res, 'Only PDF documents are supported for profile extraction.', 'INVALID_FILE_TYPE', 400);
    }

    const { targetRole } = req.body;

    const review = await linkedinReviewService.analyzeProfile({
      userId: req.user.id,
      inputMethod: 'pdf',
      pdfBuffer: req.file.buffer,
      targetRole
    });

    return successResponse(
      res,
      { review },
      'LinkedIn profile PDF parsed and analyzed successfully.',
      201
    );
  } catch (err) {
    if (err.status) {
      return errorResponse(res, err.message, 'LINKEDIN_PDF_FAILED', err.status);
    }
    next(err);
  }
};

/**
 * GET /api/linkedin/latest
 * Get latest LinkedIn profile review
 */
const getLatestReview = async (req, res, next) => {
  try {
    const review = await linkedinReviewService.getLatestReview(req.user.id);
    return successResponse(
      res,
      { review: review || null },
      review ? 'Latest review retrieved.' : 'No LinkedIn review found.'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/linkedin/history
 * Get LinkedIn review history
 */
const getReviewHistory = async (req, res, next) => {
  try {
    const history = await linkedinReviewService.getReviewHistory(req.user.id);
    return successResponse(res, { history }, 'Review history retrieved.');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  analyzeProfile,
  uploadPdfAndAnalyze,
  getLatestReview,
  getReviewHistory
};
