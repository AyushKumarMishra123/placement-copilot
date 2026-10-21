const mongoose = require('mongoose');

const componentResultSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      enum: ['resume', 'projects', 'interview', 'github', 'coding', 'linkedin', 'achievements']
    },
    label: {
      type: String,
      required: true
    },
    weight: {
      type: Number,
      required: true,
      min: 1,
      max: 100
    },
    score: {
      type: Number,
      default: null,
      min: 0,
      max: 100
    },
    status: {
      type: String,
      required: true,
      enum: ['assessed', 'not_assessed', 'processing', 'failed', 'stale']
    },
    source: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({})
    },
    assessedAt: {
      type: Date,
      default: null
    },
    lastUpdatedAt: {
      type: Date,
      default: null
    },
    reasons: [{ type: String }]
  },
  { _id: false }
);

const recommendationSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    sourceComponent: {
      type: String,
      required: true
    },
    sourceFindingId: {
      type: String,
      default: ''
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      required: true
    },
    impact: {
      type: String,
      required: true
    },
    actionSteps: [{ type: String }],
    status: {
      type: String,
      enum: ['pending', 'resolved'],
      default: 'pending'
    }
  },
  { _id: false }
);

const readinessAssessmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    assessmentType: {
      type: String,
      enum: ['provisional', 'final'],
      required: true,
      default: 'provisional'
    },
    score: {
      type: Number,
      default: null,
      min: 0,
      max: 100
    },
    scoreStatus: {
      type: String,
      enum: ['provisional', 'final'],
      required: true,
      default: 'provisional'
    },
    readinessLevel: {
      type: String,
      required: true,
      default: 'Unassessed'
    },
    assessedWeight: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0
    },
    coveragePercent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0
    },
    components: [componentResultSchema],
    recommendations: [recommendationSchema],
    sourceSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({})
    },
    calculationVersion: {
      type: String,
      default: '1.0'
    },
    isCurrent: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

readinessAssessmentSchema.index({ userId: 1, createdAt: -1 });
readinessAssessmentSchema.index({ userId: 1, isCurrent: 1 });

readinessAssessmentSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const ReadinessAssessment = mongoose.model('ReadinessAssessment', readinessAssessmentSchema);

module.exports = ReadinessAssessment;
