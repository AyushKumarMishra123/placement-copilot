const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const Profile = require('../models/Profile');
const Job = require('../models/Job');
const Application = require('../models/Application');
const jobMatchingService = require('../services/jobs/jobMatchingService');

describe('Day 6 — Job Discovery, Matching, Tracker & Admin Board Suite', () => {
  let mongoServer;
  let studentToken;
  let studentUser;
  let adminToken;
  let adminUser;
  let testJobId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Register student
    const studentRes = await request(app).post('/api/auth/register').send({
      name: 'Campus Jobseeker',
      email: 'jobseeker@example.com',
      password: 'Password123!',
      role: 'student'
    });
    studentToken = studentRes.body.data.token;
    studentUser = studentRes.body.data.user;

    // Register admin with secret code
    const adminRes = await request(app).post('/api/auth/register').send({
      name: 'MSOT Administrator',
      email: 'admin@msot.edu',
      password: 'Password123!',
      role: 'admin',
      adminSecretCode: 'msot_admin_secret_placement_copilot_2026'
    });
    adminToken = adminRes.body.data.token;
    adminUser = adminRes.body.data.user;

    // Set student profile
    await Profile.create({
      userId: studentUser._id || studentUser.id,
      targetRole: 'Full Stack Developer',
      location: 'Bangalore',
      skills: ['React', 'Node.js', 'MongoDB', 'TypeScript', 'Docker']
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  test('Ordinary registration cannot grant admin role without secret', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Fake Admin',
      email: 'hacker@example.com',
      password: 'Password123!',
      role: 'admin'
    });
    expect(res.status).toBe(403);
  });

  test('Student cannot access admin job routes', async () => {
    const res = await request(app)
      .get('/api/admin/jobs')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(403);
  });

  test('Admin can create, publish and retrieve a new job', async () => {
    const res = await request(app)
      .post('/api/admin/jobs')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Junior Full Stack Engineer',
        company: 'MSOT Tech Labs',
        description: 'Exciting campus placement opening for building modern web applications.',
        location: 'Bangalore',
        workplaceType: 'hybrid',
        employmentType: 'full-time',
        experienceLevel: 'entry',
        requiredSkills: ['React', 'Node.js', 'MongoDB'],
        preferredSkills: ['TypeScript', 'Docker'],
        salary: '8-12 LPA',
        applyUrl: 'https://careers.example.com/apply/101'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    testJobId = res.body.data.job._id;
    expect(res.body.data.job.title).toBe('Junior Full Stack Engineer');
  });

  test('Job Matching Service calculates deterministic 5-factor match score', () => {
    const profile = {
      targetRole: 'Junior Full Stack Engineer',
      location: 'Bangalore',
      skills: ['React', 'Node.js', 'MongoDB', 'Docker']
    };
    const job = {
      title: 'Junior Full Stack Engineer',
      company: 'Tech Corp',
      location: 'Bangalore',
      workplaceType: 'hybrid',
      requiredSkills: ['React', 'Node.js', 'MongoDB'],
      experienceLevel: 'entry',
      publishedAt: new Date()
    };

    const result = jobMatchingService.calculateMatch(profile, job);
    expect(result.matchScore).toBeGreaterThanOrEqual(80);
    expect(result.matchedSkills).toContain('react');
    expect(result.matchedSkills).toContain('node.js');
    expect(result.matchingReasons.length).toBeGreaterThanOrEqual(2);
  });

  test('GET /api/jobs returns active jobs with candidate match score', async () => {
    const res = await request(app)
      .get('/api/jobs')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.jobs)).toBe(true);
    expect(res.body.data.jobs.length).toBeGreaterThanOrEqual(1);
    const foundJob = res.body.data.jobs.find((j) => j._id === testJobId);
    expect(foundJob).toBeDefined();
    expect(typeof foundJob.matchScore).toBe('number');
  });

  test('POST /api/applications saves job to application tracker', async () => {
    const res = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        jobId: testJobId,
        status: 'Saved',
        notes: 'Reviewing company engineering blog before applying'
      });

    expect(res.status).toBe(201);
    expect(res.body.data.application.status).toBe('Saved');
    expect(res.body.data.application.statusHistory.length).toBe(1);
  });

  test('POST /api/applications prevents duplicate record and updates existing', async () => {
    const res = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        jobId: testJobId,
        status: 'Applied',
        notes: 'Submitted resume via external portal'
      });

    expect(res.status).toBe(200);
    expect(res.body.data.application.status).toBe('Applied');
    expect(res.body.data.application.statusHistory.length).toBe(2);
  });

  test('PATCH /api/applications/:id updates status and follow-up date', async () => {
    const listRes = await request(app)
      .get('/api/applications')
      .set('Authorization', `Bearer ${studentToken}`);
    const appRecord = listRes.body.data.applications[0];

    const followUp = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const updateRes = await request(app)
      .patch(`/api/applications/${appRecord._id}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        status: 'Interview',
        followUpDate: followUp,
        notes: 'First round technical interview scheduled'
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.application.status).toBe('Interview');
    expect(updateRes.body.data.application.statusHistory.length).toBe(3);
  });

  test('Admin can view applicants for their job posting', async () => {
    const res = await request(app)
      .get(`/api/admin/jobs/${testJobId}/applicants`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.applicants.length).toBe(1);
    expect(res.body.data.applicants[0].studentEmail).toBe('jobseeker@example.com');
  });

  test('Admin can update student application status', async () => {
    const applicantsRes = await request(app)
      .get(`/api/admin/jobs/${testJobId}/applicants`)
      .set('Authorization', `Bearer ${adminToken}`);
    const applicant = applicantsRes.body.data.applicants[0];

    const updateRes = await request(app)
      .patch(`/api/admin/jobs/${testJobId}/applicants/${applicant.applicationId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'Offer',
        note: 'Selected for campus placement role'
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.application.status).toBe('Offer');
  });
});
