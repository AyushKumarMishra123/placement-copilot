const request = require('supertest');
const app = require('../app');
const Profile = require('../models/Profile');
const Resume = require('../models/Resume');
const ResumeReview = require('../models/ResumeReview');
const GitHubReview = require('../models/GitHubReview');
const ProjectAnalysis = require('../models/ProjectAnalysis');
const ReadinessAssessment = require('../models/ReadinessAssessment');
require('./setup');

describe('Placement Readiness API & Multi-Tenant Isolation Tests', () => {
  let user1Token;
  let user2Token;
  let user1Id;
  let user2Id;

  beforeEach(async () => {
    const res1 = await request(app).post('/api/auth/register').send({
      name: 'Alice Candidate',
      email: 'alice.candidate@example.com',
      password: 'password123'
    });
    user1Token = res1.body.data.token;
    user1Id = res1.body.data.user._id || res1.body.data.user.id;

    const res2 = await request(app).post('/api/auth/register').send({
      name: 'Bob Candidate',
      email: 'bob.candidate@example.com',
      password: 'password123'
    });
    user2Token = res2.body.data.token;
    user2Id = res2.body.data.user._id || res2.body.data.user.id;
  });

  test('rejects unauthenticated requests to /api/readiness', async () => {
    const res = await request(app).get('/api/readiness');
    expect(res.status).toBe(401);
  });

  test('returns provisional unassessed state when student has no assessments', async () => {
    const res = await request(app)
      .get('/api/readiness')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const assessment = res.body.data.assessment;
    expect(assessment).toBeDefined();
    expect(assessment.score).toBeNull();
    expect(assessment.scoreStatus).toBe('provisional');
    expect(assessment.coveragePercent).toBe(0);
    expect(assessment.readinessLevel).toBe('Unassessed');
    expect(assessment.components.length).toBe(7);
  });

  test('calculates accurate score from real persisted source assessments', async () => {
    // 1. Create a processed resume with benchmark review for Alice
    const resume = await Resume.create({
      userId: user1Id,
      documentId: 'doc_123',
      originalFilename: 'alice_cv.pdf',
      mimeType: 'application/pdf',
      fileSize: 10240,
      status: 'processed'
    });

    await ResumeReview.create({
      userId: user1Id,
      resumeId: resume._id,
      score: 80,
      categoryScores: {
        structure: 80,
        projects: 80,
        measurableImpact: 80,
        skillsAts: 80,
        profilesLinks: 80,
        achievements: 80
      },
      checks: [
        {
          id: 'TEST_CHECK',
          name: 'Metrics in bullets',
          category: 'measurableImpact',
          status: 'fail',
          score: 0,
          weight: 20,
          explanation: 'Bullet points lack quantifiable metrics.',
          suggestion: 'Add numerical metrics to project outcomes.'
        }
      ]
    });

    // 2. Create a GitHub review for Alice (score: 90)
    await GitHubReview.create({
      userId: user1Id,
      username: 'alice-dev',
      profileUrl: 'https://github.com/alice-dev',
      score: 90,
      profileSnapshot: { publicRepos: 5 }
    });

    // 3. Confirm achievements in Profile
    await Profile.findOneAndUpdate(
      { userId: user1Id },
      {
        $set: {
          achievements: ['Hackathon Winner 2025', 'IEEE Member'],
          achievementsReviewed: true
        }
      },
      { upsert: true }
    );

    // Call GET /api/readiness
    const res = await request(app)
      .get('/api/readiness')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.status).toBe(200);
    const assessment = res.body.data.assessment;
    expect(assessment).toBeDefined();

    // Components assessed: Resume (25, score 80), GitHub (10, score 90), Achievements (5, score 95)
    // Assessed weight = 25 + 10 + 5 = 40
    // Weighted sum = (80 * 25) + (90 * 10) + (95 * 5) = 2000 + 900 + 475 = 3375
    // Provisional score = 3375 / 40 = 84.375 -> rounded = 84
    expect(assessment.coveragePercent).toBe(40);
    expect(assessment.score).toBe(84);
    expect(assessment.scoreStatus).toBe('provisional');
    expect(assessment.readinessLevel).toBe('Provisional (Placement Ready)');

    // Recommendations should contain the failed resume metrics check
    expect(assessment.recommendations.length).toBeGreaterThan(0);
    const resumeRec = assessment.recommendations.find((r) => r.sourceComponent === 'resume');
    expect(resumeRec).toBeDefined();
    expect(resumeRec.title).toContain('Metrics in bullets');
  });

  test('prevents User 2 from accessing User 1 readiness assessment snapshot', async () => {
    // Generate an assessment for Alice
    const aliceAssessment = await ReadinessAssessment.create({
      userId: user1Id,
      assessmentType: 'provisional',
      score: 85,
      scoreStatus: 'provisional',
      readinessLevel: 'Provisional (Placement Ready)',
      assessedWeight: 40,
      coveragePercent: 40,
      components: [
        { key: 'resume', label: 'Resume', weight: 25, score: 85, status: 'assessed', source: {} }
      ],
      recommendations: [],
      calculationVersion: '1.0',
      isCurrent: true
    });

    // Bob tries to access Alice's assessment ID
    const res = await request(app)
      .get(`/api/readiness/${aliceAssessment._id}`)
      .set('Authorization', `Bearer ${user2Token}`);

    expect(res.status).toBe(404);
  });

  test('POST /api/readiness/recalculate triggers fresh server-side evaluation', async () => {
    const res = await request(app)
      .post('/api/readiness/recalculate')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        // Client attempts to pass fake score; server MUST ignore and calculate from real database
        score: 99
      });

    expect(res.status).toBe(200);
    const assessment = res.body.data.assessment;
    // Alice has no assessments in this test, score must be null (not 99!)
    expect(assessment.score).toBeNull();
    expect(assessment.coveragePercent).toBe(0);
  });

  test('GET /api/readiness/history retrieves user chronological assessment records', async () => {
    await ReadinessAssessment.create({
      userId: user1Id,
      assessmentType: 'provisional',
      score: 70,
      scoreStatus: 'provisional',
      readinessLevel: 'Provisional (Almost Ready)',
      assessedWeight: 25,
      coveragePercent: 25,
      components: [
        { key: 'resume', label: 'Resume', weight: 25, score: 70, status: 'assessed', source: {} }
      ],
      recommendations: [],
      isCurrent: false
    });

    const res = await request(app)
      .get('/api/readiness/history')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.history.length).toBeGreaterThanOrEqual(1);
  });
});
