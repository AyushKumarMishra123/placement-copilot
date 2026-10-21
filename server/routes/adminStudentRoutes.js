const express = require('express');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const adminStudentController = require('../controllers/adminStudentController');

const router = express.Router();

// Enforce strict authentication and administrative role authorization
router.use(requireAuth);
router.use(requireRole('admin'));

// Executive overview
router.get('/overview', adminStudentController.getAdminOverview);

// All students list & filtering
router.get('/students', adminStudentController.getStudents);

// Student detail & assessment review inspection
router.get('/students/:studentId', adminStudentController.getStudentById);
router.get('/students/:studentId/readiness', adminStudentController.getStudentReadiness);
router.post('/students/:studentId/refresh-readiness', adminStudentController.refreshStudentReadiness);
router.get('/students/:studentId/resumes', adminStudentController.getStudentResumes);
router.get('/students/:studentId/resumes/:resumeId/download', adminStudentController.downloadStudentResume);
router.get('/students/:studentId/linkedin-reviews', adminStudentController.getStudentLinkedInReviews);
router.get('/students/:studentId/github-reviews', adminStudentController.getStudentGitHubReviews);
router.get('/students/:studentId/projects', adminStudentController.getStudentProjects);
router.get('/students/:studentId/interviews', adminStudentController.getStudentInterviews);
router.get('/students/:studentId/coding-assessments', adminStudentController.getStudentCodingAssessments);

// Batch overview endpoints
router.get('/readiness-overview', adminStudentController.getAdminReadinessOverview);
router.get('/resumes-overview', adminStudentController.getAdminResumesOverview);
router.get('/linkedin-overview', adminStudentController.getAdminLinkedInOverview);
router.get('/projects-overview', adminStudentController.getAdminProjectsOverview);
router.get('/interviews-overview', adminStudentController.getAdminInterviewsOverview);
router.get('/coding-overview', adminStudentController.getAdminCodingOverview);

// System Audit Logs
router.get('/audit-logs', adminStudentController.getAuditLogs);

module.exports = router;
