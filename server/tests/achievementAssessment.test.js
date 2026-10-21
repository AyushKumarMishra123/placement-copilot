const request = require('supertest');
const app = require('../app');
const AchievementAssessment = require('../models/AchievementAssessment');
const achievementsScoreAdapter = require('../services/readiness/components/achievementsScoreAdapter');
require('./setup');

describe('Feature 2: Co-Curricular Achievement Assessment Suite', () => {
  let user1Token;
  let user1Id;
  let user2Token;
  let user2Id;

  beforeEach(async () => {
    const res1 = await request(app).post('/api/auth/register').send({
      name: 'Achiever Student 1',
      email: 'achiever1@example.com',
      password: 'password123',
      targetRole: 'Software Engineer'
    });
    user1Token = res1.body.data.token;
    user1Id = res1.body.data.user._id || res1.body.data.user.id;

    const res2 = await request(app).post('/api/auth/register').send({
      name: 'Achiever Student 2',
      email: 'achiever2@example.com',
      password: 'password123',
      targetRole: 'Backend Developer'
    });
    user2Token = res2.body.data.token;
    user2Id = res2.body.data.user._id || res2.body.data.user.id;
  });

  describe('1. Security & Form Validation', () => {
    test('unauthenticated requests to /api/achievements/assess are blocked with 401', async () => {
      const res = await request(app).post('/api/achievements/assess').send({
        participationStatus: 'achievements'
      });
      expect(res.status).toBe(401);
    });

    test('rejects missing or invalid participationStatus', async () => {
      const res = await request(app)
        .post('/api/achievements/assess')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          targetRole: 'Software Engineer'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/participationStatus is required/i);
    });
  });

  describe('2. Baseline Handling for Zero / In-Progress Achievements', () => {
    test('calculates honest baseline and actionable roadmap for "none_want_to_improve" without penalty or fabrication', async () => {
      const res = await request(app)
        .post('/api/achievements/assess')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          participationStatus: 'none_want_to_improve',
          targetRole: 'Software Engineer',
          academicYear: '1st Year'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const assessment = res.body.data.assessment;
      expect(assessment).toBeDefined();
      expect(assessment.baseline).toBe(true);
      expect(assessment.overallScore).toBeGreaterThanOrEqual(30);
      expect(assessment.overallScore).toBeLessThan(55);

      // Verify all 6 dimensions are populated
      const { relevance, contribution, outcomes, achievementLevel, consistency, evidence } = assessment.dimensionScores;
      expect(relevance.weightPercent).toBe(25);
      expect(contribution.weightPercent).toBe(20);
      expect(outcomes.weightPercent).toBe(20);
      expect(achievementLevel.weightPercent).toBe(15);
      expect(consistency.weightPercent).toBe(10);
      expect(evidence.weightPercent).toBe(10);

      // Verify action plan is provided
      expect(assessment.actionPlan30Days.length).toBeGreaterThan(0);
      expect(assessment.actionPlan60Days.length).toBeGreaterThan(0);
      expect(assessment.recommendedActivities.length).toBeGreaterThan(0);
      // Verify recommended activities are explicitly labeled as recommended, not claimed as achieved
      expect(assessment.recommendedActivities.every((r) => r.status === 'recommended')).toBe(true);
    });
  });

  describe('3. Multi-Category Entry & Weighted Rubric Evaluation', () => {
    test('accurately scores rich multi-category achievements across 6 dimensions', async () => {
      const achievements = [
        {
          category: 'hackathons',
          title: 'HackNIT 2024 (Annual National Hackathon)',
          organizer: 'NIT Calicut',
          date: 'March 2024',
          participationType: 'team',
          role: 'Team Lead & Backend Architect',
          teamSize: 4,
          resultAward: '1st Place Winner (Best Web3 Solution)',
          problemSolved: 'Decentralized identity verification for campus placements.',
          contribution: 'Designed REST endpoints and smart contract integrations with Node.js.',
          technologies: ['Node.js', 'Solidity', 'MongoDB', 'Docker'],
          impact: 'Selected as top project out of 120 teams; recognized by industry sponsors.',
          evidenceUrl: 'https://github.com/test-candidate/hacknit-winner',
          status: 'completed'
        },
        {
          category: 'leadership',
          title: 'Google Developer Groups on Campus (GDG)',
          organizer: 'Google Developers / Campus Chapter',
          date: '2023 - 2024',
          participationType: 'team',
          role: 'Technical Lead & Workshop Coordinator',
          teamSize: 10,
          resultAward: 'Organized 5 Hands-on Masterclasses',
          contribution: 'Mentored 250+ students in Git, web development, and cloud computing.',
          impact: 'Increased active developer chapter participation by 45%.',
          evidenceUrl: 'https://gdg.community.dev/chapters/test-chapter',
          status: 'completed'
        },
        {
          category: 'open_source',
          title: 'Express.js Community Ecosystem Tooling',
          organizer: 'OpenJS Foundation Ecosystem',
          date: 'Nov 2023',
          participationType: 'individual',
          role: 'Core Contributor',
          resultAward: 'Merged Pull Request #482',
          contribution: 'Resolved intermittent rate limiter memory leak issue in middleware.',
          technologies: ['JavaScript', 'Express', 'Jest'],
          impact: 'PR merged into production release used by over 10k weekly downloads.',
          evidenceUrl: 'https://github.com/expressjs/express/pull/482',
          status: 'completed'
        },
        {
          category: 'certifications',
          title: 'AWS Certified Cloud Practitioner',
          organizer: 'Amazon Web Services',
          date: 'Jan 2024',
          participationType: 'individual',
          resultAward: 'Certified Credential ID #AWS-847291',
          technologies: ['AWS EC2', 'S3', 'IAM', 'CloudFront'],
          evidenceUrl: 'https://www.credly.com/badges/sample-id',
          status: 'completed'
        }
      ];

      const res = await request(app)
        .post('/api/achievements/assess')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          participationStatus: 'achievements',
          targetRole: 'Software Engineer',
          academicYear: '3rd Year',
          achievements
        });

      expect(res.status).toBe(201);
      const assessment = res.body.data.assessment;
      expect(assessment).toBeDefined();
      expect(assessment.baseline).toBe(false);

      // Verify 6 dimension scores sum up to overall score
      const dims = assessment.dimensionScores;
      const calculatedSum =
        dims.relevance.score +
        dims.contribution.score +
        dims.outcomes.score +
        dims.achievementLevel.score +
        dims.consistency.score +
        dims.evidence.score;

      expect(assessment.overallScore).toBe(calculatedSum);
      expect(assessment.overallScore).toBeGreaterThanOrEqual(75);

      // Verify category breakdown covers all categories
      expect(assessment.categoryBreakdown.length).toBe(6);
      const hackathonBreakdown = assessment.categoryBreakdown.find((c) => c.category === 'hackathons');
      expect(hackathonBreakdown.count).toBe(1);

      // Verify presentation guidance
      expect(assessment.resumeLinkedInPresentation.length).toBeGreaterThan(0);
      expect(assessment.resumeLinkedInPresentation[0].bulletSuggestion).toBeDefined();

      // Verify strongest contributions synthesized
      expect(assessment.strongestContributions.length).toBeGreaterThan(0);
    });
  });

  describe('4. Persistence, Retake & Multi-Tenant Isolation', () => {
    test('persists assessment and allows candidate to fetch latest and historical progression', async () => {
      await request(app)
        .post('/api/achievements/assess')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          participationStatus: 'activities_no_formal',
          targetRole: 'Full-Stack Developer',
          academicYear: '2nd Year',
          achievements: [
            {
              category: 'projects',
              title: 'Campus Lost and Found Portal',
              role: 'Developer',
              resultAward: 'Completed prototype',
              contribution: 'Built UI in React and Node.js backend.'
            }
          ]
        });

      const latestRes = await request(app)
        .get('/api/achievements/latest')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(latestRes.status).toBe(200);
      expect(latestRes.body.data.assessment).toBeDefined();
      expect(latestRes.body.data.assessment.userId.toString()).toBe(user1Id.toString());

      const historyRes = await request(app)
        .get('/api/achievements/history')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(historyRes.status).toBe(200);
      expect(historyRes.body.data.history.length).toBeGreaterThanOrEqual(1);
    });

    test('multi-tenant isolation: User 2 cannot access User 1 assessment', async () => {
      // User 1 creates assessment
      await request(app)
        .post('/api/achievements/assess')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          participationStatus: 'none_want_to_improve',
          targetRole: 'AI Engineer'
        });

      // User 2 queries latest assessment
      const user2Latest = await request(app)
        .get('/api/achievements/latest')
        .set('Authorization', `Bearer ${user2Token}`);

      expect(user2Latest.status).toBe(200);
      expect(user2Latest.body.data.assessment).toBeNull();
    });
  });

  describe('5. Readiness Score Adapter Integration', () => {
    test('achievementsScoreAdapter prioritizes AchievementAssessment model when available', async () => {
      await request(app)
        .post('/api/achievements/assess')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          participationStatus: 'achievements',
          targetRole: 'Software Engineer',
          academicYear: '3rd Year',
          achievements: [
            {
              category: 'hackathons',
              title: 'IEEE Hackfest',
              role: 'Team Lead',
              resultAward: 'Winner',
              contribution: 'Built full system.'
            }
          ]
        });

      const adapterResult = await achievementsScoreAdapter.evaluate(user1Id);
      expect(adapterResult.component.status).toBe('assessed');
      expect(adapterResult.component.weight).toBe(5);
      expect(adapterResult.component.source.type).toBe('co_curricular_assessment');
      expect(adapterResult.component.score).toBeGreaterThan(0);
    });
  });
});
