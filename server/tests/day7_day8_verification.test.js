const request = require('supertest');
const app = require('../app');
const Job = require('../models/Job');
const Application = require('../models/Application');
const InterviewSession = require('../models/InterviewSession');
const ReadinessAssessment = require('../models/ReadinessAssessment');
const OllamaProvider = require('../services/ai/OllamaProvider');
require('./setup');

describe('Day 7 & Day 8 Comprehensive Integration & Verification', () => {
  let studentToken;
  let studentId;
  let adminToken;
  let adminId;

  beforeEach(async () => {
    const rand = Math.random().toString(36).substring(2, 9);
    // 1. Register student
    const studentRes = await request(app).post('/api/auth/register').send({
      name: 'Verification Student',
      email: `student_${Date.now()}_${rand}@test.edu`,
      password: 'StrongPassword123'
    });
    studentToken = studentRes.body.data.token;
    studentId = studentRes.body.data.user.id;

    // 2. Register authorized MSOT admin using secret code
    const adminRes = await request(app).post('/api/auth/register').send({
      name: 'MSOT Placement Admin',
      email: `admin_${Date.now()}_${rand}@university.edu`,
      password: 'AdminPassword123',
      role: 'admin',
      adminSecretCode: process.env.ADMIN_REGISTRATION_SECRET || 'msot_admin_secret_placement_copilot_2026'
    });
    adminToken = adminRes.body.data.token;
    adminId = adminRes.body.data.user.id;
  });

  describe('1. Health Check & Operational Metrics', () => {
    it('returns 200 with operational database state and aiProvider info', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.environment).toBe('test');
      expect(res.body.aiProvider).toBeDefined();
    });
  });

  describe('2. Complete Student Workflow End-to-End', () => {
    it('executes profile -> interview -> jobs -> tracker -> cascade deletion flow', async () => {
      // Step A: Setup Candidate Profile
      const profileRes = await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          targetRole: 'Full Stack Developer',
          location: 'Bangalore',
          skills: ['Node.js', 'React', 'MongoDB', 'Express', 'TypeScript'],
          education: 'B.Tech CSE, 2025',
          projects: [
            {
              name: 'Campus Placement Portal',
              description: 'MERN stack portal with real-time analytics',
              techStack: ['Node.js', 'React', 'MongoDB'],
              githubUrl: 'https://github.com/student/portal'
            }
          ]
        });
      expect(profileRes.status).toBe(200);
      expect(profileRes.body.data.profile.skills).toContain('Node.js');

      // Step B: Start Mock Interview
      const interviewStartRes = await request(app)
        .post('/api/interviews')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          targetRole: 'Full Stack Developer',
          durationMinutes: 15,
          focus: 'project_deep_dive'
        });
      expect(interviewStartRes.status).toBe(201);
      const session = interviewStartRes.body.data.session;
      expect(session.status).toBe('active');
      expect(session.questions.length).toBeGreaterThanOrEqual(4);

      // Step C: Submit Answer for First Question
      const firstQ = session.questions[0];
      const answerRes = await request(app)
        .post(`/api/interviews/${session._id}/answer`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          questionId: firstQ.id,
          answerText: 'In our MERN architecture, we handled database connections via Mongoose connection pooling and enforced JWT authentication in Express middleware.'
        });
      expect(answerRes.status).toBe(200);
      expect(answerRes.body.data.session.transcript.length).toBe(1);

      // Step D: Complete Interview and Evaluate
      const completeRes = await request(app)
        .post(`/api/interviews/${session._id}/complete`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(completeRes.status).toBe(200);
      expect(['evaluation_pending', 'completed']).toContain(completeRes.body.data.session.status);

      const evalRes = await request(app)
        .post(`/api/interviews/${session._id}/evaluate`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(evalRes.status).toBe(200);
      expect(evalRes.body.data.session.status).toBe('completed');
      expect(evalRes.body.data.session.evaluation.overallScore).toBeGreaterThanOrEqual(0);
      expect(evalRes.body.data.session.evaluation.dimensions.length).toBe(5);

      // Step E: Admin creates and publishes a campus drive
      const jobCreateRes = await request(app)
        .post('/api/admin/jobs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Full Stack Software Engineer',
          company: 'Acme Technologies',
          description: 'Building cloud scalable distributed backend services and responsive client web applications.',
          location: 'Bangalore',
          workplaceType: 'hybrid',
          employmentType: 'full-time',
          requiredSkills: ['Node.js', 'React', 'MongoDB'],
          preferredSkills: ['TypeScript', 'Docker'],
          applyUrl: 'https://acme.example.com/careers/apply'
        });
      expect(jobCreateRes.status).toBe(201);
      const createdJob = jobCreateRes.body.data.job;

      // Step F: Student discovers recommended jobs with explainable match
      const recRes = await request(app)
        .get('/api/jobs/recommended')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(recRes.status).toBe(200);
      const matchedJob = recRes.body.data.jobs.find((j) => j._id.toString() === createdJob._id.toString());
      expect(matchedJob).toBeDefined();
      expect(matchedJob.match.matchScore).toBeGreaterThanOrEqual(60);
      expect(matchedJob.match.matchedSkills).toContain('node.js');

      // Step G: Student saves and tracks application
      const trackRes = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          jobId: createdJob._id,
          status: 'Applied',
          notes: 'Submitted resume via external portal.',
          followUpDate: new Date(Date.now() + 7 * 86400000).toISOString()
        });
      expect(trackRes.status).toBe(201);
      const appId = trackRes.body.data.application._id;

      // Step H: Update application status with audit trail
      const updateAppRes = await request(app)
        .patch(`/api/applications/${appId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          status: 'Interview',
          notes: 'Received invite for technical round.'
        });
      expect(updateAppRes.status).toBe(200);
      expect(updateAppRes.body.data.application.status).toBe('Interview');
      expect(updateAppRes.body.data.application.statusHistory.length).toBeGreaterThanOrEqual(2);

      // Step I: Student permanently deletes profile and all personal records
      const delProfileRes = await request(app)
        .delete('/api/profile')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(delProfileRes.status).toBe(200);

      // Verify cascade deletion: student's session and application are wiped
      const remainingSessions = await InterviewSession.find({ userId: studentId });
      expect(remainingSessions.length).toBe(0);

      const remainingApplications = await Application.find({ userId: studentId });
      expect(remainingApplications.length).toBe(0);

      // Verify shared job is NOT deleted!
      const jobStillExists = await Job.findById(createdJob._id);
      expect(jobStillExists).not.toBeNull();
      expect(jobStillExists.title).toBe('Full Stack Software Engineer');
    });
  });

  describe('3. Role Authorization & MSOT Admin Security', () => {
    it('strictly forbids students from creating jobs on admin endpoints', async () => {
      const res = await request(app)
        .post('/api/admin/jobs')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          title: 'Illicit Student Job',
          company: 'Hacker Inc',
          description: 'Unauthorized posting attempt',
          applyUrl: 'https://example.com',
          requiredSkills: ['Hacking']
        });
      expect(res.status).toBe(403);
    });

    it('rejects ordinary registration attempting to claim admin role without secret', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Sneaky User',
        email: 'sneaky@test.com',
        password: 'Password123',
        role: 'admin',
        adminSecretCode: 'wrong_secret'
      });
      // Strictly rejected with 403 Forbidden
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN_ADMIN_REGISTRATION');
    });

    it('allows admin to view applicants and advance candidate hiring status', async () => {
      // Create job
      const jobRes = await request(app)
        .post('/api/admin/jobs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Backend Intern',
          company: 'Cloud Corp',
          description: 'Internship role working on backend APIs and databases.',
          location: 'Remote',
          applyUrl: 'https://cloudcorp.example.com/apply',
          requiredSkills: ['Node.js', 'SQL']
        });
      expect(jobRes.status).toBe(201);
      const jobId = jobRes.body.data.job._id;

      // Student applies
      const appRes = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          jobId,
          status: 'Applied'
        });
      expect(appRes.status).toBe(201);
      const applicationId = appRes.body.data.application._id;

      // Admin views applicants
      const applicantsRes = await request(app)
        .get(`/api/admin/jobs/${jobId}/applicants`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(applicantsRes.status).toBe(200);
      expect(applicantsRes.body.data.applicants.length).toBe(1);

      // Admin updates status to Shortlisted
      const updateRes = await request(app)
        .patch(`/api/admin/jobs/${jobId}/applicants/${applicationId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'Shortlisted',
          note: 'Strong portfolio matched candidate requirements'
        });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.application.status).toBe('Shortlisted');
    });
  });

  describe('4. Local Ollama Provider Behavior & Graceful Fallback', () => {
    it('gracefully falls back to deterministic RuleOnlyProvider when Ollama is offline', async () => {
      const provider = new OllamaProvider('http://127.0.0.1:9999', 'llama3'); // Non-existent port

      // 1. Resume Review Fallback
      const review = await provider.reviewResume({
        parsedResume: { pageCount: 1, sections: { skills: { allSkills: ['Node.js', 'React'] } } },
        checks: [{ id: 'CHECK_PAGE_COUNT', name: 'Page Count', status: 'pass' }],
        score: 85
      });
      expect(review).toBeDefined();
      expect(review.strengths.length).toBeGreaterThan(0);
      expect(review.summary).toBeDefined();

      // 2. Question Generation Fallback
      const questionsResult = await provider.generateInterviewQuestions({
        targetRole: 'Software Engineer',
        skills: ['JavaScript', 'MongoDB'],
        projects: [{ name: 'Task App', techStack: ['JavaScript'] }],
        durationMinutes: 15
      });
      expect(questionsResult.questions.length).toBeGreaterThanOrEqual(4);
      expect(questionsResult.questions[0].prompt).toBeDefined();

      // 3. Evaluation Fallback
      const evalResult = await provider.evaluateInterview({
        targetRole: 'Software Engineer',
        focus: 'general',
        questions: [{ id: 'q1', prompt: 'Explain event loop' }],
        transcript: [{ questionPrompt: 'Explain event loop', answerText: 'Node.js event loop handles async callbacks with libuv.' }]
      });
      expect(evalResult.overallScore).toBeGreaterThanOrEqual(0);
      expect(evalResult.dimensions.length).toBe(5);
    });
  });
});
