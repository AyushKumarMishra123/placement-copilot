const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const Profile = require('../models/Profile');
const InterviewSession = require('../models/InterviewSession');
const readinessService = require('../services/readiness/readinessService');
const interviewScoreAdapter = require('../services/readiness/components/interviewScoreAdapter');

describe('Day 5 — Mock Interview Suite', () => {
  let mongoServer;
  let studentUser;
  let studentToken;
  let otherStudentToken;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Create student user
    const res = await request(app).post('/api/auth/register').send({
      name: 'Interview Candidate',
      email: 'candidate@example.com',
      password: 'Password123!',
      role: 'student'
    });
    studentToken = res.body.data.token;
    studentUser = res.body.data.user;

    // Create other user
    const otherRes = await request(app).post('/api/auth/register').send({
      name: 'Other Candidate',
      email: 'other@example.com',
      password: 'Password123!',
      role: 'student'
    });
    otherStudentToken = otherRes.body.data.token;

    // Set up profile for candidate
    await Profile.create({
      userId: studentUser._id || studentUser.id,
      targetRole: 'Backend Engineer',
      skills: ['Node.js', 'Express', 'MongoDB', 'Docker', 'Redis'],
      projects: [
        {
          name: 'Task Orchestrator',
          techStack: ['Node.js', 'MongoDB', 'Redis'],
          description: 'High throughput distributed queue'
        }
      ]
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  test('POST /api/interviews requires authentication', async () => {
    const res = await request(app).post('/api/interviews').send({
      targetRole: 'Backend Engineer'
    });
    expect(res.status).toBe(401);
  });

  test('POST /api/interviews generates personalized questions using profile', async () => {
    const res = await request(app)
      .post('/api/interviews')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        targetRole: 'Backend Engineer',
        durationMinutes: 15,
        focus: 'backend'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    const session = res.body.data.session;
    expect(session.targetRole).toBe('Backend Engineer');
    expect(session.status).toBe('active');
    expect(session.questions.length).toBeGreaterThanOrEqual(4);
    expect(session.questions[0].prompt).toBeDefined();
    expect(new Date(session.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  test('POST /api/interviews reconnects to active session if still running', async () => {
    const res = await request(app)
      .post('/api/interviews')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        targetRole: 'Backend Engineer',
        durationMinutes: 15
      });

    expect(res.status).toBe(201);
    const session = res.body.data.session;
    expect(session.status).toBe('active');
  });

  test('POST /api/interviews/:id/answer submits answer and advances index', async () => {
    const listRes = await request(app)
      .get('/api/interviews')
      .set('Authorization', `Bearer ${studentToken}`);
    const activeSession = listRes.body.data.interviews[0];

    const detailRes = await request(app)
      .get(`/api/interviews/${activeSession._id}`)
      .set('Authorization', `Bearer ${studentToken}`);
    const currentQuestion = detailRes.body.data.session.questions[0];

    const ansRes = await request(app)
      .post(`/api/interviews/${activeSession._id}/answer`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        questionId: currentQuestion.id,
        answerText: 'In Node.js, asynchronous operations are handled by the event loop and libuv thread pool. We avoid blocking the main thread by using non-blocking I/O, streams for large payloads, and Redis for caching frequent queries.'
      });

    expect(ansRes.status).toBe(200);
    expect(ansRes.body.data.session.transcript.length).toBe(1);
    expect(ansRes.body.data.session.transcript[0].skipped).toBe(false);
  });

  test('POST /api/interviews/:id/skip records question as skipped', async () => {
    const listRes = await request(app)
      .get('/api/interviews')
      .set('Authorization', `Bearer ${studentToken}`);
    const activeSession = listRes.body.data.interviews[0];

    const detailRes = await request(app)
      .get(`/api/interviews/${activeSession._id}`)
      .set('Authorization', `Bearer ${studentToken}`);
    const nextQuestion = detailRes.body.data.session.questions[1];

    const skipRes = await request(app)
      .post(`/api/interviews/${activeSession._id}/skip`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        questionId: nextQuestion.id
      });

    expect(skipRes.status).toBe(200);
    const transcript = skipRes.body.data.session.transcript;
    const skippedEntry = transcript.find((t) => t.questionId === nextQuestion.id);
    expect(skippedEntry).toBeDefined();
    expect(skippedEntry.skipped).toBe(true);
  });

  test('Another student cannot access this session (multi-tenant isolation)', async () => {
    const listRes = await request(app)
      .get('/api/interviews')
      .set('Authorization', `Bearer ${studentToken}`);
    const session = listRes.body.data.interviews[0];

    const unauthorizedRes = await request(app)
      .get(`/api/interviews/${session._id}`)
      .set('Authorization', `Bearer ${otherStudentToken}`);

    expect(unauthorizedRes.status).toBe(404);
  });

  test('POST /api/interviews/:id/complete finalizes and evaluates against official rubric', async () => {
    const listRes = await request(app)
      .get('/api/interviews')
      .set('Authorization', `Bearer ${studentToken}`);
    const session = listRes.body.data.interviews[0];

    const compRes = await request(app)
      .post(`/api/interviews/${session._id}/complete`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(compRes.status).toBe(200);
    const completedSession = compRes.body.data.session;
    expect(completedSession.status).toBe('completed');
    expect(completedSession.evaluationStatus).toBe('completed');
    expect(completedSession.evaluation).toBeDefined();
    expect(typeof completedSession.evaluation.overallScore).toBe('number');
    expect(completedSession.evaluation.dimensions.length).toBe(5);
    expect(completedSession.evaluation.dimensions[0].name).toBe('Technical Accuracy & Fundamentals');
  });

  test('InterviewScoreAdapter integrates with completed interview for Day 4 Readiness Score', async () => {
    const userId = studentUser._id || studentUser.id;
    const adapterResult = await interviewScoreAdapter.evaluate(userId);

    expect(adapterResult.component.key).toBe('interview');
    expect(adapterResult.component.weight).toBe(20);
    expect(adapterResult.component.status).toBe('assessed');
    expect(typeof adapterResult.component.score).toBe('number');
    expect(adapterResult.component.score).toBeGreaterThanOrEqual(0);
    expect(adapterResult.component.score).toBeLessThanOrEqual(100);
  });
});
