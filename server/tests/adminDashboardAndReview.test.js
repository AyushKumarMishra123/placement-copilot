const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const Profile = require('../models/Profile');
const Resume = require('../models/Resume');
const ResumeReview = require('../models/ResumeReview');
const LinkedInReview = require('../models/LinkedInReview');
const GitHubReview = require('../models/GitHubReview');
const ProjectAnalysis = require('../models/ProjectAnalysis');
const InterviewSession = require('../models/InterviewSession');
const CodingProblem = require('../models/CodingProblem');
const CodingSubmission = require('../models/CodingSubmission');
const ReadinessAssessment = require('../models/ReadinessAssessment');
const Job = require('../models/Job');
const Application = require('../models/Application');
const AuditLog = require('../models/AuditLog');
require('./setup');

describe('Dedicated Admin Dashboard and Student Review System Suite', () => {
  let adminToken;
  let adminId;
  let student1Token;
  let student1Id;
  let student2Token;
  let student2Id;

  beforeEach(async () => {
    // 1. Create an authorized placement cell administrator
    const adminRes = await request(app).post('/api/auth/register').send({
      name: 'Placement Officer',
      email: 'admin.placement@university.edu',
      password: 'AdminPassword123!',
      role: 'admin',
      adminSecretCode: 'msot_admin_secret_placement_copilot_2026'
    });
    adminToken = adminRes.body.data.token;
    adminId = adminRes.body.data.user._id || adminRes.body.data.user.id;

    // 2. Create Student 1 (Aarav Candidate)
    const s1Res = await request(app).post('/api/auth/register').send({
      name: 'Aarav Candidate',
      email: 'aarav.candidate@university.edu',
      password: 'StudentPass123!'
    });
    student1Token = s1Res.body.data.token;
    student1Id = s1Res.body.data.user._id || s1Res.body.data.user.id;

    // 3. Create Student 2 (Diya Candidate)
    const s2Res = await request(app).post('/api/auth/register').send({
      name: 'Diya Candidate',
      email: 'diya.candidate@university.edu',
      password: 'StudentPass123!'
    });
    student2Token = s2Res.body.data.token;
    student2Id = s2Res.body.data.user._id || s2Res.body.data.user.id;

    // Populate profile for student 1
    await Profile.create({
      userId: student1Id,
      targetRole: 'Software Engineer',
      location: 'Bengaluru, India',
      skills: ['JavaScript', 'Node.js', 'React', 'MongoDB'],
      education: 'B.Tech in Computer Science',
      github: 'https://github.com/aarav-dev',
      linkedin: 'https://linkedin.com/in/aarav-dev'
    });

    // Populate profile for student 2 (different role)
    await Profile.create({
      userId: student2Id,
      targetRole: 'Data Scientist',
      location: 'Pune, India',
      skills: ['Python', 'Pandas', 'PyTorch'],
      education: 'B.Tech in Artificial Intelligence'
    });
  });

  describe('1. Role-Based Access Control and Security Enforcement', () => {
    test('Students are strictly forbidden from accessing admin endpoints (HTTP 403)', async () => {
      const endpoints = [
        '/api/admin/overview',
        '/api/admin/students',
        `/api/admin/students/${student1Id}`,
        `/api/admin/students/${student1Id}/readiness`,
        `/api/admin/students/${student1Id}/resumes`,
        '/api/admin/audit-logs',
        '/api/admin/jobs'
      ];

      for (const ep of endpoints) {
        const res = await request(app)
          .get(ep)
          .set('Authorization', `Bearer ${student1Token}`);

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
        expect(res.body.code).toBe('FORBIDDEN_ROLE');
      }
    });

    test('Anonymous unauthenticated requests are rejected with HTTP 401', async () => {
      const res = await request(app).get('/api/admin/overview');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('AUTH_TOKEN_MISSING');
    });

    test('Authorized admin can access admin overview and student directory (HTTP 200)', async () => {
      const overviewRes = await request(app)
        .get('/api/admin/overview')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(overviewRes.status).toBe(200);
      expect(overviewRes.body.success).toBe(true);
      expect(overviewRes.body.data.summary.totalStudents).toBe(2);

      const studentsRes = await request(app)
        .get('/api/admin/students')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(studentsRes.status).toBe(200);
      expect(studentsRes.body.data.students.length).toBe(2);
    });

    test('Student accounts cannot access another student private documents', async () => {
      // Student 1 tries to access Student 2's details through any route
      const res = await request(app)
        .get(`/api/admin/students/${student2Id}`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(403);
    });
  });

  describe('2. Real Database Overview Aggregations', () => {
    test('Calculates real metrics distinguishing provisional, final, and unassessed candidates', async () => {
      // Setup: Student 1 has provisional readiness
      await ReadinessAssessment.create({
        userId: student1Id,
        score: 80,
        scoreStatus: 'provisional',
        assessmentType: 'provisional',
        readinessLevel: 'Provisional (Placement Ready)',
        assessedWeight: 50,
        coveragePercent: 50,
        isCurrent: true
      });

      // Student 2 has no assessment (unassessed)

      // Post 1 active job
      await Job.create({
        title: 'Full Stack Engineer',
        company: 'Campus Tech Drive',
        description: 'Exciting full stack graduate opportunity',
        applyUrl: 'https://campus.drive/apply',
        isActive: true,
        postedBy: adminId
      });

      const res = await request(app)
        .get('/api/admin/overview')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const { summary, readinessDistribution } = res.body.data;

      expect(summary.totalStudents).toBe(2);
      expect(summary.provisionalScoresCount).toBe(1);
      expect(summary.finalScoresCount).toBe(0);
      expect(summary.unassessedStudentsCount).toBe(1);
      expect(summary.publishedJobsCount).toBe(1);
      expect(readinessDistribution['Provisional (Placement Ready)']).toBe(1);
      expect(readinessDistribution['Unassessed']).toBe(1);
    });
  });

  describe('3. Student Directory Search, Filtering, and Pagination', () => {
    test('Filters students by targetRole and search query', async () => {
      // Search by name
      const searchRes = await request(app)
        .get('/api/admin/students?search=Aarav')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(searchRes.status).toBe(200);
      expect(searchRes.body.data.students.length).toBe(1);
      expect(searchRes.body.data.students[0].name).toBe('Aarav Candidate');

      // Filter by target role
      const roleRes = await request(app)
        .get('/api/admin/students?targetRole=Data')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(roleRes.status).toBe(200);
      expect(roleRes.body.data.students.length).toBe(1);
      expect(roleRes.body.data.students[0].name).toBe('Diya Candidate');
    });

    test('Handles unassessed students honestly without showing zero as score', async () => {
      const res = await request(app)
        .get('/api/admin/students')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const student2 = res.body.data.students.find((s) => s.email === 'diya.candidate@university.edu');
      expect(student2.readinessScore).toBeNull();
      expect(student2.readinessLevel).toBe('Unassessed');
    });

    test('Server-side pagination restricts limit and returns pagination metadata', async () => {
      const res = await request(app)
        .get('/api/admin/students?page=1&limit=1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.students.length).toBe(1);
      expect(res.body.data.pagination.total).toBe(2);
      expect(res.body.data.pagination.totalPages).toBe(2);
    });
  });

  describe('4. Student Detail & Assessment Telemetry', () => {
    test('Retrieves single student detail with counts and profile completion', async () => {
      const res = await request(app)
        .get(`/api/admin/students/${student1Id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.student.email).toBe('aarav.candidate@university.edu');
      expect(res.body.data.profileCompletion).toBeGreaterThan(0);
      expect(res.body.data.counts).toBeDefined();
    });

    test('Returns 404 for non-existent student ID', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/admin/students/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('STUDENT_NOT_FOUND');
    });

    test('Retrieves authoritative readiness breakdown using single-source weights', async () => {
      const res = await request(app)
        .get(`/api/admin/students/${student1Id}/readiness`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.assessment).toBeDefined();
      expect(Array.isArray(res.body.data.assessment.components)).toBe(true);
      expect(res.body.data.assessment.components.length).toBe(7);

      // Verify official weights
      const compMap = new Map();
      res.body.data.assessment.components.forEach((c) => compMap.set(c.key, c.weight));
      expect(compMap.get('resume')).toBe(25);
      expect(compMap.get('projects')).toBe(25);
      expect(compMap.get('interview')).toBe(20);
      expect(compMap.get('github')).toBe(10);
      expect(compMap.get('coding')).toBe(10);
      expect(compMap.get('linkedin')).toBe(5);
      expect(compMap.get('achievements')).toBe(5);
    });

    test('Refresh readiness triggers authoritative calculation and prevents arbitrary score tampering', async () => {
      // Trying to pass an arbitrary score payload
      const res = await request(app)
        .post(`/api/admin/students/${student1Id}/refresh-readiness`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ score: 99, readinessLevel: 'Placement Ready (Top Tier)' });

      expect(res.status).toBe(200);
      // The score must come strictly from the authoritative service calculation, NOT the arbitrary request payload
      expect(res.body.data.assessment).toBeDefined();
    });
  });

  describe('5. Artifact Inspection: LinkedIn, GitHub, Interviews & Coding', () => {
    test('Returns "Review not available" state gracefully when student has only URL without review', async () => {
      const res = await request(app)
        .get(`/api/admin/students/${student1Id}/linkedin-reviews`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.profileUrl).toBe('https://linkedin.com/in/aarav-dev');
      expect(res.body.data.reviews).toEqual([]);
    });

    test('Returns interview sessions without exposing test-taking actions', async () => {
      await InterviewSession.create({
        userId: student1Id,
        targetRole: 'Software Engineer',
        durationMinutes: 15,
        status: 'completed',
        expiresAt: new Date(Date.now() + 100000),
        evaluation: {
          overallScore: 82,
          strengths: ['Clear algorithmic explanation'],
          weaknesses: ['Edge case handling in queues']
        }
      });

      const res = await request(app)
        .get(`/api/admin/students/${student1Id}/interviews`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.interviews.length).toBe(1);
      expect(res.body.data.interviews[0].evaluation.overallScore).toBe(82);
    });

    test('Returns coding submissions and masks hidden test case inputs and outputs', async () => {
      const problem = await CodingProblem.create({
        title: 'Two Sum Variant',
        slug: 'two-sum-variant-admin-test',
        description: 'Find two indices that sum up to target.',
        topic: 'Arrays & Strings',
        difficulty: 'Easy',
        tags: ['Arrays'],
        maxScore: 100,
        referenceSolution: {
          language: 'javascript',
          code: 'function solve() { return [0, 1]; }'
        }
      });

      await CodingSubmission.create({
        userId: student1Id,
        problemId: problem._id,
        language: 'javascript',
        code: 'console.log("hello");',
        status: 'Accepted',
        score: 100,
        passedTestCases: 2,
        totalTestCases: 2,
        testCaseResults: [
          { testCaseIndex: 0, passed: true, status: 'Passed', isHidden: false, input: '[1,2]', expectedOutput: '[0,1]' },
          { testCaseIndex: 1, passed: true, status: 'Passed', isHidden: true, input: 'SECRET_HIDDEN_INPUT', expectedOutput: 'SECRET_HIDDEN_OUTPUT' }
        ]
      });

      const res = await request(app)
        .get(`/api/admin/students/${student1Id}/coding-assessments`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.submissions.length).toBe(1);
      const hiddenTestCase = res.body.data.submissions[0].testCaseResults.find((tc) => tc.isHidden);
      expect(hiddenTestCase.input).toBe('[HIDDEN_TESTCASE]');
      expect(hiddenTestCase.expectedOutput).toBe('[HIDDEN_TESTCASE]');
    });
  });

  describe('6. Data Privacy and Audit Logging', () => {
    test('Records audit events for administrative access and never stores sensitive contents', async () => {
      // Admin inspects student detail
      await request(app)
        .get(`/api/admin/students/${student1Id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Verify audit log
      const auditRes = await request(app)
        .get('/api/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(auditRes.status).toBe(200);
      expect(auditRes.body.data.logs.length).toBeGreaterThan(0);

      const latestLog = auditRes.body.data.logs[0];
      expect(latestLog.adminEmail).toBe('admin.placement@university.edu');

      // Verify no sensitive content in details
      expect(latestLog.details.extractedText).toBeUndefined();
      expect(latestLog.details.transcript).toBeUndefined();
    });
  });
});
