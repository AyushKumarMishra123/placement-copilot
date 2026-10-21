const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const Profile = require('../models/Profile');
const Resume = require('../models/Resume');
const ResumeReview = require('../models/ResumeReview');
const Application = require('../models/Application');
const Job = require('../models/Job');
const InterviewSession = require('../models/InterviewSession');
const ProjectAnalysis = require('../models/ProjectAnalysis');
require('./setup');

describe('Final Release Verification — Privacy, Data Access, Deletion & Admin', () => {
  let studentToken;
  let studentId;
  let otherToken;
  let otherId;

  beforeEach(async () => {
    // Register primary student
    const res1 = await request(app).post('/api/auth/register').send({
      name: 'Alice Candidate',
      email: 'alice@example.com',
      password: 'StrongPassword123!'
    });
    studentToken = res1.body.data.token;
    studentId = res1.body.data.user._id;

    // Register secondary student for isolation tests
    const res2 = await request(app).post('/api/auth/register').send({
      name: 'Bob Candidate',
      email: 'bob@example.com',
      password: 'StrongPassword123!'
    });
    otherToken = res2.body.data.token;
    otherId = res2.body.data.user._id;
  });

  describe('User Data Access (Export)', () => {
    it('rejects unauthenticated request to /api/profile/export', async () => {
      const res = await request(app).get('/api/profile/export');
      expect(res.status).toBe(401);
    });

    it('returns complete structured candidate data archive for authenticated student', async () => {
      // 1. Setup profile data
      await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          targetRole: 'Full Stack Engineer',
          skills: ['Node.js', 'React', 'MongoDB'],
          education: 'B.Tech CS'
        });

      // 2. Setup mock resume and review
      const resume = await Resume.create({
        userId: studentId,
        documentId: 'doc-export-123',
        originalFilename: 'alice_resume.pdf',
        fileType: 'pdf',
        mimeType: 'application/pdf',
        fileSize: 10240,
        status: 'processed'
      });

      await ResumeReview.create({
        userId: studentId,
        resumeId: resume._id,
        version: 1,
        score: 85,
        categoryScores: { structure: 15, projects: 20 },
        checks: [
          {
            id: 'CHECK_1',
            name: 'Page Count',
            category: 'structure',
            status: 'pass',
            score: 15,
            weight: 15,
            explanation: 'Exact 1 page length compliant',
            suggestion: 'Maintain standard layout'
          }
        ],
        strengths: ['Great 1-page format'],
        weaknesses: [],
        recommendations: ['Quantify bullet points'],
        summary: 'Excellent resume.'
      });

      // 3. Export data
      const res = await request(app)
        .get('/api/profile/export')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.exportMetadata).toBeDefined();
      expect(res.body.data.account.email).toBe('alice@example.com');
      expect(res.body.data.profile.targetRole).toBe('Full Stack Engineer');
      expect(res.body.data.resumes.length).toBe(1);
      expect(res.body.data.resumeReviews.length).toBe(1);
      expect(res.body.data.resumeReviews[0].score).toBe(85);
    });
  });

  describe('Resume Deletion and Isolation', () => {
    let testResume;

    beforeEach(async () => {
      testResume = await Resume.create({
        userId: studentId,
        documentId: 'doc-delete-test',
        originalFilename: 'alice_cv.pdf',
        fileType: 'pdf',
        mimeType: 'application/pdf',
        fileSize: 20480,
        status: 'processed'
      });

      await ResumeReview.create({
        userId: studentId,
        resumeId: testResume._id,
        version: 1,
        score: 78,
        categoryScores: {},
        checks: [],
        strengths: [],
        weaknesses: [],
        recommendations: [],
        summary: 'Review text'
      });
    });

    it('prevents another user from deleting Alice’s resume', async () => {
      const res = await request(app)
        .delete(`/api/resumes/${testResume._id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(404);

      // Verify resume still exists in database
      const existing = await Resume.findById(testResume._id);
      expect(existing).not.toBeNull();
    });

    it('allows owner to permanently delete resume and cascades associated reviews', async () => {
      const res = await request(app)
        .delete(`/api/resumes/${testResume._id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Resume document must be gone
      const deletedResume = await Resume.findById(testResume._id);
      expect(deletedResume).toBeNull();

      // Associated reviews must be deleted
      const reviews = await ResumeReview.find({ resumeId: testResume._id });
      expect(reviews.length).toBe(0);
    });

    it('returns 404 when attempting to delete non-existent resume ID', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const res = await request(app)
        .delete(`/api/resumes/${fakeId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('User Account Deletion', () => {
    it('permanently deletes user account, profile, documents, and prevents future login', async () => {
      // Seed records for Alice
      await Profile.create({
        userId: studentId,
        targetRole: 'Backend Engineer'
      });

      const resume = await Resume.create({
        userId: studentId,
        documentId: 'doc-alice',
        originalFilename: 'alice.pdf',
        fileType: 'pdf',
        mimeType: 'application/pdf',
        fileSize: 1000,
        status: 'uploaded'
      });

      await ResumeReview.create({
        userId: studentId,
        resumeId: resume._id,
        version: 1,
        score: 70,
        categoryScores: {},
        checks: []
      });

      // Alice deletes her entire account
      const delRes = await request(app)
        .delete('/api/profile/account')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);
      expect(delRes.body.data.accountDeleted).toBe(true);

      // Verify user document is deleted
      const userDoc = await User.findById(studentId);
      expect(userDoc).toBeNull();

      // Verify profile is deleted
      const profileDoc = await Profile.findOne({ userId: studentId });
      expect(profileDoc).toBeNull();

      // Verify resumes and reviews are deleted
      const resumes = await Resume.find({ userId: studentId });
      expect(resumes.length).toBe(0);
      const reviews = await ResumeReview.find({ userId: studentId });
      expect(reviews.length).toBe(0);

      // Verify Alice cannot log in anymore
      const loginRes = await request(app).post('/api/auth/login').send({
        email: 'alice@example.com',
        password: 'StrongPassword123!'
      });
      expect(loginRes.status).toBe(401);
    });
  });
});
