const InterviewSession = require('../../models/InterviewSession');
const interviewContextService = require('./interviewContextService');
const interviewQuestionService = require('./interviewQuestionService');
const interviewEvaluationService = require('./interviewEvaluationService');
const readinessService = require('../readiness/readinessService');

class InterviewSessionService {
  /**
   * Start a new interview session or return active existing one
   */
  async startSession(userId, { targetRole, durationMinutes = 15, focus = 'general' }) {
    const duration = [15, 20].includes(Number(durationMinutes)) ? Number(durationMinutes) : 15;

    // Check if user already has an active, non-expired session
    const existingActive = await InterviewSession.findOne({
      userId,
      status: 'active',
      expiresAt: { $gt: new Date() }
    });

    if (existingActive) {
      return existingActive;
    }

    // Build personalized context from real user profile, resume, projects
    const context = await interviewContextService.buildStudentContext(userId, targetRole);

    // Generate questions
    const plan = await interviewQuestionService.generateInterviewPlan({
      targetRole: context.targetRole,
      durationMinutes: duration,
      focus,
      context
    });

    const now = new Date();
    const expiresAt = new Date(now.getTime() + duration * 60 * 1000);

    const session = await InterviewSession.create({
      userId,
      targetRole: context.targetRole,
      durationMinutes: duration,
      focus,
      status: 'active',
      startedAt: now,
      expiresAt,
      currentQuestionIndex: 0,
      questions: plan.questions,
      transcript: [],
      contextSnapshot: context,
      modelMetadata: {
        provider: plan.provider,
        generatedAt: now
      }
    });

    return session;
  }

  /**
   * Submit an answer for the current question
   */
  async submitAnswer(userId, sessionId, { questionId, answerText }) {
    const session = await InterviewSession.findOne({ _id: sessionId, userId });
    if (!session) {
      const err = new Error('Interview session not found.');
      err.code = 'SESSION_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    // Check expiration
    if (new Date() > new Date(session.expiresAt) || session.status === 'completed') {
      if (session.status === 'active') {
        session.status = 'evaluation_pending';
        await session.save();
        await this.evaluateAndFinalize(session);
      }
      const err = new Error('Interview time has expired. Session has been closed for evaluation.');
      err.code = 'SESSION_EXPIRED';
      err.status = 400;
      throw err;
    }

    const question = session.questions.find((q) => q.id === questionId);
    if (!question) {
      const err = new Error('Specified question does not belong to this interview session.');
      err.code = 'INVALID_QUESTION_ID';
      err.status = 400;
      throw err;
    }

    // Prevent duplicate submission for already answered question unless it was skipped
    const existingIdx = session.transcript.findIndex((t) => t.questionId === questionId);
    if (existingIdx >= 0) {
      session.transcript[existingIdx].answerText = answerText;
      session.transcript[existingIdx].submittedAt = new Date();
      session.transcript[existingIdx].skipped = false;
    } else {
      session.transcript.push({
        questionId: question.id,
        questionText: question.prompt,
        category: question.category,
        answerText,
        submittedAt: new Date(),
        skipped: false
      });
    }

    // Advance to next question
    if (session.currentQuestionIndex < session.questions.length - 1) {
      session.currentQuestionIndex += 1;
    }

    await session.save();
    return session;
  }

  /**
   * Skip a question
   */
  async skipQuestion(userId, sessionId, { questionId }) {
    const session = await InterviewSession.findOne({ _id: sessionId, userId });
    if (!session) {
      const err = new Error('Interview session not found.');
      err.code = 'SESSION_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    if (new Date() > new Date(session.expiresAt) || session.status === 'completed') {
      const err = new Error('Interview session is expired or completed.');
      err.code = 'SESSION_EXPIRED';
      err.status = 400;
      throw err;
    }

    const question = session.questions.find((q) => q.id === questionId);
    if (!question) {
      const err = new Error('Question not found in session.');
      err.code = 'INVALID_QUESTION_ID';
      err.status = 400;
      throw err;
    }

    const existingIdx = session.transcript.findIndex((t) => t.questionId === questionId);
    if (existingIdx >= 0) {
      session.transcript[existingIdx].skipped = true;
      session.transcript[existingIdx].answerText = '';
    } else {
      session.transcript.push({
        questionId: question.id,
        questionText: question.prompt,
        category: question.category,
        answerText: '',
        submittedAt: new Date(),
        skipped: true
      });
    }

    if (session.currentQuestionIndex < session.questions.length - 1) {
      session.currentQuestionIndex += 1;
    }

    await session.save();
    return session;
  }

  /**
   * Complete interview and run evaluation
   */
  async completeSession(userId, sessionId) {
    const session = await InterviewSession.findOne({ _id: sessionId, userId });
    if (!session) {
      const err = new Error('Interview session not found.');
      err.code = 'SESSION_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    if (session.status === 'completed' && session.evaluation) {
      return session;
    }

    session.status = 'evaluation_pending';
    session.completedAt = new Date();
    await session.save();

    return this.evaluateAndFinalize(session);
  }

  /**
   * Evaluates transcript and stores official scorecard
   */
  async evaluateAndFinalize(session) {
    try {
      session.evaluationStatus = 'pending';
      await session.save();

      const evalData = await interviewEvaluationService.evaluateSession({
        targetRole: session.targetRole,
        durationMinutes: session.durationMinutes,
        focus: session.focus,
        questions: session.questions,
        transcript: session.transcript,
        context: session.contextSnapshot
      });

      session.evaluation = evalData;
      session.status = 'completed';
      session.evaluationStatus = 'completed';
      session.completedAt = session.completedAt || new Date();
      await session.save();

      // Trigger readiness score update in background so Day 4 readiness dashboard immediately consumes this
      try {
        await readinessService.recalculate(session.userId);
      } catch (readinessErr) {
        console.warn('[InterviewSessionService] Readiness recalculation note:', readinessErr.message);
      }

      return session;
    } catch (evalErr) {
      console.error('[InterviewSessionService] Evaluation error:', evalErr.message);
      session.evaluationStatus = 'failed';
      session.status = 'evaluation_failed';
      await session.save();
      throw evalErr;
    }
  }

  /**
   * Retry failed evaluation
   */
  async retryEvaluation(userId, sessionId) {
    const session = await InterviewSession.findOne({ _id: sessionId, userId });
    if (!session) {
      const err = new Error('Interview session not found.');
      err.code = 'SESSION_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    return this.evaluateAndFinalize(session);
  }

  /**
   * Get all previous interview sessions for a student
   */
  async getUserInterviews(userId) {
    return InterviewSession.find({ userId })
      .sort({ createdAt: -1 })
      .select('-questions');
  }

  /**
   * Get single interview session by ID
   */
  async getSessionById(userId, sessionId) {
    const session = await InterviewSession.findOne({ _id: sessionId, userId });
    if (!session) {
      const err = new Error('Interview session not found.');
      err.code = 'SESSION_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    // Auto-complete if expired while user was disconnected
    if (session.status === 'active' && new Date() > new Date(session.expiresAt)) {
      session.status = 'evaluation_pending';
      session.completedAt = new Date();
      await session.save();
      return this.evaluateAndFinalize(session);
    }

    return session;
  }
}

module.exports = new InterviewSessionService();
