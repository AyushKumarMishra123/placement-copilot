const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const CodingProblem = require('../models/CodingProblem');
const CodingSubmission = require('../models/CodingSubmission');
const codeExecutionService = require('../services/coding/codeExecutionService');
const {
  Judge0Error,
  Judge0AuthError,
  Judge0RateLimitError,
  Judge0UnavailableError
} = require('../services/coding/codeExecutionService');

describe('Judge0 Integration & Code Execution Engine Suite', () => {
  let mongoServer;
  let studentToken;
  let studentUser;
  let testProblem;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongoServer = await MongoMemoryServer.create();
      await mongoose.connect(mongoServer.getUri());
    }

    // Register a test student user
    await User.deleteMany({ email: 'judge0_student@test.com' });
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Judge0 Test Student',
        email: 'judge0_student@test.com',
        password: 'Password123!',
        targetRole: 'Software Engineer'
      });

    studentToken = regRes.body.data.token;
    studentUser = regRes.body.data.user;

    // Create a dedicated test problem with sample and hidden test cases
    testProblem = await CodingProblem.create({
      slug: 'two-sum-judge0-test-' + Date.now(),
      title: 'Two Sum Addition Test',
      topic: 'Arrays & Strings',
      difficulty: 'Easy',
      description: 'Given two integers separated by a space, print their sum.',
      constraints: ['-10^4 <= a, b <= 10^4'],
      maxScore: 100,
      timeLimitMs: 4000,
      starterCode: {
        javascript: 'const line = readline(); const [a, b] = line.split(" ").map(Number); console.log(a + b);',
        python: 'import sys\nline = sys.stdin.read().strip()\na, b = map(int, line.split())\nprint(a + b)',
        cpp: '#include <iostream>\nusing namespace std;\nint main() { int a, b; if (cin >> a >> b) cout << (a + b) << endl; return 0; }'
      },
      referenceSolution: {
        language: 'javascript',
        code: 'const line = readline(); const [a, b] = line.split(" ").map(Number); console.log(a + b);'
      },
      testCases: [
        {
          input: '5 7',
          expectedOutput: '12',
          isHidden: false,
          explanation: '5 + 7 = 12'
        },
        {
          input: '10 -3',
          expectedOutput: '7',
          isHidden: false,
          explanation: '10 + (-3) = 7'
        },
        {
          input: '-20 -30',
          expectedOutput: '-50',
          isHidden: true,
          explanation: 'Hidden negative boundary case'
        }
      ],
      status: 'active',
      isActive: true,
      isSeeded: false,
      validationStatus: {
        isValidated: true,
        validatedAt: new Date()
      }
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: 'judge0_student@test.com' });
    if (testProblem?._id) {
      await CodingProblem.findByIdAndDelete(testProblem._id);
      await CodingSubmission.deleteMany({ problemId: testProblem._id });
    }
    if (mongoServer) {
      await mongoose.disconnect();
      await mongoServer.stop();
    }
  });

  // ========================================================
  // 1. Diagnostics & Health Check
  // ========================================================
  describe('1. Judge0 Health Check & Diagnostics', () => {
    test('GET /api/coding/health reports Judge0 connectivity without leaking credentials', async () => {
      const res = await request(app).get('/api/coding/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.judge0).toBeDefined();

      const j0 = res.body.data.judge0;
      expect(j0.configured).toBe(true);
      expect(typeof j0.url).toBe('string');
      expect(j0.url.length).toBeGreaterThan(0);
      // Secrets must never be exposed
      expect(j0.apiKey).toBeUndefined();
      expect(j0.judge0ApiKey).toBeUndefined();
    });
  });

  // ========================================================
  // 2. Real / Mocked Language Execution
  // ========================================================
  describe('2. Multi-Language Program Execution (C++, Python, JS)', () => {
    test('A valid C++ program compiles and prints expected output', async () => {
      const cppCode = `
#include <iostream>
using namespace std;
int main() {
    cout << "Judge0 C++ Works!" << endl;
    return 0;
}
`;
      const result = await codeExecutionService.execute({
        language: 'cpp',
        code: cppCode,
        stdin: '',
        timeoutMs: 5000
      });

      expect(result.status).toBe('Success');
      expect(result.stdout).toBe('Judge0 C++ Works!');
      expect(result.error).toBeNull();
    });

    test('A valid C++ program correctly accepts standard input', async () => {
      const cppStdinCode = `
#include <iostream>
using namespace std;
int main() {
    int a, b;
    if (cin >> a >> b) {
        cout << (a * b) << endl;
    }
    return 0;
}
`;
      const result = await codeExecutionService.execute({
        language: 'cpp',
        code: cppStdinCode,
        stdin: '6 7',
        timeoutMs: 5000
      });

      expect(result.status).toBe('Success');
      expect(result.stdout).toBe('42');
    });

    test('A valid Python program executes and produces expected output', async () => {
      const pythonCode = `
import sys
data = sys.stdin.read().strip()
nums = [int(x) for x in data.split()]
print(sum(nums))
`;
      const result = await codeExecutionService.execute({
        language: 'python',
        code: pythonCode,
        stdin: '10 25 15',
        timeoutMs: 5000
      });

      expect(result.status).toBe('Success');
      expect(result.stdout).toBe('50');
    });

    test('A JavaScript program executes with standard input', async () => {
      const jsCode = `
const line = readline() || '';
const [x, y] = line.split(' ').map(Number);
console.log(x + y);
`;
      const result = await codeExecutionService.execute({
        language: 'javascript',
        code: jsCode,
        stdin: '14 26',
        timeoutMs: 4000
      });

      expect(result.status).toBe('Success');
      expect(result.stdout).toBe('40');
    });
  });

  // ========================================================
  // 3. Error Classification: CE, RE, TLE, Wrong Answer
  // ========================================================
  describe('3. Execution Verdicts & Error Classification', () => {
    test('A program with syntax errors reports Compilation Error with diagnostics', async () => {
      const badCpp = `
#include <iostream>
int main() {
    int a = ; // syntax error
    return 0;
}
`;
      const result = await codeExecutionService.execute({
        language: 'cpp',
        code: badCpp,
        stdin: '',
        timeoutMs: 4000
      });

      expect(result.status).toBe('Compilation Error');
      expect(result.compileOutput.length).toBeGreaterThan(0);
      expect(result.error).toBeDefined();
    });

    test('A program that crashes at runtime reports Runtime Error', async () => {
      const segfaultCpp = `
#include <iostream>
int main() {
    int* ptr = nullptr;
    *ptr = 123; // Segfault
    return 0;
}
`;
      const result = await codeExecutionService.execute({
        language: 'cpp',
        code: segfaultCpp,
        stdin: '',
        timeoutMs: 4000
      });

      expect(result.status).toBe('Runtime Error');
      expect(result.error).toBeDefined();
    });

    test('A program producing incorrect output produces Wrong Answer verdict', async () => {
      const testCase = { input: '5 7', expectedOutput: '12' };
      const wrongCode = `
#include <iostream>
using namespace std;
int main() {
    cout << "999" << endl; // wrong answer
    return 0;
}
`;
      const evalResult = await codeExecutionService.evaluateTestCase({
        language: 'cpp',
        code: wrongCode,
        testCase,
        timeoutMs: 4000
      });

      expect(evalResult.passed).toBe(false);
      expect(evalResult.status).toBe('Wrong Answer');
      expect(evalResult.actualOutput).toBe('999');
      expect(evalResult.expectedOutput).toBe('12');
    });

    test('Unsupported language request throws structured error', async () => {
      await expect(
        codeExecutionService.execute({
          language: 'unsupported_lang_xyz',
          code: 'print(1)',
          stdin: ''
        })
      ).rejects.toThrow(/Unsupported programming language/);
    });
  });

  // ========================================================
  // 4. Asynchronous Polling & Token Handling
  // ========================================================
  describe('4. Asynchronous Submission Handling and Polling', () => {
    test('pollSubmission resolves result when token status changes to Accepted', async () => {
      // Mock fetch specifically for polling simulation
      const originalFetch = global.fetch;
      let callCount = 0;

      global.fetch = jest.fn(async (url) => {
        callCount++;
        if (callCount === 1) {
          // First poll: In Queue (id 1)
          return {
            ok: true,
            status: 200,
            json: async () => ({
              status: { id: 1, description: 'In Queue' }
            })
          };
        }
        if (callCount === 2) {
          // Second poll: Processing (id 2)
          return {
            ok: true,
            status: 200,
            json: async () => ({
              status: { id: 2, description: 'Processing' }
            })
          };
        }
        // Third poll: Completed Accepted (id 3)
        return {
          ok: true,
          status: 200,
          json: async () => ({
            stdout: Buffer.from('Async Polling Succeeded\n').toString('base64'),
            stderr: null,
            time: '0.045',
            status: { id: 3, description: 'Accepted' }
          })
        };
      });

      try {
        const result = await codeExecutionService.pollSubmission('fake-token-1234', 3000);
        expect(result.status).toBe('Success');
        expect(result.stdout).toBe('Async Polling Succeeded');
        expect(callCount).toBe(3);
      } finally {
        global.fetch = originalFetch;
      }
    });

    test('Handles Judge0 rate limiting (HTTP 429) cleanly with Judge0RateLimitError', async () => {
      const originalFetch = global.fetch;
      global.fetch = jest.fn(async () => ({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: async () => JSON.stringify({ message: 'Rate limit exceeded' })
      }));

      try {
        await expect(
          codeExecutionService.executeWithJudge0({
            language: 'cpp',
            code: 'int main(){}',
            stdin: '',
            timeoutMs: 2000
          })
        ).rejects.toThrow(Judge0RateLimitError);
      } finally {
        global.fetch = originalFetch;
      }
    });

    test('Handles Judge0 authentication failure (HTTP 401) with Judge0AuthError', async () => {
      const originalFetch = global.fetch;
      global.fetch = jest.fn(async () => ({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => JSON.stringify({ message: 'Invalid API key' })
      }));

      try {
        await expect(
          codeExecutionService.executeWithJudge0({
            language: 'cpp',
            code: 'int main(){}',
            stdin: '',
            timeoutMs: 2000
          })
        ).rejects.toThrow(Judge0AuthError);
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  // ========================================================
  // 5. Run Sample Tests vs Full Assessment Submit Endpoints
  // ========================================================
  describe('5. Run Code vs Submit Assessment Distinction', () => {
    test('POST /api/coding/problems/:id/run executes ONLY sample test cases without persisting score', async () => {
      const validCpp = `
#include <iostream>
using namespace std;
int main() {
    int a, b;
    if (cin >> a >> b) {
        cout << (a + b) << endl;
    }
    return 0;
}
`;
      const res = await request(app)
        .post(`/api/coding/problems/${testProblem._id}/run`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          language: 'cpp',
          code: validCpp
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.allPassed).toBe(true);
      // Problem has 2 sample test cases and 1 hidden testcase -> Run only runs the 2 sample test cases
      expect(res.body.data.totalCount).toBe(2);
      expect(res.body.data.passedCount).toBe(2);

      // Verify NO persistent submission record was created by "Run"
      const subs = await CodingSubmission.find({ problemId: testProblem._id, userId: studentUser._id || studentUser.id });
      expect(subs.length).toBe(0);
    });

    test('POST /api/coding/problems/:id/submit evaluates all test cases and keeps hidden test data private', async () => {
      const validCpp = `
#include <iostream>
using namespace std;
int main() {
    int a, b;
    if (cin >> a >> b) {
        cout << (a + b) << endl;
    }
    return 0;
}
`;
      const res = await request(app)
        .post(`/api/coding/problems/${testProblem._id}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          language: 'cpp',
          code: validCpp
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const sub = res.body.data.submission;
      expect(sub.status).toBe('Accepted');
      expect(sub.score).toBe(100);
      expect(sub.passedTestCases).toBe(3);
      expect(sub.totalTestCases).toBe(3);

      // SECURITY CRITICAL: Verify hidden test case inputs and expected outputs are NEVER returned
      const hiddenResult = sub.testCaseResults.find((tc) => tc.isHidden === true);
      expect(hiddenResult).toBeDefined();
      expect(hiddenResult.input).toBeNull();
      expect(hiddenResult.expectedOutput).toBeNull();
      expect(hiddenResult.actualOutput).toBeNull();

      // Verify persistent record in DB
      const dbSub = await CodingSubmission.findById(sub._id);
      expect(dbSub).toBeDefined();
      expect(dbSub.status).toBe('Accepted');
    });

    test('POST /api/coding/problems/:id/submit awards partial credit when only sample cases pass', async () => {
      // Hardcoded to only handle positive numbers; fails negative hidden case (-20 -30)
      const partialCpp = `
#include <iostream>
using namespace std;
int main() {
    int a, b;
    if (cin >> a >> b) {
        if (a < 0 && b < 0) {
            cout << "0" << endl; // Wrong only for both negative numbers
        } else {
            cout << (a + b) << endl;
        }
    }
    return 0;
}
`;
      const res = await request(app)
        .post(`/api/coding/problems/${testProblem._id}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          language: 'cpp',
          code: partialCpp
        });

      expect(res.status).toBe(201);
      const sub = res.body.data.submission;
      expect(sub.status).not.toBe('Accepted');
      expect(sub.passedTestCases).toBe(2);
      expect(sub.totalTestCases).toBe(3);
      expect(sub.score).toBe(Math.round((2 / 3) * 100)); // 67%
    });
  });
});
