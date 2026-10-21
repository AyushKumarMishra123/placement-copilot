const codeExecutionService = require('./codeExecutionService');

/**
 * Service to validate coding problems and their test cases against trusted reference solutions.
 */
class ProblemValidationService {
  /**
   * Run the reference solution against every test case in the problem
   * @param {Object} problem
   * @returns {Promise<{ isValidated: boolean, passedCount: number, totalCount: number, errors: Array<string>, verifiedTestCases: Array }>}
   */
  async validateProblem(problem) {
    if (!problem.referenceSolution || !problem.referenceSolution.code) {
      return {
        isValidated: false,
        passedCount: 0,
        totalCount: problem.testCases?.length || 0,
        errors: ['Reference solution code is missing.'],
        verifiedTestCases: problem.testCases || []
      };
    }

    const testCases = problem.testCases || [];
    if (testCases.length === 0) {
      return {
        isValidated: false,
        passedCount: 0,
        totalCount: 0,
        errors: ['Problem has no test cases defined.'],
        verifiedTestCases: []
      };
    }

    const errors = [];
    let passedCount = 0;
    const verifiedTestCases = [];

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      const res = await codeExecutionService.execute({
        language: problem.referenceSolution.language || 'javascript',
        code: problem.referenceSolution.code,
        stdin: tc.input || '',
        timeoutMs: problem.timeLimitMs || 3000,
        preferLocalSandbox: true
      });

      if (res.status !== 'Success') {
        errors.push(`Test Case #${i + 1} execution failed: ${res.error || res.stderr || res.status}`);
        verifiedTestCases.push(tc);
        continue;
      }

      const normalize = (str) =>
        (str || '')
          .split('\n')
          .map((l) => l.trimEnd())
          .join('\n')
          .trim();

      const actualOutput = normalize(res.stdout);
      let expectedOutput = normalize(tc.expectedOutput);

      // If expectedOutput was not set or empty during test creation, record verified reference output
      if (!expectedOutput && actualOutput) {
        expectedOutput = actualOutput;
        tc.expectedOutput = actualOutput;
      }

      if (actualOutput === expectedOutput) {
        passedCount++;
        verifiedTestCases.push({
          ...tc,
          expectedOutput
        });
      } else {
        errors.push(
          `Test Case #${i + 1} output mismatch. Expected: "${expectedOutput}", Got: "${actualOutput}" (Input: "${(tc.input || '').slice(0, 50)}")`
        );
        verifiedTestCases.push(tc);
      }
    }

    const isValidated = passedCount === testCases.length && errors.length === 0;

    return {
      isValidated,
      passedCount,
      totalCount: testCases.length,
      errors,
      verifiedTestCases
    };
  }
}

module.exports = new ProblemValidationService();
