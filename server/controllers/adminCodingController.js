const CodingProblem = require('../models/CodingProblem');
const problemValidationService = require('../services/coding/problemValidationService');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * Controller for Administrator Question Management
 * Only accessible by authenticated administrators
 */

// GET /api/admin/coding/problems - Get all problems including drafts and validation status
exports.getAdminProblems = async (req, res) => {
  try {
    const { status, topic, difficulty, search } = req.query;
    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }
    if (topic && topic !== 'all') {
      query.topic = topic;
    }
    if (difficulty && difficulty !== 'all') {
      query.difficulty = difficulty.charAt(0).toUpperCase() + difficulty.slice(1).toLowerCase();
    }
    if (search) {
      query.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { slug: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const problems = await CodingProblem.find(query)
      .sort({ createdAt: -1 })
      .select('-testCases -referenceSolution.code');

    const total = await CodingProblem.countDocuments(query);

    return successResponse(res, { problems, total });
  } catch (err) {
    return errorResponse(res, err.message, 'ADMIN_CODING_FETCH_ERROR', 500);
  }
};

// GET /api/admin/coding/problems/:id - Get full problem details including hidden test cases and reference solution
exports.getAdminProblemById = async (req, res) => {
  try {
    const { id } = req.params;
    const problem = await CodingProblem.findById(id);

    if (!problem) {
      return errorResponse(res, 'Coding problem not found.', 'PROBLEM_NOT_FOUND', 404);
    }

    return successResponse(res, { problem });
  } catch (err) {
    return errorResponse(res, err.message, 'ADMIN_CODING_DETAIL_ERROR', 500);
  }
};

// POST /api/admin/coding/problems - Create a new problem (default draft)
exports.createProblem = async (req, res) => {
  try {
    const {
      title,
      slug,
      topic,
      difficulty,
      description,
      constraints,
      hints,
      timeLimitMs,
      maxScore,
      starterCode,
      referenceSolution,
      testCases
    } = req.body;

    if (!title || !description || !topic) {
      return errorResponse(res, 'Title, topic, and description are required.', 'VALIDATION_ERROR', 400);
    }

    // Auto-generate slug if not provided
    const generatedSlug =
      slug ||
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') +
        '-' +
        Date.now().toString().slice(-4);

    const existingSlug = await CodingProblem.findOne({ slug: generatedSlug });
    if (existingSlug) {
      return errorResponse(res, `A problem with slug "${generatedSlug}" already exists.`, 'SLUG_EXISTS', 409);
    }

    const problem = new CodingProblem({
      title,
      slug: generatedSlug,
      topic,
      difficulty: difficulty || 'Easy',
      description,
      constraints: constraints || [],
      hints: hints || [],
      timeLimitMs: timeLimitMs || 2000,
      maxScore: maxScore || 100,
      starterCode: starterCode || {},
      referenceSolution: referenceSolution || { language: 'javascript', code: '' },
      testCases: testCases || [],
      status: 'draft',
      isActive: false,
      isSeeded: false,
      validationStatus: {
        isValidated: false,
        passedCount: 0,
        totalCount: testCases?.length || 0,
        errors: []
      }
    });

    await problem.save();

    return successResponse(res, { problem }, null, 201);
  } catch (err) {
    return errorResponse(res, err.message, 'CREATE_PROBLEM_ERROR', 500);
  }
};

// PUT /api/admin/coding/problems/:id - Update problem details
exports.updateProblem = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Prevent direct bypass of validation
    if (updates.status === 'active' || updates.isActive === true) {
      const existing = await CodingProblem.findById(id);
      if (!existing.validationStatus?.isValidated) {
        return errorResponse(
          res,
          'Cannot activate problem: Reference solution must be validated against all test cases first.',
          'NOT_VALIDATED',
          400
        );
      }
    }

    // If reference solution or test cases were modified, reset validation status
    if (updates.referenceSolution || updates.testCases) {
      updates['validationStatus.isValidated'] = false;
      updates.status = 'draft';
      updates.isActive = false;
    }

    // Mark as admin-modified so idempotent seeder will not overwrite
    updates.isSeeded = false;

    const problem = await CodingProblem.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    if (!problem) {
      return errorResponse(res, 'Problem not found.', 'PROBLEM_NOT_FOUND', 404);
    }

    return successResponse(res, { problem });
  } catch (err) {
    return errorResponse(res, err.message, 'UPDATE_PROBLEM_ERROR', 500);
  }
};

// POST /api/admin/coding/problems/:id/validate - Run validation pipeline against reference solution
exports.validateProblem = async (req, res) => {
  try {
    const { id } = req.params;
    const problem = await CodingProblem.findById(id);

    if (!problem) {
      return errorResponse(res, 'Problem not found.', 'PROBLEM_NOT_FOUND', 404);
    }

    const validation = await problemValidationService.validateProblem(problem);

    problem.validationStatus = {
      isValidated: validation.isValidated,
      validatedAt: new Date(),
      passedCount: validation.passedCount,
      totalCount: validation.totalCount,
      errors: validation.errors
    };

    if (validation.isValidated) {
      // Problem is ready for activation
      if (validation.verifiedTestCases) {
        problem.testCases = validation.verifiedTestCases;
      }
    } else {
      // Flag as draft and disable from student assessments
      problem.status = 'draft';
      problem.isActive = false;
    }

    await problem.save();

    return successResponse(res, {
      isValidated: validation.isValidated,
      passedCount: validation.passedCount,
      totalCount: validation.totalCount,
      errors: validation.errors,
      problem
    });
  } catch (err) {
    return errorResponse(res, err.message, 'VALIDATION_ERROR', 500);
  }
};

// PATCH /api/admin/coding/problems/:id/status - Toggle activate/deactivate
exports.toggleProblemStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const problem = await CodingProblem.findById(id);
    if (!problem) {
      return errorResponse(res, 'Problem not found.', 'PROBLEM_NOT_FOUND', 404);
    }

    if (isActive && !problem.validationStatus?.isValidated) {
      return errorResponse(
        res,
        'Cannot activate problem: Reference solution must pass all test cases first.',
        'VALIDATION_REQUIRED',
        400
      );
    }

    problem.isActive = Boolean(isActive);
    problem.status = isActive ? 'active' : 'draft';
    await problem.save();

    return successResponse(res, {
      problemId: problem._id,
      isActive: problem.isActive,
      status: problem.status
    });
  } catch (err) {
    return errorResponse(res, err.message, 'TOGGLE_STATUS_ERROR', 500);
  }
};

// POST /api/admin/coding/problems/:id/testcases - Add a testcase
exports.addTestCase = async (req, res) => {
  try {
    const { id } = req.params;
    const { input = '', expectedOutput = '', isHidden = false, isEdgeCase = false, explanation = '' } = req.body;

    const problem = await CodingProblem.findById(id);
    if (!problem) {
      return errorResponse(res, 'Problem not found.', 'PROBLEM_NOT_FOUND', 404);
    }

    problem.testCases.push({
      input,
      expectedOutput,
      isHidden: Boolean(isHidden),
      isEdgeCase: Boolean(isEdgeCase),
      explanation
    });

    // Reset validation status since test set changed
    problem.validationStatus.isValidated = false;
    problem.status = 'draft';
    problem.isActive = false;
    problem.isSeeded = false;

    await problem.save();

    return successResponse(res, { testCases: problem.testCases }, null, 201);
  } catch (err) {
    return errorResponse(res, err.message, 'ADD_TEST_CASE_ERROR', 500);
  }
};

// PUT /api/admin/coding/problems/:id/testcases/:tcId - Edit a testcase
exports.updateTestCase = async (req, res) => {
  try {
    const { id, tcId } = req.params;
    const { input, expectedOutput, isHidden, isEdgeCase, explanation } = req.body;

    const problem = await CodingProblem.findById(id);
    if (!problem) {
      return errorResponse(res, 'Problem not found.', 'PROBLEM_NOT_FOUND', 404);
    }

    const tc = problem.testCases.id(tcId);
    if (!tc) {
      return errorResponse(res, 'Test case not found.', 'TEST_CASE_NOT_FOUND', 404);
    }

    if (input !== undefined) tc.input = input;
    if (expectedOutput !== undefined) tc.expectedOutput = expectedOutput;
    if (isHidden !== undefined) tc.isHidden = Boolean(isHidden);
    if (isEdgeCase !== undefined) tc.isEdgeCase = Boolean(isEdgeCase);
    if (explanation !== undefined) tc.explanation = explanation;

    problem.validationStatus.isValidated = false;
    problem.status = 'draft';
    problem.isActive = false;
    problem.isSeeded = false;

    await problem.save();

    return successResponse(res, { testCase: tc });
  } catch (err) {
    return errorResponse(res, err.message, 'UPDATE_TEST_CASE_ERROR', 500);
  }
};

// DELETE /api/admin/coding/problems/:id/testcases/:tcId - Remove a testcase
exports.deleteTestCase = async (req, res) => {
  try {
    const { id, tcId } = req.params;
    const problem = await CodingProblem.findById(id);

    if (!problem) {
      return errorResponse(res, 'Problem not found.', 'PROBLEM_NOT_FOUND', 404);
    }

    problem.testCases.pull({ _id: tcId });
    problem.validationStatus.isValidated = false;
    problem.status = 'draft';
    problem.isActive = false;
    problem.isSeeded = false;

    await problem.save();

    return successResponse(res, { message: 'Test case deleted successfully', testCases: problem.testCases });
  } catch (err) {
    return errorResponse(res, err.message, 'DELETE_TEST_CASE_ERROR', 500);
  }
};

// DELETE /api/admin/coding/problems/:id - Delete problem
exports.deleteProblem = async (req, res) => {
  try {
    const { id } = req.params;
    const problem = await CodingProblem.findByIdAndDelete(id);

    if (!problem) {
      return errorResponse(res, 'Problem not found.', 'PROBLEM_NOT_FOUND', 404);
    }

    return successResponse(res, { message: 'Problem deleted successfully', id });
  } catch (err) {
    return errorResponse(res, err.message, 'DELETE_PROBLEM_ERROR', 500);
  }
};
