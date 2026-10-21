const mongoose = require('mongoose');
const Job = require('../models/Job');
const Profile = require('../models/Profile');
const Application = require('../models/Application');
const jobMatchingService = require('../services/jobs/jobMatchingService');
const jobSourceService = require('../services/jobs/jobSourceService');
const serpApiService = require('../services/jobs/serpApiService');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * Search and browse active jobs with personalized match scores
 * GET /api/jobs
 */
const getJobs = async (req, res, next) => {
  try {
    const {
      search,
      role,
      location,
      workplaceType,
      employmentType,
      sourceType,
      sort = 'match',
      page = 1,
      limit = 12
    } = req.query;

    const query = { isActive: true };

    if (search) {
      query.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { company: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    if (location) {
      query.location = { $regex: location.trim(), $options: 'i' };
    }

    if (workplaceType && ['remote', 'hybrid', 'on-site'].includes(workplaceType)) {
      query.workplaceType = workplaceType;
    }

    if (employmentType && ['full-time', 'internship', 'part-time', 'contract'].includes(employmentType)) {
      query.employmentType = employmentType;
    }

    if (sourceType && ['admin', 'greenhouse', 'lever', 'external_feed'].includes(sourceType)) {
      query.sourceType = sourceType;
    }

    // Fetch user profile for deterministic matching
    const profile = await Profile.findOne({ userId: req.user.id });

    // Fetch raw jobs
    const rawJobs = await Job.find(query).sort({ publishedAt: -1 }).limit(100);

    // Compute match score for each job
    let evaluatedJobs = rawJobs.map((job) => {
      const match = jobMatchingService.calculateMatch(profile || {}, job);
      return {
        ...job.toJSON(),
        match,
        matchScore: match.matchScore,
        matchedSkills: match.matchedSkills,
        missingSkills: match.missingSkills,
        matchingReasons: match.matchingReasons,
        qualificationWarnings: match.qualificationWarnings
      };
    });

    // Sort evaluated jobs
    if (sort === 'match') {
      evaluatedJobs.sort((a, b) => b.matchScore - a.matchScore);
    } else {
      evaluatedJobs.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    }

    // Apply pagination in memory
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedJobs = evaluatedJobs.slice(startIndex, startIndex + limitNum);

    // Attach saved/applied tracker status if any
    const jobIds = paginatedJobs.map((j) => j._id);
    const existingApps = await Application.find({
      userId: req.user.id,
      jobId: { $in: jobIds }
    });
    const appMap = new Map(existingApps.map((a) => [a.jobId.toString(), a.status]));

    const results = paginatedJobs.map((j) => ({
      ...j,
      applicationStatus: appMap.get(j._id.toString()) || null
    }));

    return successResponse(res, {
      jobs: results,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: evaluatedJobs.length,
        pages: Math.ceil(evaluatedJobs.length / limitNum)
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Helper to normalize external URLs for robust cross-source deduplication and exclusion
 */
const normalizeJobUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  try {
    const u = new URL(url.trim());
    return (u.origin + u.pathname).toLowerCase().replace(/\/+$/, '');
  } catch (_) {
    return url.trim().toLowerCase().replace(/\/+$/, '');
  }
};

const normalizeCompanyTitleKey = (company, title) =>
  `${(company || '').trim().toLowerCase()}::${(title || '').trim().toLowerCase()}`;

/**
 * Get recommended jobs for authenticated user matching their actual skills and target role,
 * strictly excluding jobs that the student has already applied to or progressed in tracking.
 * GET /api/jobs/recommended
 */
const getRecommendedJobs = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const profile = await Profile.findOne({ userId });

    // Validate that student profile has sufficient information for personalized recommendations
    const hasSkills = Array.isArray(profile?.skills) && profile.skills.length > 0;
    const hasTargetRole = Boolean(profile?.targetRole && profile.targetRole.trim());
    if (!profile || (!hasSkills && !hasTargetRole)) {
      return successResponse(
        res,
        {
          jobs: [],
          profileIncomplete: true,
          message: 'Please complete your target role and technical skills in your profile to view personalized job recommendations.'
        },
        'Profile requires skills or target role'
      );
    }

    // Retrieve the authenticated student's application history to exclude applied/terminal jobs
    const studentApps = await Application.find({ userId });

    // Statuses that represent completed or active applications that must NOT be recommended again
    const EXCLUDED_STATUSES = new Set(['Applied', 'Shortlisted', 'Interview', 'Offer', 'Rejected']);

    const appliedJobIdStrings = new Set();
    const appliedExternalIds = new Set();
    const appliedUrls = new Set();
    const appliedCompanyTitles = new Set();

    const savedJobIdStrings = new Set();
    const savedExternalIds = new Set();
    const savedCompanyTitles = new Set();

    for (const app of studentApps) {
      const isExcludedStatus = EXCLUDED_STATUSES.has(app.status);

      if (isExcludedStatus) {
        if (app.jobId) appliedJobIdStrings.add(app.jobId.toString());
        if (app.jobSnapshot?.applyUrl) {
          appliedUrls.add(normalizeJobUrl(app.jobSnapshot.applyUrl));
        }
        if (app.jobSnapshot?.company && app.jobSnapshot?.title) {
          appliedCompanyTitles.add(normalizeCompanyTitleKey(app.jobSnapshot.company, app.jobSnapshot.title));
        }
      } else if (app.status === 'Saved') {
        if (app.jobId) savedJobIdStrings.add(app.jobId.toString());
        if (app.jobSnapshot?.company && app.jobSnapshot?.title) {
          savedCompanyTitles.add(normalizeCompanyTitleKey(app.jobSnapshot.company, app.jobSnapshot.title));
        }
      }
    }

    // Resolve external IDs and canonical URLs of applied jobs
    if (appliedJobIdStrings.size > 0) {
      const appliedJobDocs = await Job.find({
        _id: { $in: Array.from(appliedJobIdStrings) }
      });
      for (const aj of appliedJobDocs) {
        if (aj.externalId) appliedExternalIds.add(aj.externalId);
        if (aj.applyUrl) appliedUrls.add(normalizeJobUrl(aj.applyUrl));
        appliedCompanyTitles.add(normalizeCompanyTitleKey(aj.company, aj.title));
      }
    }

    // Resolve external IDs of saved jobs
    if (savedJobIdStrings.size > 0) {
      const savedJobDocs = await Job.find({
        _id: { $in: Array.from(savedJobIdStrings) }
      });
      for (const sj of savedJobDocs) {
        if (sj.externalId) savedExternalIds.add(sj.externalId);
      }
    }

    // Collect candidate jobs from the existing Jobs Portal sources:
    // 1. Persistent active jobs catalog in MongoDB (Admin campus drives, Greenhouse/Lever, external postings)
    const dbJobs = await Job.find({ isActive: true }).sort({ publishedAt: -1 }).limit(100);

    // 2. Real-time external job listings from SerpApi Google Jobs (if configured)
    let serpApiJobs = [];
    if (serpApiService.isConfigured()) {
      try {
        const searchQuery = profile.targetRole
          ? profile.targetRole
          : (profile.skills?.[0] ? `${profile.skills[0]} developer` : 'software engineer');
        const searchLoc = profile.location || process.env.JOBS_DEFAULT_LOCATION || 'Bengaluru, Karnataka, India';

        const serpResult = await serpApiService.searchJobs({
          q: searchQuery,
          location: searchLoc
        });
        if (Array.isArray(serpResult?.jobs)) {
          serpApiJobs = serpResult.jobs;
        }
      } catch (serpErr) {
        // Silently fall back to active database jobs; never fabricate fake jobs
        console.warn('[Recommended Jobs - SerpApi Note]', serpErr.message);
      }
    }

    // Merge and deduplicate candidates, strictly filtering out applied/terminal jobs
    const candidatePool = [];
    const seenCandidateKeys = new Set();

    // Helper to evaluate and filter a job
    const processCandidate = (job) => {
      // 1. Inactive check
      if (job.isActive === false) return;

      const jobIdStr = job._id ? job._id.toString() : '';
      const externalId = job.externalId || '';
      const normUrl = normalizeJobUrl(job.applyUrl || job.shareLink);
      const companyTitleKey = normalizeCompanyTitleKey(job.company, job.title);

      // 2. Exclusion: Did THIS student already apply, get shortlisted, interview, get offered, or rejected?
      if (jobIdStr && appliedJobIdStrings.has(jobIdStr)) return;
      if (externalId && appliedExternalIds.has(externalId)) return;
      if (normUrl && appliedUrls.has(normUrl)) return;
      if (companyTitleKey && appliedCompanyTitles.has(companyTitleKey)) return;

      // 3. Robust deduplication across candidate listings
      if (externalId && seenCandidateKeys.has(`ext:${externalId}`)) return;
      if (normUrl && normUrl.length > 10 && seenCandidateKeys.has(`url:${normUrl}`)) return;
      if (companyTitleKey && seenCandidateKeys.has(`ct:${companyTitleKey}`)) return;

      if (externalId) seenCandidateKeys.add(`ext:${externalId}`);
      if (normUrl && normUrl.length > 10) seenCandidateKeys.add(`url:${normUrl}`);
      if (companyTitleKey) seenCandidateKeys.add(`ct:${companyTitleKey}`);

      // 4. Calculate deterministic match score using student profile
      const match = jobMatchingService.calculateMatch(profile || {}, job);

      // Check if job is currently saved by the student
      const isSaved =
        (jobIdStr && savedJobIdStrings.has(jobIdStr)) ||
        (externalId && savedExternalIds.has(externalId)) ||
        savedCompanyTitles.has(companyTitleKey);

      candidatePool.push({
        jobId: jobIdStr || externalId,
        _id: jobIdStr || externalId,
        externalId,
        title: job.title,
        company: job.company,
        location: job.location || 'Remote',
        workplaceType: job.workplaceType || 'remote',
        employmentType: job.employmentType || 'full-time',
        experienceLevel: job.experienceLevel || 'entry',
        thumbnail: job.thumbnail || '',
        via: job.via || '',
        sourceType: job.sourceType || 'external_feed',
        sourceName: job.sourceName || (job.sourceType === 'admin' ? 'Campus Drive' : 'Google Jobs'),
        applyUrl: job.applyUrl || job.shareLink || '',
        applicationUrl: job.applyUrl || job.shareLink || '',
        matchScore: match.matchScore,
        matchedSkills: match.matchedSkills,
        missingSkills: match.missingSkills,
        matchingReasons: match.matchingReasons,
        qualificationWarnings: match.qualificationWarnings,
        match,
        isSaved: Boolean(isSaved),
        publishedAt: job.publishedAt || new Date()
      });
    };

    // Process DB jobs
    for (const dj of dbJobs) {
      processCandidate(dj.toJSON ? dj.toJSON() : dj);
    }

    // Process SerpApi jobs
    for (const sj of serpApiJobs) {
      processCandidate(sj);
    }

    // Sort strictly by matchScore descending, then by publication recency
    candidatePool.sort((a, b) => {
      if (b.matchScore !== a.matchScore) {
        return b.matchScore - a.matchScore;
      }
      return new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0);
    });

    const topRecommendations = candidatePool.slice(0, 6);

    return successResponse(res, {
      jobs: topRecommendations,
      profileIncomplete: false,
      totalAvailable: candidatePool.length
    }, 'Recommended opportunities retrieved successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * Get single job details with match breakdown
 * GET /api/jobs/:jobId
 */
const getJobById = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    let job = null;
    if (mongoose.Types.ObjectId.isValid(jobId)) {
      job = await Job.findById(jobId);
    }
    if (!job) {
      job = await Job.findOne({ externalId: jobId });
    }

    if (!job) {
      return errorResponse(res, 'Job listing not found', 'JOB_NOT_FOUND', 404);
    }

    const profile = await Profile.findOne({ userId: req.user.id });
    const match = jobMatchingService.calculateMatch(profile || {}, job);

    const application = await Application.findOne({
      userId: req.user.id,
      jobId: job._id
    });

    return successResponse(res, {
      job: {
        ...job.toJSON(),
        matchScore: match.matchScore,
        matchedSkills: match.matchedSkills,
        missingSkills: match.missingSkills,
        matchingReasons: match.matchingReasons,
        qualificationWarnings: match.qualificationWarnings,
        application: application ? application.toJSON() : null
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Search Google Jobs via SerpApi with personalized deterministic matching
 * GET /api/jobs/search
 */
const searchJobs = async (req, res, next) => {
  try {
    const {
      q,
      location,
      employmentType,
      workMode,
      nextPageToken
    } = req.query;

    // Fetch user profile for deterministic matching
    const profile = await Profile.findOne({ userId: req.user.id });

    // Determine default query if not provided
    const query = q !== undefined && q !== '' ? q : (profile?.targetRole ? `${profile.targetRole} internship` : 'software engineer internship');
    const loc = location !== undefined && location !== '' ? location : (profile?.location || process.env.JOBS_DEFAULT_LOCATION || 'Bengaluru, Karnataka, India');

    const searchResult = await serpApiService.searchJobs({
      q: query,
      location: loc,
      employmentType,
      workMode,
      nextPageToken
    });

    // Cross-reference user's applications
    const externalIds = searchResult.jobs.map((j) => j.externalId).filter(Boolean);
    const existingJobs = await Job.find({ externalId: { $in: externalIds } });
    const jobMapByExternalId = new Map(existingJobs.map((j) => [j.externalId, j._id]));

    const existingJobIds = Array.from(jobMapByExternalId.values());
    const existingApps = await Application.find({
      userId: req.user.id,
      jobId: { $in: existingJobIds }
    });
    const appMap = new Map(existingApps.map((a) => [a.jobId.toString(), a.status]));

    // Match each job against student profile deterministically
    const evaluatedJobs = searchResult.jobs.map((job) => {
      const match = jobMatchingService.calculateMatch(profile || {}, job);
      const existingJobId = jobMapByExternalId.get(job.externalId);
      const applicationStatus = existingJobId ? (appMap.get(existingJobId.toString()) || null) : null;

      return {
        ...job,
        _id: existingJobId ? existingJobId.toString() : job.externalId,
        isPersisted: Boolean(existingJobId),
        match,
        matchScore: match.matchScore,
        matchedSkills: match.matchedSkills,
        missingSkills: match.missingSkills,
        matchingReasons: match.matchingReasons,
        qualificationWarnings: match.qualificationWarnings,
        applicationStatus
      };
    });

    return successResponse(res, {
      jobs: evaluatedJobs,
      nextPageToken: searchResult.nextPageToken,
      cached: searchResult.cached,
      totalFetched: searchResult.totalFetched,
      query,
      location: loc
    }, 'Live job search results retrieved');
  } catch (err) {
    if (err.code === 'SERPAPI_NOT_CONFIGURED') {
      return errorResponse(
        res,
        err.message,
        'SERPAPI_NOT_CONFIGURED',
        503
      );
    }
    if (err.code === 'INVALID_API_KEY') {
      return errorResponse(res, err.message, 'INVALID_API_KEY', 401);
    }
    if (err.code === 'RATE_LIMIT_EXCEEDED') {
      return errorResponse(res, err.message, 'RATE_LIMIT_EXCEEDED', 429);
    }
    if (err.code === 'PROVIDER_TIMEOUT') {
      return errorResponse(res, err.message, 'PROVIDER_TIMEOUT', 504);
    }
    if (err.code === 'PROVIDER_ERROR' || err.code === 'PROVIDER_NETWORK_ERROR') {
      return errorResponse(res, err.message, err.code, err.status || 502);
    }
    next(err);
  }
};

/**
 * Get source registry and statuses
 * GET /api/jobs/sources/status
 */
const getSourceStatus = async (req, res) => {
  const sources = jobSourceService.getSourceRegistry();
  return successResponse(res, { sources });
};

/**
 * Refresh external job boards
 * POST /api/jobs/refresh-sources
 */
const refreshSources = async (req, res, next) => {
  try {
    const results = await jobSourceService.refreshSources();
    return successResponse(res, results, 'Job sources refresh completed');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getJobs,
  searchJobs,
  getRecommendedJobs,
  getJobById,
  getSourceStatus,
  refreshSources
};
