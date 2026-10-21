const mongoose = require('mongoose');

const testCaseSchema = new mongoose.Schema(
  {
    input: {
      type: String,
      default: ''
    },
    expectedOutput: {
      type: String,
      default: ''
    },
    isHidden: {
      type: Boolean,
      default: false
    },
    isEdgeCase: {
      type: Boolean,
      default: false
    },
    explanation: {
      type: String,
      default: ''
    }
  },
  { _id: true }
);

const codingProblemSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Problem title is required'],
      trim: true
    },
    topic: {
      type: String,
      required: [true, 'Topic is required'],
      enum: [
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
      ],
      index: true
    },
    difficulty: {
      type: String,
      required: true,
      enum: ['Easy', 'Medium', 'Hard'],
      default: 'Easy',
      index: true
    },
    description: {
      type: String,
      required: [true, 'Problem description is required']
    },
    constraints: {
      type: [String],
      default: []
    },
    hints: {
      type: [String],
      default: []
    },
    timeLimitMs: {
      type: Number,
      default: 2000
    },
    memoryLimitMb: {
      type: Number,
      default: 256
    },
    maxScore: {
      type: Number,
      default: 100
    },
    starterCode: {
      javascript: { type: String, default: '' },
      python: { type: String, default: '' },
      cpp: { type: String, default: '' },
      java: { type: String, default: '' }
    },
    referenceSolution: {
      language: { type: String, default: 'javascript' },
      code: { type: String, required: true }
    },
    testCases: [testCaseSchema],
    status: {
      type: String,
      enum: ['draft', 'active', 'archived'],
      default: 'draft',
      index: true
    },
    isActive: {
      type: Boolean,
      default: false,
      index: true
    },
    isSeeded: {
      type: Boolean,
      default: false
    },
    validationStatus: {
      isValidated: { type: Boolean, default: false },
      validatedAt: { type: Date, default: null },
      passedCount: { type: Number, default: 0 },
      totalCount: { type: Number, default: 0 },
      errors: { type: [String], default: [] }
    },
    stats: {
      submissionsCount: { type: Number, default: 0 },
      acceptedCount: { type: Number, default: 0 }
    }
  },
  {
    timestamps: true
  }
);

/**
 * Public serialization: Sanitizes hidden test cases and reference solution
 * to protect problem test integrity for student users.
 */
codingProblemSchema.methods.toPublicJSON = function () {
  const obj = this.toObject ? this.toObject() : { ...this };
  delete obj.referenceSolution;
  delete obj.__v;

  // Only return public sample test cases (isHidden: false)
  if (Array.isArray(obj.testCases)) {
    obj.testCases = obj.testCases
      .filter((tc) => !tc.isHidden)
      .map((tc) => ({
        _id: tc._id,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        explanation: tc.explanation,
        isEdgeCase: tc.isEdgeCase,
        isHidden: false
      }));
  }

  return obj;
};

const CodingProblem = mongoose.model('CodingProblem', codingProblemSchema);

module.exports = CodingProblem;
