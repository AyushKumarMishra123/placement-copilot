const Job = require('../models/Job');
const Application = require('../models/Application');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * Create a new admin job posting
 * POST /api/admin/jobs
 */
const createAdminJob = async (req, res, next) => {
  try {
    const {
      title,
      company,
      description,
      location = 'Remote',
      workplaceType = 'remote',
      employmentType = 'full-time',
      experienceLevel = 'entry',
      requiredSkills = [],
      preferredSkills = [],
      minimumQualifications = [],
      salary = '',
      currency = 'INR',
      applyUrl,
      closingDate
    } = req.body;

    if (!title || !company || !description || !applyUrl) {
      return errorResponse(res, 'Title, company, description, and application URL are required', 'MISSING_FIELDS', 400);
    }

    const job = await Job.create({
      title: title.trim(),
      company: company.trim(),
      description: description.trim(),
      location: location.trim(),
      workplaceType,
      employmentType,
      experienceLevel,
      requiredSkills: Array.isArray(requiredSkills) ? requiredSkills : requiredSkills.split(',').map((s) => s.trim()).filter(Boolean),
      preferredSkills: Array.isArray(preferredSkills) ? preferredSkills : preferredSkills.split(',').map((s) => s.trim()).filter(Boolean),
      minimumQualifications: Array.isArray(minimumQualifications) ? minimumQualifications : minimumQualifications.split('\n').map((s) => s.trim()).filter(Boolean),
      salary,
      currency,
      applyUrl: applyUrl.trim(),
      closingDate: closingDate ? new Date(closingDate) : null,
      sourceType: 'admin',
      sourceName: 'MSOT Admin Portal',
      isActive: true,
      postedBy: req.user.id
    });

    return successResponse(res, { job }, 'Job created and published successfully', 201);
  } catch (err) {
    next(err);
  }
};

/**
 * List all jobs created by admin
 * GET /api/admin/jobs
 */
const getAdminJobs = async (req, res, next) => {
  try {
    const jobs = await Job.find({ sourceType: 'admin' }).sort({ createdAt: -1 });

    // Fetch applicant counts for each job
    const jobIds = jobs.map((j) => j._id);
    const applications = await Application.find({ jobId: { $in: jobIds } });

    const countMap = new Map();
    for (const app of applications) {
      const jid = app.jobId.toString();
      countMap.set(jid, (countMap.get(jid) || 0) + 1);
    }

    const results = jobs.map((j) => ({
      ...j.toJSON(),
      applicantCount: countMap.get(j._id.toString()) || 0
    }));

    return successResponse(res, { jobs: results });
  } catch (err) {
    next(err);
  }
};

/**
 * Get single admin job by ID
 * GET /api/admin/jobs/:jobId
 */
const getAdminJobById = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) {
      return errorResponse(res, 'Job not found', 'JOB_NOT_FOUND', 404);
    }

    const applicantCount = await Application.countDocuments({ jobId: job._id });

    return successResponse(res, {
      job: {
        ...job.toJSON(),
        applicantCount
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update an existing job
 * PUT /api/admin/jobs/:jobId
 */
const updateAdminJob = async (req, res, next) => {
  try {
    const {
      title,
      company,
      description,
      location,
      workplaceType,
      employmentType,
      experienceLevel,
      requiredSkills,
      preferredSkills,
      salary,
      applyUrl,
      closingDate,
      isActive
    } = req.body;

    const job = await Job.findById(req.params.jobId);
    if (!job) {
      return errorResponse(res, 'Job not found', 'JOB_NOT_FOUND', 404);
    }

    if (title) job.title = title.trim();
    if (company) job.company = company.trim();
    if (description) job.description = description.trim();
    if (location !== undefined) job.location = location.trim();
    if (workplaceType) job.workplaceType = workplaceType;
    if (employmentType) job.employmentType = employmentType;
    if (experienceLevel) job.experienceLevel = experienceLevel;
    if (requiredSkills !== undefined) {
      job.requiredSkills = Array.isArray(requiredSkills) ? requiredSkills : requiredSkills.split(',').map((s) => s.trim()).filter(Boolean);
    }
    if (preferredSkills !== undefined) {
      job.preferredSkills = Array.isArray(preferredSkills) ? preferredSkills : preferredSkills.split(',').map((s) => s.trim()).filter(Boolean);
    }
    if (salary !== undefined) job.salary = salary;
    if (applyUrl) job.applyUrl = applyUrl.trim();
    if (closingDate !== undefined) job.closingDate = closingDate ? new Date(closingDate) : null;
    if (isActive !== undefined) job.isActive = Boolean(isActive);

    job.lastVerifiedAt = new Date();
    await job.save();

    return successResponse(res, { job }, 'Job updated successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * Toggle job active/published status
 * PATCH /api/admin/jobs/:jobId/publish
 */
const togglePublishJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) {
      return errorResponse(res, 'Job not found', 'JOB_NOT_FOUND', 404);
    }

    job.isActive = !job.isActive;
    job.lastVerifiedAt = new Date();
    await job.save();

    return successResponse(
      res,
      { job },
      `Job ${job.isActive ? 'published' : 'unpublished'} successfully`
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Delete admin job
 * DELETE /api/admin/jobs/:jobId
 */
const deleteAdminJob = async (req, res, next) => {
  try {
    const job = await Job.findByIdAndDelete(req.params.jobId);
    if (!job) {
      return errorResponse(res, 'Job not found', 'JOB_NOT_FOUND', 404);
    }

    return successResponse(res, {}, 'Job removed successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * View applicants for an admin job
 * GET /api/admin/jobs/:jobId/applicants
 */
const getJobApplicants = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) {
      return errorResponse(res, 'Job not found', 'JOB_NOT_FOUND', 404);
    }

    const applications = await Application.find({ jobId: job._id })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    const applicants = applications.map((app) => ({
      applicationId: app._id,
      studentName: app.userId?.name || 'Anonymous Student',
      studentEmail: app.userId?.email || 'N/A',
      status: app.status,
      appliedAt: app.appliedAt || app.createdAt,
      followUpDate: app.followUpDate,
      notes: app.notes,
      statusHistory: app.statusHistory
    }));

    return successResponse(res, { job, applicants });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin updates applicant status for an administered job
 * PATCH /api/admin/jobs/:jobId/applicants/:applicationId/status
 */
const updateApplicantStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;
    const validStatuses = ['Saved', 'Applied', 'Shortlisted', 'Interview', 'Offer', 'Rejected'];

    if (!validStatuses.includes(status)) {
      return errorResponse(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`, 'INVALID_STATUS', 400);
    }

    const application = await Application.findOne({
      _id: req.params.applicationId,
      jobId: req.params.jobId
    });

    if (!application) {
      return errorResponse(res, 'Applicant record not found for this job', 'APPLICANT_NOT_FOUND', 404);
    }

    const now = new Date();
    application.status = status;
    application.statusHistory.push({
      status,
      changedAt: now,
      changedBy: req.user.id,
      note: note || `Status updated to ${status} by administrator`
    });

    await application.save();

    return successResponse(res, { application }, 'Applicant status updated successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createAdminJob,
  getAdminJobs,
  getAdminJobById,
  updateAdminJob,
  togglePublishJob,
  deleteAdminJob,
  getJobApplicants,
  updateApplicantStatus
};
