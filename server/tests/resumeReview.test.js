const request = require('supertest');
const app = require('../app');
const Resume = require('../models/Resume');
const ResumeReview = require('../models/ResumeReview');
require('./setup');

describe('Resume Review API Endpoints (/api/resumes)', () => {
  let user1Token;
  let user2Token;
  let user1ResumeId;

  beforeEach(async () => {
    // Register User 1
    const res1 = await request(app).post('/api/auth/register').send({
      name: 'User One',
      email: 'user1@example.com',
      password: 'password123'
    });
    user1Token = res1.body.data.token;
    const user1Id = res1.body.data.user._id;

    // Register User 2
    const res2 = await request(app).post('/api/auth/register').send({
      name: 'User Two',
      email: 'user2@example.com',
      password: 'password123'
    });
    user2Token = res2.body.data.token;

    // Create a mock resume directly in DB for User 1
    const resume = await Resume.create({
      userId: user1Id,
      documentId: 'doc-uuid-12345',
      originalFilename: 'user1_resume.pdf',
      storedFilename: 'safe_user1_resume.pdf',
      storageId: 'storage-123',
      storageType: 'local',
      mimeType: 'application/pdf',
      fileType: 'pdf',
      fileSize: 102400,
      status: 'processed',
      pageCount: 1,
      structuredData: {
        contact: { name: 'User One', email: 'user1@example.com' },
        projects: [{ name: 'Placement Copilot' }]
      }
    });
    user1ResumeId = resume._id.toString();

    // Create mock reviews (version 1 and version 2)
    await ResumeReview.create({
      userId: user1Id,
      resumeId: resume._id,
      version: 1,
      score: 75,
      categoryScores: {
        structure: 15,
        projects: 15,
        measurableImpact: 10,
        skillsAts: 15,
        profilesLinks: 10,
        achievements: 10
      },
      checks: [
        {
          id: 'CHECK_PAGE_COUNT',
          name: 'Single Page Format',
          category: 'structure',
          status: 'pass',
          score: 10,
          weight: 10,
          explanation: 'Pass',
          suggestion: 'Good',
          source: 'rule'
        }
      ],
      strengths: ['1-page compliance'],
      weaknesses: ['Add metrics'],
      recommendations: ['Quantify project impact']
    });

    await ResumeReview.create({
      userId: user1Id,
      resumeId: resume._id,
      version: 2,
      score: 88,
      categoryScores: {
        structure: 15,
        projects: 20,
        measurableImpact: 18,
        skillsAts: 15,
        profilesLinks: 10,
        achievements: 10
      },
      checks: [
        {
          id: 'CHECK_PAGE_COUNT',
          name: 'Single Page Format',
          category: 'structure',
          status: 'pass',
          score: 10,
          weight: 10,
          explanation: 'Pass',
          suggestion: 'Good',
          source: 'rule'
        }
      ],
      strengths: ['1-page compliance', 'Strong projects'],
      weaknesses: [],
      recommendations: ['Prepare for technical interview']
    });
  });

  it('allows owner to fetch resume and latest review via GET /api/resumes/:id', async () => {
    const res = await request(app)
      .get(`/api/resumes/${user1ResumeId}`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.resume._id).toBe(user1ResumeId);
    expect(res.body.data.latestReview.version).toBe(2);
    expect(res.body.data.latestReview.score).toBe(88);
  });

  it('prevents another student from accessing user1 resume (tenant isolation)', async () => {
    const res = await request(app)
      .get(`/api/resumes/${user1ResumeId}`)
      .set('Authorization', `Bearer ${user2Token}`);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('RESUME_NOT_FOUND');
  });

  it('allows owner to retrieve full review history via GET /api/resumes/:id/reviews', async () => {
    const res = await request(app)
      .get(`/api/resumes/${user1ResumeId}/reviews`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reviews).toHaveLength(2);
    expect(res.body.data.reviews[0].version).toBe(2);
    expect(res.body.data.reviews[1].version).toBe(1);
  });

  it('returns 404 for non-existent resume ID', async () => {
    const fakeId = '663675000000000000000000';
    const res = await request(app)
      .get(`/api/resumes/${fakeId}`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.status).toBe(404);
  });
});
