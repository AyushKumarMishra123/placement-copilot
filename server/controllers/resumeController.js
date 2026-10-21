const path = require('path');
const fs = require('fs');
const Resume = require('../models/Resume');
const ResumeReview = require('../models/ResumeReview');
const reviewService = require('../services/reviewService');
const { getStorageProvider } = require('../services/storage');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * Handle validated resume upload & automated parsing
 * POST /api/resumes
 */
const uploadResume = async (req, res, next) => {
  try {
    if (!req.file) {
      return errorResponse(res, 'No file uploaded', 'MISSING_FILE', 400);
    }

    const { originalname, mimetype, size, buffer, documentId, storedFilename } = req.file;
    const ext = path.extname(originalname).toLowerCase();
    const fileType = ext === '.docx' || ext === '.doc' ? 'docx' : 'pdf';

    // 1. Store file securely via storage abstraction (GridFS / Local)
    const storage = getStorageProvider();
    const storageResult = await storage.uploadFile({
      buffer,
      originalFilename: originalname,
      mimeType: mimetype,
      userId: req.user.id,
      documentId
    });

    // 2. Create Resume record in database with status 'uploaded'
    const newResume = await Resume.create({
      userId: req.user.id,
      documentId,
      originalFilename: originalname,
      storedFilename,
      storageId: storageResult.storageId,
      storageType: storageResult.storageType || 'gridfs',
      mimeType: mimetype,
      fileType,
      fileSize: size,
      status: 'uploaded'
    });

    // 3. Initiate processing & review pipeline
    let reviewResult = null;
    let processingError = null;

    try {
      const { resume: updatedResume, review } = await reviewService.processAndReviewResume({
        resumeId: newResume._id,
        userId: req.user.id,
        fileBuffer: buffer
      });
      reviewResult = review;
      Object.assign(newResume, updatedResume.toObject());
    } catch (parseErr) {
      // If AI service is not running or parsing fails, we record the error on the resume
      console.warn(`[Resume Processing Note] Immediate review could not complete: ${parseErr.message}`);
      processingError = parseErr.message;
    }

    return successResponse(
      res,
      {
        resume: {
          id: newResume._id,
          documentId: newResume.documentId,
          originalFilename: newResume.originalFilename,
          mimeType: newResume.mimeType,
          fileType: newResume.fileType,
          fileSize: newResume.fileSize,
          status: newResume.status,
          pageCount: newResume.pageCount,
          errorMessage: newResume.errorMessage || processingError,
          createdAt: newResume.createdAt
        },
        review: reviewResult
      },
      'Resume uploaded and registered successfully',
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get student's current resumes
 * GET /api/resumes
 */
const getResumes = async (req, res, next) => {
  try {
    const resumes = await Resume.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .select('-storagePath');

    return successResponse(res, { resumes });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single resume by ID with its latest review
 * GET /api/resumes/:id
 */
const getResumeById = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!resume) {
      return errorResponse(res, 'Resume not found or unauthorized', 'RESUME_NOT_FOUND', 404);
    }

    const latestReview = await ResumeReview.findOne({
      resumeId: resume._id,
      userId: req.user.id
    }).sort({ createdAt: -1 });

    return successResponse(res, {
      resume,
      latestReview
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get latest review for a resume
 * GET /api/resumes/:id/review
 */
const getResumeReview = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!resume) {
      return errorResponse(res, 'Resume not found', 'RESUME_NOT_FOUND', 404);
    }

    const review = await ResumeReview.findOne({
      resumeId: resume._id,
      userId: req.user.id
    }).sort({ createdAt: -1 });

    if (!review) {
      return errorResponse(res, 'No review generated for this resume yet.', 'REVIEW_NOT_FOUND', 404);
    }

    return successResponse(res, { review, resumeStatus: resume.status });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all historical reviews for a resume
 * GET /api/resumes/:id/reviews
 */
const getResumeReviewsHistory = async (req, res, next) => {
  try {
    const reviews = await ResumeReview.find({
      resumeId: req.params.id,
      userId: req.user.id
    }).sort({ createdAt: -1 });

    return successResponse(res, { reviews });
  } catch (error) {
    next(error);
  }
};

/**
 * Trigger re-analysis / re-review of an existing resume
 * POST /api/resumes/:id/re-review
 */
const reReviewResume = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!resume) {
      return errorResponse(res, 'Resume not found', 'RESUME_NOT_FOUND', 404);
    }

    const { resume: updatedResume, review } = await reviewService.processAndReviewResume({
      resumeId: resume._id,
      userId: req.user.id
    });

    return successResponse(
      res,
      { resume: updatedResume, review },
      'Resume re-analyzed successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Delete resume document, its stored file, and associated reviews
 * DELETE /api/resumes/:id
 */
const deleteResume = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!resume) {
      return errorResponse(res, 'Resume not found or unauthorized', 'RESUME_NOT_FOUND', 404);
    }

    // 1. Delete stored file in GridFS or local storage
    if (resume.storageId) {
      try {
        const storage = getStorageProvider();
        await storage.deleteFile(resume.storageId, req.user.id);
      } catch (storageErr) {
        console.warn(`[Storage Cleanup] Could not delete storageId: ${resume.storageId}`, storageErr.message);
      }
    }

    // 2. Delete file if stored in local filesystem
    if (resume.storagePath && fs.existsSync(resume.storagePath)) {
      try {
        fs.unlinkSync(resume.storagePath);
      } catch (fileErr) {
        console.warn(`[File Cleanup] Could not delete file: ${resume.storagePath}`, fileErr.message);
      }
    }

    // 3. Delete ResumeReview documents associated with this resume
    await ResumeReview.deleteMany({
      resumeId: resume._id,
      userId: req.user.id
    });

    // 4. Delete the Resume document itself
    await Resume.findByIdAndDelete(resume._id);

    // 5. Trigger readiness recalculation to ensure fresh scores
    try {
      const readinessService = require('../services/readiness/readinessService');
      await readinessService.recalculate(req.user.id);
    } catch (readinessErr) {
      console.warn('[Resume Deletion] Readiness recalculation note:', readinessErr.message);
    }

    return successResponse(res, { deleted: true }, 'Resume and associated review data deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadResume,
  getResumes,
  getResumeById,
  getResumeReview,
  getResumeReviewsHistory,
  reReviewResume,
  deleteResume
};
