const mongoose = require('mongoose');

const checkSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    category: {
      type: String,
      required: true,
      enum: ['structure', 'projects', 'measurableImpact', 'skillsAts', 'profilesLinks', 'achievements', 'writing']
    },
    status: {
      type: String,
      required: true,
      enum: ['pass', 'fail', 'warning']
    },
    score: {
      type: Number,
      required: true
    },
    weight: {
      type: Number,
      required: true
    },
    evidence: {
      type: String,
      default: ''
    },
    explanation: {
      type: String,
      required: true
    },
    suggestion: {
      type: String,
      required: true
    },
    source: {
      type: String,
      enum: ['rule', 'ai', 'combined'],
      default: 'rule'
    }
  },
  { _id: false }
);

const categoryScoresSchema = new mongoose.Schema(
  {
    structure: { type: Number, default: 0 },
    projects: { type: Number, default: 0 },
    measurableImpact: { type: Number, default: 0 },
    skillsAts: { type: Number, default: 0 },
    profilesLinks: { type: Number, default: 0 },
    achievements: { type: Number, default: 0 }
  },
  { _id: false }
);

const resumeReviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resume',
      required: true,
      index: true
    },
    version: {
      type: Number,
      default: 1
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    categoryScores: {
      type: categoryScoresSchema,
      required: true
    },
    checks: [checkSchema],
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
    recommendations: [{ type: String }],
    summary: {
      type: String,
      default: ''
    },
    aiReviewGenerated: {
      type: Boolean,
      default: false
    },
    aiProvider: {
      type: String,
      default: 'rule-only'
    }
  },
  {
    timestamps: true
  }
);

resumeReviewSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const ResumeReview = mongoose.model('ResumeReview', resumeReviewSchema);

module.exports = ResumeReview;
