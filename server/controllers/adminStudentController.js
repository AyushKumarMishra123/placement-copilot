const mongoose = require('mongoose');
const User = require('../models/User');
const Profile = require('../models/Profile');
const Resume = require('../models/Resume');
const ResumeReview = require('../models/ResumeReview');
const LinkedInReview = require('../models/LinkedInReview');
const GitHubReview = require('../models/GitHubReview');
const ProjectAnalysis = require('../models/ProjectAnalysis');
const InterviewSession = require('../models/InterviewSession');
const CodingSubmission = require('../models/CodingSubmission');
const ReadinessAssessment = require('../models/ReadinessAssessment');
const Job = require('../models/Job');
const Application = require('../models/Application');
const AuditLog = require('../models/AuditLog');

const readinessService = require('../services/readiness/readinessService');
const adminAuditService = require('../services/admin/adminAuditService');
const { getStorageProvider } = require('../services/storage');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * Computes profile completion score (0 to 100%)
 */
function calculateProfileCompletion(profile) {
  if (!profile) return 0;
  let score = 0;
  if (profile.targetRole && profile.targetRole.trim()) score += 20;
  if (Array.isArray(profile.skills) && profile.skills.length > 0) score += 20;
  if (profile.education && profile.education.trim()) score += 20;
  if ((profile.github && profile.github.trim()) || (profile.linkedin && profile.linkedin.trim())) score += 20;
  if (Array.isArray(profile.projects) && profile.projects.length > 0) score += 20;
  return score;
}

/**
 * Administrative Overview
 * GET /api/admin/overview
 */
const getAdminOverview = async (req, res, next) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'student' });

    // Fetch current readiness assessments
    const currentAssessments = await ReadinessAssessment.find({ isCurrent: true });
    const assessmentByUserId = new Map();
    currentAssessments.forEach((a) => {
      assessmentByUserId.set(a.userId.toString(), a);
    });

    let completedAssessmentsCount = 0;
    let provisionalScoresCount = 0;
    let finalScoresCount = 0;
    let totalAssessedScoreSum = 0;
    let assessedCount = 0;

    const readinessDistribution = {
      'Placement Ready': 0,
      'Provisional (Placement Ready)': 0,
      'Almost Ready': 0,
      'Not Ready': 0,
      'Unassessed': 0
    };

    currentAssessments.forEach((a) => {
      if (a.score !== null && typeof a.score === 'number') {
        totalAssessedScoreSum += a.score;
        assessedCount += 1;

        if (a.scoreStatus === 'final') {
          finalScoresCount += 1;
          completedAssessmentsCount += 1;
        } else if (a.scoreStatus === 'provisional') {
          provisionalScoresCount += 1;
        }

        if (a.readinessLevel.includes('Placement Ready')) {
          if (a.scoreStatus === 'provisional') {
            readinessDistribution['Provisional (Placement Ready)'] += 1;
          } else {
            readinessDistribution['Placement Ready'] += 1;
          }
        } else if (a.readinessLevel.includes('Almost Ready')) {
          readinessDistribution['Almost Ready'] += 1;
        } else if (a.readinessLevel.includes('Not Ready')) {
          readinessDistribution['Not Ready'] += 1;
        } else {
          readinessDistribution['Unassessed'] += 1;
        }
      }
    });

    // Count unassessed students honestly
    const unassessedStudentsCount = Math.max(0, totalStudents - assessedCount);
    readinessDistribution['Unassessed'] += unassessedStudentsCount;

    const averageScore = assessedCount > 0 ? Math.round(totalAssessedScoreSum / assessedCount) : null;

    // Jobs and application metrics
    const publishedJobsCount = await Job.countDocuments({ isActive: true });
    const totalApplicationsCount = await Application.countDocuments({});

    const appStatusAgg = await Application.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const applicationsByStatus = {
      Saved: 0,
      Applied: 0,
      Shortlisted: 0,
      Interview: 0,
      Offer: 0,
      Rejected: 0
    };
    appStatusAgg.forEach((item) => {
      if (applicationsByStatus[item._id] !== undefined) {
        applicationsByStatus[item._id] = item.count;
      }
    });

    // Recent students
    const recentStudentsDocs = await User.find({ role: 'student' })
      .sort({ createdAt: -1 })
      .limit(6)
      .select('name email createdAt');

    const recentUserIds = recentStudentsDocs.map((u) => u._id);
    const recentProfiles = await Profile.find({ userId: { $in: recentUserIds } });
    const profileMap = new Map();
    recentProfiles.forEach((p) => profileMap.set(p.userId.toString(), p));

    const recentStudents = recentStudentsDocs.map((u) => {
      const p = profileMap.get(u._id.toString());
      const a = assessmentByUserId.get(u._id.toString());
      return {
        _id: u._id,
        name: u.name,
        email: u.email,
        targetRole: p?.targetRole || 'Not specified',
        profileCompletion: calculateProfileCompletion(p),
        readinessScore: a?.score !== undefined ? a.score : null,
        readinessLevel: a?.readinessLevel || 'Unassessed',
        scoreStatus: a?.scoreStatus || 'unassessed',
        joinedAt: u.createdAt
      };
    });

    // Recent assessment activities
    const [recentAssessments, recentResumes, recentInterviews, recentCoding] = await Promise.all([
      ReadinessAssessment.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('userId', 'name email'),
      Resume.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('userId', 'name email'),
      InterviewSession.find({ status: 'completed' })
        .sort({ completedAt: -1 })
        .limit(5)
        .populate('userId', 'name email'),
      CodingSubmission.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('userId', 'name email')
        .populate('problemId', 'title')
    ]);

    const activityFeed = [];

    recentAssessments.forEach((a) => {
      if (a.userId) {
        activityFeed.push({
          type: 'readiness',
          title: `Readiness Score Recalculated: ${a.score !== null ? `${a.score}/100` : 'Unassessed'} (${a.readinessLevel})`,
          studentName: a.userId.name,
          studentEmail: a.userId.email,
          studentId: a.userId._id,
          timestamp: a.createdAt
        });
      }
    });

    recentResumes.forEach((r) => {
      if (r.userId) {
        activityFeed.push({
          type: 'resume',
          title: `Resume Uploaded: "${r.originalFilename}" (${r.status})`,
          studentName: r.userId.name,
          studentEmail: r.userId.email,
          studentId: r.userId._id,
          timestamp: r.createdAt
        });
      }
    });

    recentInterviews.forEach((i) => {
      if (i.userId) {
        activityFeed.push({
          type: 'interview',
          title: `Completed Mock Interview for ${i.targetRole} (Score: ${i.evaluation?.overallScore ?? 'N/A'})`,
          studentName: i.userId.name,
          studentEmail: i.userId.email,
          studentId: i.userId._id,
          timestamp: i.completedAt || i.updatedAt
        });
      }
    });

    recentCoding.forEach((c) => {
      if (c.userId) {
        activityFeed.push({
          type: 'coding',
          title: `Submitted Solution for "${c.problemId?.title || 'DSA Problem'}" (${c.status}, ${c.score} pts)`,
          studentName: c.userId.name,
          studentEmail: c.userId.email,
          studentId: c.userId._id,
          timestamp: c.createdAt
        });
      }
    });

    activityFeed.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const recentActivity = activityFeed.slice(0, 10);

    // Audit overview view
    await adminAuditService.log({
      req,
      resourceType: 'overview',
      action: 'view_overview',
      details: { totalStudents, publishedJobsCount }
    });

    return successResponse(res, {
      summary: {
        totalStudents,
        completedAssessmentsCount,
        provisionalScoresCount,
        finalScoresCount,
        unassessedStudentsCount,
        averageScore,
        publishedJobsCount,
        totalApplicationsCount
      },
      readinessDistribution,
      applicationsByStatus,
      recentStudents,
      recentActivity
    }, 'Administrative overview loaded successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Filterable and paginated list of all students
 * GET /api/admin/students
 */
const getStudents = async (req, res, next) => {
  try {
    const {
      search = '',
      targetRole = '',
      readinessLevel = '',
      assessmentStatus = 'all', // 'all', 'final', 'provisional', 'unassessed'
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

    // Base query for students
    const userQuery = { role: 'student' };
    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      userQuery.$or = [{ name: searchRegex }, { email: searchRegex }];
    }

    // Retrieve matching student users
    const allMatchingUsers = await User.find(userQuery).select('name email createdAt');
    const userIds = allMatchingUsers.map((u) => u._id);

    // Batch fetch associated profiles and current readiness assessments
    const [profiles, assessments] = await Promise.all([
      Profile.find({ userId: { $in: userIds } }),
      ReadinessAssessment.find({ userId: { $in: userIds }, isCurrent: true })
    ]);

    const profileMap = new Map();
    profiles.forEach((p) => profileMap.set(p.userId.toString(), p));

    const assessmentMap = new Map();
    assessments.forEach((a) => assessmentMap.set(a.userId.toString(), a));

    // Map each student to enriched record
    let enrichedStudents = allMatchingUsers.map((u) => {
      const p = profileMap.get(u._id.toString());
      const a = assessmentMap.get(u._id.toString());
      const profileCompletion = calculateProfileCompletion(p);

      return {
        _id: u._id,
        name: u.name,
        email: u.email,
        targetRole: p?.targetRole || '',
        skills: p?.skills || [],
        education: p?.education || '',
        location: p?.location || '',
        profileCompletion,
        readinessScore: a?.score !== undefined ? a.score : null,
        scoreStatus: a?.scoreStatus || 'unassessed',
        readinessLevel: a?.readinessLevel || 'Unassessed',
        coveragePercent: a?.coveragePercent || 0,
        lastAssessmentDate: a?.assessedAt || a?.updatedAt || null,
        createdAt: u.createdAt
      };
    });

    // Apply in-memory secondary filters for joined profile/assessment fields
    if (targetRole.trim()) {
      const roleRegex = new RegExp(targetRole.trim(), 'i');
      enrichedStudents = enrichedStudents.filter((s) => roleRegex.test(s.targetRole));
    }

    if (readinessLevel.trim()) {
      enrichedStudents = enrichedStudents.filter((s) =>
        s.readinessLevel.toLowerCase().includes(readinessLevel.trim().toLowerCase())
      );
    }

    if (assessmentStatus === 'final') {
      enrichedStudents = enrichedStudents.filter((s) => s.scoreStatus === 'final');
    } else if (assessmentStatus === 'provisional') {
      enrichedStudents = enrichedStudents.filter((s) => s.scoreStatus === 'provisional' && s.readinessScore !== null);
    } else if (assessmentStatus === 'unassessed') {
      enrichedStudents = enrichedStudents.filter((s) => s.readinessScore === null || s.scoreStatus === 'unassessed');
    }

    // Sorting
    enrichedStudents.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (sortBy === 'readinessScore') {
        valA = valA === null ? -1 : valA;
        valB = valB === null ? -1 : valB;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    const total = enrichedStudents.length;
    const totalPages = Math.ceil(total / limitNum) || 1;
    const paginatedStudents = enrichedStudents.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    await adminAuditService.log({
      req,
      resourceType: 'students',
      action: 'view_students',
      details: { search, targetRole, readinessLevel, assessmentStatus, page: pageNum, total }
    });

    return successResponse(res, {
      students: paginatedStudents,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Single student detail for admin
 * GET /api/admin/students/:studentId
 */
const getStudentById = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return errorResponse(res, 'Invalid student identifier', 'INVALID_ID', 400);
    }

    const student = await User.findOne({ _id: studentId, role: 'student' }).select('-passwordHash');
    if (!student) {
      return errorResponse(res, 'Student account not found', 'STUDENT_NOT_FOUND', 404);
    }

    const [profile, readiness, resumesCount, projectsCount, interviewsCount, codingCount, applicationsCount] =
      await Promise.all([
        Profile.findOne({ userId: studentId }),
        ReadinessAssessment.findOne({ userId: studentId, isCurrent: true }),
        Resume.countDocuments({ userId: studentId }),
        ProjectAnalysis.countDocuments({ userId: studentId }),
        InterviewSession.countDocuments({ userId: studentId }),
        CodingSubmission.countDocuments({ userId: studentId }),
        Application.countDocuments({ userId: studentId })
      ]);

    const profileCompletion = calculateProfileCompletion(profile);

    await adminAuditService.log({
      req,
      studentId: student._id,
      studentEmail: student.email,
      resourceType: 'student_detail',
      action: 'view_student_detail',
      details: { studentName: student.name }
    });

    return successResponse(res, {
      student,
      profile: profile || null,
      profileCompletion,
      readiness: readiness || null,
      counts: {
        resumes: resumesCount,
        projects: projectsCount,
        interviews: interviewsCount,
        coding: codingCount,
        applications: applicationsCount
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get student readiness assessment with full breakdown
 * GET /api/admin/students/:studentId/readiness
 */
const getStudentReadiness = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const student = await User.findOne({ _id: studentId, role: 'student' });
    if (!student) {
      return errorResponse(res, 'Student not found', 'STUDENT_NOT_FOUND', 404);
    }

    const assessment = await readinessService.getLatestOrRecalculate(studentId);
    const history = await ReadinessAssessment.find({ userId: studentId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('score readinessLevel scoreStatus coveragePercent createdAt');

    await adminAuditService.log({
      req,
      studentId,
      studentEmail: student.email,
      resourceType: 'readiness',
      action: 'view_readiness'
    });

    return successResponse(res, { assessment, history });
  } catch (error) {
    next(error);
  }
};

/**
 * Recalculate student readiness score (authoritative only; no arbitrary score modification)
 * POST /api/admin/students/:studentId/refresh-readiness
 */
const refreshStudentReadiness = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const student = await User.findOne({ _id: studentId, role: 'student' });
    if (!student) {
      return errorResponse(res, 'Student not found', 'STUDENT_NOT_FOUND', 404);
    }

    const assessment = await readinessService.recalculate(studentId);

    await adminAuditService.log({
      req,
      studentId,
      studentEmail: student.email,
      resourceType: 'readiness',
      action: 'refresh_readiness',
      details: { newScore: assessment.score, readinessLevel: assessment.readinessLevel }
    });

    return successResponse(res, { assessment }, 'Readiness recalculated successfully from actual student assessments');
  } catch (error) {
    next(error);
  }
};

/**
 * Get student resumes and review history
 * GET /api/admin/students/:studentId/resumes
 */
const getStudentResumes = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const student = await User.findOne({ _id: studentId, role: 'student' });
    if (!student) {
      return errorResponse(res, 'Student not found', 'STUDENT_NOT_FOUND', 404);
    }

    const resumes = await Resume.find({ userId: studentId }).sort({ createdAt: -1 }).select('-storagePath -cleanText -extractedText');
    const resumeIds = resumes.map((r) => r._id);
    const reviews = await ResumeReview.find({ resumeId: { $in: resumeIds } }).sort({ createdAt: -1 });

    const reviewMap = new Map();
    reviews.forEach((rev) => {
      const rId = rev.resumeId.toString();
      if (!reviewMap.has(rId)) {
        reviewMap.set(rId, []);
      }
      reviewMap.get(rId).push(rev);
    });

    const enrichedResumes = resumes.map((r) => ({
      ...r.toObject(),
      reviews: reviewMap.get(r._id.toString()) || []
    }));

    await adminAuditService.log({
      req,
      studentId,
      studentEmail: student.email,
      resourceType: 'resume',
      action: 'view_resumes',
      details: { resumeCount: resumes.length }
    });

    return successResponse(res, { resumes: enrichedResumes });
  } catch (error) {
    next(error);
  }
};

/**
 * Download a student's resume file securely
 * GET /api/admin/students/:studentId/resumes/:resumeId/download
 */
const downloadStudentResume = async (req, res, next) => {
  try {
    const { studentId, resumeId } = req.params;

    const resume = await Resume.findOne({ _id: resumeId, userId: studentId });
    if (!resume) {
      return errorResponse(res, 'Resume document not found', 'RESUME_NOT_FOUND', 404);
    }

    const storage = getStorageProvider();
    let stream;
    try {
      // Pass isAdmin = true to authorize administrative retrieval
      stream = await storage.getFileStream(resume.storageId, studentId, true);
    } catch (storageErr) {
      return errorResponse(res, 'Document file not found in storage', 'FILE_NOT_FOUND', 404);
    }

    await adminAuditService.log({
      req,
      studentId,
      resourceType: 'resume_download',
      action: 'download_resume',
      details: { resumeId: resume._id, filename: resume.originalFilename, storageType: resume.storageType }
    });

    res.setHeader('Content-Type', resume.mimeType || 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(resume.originalFilename || 'resume.pdf')}"`
    );

    stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

/**
 * Get student LinkedIn reviews
 * GET /api/admin/students/:studentId/linkedin-reviews
 */
const getStudentLinkedInReviews = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const student = await User.findOne({ _id: studentId, role: 'student' });
    if (!student) {
      return errorResponse(res, 'Student not found', 'STUDENT_NOT_FOUND', 404);
    }

    const profile = await Profile.findOne({ userId: studentId });
    const reviews = await LinkedInReview.find({ userId: studentId }).sort({ createdAt: -1 });

    await adminAuditService.log({
      req,
      studentId,
      studentEmail: student.email,
      resourceType: 'linkedin',
      action: 'view_linkedin',
      details: { reviewCount: reviews.length }
    });

    return successResponse(res, {
      profileUrl: profile?.linkedin || '',
      reviews
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get student GitHub reviews
 * GET /api/admin/students/:studentId/github-reviews
 */
const getStudentGitHubReviews = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const student = await User.findOne({ _id: studentId, role: 'student' });
    if (!student) {
      return errorResponse(res, 'Student not found', 'STUDENT_NOT_FOUND', 404);
    }

    const profile = await Profile.findOne({ userId: studentId });
    const reviews = await GitHubReview.find({ userId: studentId }).sort({ createdAt: -1 });

    await adminAuditService.log({
      req,
      studentId,
      studentEmail: student.email,
      resourceType: 'github',
      action: 'view_github',
      details: { reviewCount: reviews.length }
    });

    return successResponse(res, {
      profileUrl: profile?.github || '',
      reviews
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get student projects & deep repository analysis
 * GET /api/admin/students/:studentId/projects
 */
const getStudentProjects = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const student = await User.findOne({ _id: studentId, role: 'student' });
    if (!student) {
      return errorResponse(res, 'Student not found', 'STUDENT_NOT_FOUND', 404);
    }

    const profile = await Profile.findOne({ userId: studentId });
    const analyses = await ProjectAnalysis.find({ userId: studentId }).sort({ createdAt: -1 });

    await adminAuditService.log({
      req,
      studentId,
      studentEmail: student.email,
      resourceType: 'project',
      action: 'view_projects',
      details: { analysisCount: analyses.length, profileProjectCount: profile?.projects?.length || 0 }
    });

    return successResponse(res, {
      profileProjects: profile?.projects || [],
      analyses
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get student mock interview sessions & evaluations
 * GET /api/admin/students/:studentId/interviews
 */
const getStudentInterviews = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const student = await User.findOne({ _id: studentId, role: 'student' });
    if (!student) {
      return errorResponse(res, 'Student not found', 'STUDENT_NOT_FOUND', 404);
    }

    const interviews = await InterviewSession.find({ userId: studentId }).sort({ createdAt: -1 });

    await adminAuditService.log({
      req,
      studentId,
      studentEmail: student.email,
      resourceType: 'interview',
      action: 'view_interviews',
      details: { count: interviews.length }
    });

    return successResponse(res, { interviews });
  } catch (error) {
    next(error);
  }
};

/**
 * Get student coding assessments & submissions
 * GET /api/admin/students/:studentId/coding-assessments
 */
const getStudentCodingAssessments = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const student = await User.findOne({ _id: studentId, role: 'student' });
    if (!student) {
      return errorResponse(res, 'Student not found', 'STUDENT_NOT_FOUND', 404);
    }

    const submissions = await CodingSubmission.find({ userId: studentId })
      .populate('problemId', 'title difficulty tags maxScore slug')
      .sort({ createdAt: -1 });

    // Mask hidden test cases to protect secret test integrity
    const sanitizedSubmissions = submissions.map((sub) => {
      const obj = sub.toObject();
      if (Array.isArray(obj.testCaseResults)) {
        obj.testCaseResults = obj.testCaseResults.map((tc) => ({
          testCaseIndex: tc.testCaseIndex,
          passed: tc.passed,
          status: tc.status,
          runtimeMs: tc.runtimeMs,
          isHidden: tc.isHidden,
          input: tc.isHidden ? '[HIDDEN_TESTCASE]' : tc.input,
          expectedOutput: tc.isHidden ? '[HIDDEN_TESTCASE]' : tc.expectedOutput,
          actualOutput: tc.isHidden ? '[HIDDEN_TESTCASE]' : tc.actualOutput
        }));
      }
      return obj;
    });

    await adminAuditService.log({
      req,
      studentId,
      studentEmail: student.email,
      resourceType: 'coding',
      action: 'view_coding',
      details: { count: submissions.length }
    });

    return successResponse(res, { submissions: sanitizedSubmissions });
  } catch (error) {
    next(error);
  }
};

/**
 * View recent administrative audit logs
 * GET /api/admin/audit-logs
 */
const getAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, resourceType = '' } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const filter = {};
    if (resourceType.trim()) {
      filter.resourceType = resourceType.trim();
    }

    const total = await AuditLog.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum) || 1;
    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    return successResponse(res, {
      logs,
      pagination: { total, page: pageNum, limit: limitNum, totalPages }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Batch overview of all student readiness
 * GET /api/admin/readiness-overview
 */
const getAdminReadinessOverview = async (req, res, next) => {
  try {
    const students = await User.find({ role: 'student' }).select('name email createdAt');
    const userIds = students.map((s) => s._id);

    const [profiles, assessments] = await Promise.all([
      Profile.find({ userId: { $in: userIds } }),
      ReadinessAssessment.find({ userId: { $in: userIds }, isCurrent: true })
    ]);

    const profileMap = new Map();
    profiles.forEach((p) => profileMap.set(p.userId.toString(), p));

    const assessmentMap = new Map();
    assessments.forEach((a) => assessmentMap.set(a.userId.toString(), a));

    const records = students.map((s) => {
      const p = profileMap.get(s._id.toString());
      const a = assessmentMap.get(s._id.toString());
      return {
        studentId: s._id,
        name: s.name,
        email: s.email,
        targetRole: p?.targetRole || 'Not specified',
        score: a?.score !== undefined ? a.score : null,
        readinessLevel: a?.readinessLevel || 'Unassessed',
        scoreStatus: a?.scoreStatus || 'unassessed',
        coveragePercent: a?.coveragePercent || 0,
        components: a?.components || [],
        lastUpdated: a?.updatedAt || a?.createdAt || null
      };
    });

    await adminAuditService.log({
      req,
      resourceType: 'readiness',
      action: 'view_readiness_overview',
      details: { studentCount: records.length }
    });

    return successResponse(res, { records });
  } catch (error) {
    next(error);
  }
};

/**
 * Batch overview of all resumes
 * GET /api/admin/resumes-overview
 */
const getAdminResumesOverview = async (req, res, next) => {
  try {
    const resumes = await Resume.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .select('-storagePath -cleanText -extractedText');

    const resumeIds = resumes.map((r) => r._id);
    const reviews = await ResumeReview.find({ resumeId: { $in: resumeIds } }).sort({ createdAt: -1 });

    const latestReviewMap = new Map();
    reviews.forEach((rev) => {
      const rId = rev.resumeId.toString();
      if (!latestReviewMap.has(rId)) {
        latestReviewMap.set(rId, rev);
      }
    });

    const records = resumes
      .filter((r) => r.userId)
      .map((r) => {
        const rev = latestReviewMap.get(r._id.toString());
        return {
          resumeId: r._id,
          studentId: r.userId._id,
          studentName: r.userId.name,
          studentEmail: r.userId.email,
          filename: r.originalFilename,
          fileType: r.fileType,
          fileSize: r.fileSize,
          uploadedAt: r.createdAt,
          overallScore: rev?.scores?.overallScore ?? null,
          atsScore: rev?.scores?.atsScore ?? null,
          verdict: rev?.summaryVerdict || r.status
        };
      });

    await adminAuditService.log({
      req,
      resourceType: 'resume',
      action: 'view_resumes_overview',
      details: { count: records.length }
    });

    return successResponse(res, { resumes: records });
  } catch (error) {
    next(error);
  }
};

/**
 * Batch overview of LinkedIn reviews
 * GET /api/admin/linkedin-overview
 */
const getAdminLinkedInOverview = async (req, res, next) => {
  try {
    const reviews = await LinkedInReview.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    const records = reviews
      .filter((r) => r.userId)
      .map((r) => ({
        reviewId: r._id,
        studentId: r.userId._id,
        studentName: r.userId.name,
        studentEmail: r.userId.email,
        profileUrl: r.profileUrl,
        targetRole: r.targetRole,
        overallScore: r.overallScore,
        reviewedAt: r.reviewedAt || r.createdAt
      }));

    await adminAuditService.log({
      req,
      resourceType: 'linkedin',
      action: 'view_linkedin_overview',
      details: { count: records.length }
    });

    return successResponse(res, { reviews: records });
  } catch (error) {
    next(error);
  }
};

/**
 * Batch overview of Project analyses
 * GET /api/admin/projects-overview
 */
const getAdminProjectsOverview = async (req, res, next) => {
  try {
    const analyses = await ProjectAnalysis.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    const records = analyses
      .filter((a) => a.userId)
      .map((a) => ({
        analysisId: a._id,
        studentId: a.userId._id,
        studentName: a.userId.name,
        studentEmail: a.userId.email,
        projectName: a.projectName,
        repositoryUrl: a.repositoryUrl,
        overallScore: a.scores?.overallProjectScore ?? null,
        readmeScore: a.scores?.readmeQuality ?? null,
        codeScore: a.scores?.codeQuality ?? null,
        secretWarnings: a.secretFindings?.length || 0,
        analyzedAt: a.createdAt
      }));

    await adminAuditService.log({
      req,
      resourceType: 'project',
      action: 'view_projects_overview',
      details: { count: records.length }
    });

    return successResponse(res, { projects: records });
  } catch (error) {
    next(error);
  }
};

/**
 * Batch overview of Interview sessions
 * GET /api/admin/interviews-overview
 */
const getAdminInterviewsOverview = async (req, res, next) => {
  try {
    const interviews = await InterviewSession.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    const records = interviews
      .filter((i) => i.userId)
      .map((i) => ({
        sessionId: i._id,
        studentId: i.userId._id,
        studentName: i.userId.name,
        studentEmail: i.userId.email,
        targetRole: i.targetRole,
        durationMinutes: i.durationMinutes,
        status: i.status,
        overallScore: i.evaluation?.overallScore ?? null,
        startedAt: i.startedAt,
        completedAt: i.completedAt
      }));

    await adminAuditService.log({
      req,
      resourceType: 'interview',
      action: 'view_interviews_overview',
      details: { count: records.length }
    });

    return successResponse(res, { interviews: records });
  } catch (error) {
    next(error);
  }
};

/**
 * Batch overview of Coding submissions
 * GET /api/admin/coding-overview
 */
const getAdminCodingOverview = async (req, res, next) => {
  try {
    const submissions = await CodingSubmission.find()
      .populate('userId', 'name email')
      .populate('problemId', 'title difficulty maxScore')
      .sort({ createdAt: -1 });

    const records = submissions
      .filter((s) => s.userId)
      .map((s) => ({
        submissionId: s._id,
        studentId: s.userId._id,
        studentName: s.userId.name,
        studentEmail: s.userId.email,
        problemTitle: s.problemId?.title || 'Unknown Problem',
        difficulty: s.problemId?.difficulty || 'Medium',
        language: s.language,
        status: s.status,
        score: s.score,
        passedTestCases: s.passedTestCases,
        totalTestCases: s.totalTestCases,
        submittedAt: s.createdAt
      }));

    await adminAuditService.log({
      req,
      resourceType: 'coding',
      action: 'view_coding_overview',
      details: { count: records.length }
    });

    return successResponse(res, { submissions: records });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminOverview,
  getStudents,
  getStudentById,
  getStudentReadiness,
  refreshStudentReadiness,
  getStudentResumes,
  downloadStudentResume,
  getStudentLinkedInReviews,
  getStudentGitHubReviews,
  getStudentProjects,
  getStudentInterviews,
  getStudentCodingAssessments,
  getAuditLogs,
  getAdminReadinessOverview,
  getAdminResumesOverview,
  getAdminLinkedInOverview,
  getAdminProjectsOverview,
  getAdminInterviewsOverview,
  getAdminCodingOverview
};
