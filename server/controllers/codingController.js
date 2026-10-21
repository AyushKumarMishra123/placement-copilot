const CodingProblem = require('../models/CodingProblem');
const CodingSubmission = require('../models/CodingSubmission');
const codeExecutionService = require('../services/coding/codeExecutionService');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * Controller for student-facing Coding Assessment APIs
 */

// GET /api/coding/problems - Get list of active problems (sanitized)
exports.getActiveProblems = async (req, res) => {
  try {
    const { topic, difficulty, search } = req.query;
    const query = { isActive: true, status: 'active' };

    const totalInDb = await CodingProblem.countDocuments();
    if (totalInDb === 0) {
      const { seedCodingProblems } = require('../scripts/seedCodingProblems');
      await seedCodingProblems({ verbose: false });
    }

    if (topic && topic !== 'all') {
      query.topic = topic;
    }
    if (difficulty && difficulty !== 'all') {
      query.difficulty = difficulty.charAt(0).toUpperCase() + difficulty.slice(1).toLowerCase();
    }
    if (search) {
      query.title = { $regex: search.trim(), $options: 'i' };
    }

    const problems = await CodingProblem.find(query)
      .select('-referenceSolution -testCases')
      .sort({ difficulty: 1, createdAt: 1 });

    // Also get solved status for current student
    const acceptedSubmissions = await CodingSubmission.find({
      userId: req.user.id,
      status: 'Accepted'
    }).select('problemId');

    const solvedSet = new Set(acceptedSubmissions.map((s) => s.problemId.toString()));

    const data = problems.map((p) => ({
      _id: p._id,
      slug: p.slug,
      title: p.title,
      topic: p.topic,
      difficulty: p.difficulty,
      maxScore: p.maxScore,
      stats: p.stats,
      isSolved: solvedSet.has(p._id.toString())
    }));

    return successResponse(res, { problems: data, total: data.length });
  } catch (err) {
    return errorResponse(res, err.message, 'CODING_FETCH_ERROR', 500);
  }
};

// GET /api/coding/problems/:id - Get problem details (sanitized: NO hidden test cases, NO reference solution)
exports.getProblemById = async (req, res) => {
  try {
    const { id } = req.params;
    const problem = await CodingProblem.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { slug: id }],
      isActive: true,
      status: 'active'
    });

    if (!problem) {
      return errorResponse(res, 'Coding problem not found or not currently active.', 'PROBLEM_NOT_FOUND', 404);
    }

    // Call toPublicJSON() to guarantee hidden testcases and reference solution are stripped
    const publicProblem = problem.toPublicJSON();

    // Attach student's previous submissions for this problem
    const userSubmissions = await CodingSubmission.find({
      userId: req.user.id,
      problemId: problem._id
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('status score passedTestCases totalTestCases runtimeMs createdAt');

    return successResponse(res, {
      problem: publicProblem,
      recentSubmissions: userSubmissions
    });
  } catch (err) {
    return errorResponse(res, err.message, 'PROBLEM_DETAIL_ERROR', 500);
  }
};

// POST /api/coding/problems/:id/run - Run student code against sample test cases only
exports.runSampleTests = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, language = 'javascript' } = req.body;

    if (!code || typeof code !== 'string') {
      return errorResponse(res, 'Source code is required.', 'MISSING_CODE', 400);
    }

    const problem = await CodingProblem.findById(id);
    if (!problem) {
      return errorResponse(res, 'Problem not found.', 'PROBLEM_NOT_FOUND', 404);
    }

    // Only run against public sample test cases (isHidden: false)
    const sampleTests = (problem.testCases || []).filter((tc) => !tc.isHidden);
    if (sampleTests.length === 0) {
      return errorResponse(res, 'No sample test cases available.', 'NO_SAMPLE_TESTS', 400);
    }

    // Run sample test cases concurrently
    const evalPromises = sampleTests.map((tc, idx) =>
      codeExecutionService
        .evaluateTestCase({
          language,
          code,
          testCase: tc,
          timeoutMs: problem.timeLimitMs || 3000
        })
        .then((evalResult) => ({ tc, evalResult, idx }))
    );

    const evaluated = await Promise.all(evalPromises);
    evaluated.sort((a, b) => a.idx - b.idx);

    const results = [];
    let allPassed = true;

    for (let i = 0; i < evaluated.length; i++) {
      const { tc, evalResult } = evaluated[i];
      if (!evalResult.passed) {
        allPassed = false;
      }

      results.push({
        testCaseIndex: i + 1,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput: evalResult.actualOutput,
        passed: evalResult.passed,
        status: evalResult.status,
        runtimeMs: evalResult.runtimeMs,
        compileOutput: evalResult.compileOutput,
        error: evalResult.error,
        explanation: tc.explanation
      });
    }

    return successResponse(res, {
      allPassed,
      results,
      totalCount: sampleTests.length,
      passedCount: results.filter((r) => r.passed).length
    });
  } catch (err) {
    const status = err.statusCode || (err.name === 'Judge0AuthError' ? 401 : err.name === 'Judge0RateLimitError' ? 429 : 500);
    return errorResponse(res, err.message, err.code || 'RUN_SAMPLE_ERROR', status);
  }
};

// POST /api/coding/problems/:id/submit - Submit student code against all test cases (sample + hidden)
exports.submitSolution = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, language = 'javascript' } = req.body;

    if (!code || typeof code !== 'string') {
      return errorResponse(res, 'Source code is required.', 'MISSING_CODE', 400);
    }

    const problem = await CodingProblem.findById(id);
    if (!problem || !problem.isActive) {
      return errorResponse(res, 'Problem not found or not active.', 'PROBLEM_UNAVAILABLE', 404);
    }

    const allTests = problem.testCases || [];
    if (allTests.length === 0) {
      return errorResponse(res, 'Problem has no configured test cases.', 'NO_TEST_CASES', 400);
    }

    // Execute all test cases concurrently for speed and responsiveness
    const evalPromises = allTests.map((tc, idx) =>
      codeExecutionService
        .evaluateTestCase({
          language,
          code,
          testCase: tc,
          timeoutMs: problem.timeLimitMs || 3000
        })
        .then((evalResult) => ({ tc, evalResult, idx }))
    );

    const evaluated = await Promise.all(evalPromises);
    evaluated.sort((a, b) => a.idx - b.idx);

    let passedCount = 0;
    let totalRuntime = 0;
    let finalStatus = 'Accepted';
    const testCaseResults = [];

    for (let i = 0; i < evaluated.length; i++) {
      const { tc, evalResult } = evaluated[i];
      totalRuntime += evalResult.runtimeMs;

      if (evalResult.passed) {
        passedCount++;
      } else if (finalStatus === 'Accepted') {
        finalStatus = evalResult.status;
      }

      // CRITICAL: NEVER return input/output for hidden test cases to students
      testCaseResults.push({
        testCaseIndex: i + 1,
        passed: evalResult.passed,
        status: evalResult.status,
        runtimeMs: evalResult.runtimeMs,
        isHidden: tc.isHidden,
        error: tc.isHidden ? (evalResult.passed ? null : 'Hidden test case failed') : evalResult.error,
        compileOutput: evalResult.compileOutput,
        input: tc.isHidden ? null : tc.input,
        expectedOutput: tc.isHidden ? null : tc.expectedOutput,
        actualOutput: tc.isHidden ? null : evalResult.actualOutput
      });
    }

    const score = Math.round((passedCount / allTests.length) * (problem.maxScore || 100));

    // Create persistent submission record
    const submission = await CodingSubmission.create({
      userId: req.user.id,
      problemId: problem._id,
      language,
      code,
      status: finalStatus,
      score,
      passedTestCases: passedCount,
      totalTestCases: allTests.length,
      runtimeMs: totalRuntime,
      testCaseResults
    });

    // Update problem stats
    problem.stats.submissionsCount = (problem.stats.submissionsCount || 0) + 1;
    if (finalStatus === 'Accepted') {
      problem.stats.acceptedCount = (problem.stats.acceptedCount || 0) + 1;
    }
    await problem.save();

    return successResponse(
      res,
      {
        submission: {
          _id: submission._id,
          status: submission.status,
          score: submission.score,
          passedTestCases: submission.passedTestCases,
          totalTestCases: submission.totalTestCases,
          runtimeMs: submission.runtimeMs,
          testCaseResults: submission.testCaseResults,
          createdAt: submission.createdAt
        }
      },
      null,
      201
    );
  } catch (err) {
    const status = err.statusCode || (err.name === 'Judge0AuthError' ? 401 : err.name === 'Judge0RateLimitError' ? 429 : 500);
    return errorResponse(res, err.message, err.code || 'SUBMIT_ERROR', status);
  }
};

// GET /api/coding/health - Diagnostic check for Judge0 configuration and connectivity
exports.getCodingHealth = async (req, res) => {
  try {
    const health = await codeExecutionService.checkHealth();
    return successResponse(res, { judge0: health });
  } catch (err) {
    return errorResponse(res, err.message, 'JUDGE0_HEALTH_ERROR', 500);
  }
};

// GET /api/coding/submissions - Student's submission history
exports.getUserSubmissions = async (req, res) => {
  try {
    const submissions = await CodingSubmission.find({ userId: req.user.id })
      .populate('problemId', 'title slug topic difficulty')
      .sort({ createdAt: -1 })
      .limit(50);

    return successResponse(res, { submissions });
  } catch (err) {
    return errorResponse(res, err.message, 'SUBMISSIONS_FETCH_ERROR', 500);
  }
};

// GET /api/coding/stats - Student's coding assessment summary stats
exports.getUserCodingStats = async (req, res) => {
  try {
    const accepted = await CodingSubmission.find({
      userId: req.user.id,
      status: 'Accepted'
    }).populate('problemId', 'difficulty topic');

    const solvedProblemIds = new Set();
    const difficultySolved = { Easy: 0, Medium: 0, Hard: 0 };
    const topicSolved = {};

    for (const sub of accepted) {
      if (sub.problemId && !solvedProblemIds.has(sub.problemId._id.toString())) {
        solvedProblemIds.add(sub.problemId._id.toString());
        if (sub.problemId.difficulty && difficultySolved[sub.problemId.difficulty] !== undefined) {
          difficultySolved[sub.problemId.difficulty]++;
        }
        if (sub.problemId.topic) {
          topicSolved[sub.problemId.topic] = (topicSolved[sub.problemId.topic] || 0) + 1;
        }
      }
    }

    const totalSubmissions = await CodingSubmission.countDocuments({ userId: req.user.id });

    return successResponse(res, {
      totalSolved: solvedProblemIds.size,
      totalSubmissions,
      difficultySolved,
      topicSolved
    });
  } catch (err) {
    return errorResponse(res, err.message, 'STATS_FETCH_ERROR', 500);
  }
};
