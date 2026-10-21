const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const CodingProblem = require('../models/CodingProblem');
const CodingSubmission = require('../models/CodingSubmission');
const { CODING_PROBLEMS_BANK } = require('../data/codingProblemBank');
const problemValidationService = require('../services/coding/problemValidationService');
const codingScoreAdapter = require('../services/readiness/components/codingScoreAdapter');
const { seedCodingProblems } = require('../scripts/seedCodingProblems');

describe('Coding Assessment & Problem Bank Suite', () => {
  let studentToken;
  let adminToken;
  let studentUser;
  let adminUser;

  let testMongoServer;

  beforeAll(async () => {
    jest.setTimeout(60000);
    // Connect to test database if not connected
    if (mongoose.connection.readyState === 0) {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      testMongoServer = await MongoMemoryServer.create();
      await mongoose.connect(testMongoServer.getUri());
    }

    // Clean test collections
    await User.deleteMany({ email: { $in: ['student_coding@test.com', 'admin_coding@test.com'] } });
    await CodingSubmission.deleteMany({});
    await CodingProblem.deleteMany({});

    // Register Student
    const studentReg = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Coding Student',
        email: 'student_coding@test.com',
        password: 'Password123!',
        targetRole: 'Software Engineer'
      });
    studentToken = studentReg.body.data.token;
    studentUser = studentReg.body.data.user;

    // Register Admin
    const adminReg = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Coding Admin',
        email: 'admin_coding@test.com',
        password: 'Password123!',
        role: 'admin',
        adminSecretCode: 'msot_admin_secret_placement_copilot_2026'
      });
    adminToken = adminReg.body.data.token;
    adminUser = adminReg.body.data.user;

    // Seed the 30 problems into DB
    await seedCodingProblems({ verbose: false });
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $in: ['student_coding@test.com', 'admin_coding@test.com'] } });
    await CodingSubmission.deleteMany({});
    await CodingProblem.deleteMany({});
    await mongoose.disconnect();
  });

  describe('1. Initial Question Bank Composition & Validation', () => {
    test('contains exactly 30 original coding problems', () => {
      expect(CODING_PROBLEMS_BANK.length).toBe(30);
    });

    test('satisfies difficulty distribution: 10 Easy, 15 Medium, 5 Hard', () => {
      const counts = { Easy: 0, Medium: 0, Hard: 0 };
      CODING_PROBLEMS_BANK.forEach((p) => {
        counts[p.difficulty] = (counts[p.difficulty] || 0) + 1;
      });
      expect(counts.Easy).toBe(10);
      expect(counts.Medium).toBe(15);
      expect(counts.Hard).toBe(5);
    });

    test('covers all 10 required DSA topics with 3 problems each', () => {
      const expectedTopics = [
        'Arrays & Strings',
        'Hashing',
        'Sorting & Searching',
        'Two Pointers',
        'Sliding Window',
        'Recursion',
        'Linked Lists',
        'Stacks & Queues',
        'Binary Trees',
        'Basic Graphs'
      ];
      const topicMap = {};
      CODING_PROBLEMS_BANK.forEach((p) => {
        topicMap[p.topic] = (topicMap[p.topic] || 0) + 1;
      });

      expectedTopics.forEach((t) => {
        expect(topicMap[t]).toBe(3);
      });
    });

    test('every problem includes constraints, sample tests, and trusted reference solution', () => {
      CODING_PROBLEMS_BANK.forEach((p) => {
        expect(p.title).toBeDefined();
        expect(p.slug).toBeDefined();
        expect(p.description.length).toBeGreaterThan(20);
        expect(p.constraints.length).toBeGreaterThanOrEqual(1);
        expect(p.referenceSolution?.code).toBeDefined();
        expect(p.testCases.length).toBeGreaterThanOrEqual(3);
        const sampleTest = p.testCases.find((tc) => !tc.isHidden);
        expect(sampleTest).toBeDefined();
      });
    });

    test('problem validation pipeline accurately flags invalid solutions as draft', async () => {
      const brokenProblem = {
        title: 'Broken Sum',
        slug: 'broken-sum-test',
        topic: 'Arrays & Strings',
        difficulty: 'Easy',
        description: 'Return sum',
        referenceSolution: {
          language: 'javascript',
          code: 'console.log("wrong output");'
        },
        testCases: [
          { input: '1 2', expectedOutput: '3', isHidden: false }
        ]
      };

      const result = await problemValidationService.validateProblem(brokenProblem);
      expect(result.isValidated).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('2. Security & Student Sanitization', () => {
    test('GET /api/coding/problems returns only active problems without reference solutions or test cases', async () => {
      const res = await request(app)
        .get('/api/coding/problems')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.problems.length).toBe(30);

      const first = res.body.data.problems[0];
      expect(first.title).toBeDefined();
      expect(first.referenceSolution).toBeUndefined();
      expect(first.testCases).toBeUndefined();
    });

    test('GET /api/coding/problems/:id NEVER returns hidden test cases or reference solution', async () => {
      const problem = await CodingProblem.findOne({ slug: 'palindrome-phrase-validator' });
      expect(problem).toBeDefined();

      const res = await request(app)
        .get(`/api/coding/problems/${problem._id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      const returnedProblem = res.body.data.problem;

      expect(returnedProblem.referenceSolution).toBeUndefined();
      expect(returnedProblem.testCases).toBeDefined();

      // Ensure all returned test cases are strictly sample/public (isHidden: false)
      returnedProblem.testCases.forEach((tc) => {
        expect(tc.isHidden).toBe(false);
      });

      // Total test cases in DB has hidden ones, but returned has only public ones
      expect(returnedProblem.testCases.length).toBeLessThan(problem.testCases.length);
    });

    test('unauthenticated users cannot access coding APIs', async () => {
      const res = await request(app).get('/api/coding/problems');
      expect(res.status).toBe(401);
    });
  });

  describe('3. Execution & Submission Engine', () => {
    test('POST /api/coding/problems/:id/run evaluates student code against sample tests', async () => {
      const problem = await CodingProblem.findOne({ slug: 'palindrome-phrase-validator' });

      const correctSolution = `
        const s = readline() || '';
        const cleaned = s.toLowerCase().replace(/[^a-z0-9]/g, '');
        console.log(cleaned === cleaned.split('').reverse().join('') ? 'true' : 'false');
      `;

      const res = await request(app)
        .post(`/api/coding/problems/${problem._id}/run`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          language: 'javascript',
          code: correctSolution
        });

      expect(res.status).toBe(200);
      expect(res.body.data.allPassed).toBe(true);
      expect(res.body.data.passedCount).toBe(res.body.data.totalCount);
    });

    test('POST /api/coding/problems/:id/submit accepts correct solution across all hidden test cases', async () => {
      const problem = await CodingProblem.findOne({ slug: 'first-unique-character-index' });
      expect(problem).toBeDefined();

      const res = await request(app)
        .post(`/api/coding/problems/${problem._id}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          language: 'javascript',
          code: problem.referenceSolution.code
        });

      expect(res.status).toBe(201);
      const submission = res.body.data.submission;
      expect(submission.status).toBe('Accepted');
      expect(submission.score).toBe(problem.maxScore);
      expect(submission.passedTestCases).toBe(submission.totalTestCases);

      // Verify hidden test cases do not reveal input/expectedOutput
      const hiddenResults = submission.testCaseResults.filter((r) => r.isHidden);
      expect(hiddenResults.length).toBeGreaterThan(0);
      hiddenResults.forEach((hr) => {
        expect(hr.input).toBeNull();
        expect(hr.expectedOutput).toBeNull();
      });
    });

    test('POST /api/coding/problems/:id/submit gives Wrong Answer on buggy solution', async () => {
      const problem = await CodingProblem.findOne({ slug: 'first-unique-character-index' });

      const buggyCode = 'console.log(999);';

      const res = await request(app)
        .post(`/api/coding/problems/${problem._id}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          language: 'javascript',
          code: buggyCode
        });

      expect(res.status).toBe(201);
      const submission = res.body.data.submission;
      expect(submission.status).toBe('Wrong Answer');
      expect(submission.score).toBe(0);
      expect(submission.passedTestCases).toBe(0);
    });
  });

  describe('4. Admin Management & RBAC Protection', () => {
    test('students are blocked from admin coding endpoints with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/admin/coding/problems')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });

    test('admin can retrieve all problems including reference solutions and hidden test cases', async () => {
      const problem = await CodingProblem.findOne({ slug: 'palindrome-phrase-validator' });

      const res = await request(app)
        .get(`/api/admin/coding/problems/${problem._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data.problem;
      expect(data.referenceSolution.code).toBeDefined();
      const hasHidden = data.testCases.some((tc) => tc.isHidden === true);
      expect(hasHidden).toBe(true);
    });

    test('admin can create, validate, and activate a new coding problem', async () => {
      // Step A: Create Draft
      const createRes = await request(app)
        .post('/api/admin/coding/problems')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Array Product Except Self',
          slug: 'array-product-except-self-admin',
          topic: 'Arrays & Strings',
          difficulty: 'Medium',
          description: 'Calculate product of array except self',
          referenceSolution: {
            language: 'javascript',
            code: `
              const nums = (readline() || '').trim().split(/\\s+/).map(Number);
              const n = nums.length;
              const res = new Array(n).fill(1);
              let left = 1;
              for (let i = 0; i < n; i++) {
                res[i] = left;
                left *= nums[i];
              }
              let right = 1;
              for (let i = n - 1; i >= 0; i--) {
                res[i] *= right;
                right *= nums[i];
              }
              console.log(res.join(' '));
            `
          },
          testCases: [
            { input: '1 2 3 4', expectedOutput: '24 12 8 6', isHidden: false },
            { input: '-1 1 0 -3 3', expectedOutput: '0 0 9 0 0', isHidden: true, isEdgeCase: true }
          ]
        });

      expect(createRes.status).toBe(201);
      const createdId = createRes.body.data.problem._id;
      expect(createRes.body.data.problem.status).toBe('draft');
      expect(createRes.body.data.problem.isActive).toBe(false);

      // Step B: Attempting activation before validation must be rejected (400)
      const prematureActivate = await request(app)
        .patch(`/api/admin/coding/problems/${createdId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: true });

      expect(prematureActivate.status).toBe(400);

      // Step C: Run Reference Solution Validation
      const valRes = await request(app)
        .post(`/api/admin/coding/problems/${createdId}/validate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(valRes.status).toBe(200);
      expect(valRes.body.data.isValidated).toBe(true);
      expect(valRes.body.data.passedCount).toBe(2);

      // Step D: Now activation succeeds
      const activateRes = await request(app)
        .patch(`/api/admin/coding/problems/${createdId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: true });

      expect(activateRes.status).toBe(200);
      expect(activateRes.body.data.isActive).toBe(true);
    });

    test('admin can add, update, and remove test cases', async () => {
      const problem = await CodingProblem.findOne({ slug: 'array-product-except-self-admin' });

      // Add test case
      const addRes = await request(app)
        .post(`/api/admin/coding/problems/${problem._id}/testcases`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          input: '2 3',
          expectedOutput: '3 2',
          isHidden: true
        });

      expect(addRes.status).toBe(201);
      const addedTc = addRes.body.data.testCases[addRes.body.data.testCases.length - 1];

      // Update test case
      const updateRes = await request(app)
        .put(`/api/admin/coding/problems/${problem._id}/testcases/${addedTc._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          expectedOutput: '3 2'
        });
      expect(updateRes.status).toBe(200);

      // Delete test case
      const delRes = await request(app)
        .delete(`/api/admin/coding/problems/${problem._id}/testcases/${addedTc._id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(delRes.status).toBe(200);
    });
  });

  describe('5. Placement Readiness Scoring Integration', () => {
    test('CodingScoreAdapter returns not_assessed when student has no submissions', async () => {
      const result = await codingScoreAdapter.evaluate(new mongoose.Types.ObjectId());
      expect(result.component.key).toBe('coding');
      expect(result.component.weight).toBe(10);
      expect(result.component.score).toBeNull();
      expect(result.component.status).toBe('not_assessed');
    });

    test('CodingScoreAdapter dynamically calculates score when student has solved problems', async () => {
      const result = await codingScoreAdapter.evaluate(studentUser._id || studentUser.id);
      expect(result.component.key).toBe('coding');
      expect(result.component.weight).toBe(10);
      expect(result.component.status).toBe('assessed');
      expect(typeof result.component.score).toBe('number');
      expect(result.component.score).toBeGreaterThan(0);
      expect(result.component.reasons.length).toBeGreaterThan(0);
    });
  });

  describe('6. Idempotent Seeding Behavior', () => {
    test('re-running seeder does not create duplicate problems or corrupt existing entries', async () => {
      const countBefore = await CodingProblem.countDocuments({ isSeeded: true });
      expect(countBefore).toBe(30);

      // Rerun seeder
      await seedCodingProblems({ verbose: false });

      const countAfter = await CodingProblem.countDocuments({ isSeeded: true });
      expect(countAfter).toBe(30);
    });
  });

  afterAll(async () => {
    if (testMongoServer) {
      await mongoose.disconnect();
      await testMongoServer.stop();
    }
  });
});
