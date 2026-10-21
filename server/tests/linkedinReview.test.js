const request = require('supertest');
const app = require('../app');
const LinkedInReview = require('../models/LinkedInReview');
const linkedinScoreAdapter = require('../services/readiness/components/linkedinScoreAdapter');
require('./setup');

describe('Feature 1: LinkedIn Profile Review Suite', () => {
  let user1Token;
  let user1Id;
  let user2Token;
  let user2Id;

  beforeEach(async () => {
    const res1 = await request(app).post('/api/auth/register').send({
      name: 'LinkedIn Candidate 1',
      email: 'linkedin1@example.com',
      password: 'password123',
      targetRole: 'Software Engineer'
    });
    user1Token = res1.body.data.token;
    user1Id = res1.body.data.user._id || res1.body.data.user.id;

    const res2 = await request(app).post('/api/auth/register').send({
      name: 'LinkedIn Candidate 2',
      email: 'linkedin2@example.com',
      password: 'password123',
      targetRole: 'Backend Developer'
    });
    user2Token = res2.body.data.token;
    user2Id = res2.body.data.user._id || res2.body.data.user.id;
  });

  describe('1. Security & Authentication', () => {
    test('unauthenticated requests to /api/linkedin/analyze are blocked with 401', async () => {
      const res = await request(app).post('/api/linkedin/analyze').send({
        inputMethod: 'manual',
        profileData: { headline: 'Software Engineer' }
      });
      expect(res.status).toBe(401);
    });

    test('unauthenticated requests to /api/linkedin/latest are blocked with 401', async () => {
      const res = await request(app).get('/api/linkedin/latest');
      expect(res.status).toBe(401);
    });
  });

  describe('2. URL Validation & Unauthorized Scraping Prevention', () => {
    test('rejects malformed LinkedIn URLs with clear error message', async () => {
      const res = await request(app)
        .post('/api/linkedin/analyze')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          inputMethod: 'url',
          url: 'https://twitter.com/notlinkedin'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Invalid LinkedIn URL/i);
    });

    test('does not perform unauthorized scraping on URL without credentials; returns graceful limitation response', async () => {
      const res = await request(app)
        .post('/api/linkedin/analyze')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          inputMethod: 'url',
          url: 'https://www.linkedin.com/in/test-engineer'
        });

      // 422 Unprocessable Entity explaining limitation and suggesting PDF upload or manual entry
      expect(res.status).toBe(422);
      expect(res.body.errorCode).toBe('LINKEDIN_AUTH_RESTRICTED');
      expect(res.body.suggestedAction).toBe('USE_PDF_OR_MANUAL');
      expect(res.body.message).toMatch(/Save to PDF/i);
    });

    test('successfully accepts and parses uploaded LinkedIn Profile PDF file via /api/linkedin/upload-pdf', async () => {
      const fs = require('fs');
      const path = require('path');
      const pdfBuffer = fs.readFileSync(path.join(__dirname, '../node_modules/pdf-parse/test/data/05-versions-space.pdf'));

      const res = await request(app)
        .post('/api/linkedin/upload-pdf')
        .set('Authorization', `Bearer ${user1Token}`)
        .attach('file', pdfBuffer, 'linkedin_profile.pdf')
        .field('targetRole', 'Software Engineer');

      expect(res.status).toBe(201);


      expect(res.body.success).toBe(true);
      expect(res.body.data.review).toBeDefined();
      expect(res.body.data.review.inputMethod).toBe('pdf');
      expect(res.body.data.review.overallScore).toBeGreaterThan(0);
    });
  });


  describe('3. Rubric Scoring & Explainable Results', () => {
    test('analyzes full profile data and calculates deterministic score matching 100-pt rubric sum', async () => {
      const profileData = {
        fullName: 'Jane Developer',
        headline: 'Full-Stack Engineer | React, Node.js, AWS | Building Scalable Web Apps',
        about: 'Passionate software engineer with hands-on experience building distributed backend systems and responsive web applications. Proven track record of architecting performant REST APIs and optimizing database throughput.',
        skills: ['JavaScript', 'React', 'Node.js', 'Python', 'PostgreSQL', 'Docker', 'AWS', 'Git'],
        experience: [
          {
            title: 'Software Engineer Intern',
            company: 'TechCorp Solutions',
            duration: 'Jan 2024 - Present',
            description: 'Engineered REST microservices using Node.js and MongoDB. Optimized database queries reducing latency by 30% for 50k daily active users.',
            isCurrent: true
          }
        ],
        projects: [
          {
            name: 'Cloud Resume AI',
            description: 'Automated placement analyzer built with React and Express.',
            techStack: ['React', 'Express', 'MongoDB'],
            link: 'https://github.com/janedev/cloud-resume'
          }
        ],
        education: [
          {
            school: 'National Institute of Technology',
            degree: 'B.Tech Computer Science',
            fieldOfStudy: 'Computer Science',
            year: '2025'
          }
        ],
        featuredLinks: [
          {
            title: 'GitHub Portfolio',
            url: 'https://github.com/janedev'
          }
        ],
        achievements: [
          'Winner - Smart India Hackathon 2024 (1st Prize among 300+ teams)'
        ]
      };

      const res = await request(app)
        .post('/api/linkedin/analyze')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          inputMethod: 'manual',
          profileData,
          targetRole: 'Full-Stack Developer'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const review = res.body.data.review;
      expect(review).toBeDefined();
      expect(review.userId.toString()).toBe(user1Id.toString());

      // Check all 8 categories exist
      const { headline, about, experience, projects, skills, education, featured, achievements } = review.categoryScores;
      expect(headline.max).toBe(10);
      expect(about.max).toBe(15);
      expect(experience.max).toBe(15);
      expect(projects.max).toBe(15);
      expect(skills.max).toBe(15);
      expect(education.max).toBe(10);
      expect(featured.max).toBe(10);
      expect(achievements.max).toBe(10);

      // Verify exact mathematical sum
      const categorySum =
        headline.score +
        about.score +
        experience.score +
        projects.score +
        skills.score +
        education.score +
        featured.score +
        achievements.score;

      expect(review.overallScore).toBe(categorySum);
      expect(review.overallScore).toBeGreaterThanOrEqual(75);

      // Check qualitative enhancements
      expect(review.strengths.length).toBeGreaterThanOrEqual(1);
      expect(review.strengths.length).toBeLessThanOrEqual(3);
      expect(review.weaknesses.length).toBeLessThanOrEqual(3);
      expect(review.improvedHeadline).toContain('Full-Stack Developer');
      expect(review.improvedAbout).toBeDefined();
      expect(review.actionChecklist.length).toBeGreaterThan(0);
      expect(review.recommendedKeywords.length).toBeGreaterThan(0);
    });

    test('marks missing profile sections as unavailable and does not hallucinate data', async () => {
      const minimalProfile = {
        headline: 'Student',
        about: '',
        skills: ['Java'],
        experience: [],
        projects: [],
        education: []
      };

      const res = await request(app)
        .post('/api/linkedin/analyze')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          inputMethod: 'manual',
          profileData: minimalProfile,
          targetRole: 'Software Engineer'
        });

      expect(res.status).toBe(201);
      const review = res.body.data.review;

      // Experience, projects, about, and education were missing
      expect(review.categoryScores.experience.status).toBe('unavailable');
      expect(review.categoryScores.projects.status).toBe('unavailable');
      expect(review.categoryScores.about.status).toBe('unavailable');
      expect(review.missingSections).toContain('Experience');
      expect(review.missingSections).toContain('Projects');
      expect(review.missingSections).toContain('About / Summary');

      // The overall score should reflect missing categories honestly
      expect(review.overallScore).toBeLessThan(45);
    });
  });

  describe('4. Persistence, History & Multi-Tenant Authorization', () => {
    test('persists review and allows retrieval of latest review and history', async () => {
      // Create review
      await request(app)
        .post('/api/linkedin/analyze')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          inputMethod: 'manual',
          profileData: {
            headline: 'Frontend Engineer | React Developer',
            about: 'Building clean interactive web interfaces.',
            skills: ['React', 'JavaScript', 'CSS3']
          }
        });

      const latestRes = await request(app)
        .get('/api/linkedin/latest')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(latestRes.status).toBe(200);
      expect(latestRes.body.data.review).toBeDefined();
      expect(latestRes.body.data.review.userId.toString()).toBe(user1Id.toString());

      const historyRes = await request(app)
        .get('/api/linkedin/history')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(historyRes.status).toBe(200);
      expect(historyRes.body.data.history.length).toBeGreaterThanOrEqual(1);
    });

    test('multi-tenant isolation: User 2 cannot access User 1 latest review or history', async () => {
      // User 1 creates review
      await request(app)
        .post('/api/linkedin/analyze')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          inputMethod: 'manual',
          profileData: {
            headline: 'Security Specialist',
            skills: ['Python', 'Linux']
          }
        });

      // User 2 has not submitted a review yet
      const user2Latest = await request(app)
        .get('/api/linkedin/latest')
        .set('Authorization', `Bearer ${user2Token}`);

      expect(user2Latest.status).toBe(200);
      expect(user2Latest.body.data.review).toBeNull();
    });
  });

  describe('5. Placement Readiness Adapter Integration', () => {
    test('linkedinScoreAdapter returns not_assessed when candidate has no LinkedIn review', async () => {
      const evaluation = await linkedinScoreAdapter.evaluate(user2Id);
      expect(evaluation.component.status).toBe('not_assessed');
      expect(evaluation.component.score).toBeNull();
      expect(evaluation.component.weight).toBe(5);
    });

    test('linkedinScoreAdapter returns assessed score and findings when review exists', async () => {
      await request(app)
        .post('/api/linkedin/analyze')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          inputMethod: 'manual',
          profileData: {
            headline: 'Software Engineer | Python & Django',
            about: 'Backend specialist with high volume database experience.',
            skills: ['Python', 'Django', 'PostgreSQL'],
            projects: [{ name: 'Task Manager', description: 'Built API backend.' }]
          }
        });

      const evaluation = await linkedinScoreAdapter.evaluate(user1Id);
      expect(evaluation.component.status).toBe('assessed');
      expect(evaluation.component.score).toBeGreaterThan(0);
      expect(evaluation.component.weight).toBe(5);
      expect(evaluation.component.source.type).toBe('linkedin_review');
    });
  });
});
