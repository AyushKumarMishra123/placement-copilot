const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    order: { type: Number, required: true },
    category: {
      type: String,
      enum: ['technical', 'project', 'problem_solving', 'behavioral'],
      required: true
    },
    prompt: { type: String, required: true },
    contextTarget: { type: String, default: '' }
  },
  { _id: false }
);

const transcriptEntrySchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    questionText: { type: String, required: true },
    category: {
      type: String,
      enum: ['technical', 'project', 'problem_solving', 'behavioral'],
      required: true
    },
    answerText: { type: String, default: '' },
    submittedAt: { type: Date, default: Date.now },
    skipped: { type: Boolean, default: false }
  },
  { _id: false }
);

const dimensionScoreSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    weight: { type: Number, required: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    feedback: { type: String, default: '' }
  },
  { _id: false }
);

const questionEvaluationSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    category: { type: String, default: 'technical' },
    score: { type: Number, required: true, min: 0, max: 100 },
    feedback: { type: String, default: '' },
    suggestedImprovement: { type: String, default: '' }
  },
  { _id: false }
);

const evaluationSchema = new mongoose.Schema(
  {
    overallScore: { type: Number, min: 0, max: 100 },
    dimensions: [dimensionScoreSchema],
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
    recommendations: [{ type: String }],
    questionEvaluations: [questionEvaluationSchema]
  },
  { _id: false }
);

const interviewSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    targetRole: {
      type: String,
      required: true,
      trim: true
    },
    durationMinutes: {
      type: Number,
      enum: [15, 20],
      default: 15
    },
    focus: {
      type: String,
      default: 'general',
      trim: true
    },
    status: {
      type: String,
      enum: ['created', 'active', 'evaluation_pending', 'completed', 'evaluation_failed', 'abandoned'],
      default: 'active',
      index: true
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true
    },
    completedAt: {
      type: Date,
      default: null
    },
    currentQuestionIndex: {
      type: Number,
      default: 0
    },
    questions: [questionSchema],
    transcript: [transcriptEntrySchema],
    evaluation: {
      type: evaluationSchema,
      default: null
    },
    evaluationStatus: {
      type: String,
      enum: ['none', 'pending', 'completed', 'failed'],
      default: 'none'
    },
    evaluationVersion: {
      type: Number,
      default: 1
    },
    contextSnapshot: {
      resumeId: { type: String, default: null },
      targetRole: { type: String, default: '' },
      skills: [{ type: String }],
      projects: [{ type: Object }]
    },
    modelMetadata: {
      provider: { type: String, default: 'rule-engine' },
      modelName: { type: String, default: '' },
      generatedAt: { type: Date, default: Date.now }
    }
  },
  {
    timestamps: true
  }
);

// Compound index for fast lookup of a user's latest completed interview
interviewSessionSchema.index({ userId: 1, status: 1, completedAt: -1 });

interviewSessionSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const InterviewSession = mongoose.model('InterviewSession', interviewSessionSchema);

module.exports = InterviewSession;
