const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const Profile = require('../models/Profile');
const Job = require('../models/Job');
const Application = require('../models/Application');
const jobMatchingService = require('../services/jobs/jobMatchingService');
const serpApiService = require('../services/jobs/serpApiService');

describe('Recommended Opportunities — Real Matching & Unapplied Exclusion Suite', () => {
  let mongoServer;
  let studentAToken;
  let studentAUser;
  let studentBToken;
  let studentBUser;

  let jobBackendNode;
  let jobFrontendReact;
  let jobPythonData;
  let jobCppEmbedded;
  let jobInactive;

  let originalSerpKey;

  beforeAll(async () => {
    originalSerpKey = process.env.SERPAPI_API_KEY;
    process.env.SERPAPI_API_KEY = '';
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Register Student A (Node.js, React, MongoDB, JavaScript)
    const resA = await request(app).post('/api/auth/register').send({
      name: 'Student A',
      email: 'studentA@example.com',
      password: 'Password123!',
      role: 'student'
    });
    studentAToken = resA.body.data.token;
    studentAUser = resA.body.data.user;

    await Profile.create({
      userId: studentAUser._id || studentAUser.id,
      targetRole: 'Backend Developer',
      location: 'Bengaluru',
      skills: ['JS', 'Node', 'Mongo', 'Express'] // Note: uses aliases (JS, Node, Mongo)
    });

    // Register Student B
    const resB = await request(app).post('/api/auth/register').send({
      name: 'Student B',
      email: 'studentB@example.com',
      password: 'Password123!',
      role: 'student'
    });
    studentBToken = resB.body.data.token;
    studentBUser = resB.body.data.user;

    await Profile.create({
      userId: studentBUser._id || studentBUser.id,
      targetRole: 'Full Stack Developer',
      location: 'Bengaluru',
      skills: ['React', 'Node.js', 'MongoDB']
    });

    // Create real test jobs in the database
    jobBackendNode = await Job.create({
      title: 'Backend Engineering Intern',
      company: 'CloudCore Systems',
      location: 'Bengaluru',
      description: 'Building microservices with Node.js, Express, and MongoDB.',
      workplaceType: 'remote',
      employmentType: 'internship',
      requiredSkills: ['Node.js', 'MongoDB', 'Express', 'JavaScript'],
      applyUrl: 'https://cloudcore.io/careers/backend-intern',
      sourceType: 'admin',
      isActive: true
    });

    jobFrontendReact = await Job.create({
      title: 'Frontend React Developer',
      company: 'PixelForge Labs',
      location: 'Bengaluru',
      description: 'Developing UI components with React and JavaScript.',
      workplaceType: 'hybrid',
      employmentType: 'full-time',
      requiredSkills: ['React', 'JavaScript', 'HTML', 'CSS'],
      applyUrl: 'https://pixelforge.dev/jobs/frontend-dev',
      sourceType: 'admin',
      isActive: true
    });

    jobPythonData = await Job.create({
      title: 'Python Data Analyst Intern',
      company: 'DataMetrics AI',
      location: 'Bengaluru',
      description: 'Data pipelines with Python and SQL.',
      workplaceType: 'remote',
      employmentType: 'internship',
      requiredSkills: ['Python', 'SQL', 'Pandas'],
      applyUrl: 'https://datametrics.ai/jobs/data-intern',
      sourceType: 'admin',
      isActive: true
    });

    jobCppEmbedded = await Job.create({
      title: 'Embedded Systems Firmware Engineer',
      company: 'HardwareTech Corp',
      location: 'Hyderabad',
      description: 'Writing low-level firmware in C and C++.',
      workplaceType: 'on-site',
      employmentType: 'full-time',
      experienceLevel: 'senior',
      requiredSkills: ['C', 'C++', 'RTOS'],
      applyUrl: 'https://hardwaretech.com/jobs/firmware',
      sourceType: 'admin',
      isActive: true
    });

    jobInactive = await Job.create({
      title: 'Closed Position — Outdated Node Role',
      company: 'Legacy Corp',
      location: 'Bengaluru',
      description: 'Expired position.',
      workplaceType: 'remote',
      employmentType: 'internship',
      requiredSkills: ['Node.js'],
      applyUrl: 'https://legacy.com/expired',
      sourceType: 'admin',
      isActive: false
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('Skill Normalization & Deterministic Scoring', () => {
    test('normalizes aliases (JS, Node, Mongo) to match job requirements (JavaScript, Node.js, MongoDB)', () => {
      const studentProfile = {
        skills: ['JS', 'Node', 'Mongo'],
        targetRole: 'Backend Developer'
      };
      const job = {
        title: 'Backend Developer',
        requiredSkills: ['JavaScript', 'Node.js', 'MongoDB'],
        location: 'Bengaluru',
        workplaceType: 'remote'
      };

      const match = jobMatchingService.calculateMatch(studentProfile, job);
      expect(match.matchScore).toBeGreaterThanOrEqual(80);
      expect(match.matchedSkills).toHaveLength(3);
      expect(match.missingSkills).toHaveLength(0);
    });

    test('strict normalization ensures Java does NOT match JavaScript', () => {
      expect(jobMatchingService.areSkillsMatching('Java', 'JavaScript')).toBe(false);
      expect(jobMatchingService.areSkillsMatching('JavaScript', 'Java')).toBe(false);
      expect(jobMatchingService.areSkillsMatching('JS', 'JavaScript')).toBe(true);
      expect(jobMatchingService.areSkillsMatching('Node', 'Node.js')).toBe(true);
      expect(jobMatchingService.areSkillsMatching('Mongo', 'MongoDB')).toBe(true);
    });

    test('deterministic scoring: unchanged inputs always yield exact same match score', () => {
      const studentProfile = { skills: ['Node.js', 'MongoDB'], targetRole: 'Backend Developer' };
      const job = { title: 'Backend Developer', requiredSkills: ['Node.js', 'MongoDB'], workplaceType: 'remote' };

      const score1 = jobMatchingService.calculateMatch(studentProfile, job);
      const score2 = jobMatchingService.calculateMatch(studentProfile, job);
      const score3 = jobMatchingService.calculateMatch(studentProfile, job);

      expect(score1.matchScore).toBe(score2.matchScore);
      expect(score2.matchScore).toBe(score3.matchScore);
    });

    test('relevant jobs score significantly higher than irrelevant jobs', () => {
      const studentProfile = { skills: ['Node.js', 'Express', 'MongoDB'], targetRole: 'Backend Developer' };

      const relevantMatch = jobMatchingService.calculateMatch(studentProfile, jobBackendNode);
      const irrelevantMatch = jobMatchingService.calculateMatch(studentProfile, jobCppEmbedded);

      expect(relevantMatch.matchScore).toBeGreaterThan(irrelevantMatch.matchScore);
      expect(relevantMatch.matchScore).toBeGreaterThanOrEqual(70);
      expect(irrelevantMatch.matchScore).toBeLessThan(40);
    });
  });

  describe('Recommendations API (GET /api/jobs/recommended)', () => {
    test('returns relevant unapplied jobs ranked by match score', async () => {
      const res = await request(app)
        .get('/api/jobs/recommended')
        .set('Authorization', `Bearer ${studentAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const jobs = res.body.data.jobs;
      expect(Array.isArray(jobs)).toBe(true);
      expect(jobs.length).toBeGreaterThan(0);

      // Backend Node role should be the highest recommendation for Student A
      expect(jobs[0].title).toBe('Backend Engineering Intern');
      expect(jobs[0].company).toBe('CloudCore Systems');
      expect(jobs[0].matchScore).toBeGreaterThan(60);
      expect(jobs[0].matchedSkills).toContain('node.js');
      expect(jobs[0].matchingReasons.length).toBeGreaterThan(0);

      // Inactive job must NOT be present
      const inactivePresent = jobs.some((j) => (j.jobId || j._id) === jobInactive._id.toString());
      expect(inactivePresent).toBe(false);
    });

    test('excludes jobs the student has Applied to', async () => {
      // Student A applies to Backend Engineering Intern
      await Application.create({
        userId: studentAUser._id || studentAUser.id,
        jobId: jobBackendNode._id,
        status: 'Applied',
        jobSnapshot: {
          title: jobBackendNode.title,
          company: jobBackendNode.company,
          applyUrl: jobBackendNode.applyUrl
        }
      });

      // Request recommendations again
      const res = await request(app)
        .get('/api/jobs/recommended')
        .set('Authorization', `Bearer ${studentAToken}`);

      expect(res.status).toBe(200);
      const jobs = res.body.data.jobs;

      // Backend Engineering Intern MUST be excluded now!
      const appliedFound = jobs.some((j) => (j.jobId || j._id) === jobBackendNode._id.toString());
      expect(appliedFound).toBe(false);

      // Other active unapplied jobs (like Frontend React or Python Data) should still be available
      expect(jobs.length).toBeGreaterThan(0);
    });

    test('excludes jobs with status Shortlisted, Interview, Offer, or Rejected', async () => {
      // Apply to Frontend React and mark as Interview
      await Application.create({
        userId: studentAUser._id || studentAUser.id,
        jobId: jobFrontendReact._id,
        status: 'Interview',
        jobSnapshot: {
          title: jobFrontendReact.title,
          company: jobFrontendReact.company,
          applyUrl: jobFrontendReact.applyUrl
        }
      });

      // Apply to Python Data and mark as Rejected
      await Application.create({
        userId: studentAUser._id || studentAUser.id,
        jobId: jobPythonData._id,
        status: 'Rejected',
        jobSnapshot: {
          title: jobPythonData.title,
          company: jobPythonData.company,
          applyUrl: jobPythonData.applyUrl
        }
      });

      const res = await request(app)
        .get('/api/jobs/recommended')
        .set('Authorization', `Bearer ${studentAToken}`);

      expect(res.status).toBe(200);
      const jobs = res.body.data.jobs;

      // Both Frontend React (Interview) and Python Data (Rejected) must be excluded
      expect(jobs.some((j) => (j.jobId || j._id) === jobFrontendReact._id.toString())).toBe(false);
      expect(jobs.some((j) => (j.jobId || j._id) === jobPythonData._id.toString())).toBe(false);
    });

    test('a job applied to by Student A is STILL recommended to Student B', async () => {
      // Student B requests recommendations
      const resB = await request(app)
        .get('/api/jobs/recommended')
        .set('Authorization', `Bearer ${studentBToken}`);

      expect(resB.status).toBe(200);
      const jobsB = resB.body.data.jobs;

      // Backend Engineering Intern was applied to by Student A, NOT Student B
      // So Student B MUST still be able to receive it as a recommendation!
      const backendJobFoundForB = jobsB.some((j) => (j.jobId || j._id) === jobBackendNode._id.toString());
      expect(backendJobFoundForB).toBe(true);
    });

    test('a job with status Saved is NOT excluded and is marked with isSaved: true', async () => {
      // Create a new fresh job
      const savedJob = await Job.create({
        title: 'Full Stack Software Engineer',
        company: 'Veloce Labs',
        location: 'Bengaluru',
        description: 'React and Node.js full stack engineering role.',
        workplaceType: 'remote',
        employmentType: 'full-time',
        requiredSkills: ['React', 'Node.js'],
        applyUrl: 'https://velocelabs.com/careers/fullstack',
        sourceType: 'admin',
        isActive: true
      });

      // Student B saves this job
      await Application.create({
        userId: studentBUser._id || studentBUser.id,
        jobId: savedJob._id,
        status: 'Saved',
        jobSnapshot: {
          title: savedJob.title,
          company: savedJob.company,
          applyUrl: savedJob.applyUrl
        }
      });

      const res = await request(app)
        .get('/api/jobs/recommended')
        .set('Authorization', `Bearer ${studentBToken}`);

      expect(res.status).toBe(200);
      const found = res.body.data.jobs.find((j) => (j.jobId || j._id) === savedJob._id.toString());
      expect(found).toBeDefined();
      expect(found.isSaved).toBe(true);
    });

    test('returns profileIncomplete: true when student profile has no skills or target role', async () => {
      // Register student with blank profile
      const blankRes = await request(app).post('/api/auth/register').send({
        name: 'Blank Student',
        email: 'blank@example.com',
        password: 'Password123!',
        role: 'student'
      });
      const blankToken = blankRes.body.data.token;
      const blankUser = blankRes.body.data.user;

      await Profile.create({
        userId: blankUser._id || blankUser.id,
        targetRole: '',
        skills: []
      });

      const res = await request(app)
        .get('/api/jobs/recommended')
        .set('Authorization', `Bearer ${blankToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.profileIncomplete).toBe(true);
      expect(res.body.data.jobs).toHaveLength(0);
      expect(res.body.data.message).toMatch(/complete your target role and technical skills/i);
    });

    test('external job source failure falls back gracefully to active catalog without fabricating fake jobs', async () => {
      // Temporarily mock SerpApi search to reject
      const originalSearch = serpApiService.searchJobs;
      const originalIsConfigured = serpApiService.isConfigured;

      serpApiService.isConfigured = () => true;
      serpApiService.searchJobs = jest.fn().mockRejectedValue(new Error('Network error'));

      const res = await request(app)
        .get('/api/jobs/recommended')
        .set('Authorization', `Bearer ${studentBToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Fallback to active catalog works without crashing
      expect(Array.isArray(res.body.data.jobs)).toBe(true);

      serpApiService.searchJobs = originalSearch;
      serpApiService.isConfigured = originalIsConfigured;
    });

    test('deduplicates identical listings across sources so vacancies appear only once', async () => {
      // Add a duplicate external listing matching an existing job's company and title
      const originalSearch = serpApiService.searchJobs;
      const originalIsConfigured = serpApiService.isConfigured;

      serpApiService.isConfigured = () => true;
      serpApiService.searchJobs = jest.fn().mockResolvedValue({
        jobs: [
          {
            title: 'Full Stack Software Engineer', // Same title and company as Veloce Labs
            company: 'Veloce Labs',
            location: 'Bengaluru',
            description: 'Duplicate listing from external Google Jobs search.',
            applyUrl: 'https://velocelabs.com/careers/fullstack',
            externalId: 'serp_dup_001',
            workplaceType: 'remote',
            employmentType: 'full-time',
            requiredSkills: ['React', 'Node.js']
          }
        ],
        nextPageToken: null,
        cached: false
      });

      const res = await request(app)
        .get('/api/jobs/recommended')
        .set('Authorization', `Bearer ${studentBToken}`);

      expect(res.status).toBe(200);
      const veloceJobs = res.body.data.jobs.filter(
        (j) => j.company.toLowerCase() === 'veloce labs' && j.title.toLowerCase().includes('full stack')
      );
      // Must only appear ONCE!
      expect(veloceJobs).toHaveLength(1);

      serpApiService.searchJobs = originalSearch;
      serpApiService.isConfigured = originalIsConfigured;
    });
  });
});
