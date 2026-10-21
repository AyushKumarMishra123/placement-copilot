const mongoose = require('mongoose');
const Application = require('../models/Application');
const Job = require('../models/Job');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const VALID_STATUSES = ['Saved', 'Applied', 'Shortlisted', 'Interview', 'Offer', 'Rejected'];

/**
 * Save job or track application
 * POST /api/applications
 */
const createApplication = async (req, res, next) => {
  try {
    const { jobId, status = 'Saved', notes = '', followUpDate = null, jobData = null } = req.body;

    if (!jobId) {
      return errorResponse(res, 'Job ID is required', 'MISSING_FIELD', 400);
    }

    if (!VALID_STATUSES.includes(status)) {
      return errorResponse(res, `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`, 'INVALID_STATUS', 400);
    }

    let job = null;
    if (mongoose.Types.ObjectId.isValid(jobId)) {
      job = await Job.findById(jobId);
    }
    if (!job) {
      job = await Job.findOne({ externalId: jobId });
    }

    // If saving an external SerpApi job that is not yet in MongoDB
    if (!job && jobData) {
      job = await Job.create({
        title: (jobData.title || 'Untitled Position').trim(),
        company: (jobData.company || 'Unknown Company').trim(),
        location: (jobData.location || 'Remote').trim(),
        description: jobData.description || 'Job listing from Google Jobs.',
        applyUrl: jobData.applyUrl || jobData.shareLink || 'https://google.com',
        workplaceType: jobData.workplaceType || 'remote',
        employmentType: jobData.employmentType || 'full-time',
        sourceType: 'serpapi',
        sourceName: jobData.via ? `Google Jobs (${jobData.via})` : 'Google Jobs (SerpApi)',
        externalId: jobData.externalId || jobId,
        thumbnail: jobData.thumbnail || '',
        via: jobData.via || '',
        shareLink: jobData.shareLink || '',
        applyOptions: jobData.applyOptions || [],
        requiredSkills: jobData.requiredSkills || []
      });
    }

    if (!job) {
      return errorResponse(res, 'Target job listing not found', 'JOB_NOT_FOUND', 404);
    }

    // Check if application already exists for this user and job
    let application = await Application.findOne({ userId: req.user.id, jobId: job._id });

    const now = new Date();
    if (application) {
      // If student previously saved it and now confirms application:
      if (application.status !== status) {
        application.status = status;
        if (status === 'Applied' && !application.appliedAt) {
          application.appliedAt = now;
        }
        application.statusHistory.push({
          status,
          changedAt: now,
          changedBy: req.user.id,
          note: notes || `Status updated to ${status}`
        });
      }
      if (notes) application.notes = notes;
      if (followUpDate) application.followUpDate = new Date(followUpDate);
      await application.save();

      return successResponse(res, { application }, 'Application tracker entry updated');
    }

    // Create new application tracker record
    const statusHistory = [
      {
        status,
        changedAt: now,
        changedBy: req.user.id,
        note: notes || `Initial status recorded as ${status}`
      }
    ];

    application = await Application.create({
      userId: req.user.id,
      jobId: job._id,
      jobSnapshot: {
        title: job.title,
        company: job.company,
        location: job.location,
        applyUrl: job.applyUrl,
        workplaceType: job.workplaceType,
        employmentType: job.employmentType
      },
      status,
      savedAt: now,
      appliedAt: status === 'Applied' ? now : null,
      followUpDate: followUpDate ? new Date(followUpDate) : null,
      notes,
      statusHistory
    });

    return successResponse(res, { application }, 'Job saved to application tracker', 201);
  } catch (err) {
    next(err);
  }
};

/**
 * Get all tracked applications for authenticated user
 * GET /api/applications
 */
const getApplications = async (req, res, next) => {
  try {
    const { status } = req.query;
    const query = { userId: req.user.id };

    if (status && VALID_STATUSES.includes(status)) {
      query.status = status;
    }

    const applications = await Application.find(query)
      .populate('jobId', 'title company location applyUrl isActive workplaceType')
      .sort({ updatedAt: -1 });

    // Compute status counts summary
    const allApps = await Application.find({ userId: req.user.id });
    const counts = {
      all: allApps.length,
      Saved: 0,
      Applied: 0,
      Shortlisted: 0,
      Interview: 0,
      Offer: 0,
      Rejected: 0
    };
    for (const app of allApps) {
      if (counts[app.status] !== undefined) {
        counts[app.status] += 1;
      }
    }

    return successResponse(res, { applications, counts });
  } catch (err) {
    next(err);
  }
};

/**
 * Get single application by ID
 * GET /api/applications/:applicationId
 */
const getApplicationById = async (req, res, next) => {
  try {
    const application = await Application.findOne({
      _id: req.params.applicationId,
      userId: req.user.id
    }).populate('jobId');

    if (!application) {
      return errorResponse(res, 'Application record not found or unauthorized', 'APPLICATION_NOT_FOUND', 404);
    }

    return successResponse(res, { application });
  } catch (err) {
    next(err);
  }
};

/**
 * Update application status, follow-up date, or notes
 * PATCH /api/applications/:applicationId
 */
const updateApplication = async (req, res, next) => {
  try {
    const { status, notes, followUpDate, statusNote } = req.body;

    const application = await Application.findOne({
      _id: req.params.applicationId,
      userId: req.user.id
    });

    if (!application) {
      return errorResponse(res, 'Application record not found or unauthorized', 'APPLICATION_NOT_FOUND', 404);
    }

    const now = new Date();

    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return errorResponse(res, `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`, 'INVALID_STATUS', 400);
      }

      if (application.status !== status) {
        application.status = status;
        if (status === 'Applied' && !application.appliedAt) {
          application.appliedAt = now;
        }
        application.statusHistory.push({
          status,
          changedAt: now,
          changedBy: req.user.id,
          note: statusNote || `Status changed to ${status}`
        });
      }
    }

    if (typeof notes === 'string') {
      application.notes = notes;
    }

    if (followUpDate !== undefined) {
      application.followUpDate = followUpDate ? new Date(followUpDate) : null;
    }

    await application.save();
    return successResponse(res, { application }, 'Application updated successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * Delete application record from tracker
 * DELETE /api/applications/:applicationId
 */
const deleteApplication = async (req, res, next) => {
  try {
    const application = await Application.findOneAndDelete({
      _id: req.params.applicationId,
      userId: req.user.id
    });

    if (!application) {
      return errorResponse(res, 'Application record not found or unauthorized', 'APPLICATION_NOT_FOUND', 404);
    }

    return successResponse(res, {}, 'Application record removed from tracker');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createApplication,
  getApplications,
  getApplicationById,
  updateApplication,
  deleteApplication
};
