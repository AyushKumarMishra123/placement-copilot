const User = require('../models/User');
const Profile = require('../models/Profile');
const Resume = require('../models/Resume');
const ResumeReview = require('../models/ResumeReview');
const GitHubReview = require('../models/GitHubReview');
const ProjectAnalysis = require('../models/ProjectAnalysis');
const ReadinessAssessment = require('../models/ReadinessAssessment');
const InterviewSession = require('../models/InterviewSession');
const Application = require('../models/Application');
const { getStorageProvider } = require('../services/storage');
const fs = require('fs');
const { profileSchema } = require('../validators/profileValidator');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * Retrieve authenticated student's profile
 * GET /api/profile
 */
const getProfile = async (req, res, next) => {
  try {
    const profile = await Profile.findOne({ userId: req.user.id });

    if (!profile) {
      // Return a blank structured profile if the student hasn't populated it yet
      return successResponse(res, {
        profile: {
          userId: req.user.id,
          targetRole: '',
          location: '',
          skills: [],
          education: '',
          github: '',
          linkedin: '',
          leetcode: '',
          achievements: [],
          projects: []
        },
        isNew: true
      });
    }

    return successResponse(res, { profile, isNew: false });
  } catch (error) {
    next(error);
  }
};

/**
 * Update or create authenticated student's profile
 * PUT /api/profile
 */
const updateProfile = async (req, res, next) => {
  try {
    const parseResult = profileSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorDetails = parseResult.error.errors.map((e) => e.message);
      return errorResponse(
        res,
        errorDetails[0] || 'Profile validation failed',
        'VALIDATION_FAILED',
        400,
        errorDetails
      );
    }

    const updateData = parseResult.data;

    // Upsert user profile (1:1 per user identity)
    const profile = await Profile.findOneAndUpdate(
      { userId: req.user.id },
      {
        $set: {
          ...updateData,
          userId: req.user.id
        }
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true
      }
    );

    return successResponse(res, { profile }, 'Profile updated successfully', 200);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete authenticated student's profile and all associated data
 * DELETE /api/profile
 */
const deleteProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // 1. Remove profile document
    await Profile.findOneAndDelete({ userId });

    // 2. Cascade delete associated resumes and storage files
    const resumes = await Resume.find({ userId });
    try {
      const storage = getStorageProvider();
      for (const resume of resumes) {
        if (resume.storageId) {
          try {
            await storage.deleteFile(resume.storageId, userId);
          } catch (storageErr) {
            console.warn(`[Storage Cleanup] Could not delete storageId: ${resume.storageId}`, storageErr.message);
          }
        }
        if (resume.storagePath && fs.existsSync(resume.storagePath)) {
          try {
            fs.unlinkSync(resume.storagePath);
          } catch (fileErr) {
            console.warn(`[File Cleanup] Could not delete file: ${resume.storagePath}`, fileErr.message);
          }
        }
      }
    } catch (err) {
      console.warn('[Resume Storage Cleanup Error]', err.message);
    }
    await Resume.deleteMany({ userId });

    // 3. Cascade delete Resume Reviews
    await ResumeReview.deleteMany({ userId });

    // 4. Cascade delete Project Analyses and their stored screenshots
    try {
      const storage = getStorageProvider();
      const analyses = await ProjectAnalysis.find({ userId });
      for (const analysis of analyses) {
        if (analysis.liveCheck?.screenshotDesktopStorageId) {
          try {
            await storage.deleteFile(analysis.liveCheck.screenshotDesktopStorageId, userId);
          } catch (e) {
            console.warn('[Screenshot Cleanup] Desktop screenshot delete failed:', e.message);
          }
        }
        if (analysis.liveCheck?.screenshotMobileStorageId) {
          try {
            await storage.deleteFile(analysis.liveCheck.screenshotMobileStorageId, userId);
          } catch (e) {
            console.warn('[Screenshot Cleanup] Mobile screenshot delete failed:', e.message);
          }
        }
      }
    } catch (storageErr) {
      console.warn('[Storage Cleanup Error]', storageErr.message);
    }
    await ProjectAnalysis.deleteMany({ userId });

    // 5. Cascade delete GitHub Reviews
    await GitHubReview.deleteMany({ userId });

    // 6. Cascade delete Readiness Assessments
    await ReadinessAssessment.deleteMany({ userId });

    // 7. Cascade delete Mock Interview Sessions
    await InterviewSession.deleteMany({ userId });

    // 8. Cascade delete student's personal Application Tracker records (shared Job postings are retained)
    await Application.deleteMany({ userId });

    return successResponse(
      res,
      { deleted: true },
      'Profile and all associated candidate records deleted successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Export all stored candidate personal data (Data Access / GDPR compliance)
 * GET /api/profile/export
 */
const exportProfileData = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('-passwordHash');
    const profile = await Profile.findOne({ userId });
    const resumes = await Resume.find({ userId }).select('-storagePath');
    const resumeReviews = await ResumeReview.find({ userId });
    const projectAnalyses = await ProjectAnalysis.find({ userId });
    const githubReviews = await GitHubReview.find({ userId });
    const readinessHistory = await ReadinessAssessment.find({ userId }).sort({ createdAt: -1 });
    const interviewSessions = await InterviewSession.find({ userId });
    const applications = await Application.find({ userId });

    const exportPayload = {
      exportMetadata: {
        exportedAt: new Date(),
        userId,
        platform: 'Placement Readiness Copilot',
        version: '1.0.0'
      },
      account: user,
      profile: profile || null,
      resumes: resumes || [],
      resumeReviews: resumeReviews || [],
      projectAnalyses: projectAnalyses || [],
      githubReviews: githubReviews || [],
      readinessAssessments: readinessHistory || [],
      mockInterviews: interviewSessions || [],
      trackedApplications: applications || []
    };

    return successResponse(res, exportPayload, 'Candidate personal data exported successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Permanently delete entire candidate user account and all associated personal data
 * DELETE /api/profile/account
 */
const deleteAccount = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // 1. Remove profile document
    await Profile.findOneAndDelete({ userId });

    // 2. Cascade delete resumes and storage files
    const resumes = await Resume.find({ userId });
    try {
      const storage = getStorageProvider();
      for (const resume of resumes) {
        if (resume.storageId) {
          try {
            await storage.deleteFile(resume.storageId, userId);
          } catch (_) {}
        }
        if (resume.storagePath && fs.existsSync(resume.storagePath)) {
          try {
            fs.unlinkSync(resume.storagePath);
          } catch (_) {}
        }
      }
    } catch (_) {}
    await Resume.deleteMany({ userId });

    // 3. Cascade delete Resume Reviews
    await ResumeReview.deleteMany({ userId });

    // 4. Cascade delete Project Analyses and their stored screenshots
    try {
      const storage = getStorageProvider();
      const analyses = await ProjectAnalysis.find({ userId });
      for (const analysis of analyses) {
        if (analysis.liveCheck?.desktopScreenshotId) {
          try {
            await storage.deleteFile(analysis.liveCheck.desktopScreenshotId, userId);
          } catch (_) {}
        }
        if (analysis.liveCheck?.mobileScreenshotId) {
          try {
            await storage.deleteFile(analysis.liveCheck.mobileScreenshotId, userId);
          } catch (_) {}
        }
      }
    } catch (_) {}
    await ProjectAnalysis.deleteMany({ userId });

    // 5. Cascade delete GitHub Reviews
    await GitHubReview.deleteMany({ userId });

    // 6. Cascade delete Readiness Assessments
    await ReadinessAssessment.deleteMany({ userId });

    // 7. Cascade delete Mock Interview Sessions
    await InterviewSession.deleteMany({ userId });

    // 8. Cascade delete student's personal Application Tracker records (shared Job postings are retained)
    await Application.deleteMany({ userId });

    // 9. Permanently delete the User identity record itself
    await User.findByIdAndDelete(userId);

    return successResponse(
      res,
      { accountDeleted: true },
      'User account and all personal candidate records permanently deleted.'
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  deleteProfile,
  exportProfileData,
  deleteAccount
};
