const mongoose = require('mongoose');

const testCaseResultSchema = new mongoose.Schema(
  {
    testCaseIndex: { type: Number, required: true },
    passed: { type: Boolean, required: true },
    status: { type: String, required: true },
    runtimeMs: { type: Number, default: 0 },
    error: { type: String, default: null },
    input: { type: String, default: null }, // Null if hidden
    expectedOutput: { type: String, default: null }, // Null if hidden
    actualOutput: { type: String, default: null }, // Null if hidden
    isHidden: { type: Boolean, default: false }
  },
  { _id: false }
);

const codingSubmissionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    problemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CodingProblem',
      required: true,
      index: true
    },
    language: {
      type: String,
      required: true,
      default: 'javascript'
    },
    code: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['Accepted', 'Wrong Answer', 'Time Limit Exceeded', 'Runtime Error', 'Compilation Error'],
      required: true,
      index: true
    },
    score: {
      type: Number,
      default: 0
    },
    passedTestCases: {
      type: Number,
      default: 0
    },
    totalTestCases: {
      type: Number,
      default: 0
    },
    runtimeMs: {
      type: Number,
      default: 0
    },
    testCaseResults: [testCaseResultSchema]
  },
  {
    timestamps: true
  }
);

const CodingSubmission = mongoose.model('CodingSubmission', codingSubmissionSchema);

module.exports = CodingSubmission;
