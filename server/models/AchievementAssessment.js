const mongoose = require('mongoose');

const singleAchievementSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ['hackathons', 'leadership', 'open_source', 'projects', 'certifications', 'extracurricular'],
      required: true
    },
    title: { type: String, required: true, trim: true },
    organizer: { type: String, default: '', trim: true },
    date: { type: String, default: '', trim: true },
    participationType: {
      type: String,
      enum: ['individual', 'team'],
      default: 'individual'
    },
    role: { type: String, default: '', trim: true },
    teamSize: { type: Number, default: 1 },
    resultAward: { type: String, default: '', trim: true },
    problemSolved: { type: String, default: '', trim: true },
    contribution: { type: String, default: '', trim: true },
    technologies: { type: [String], default: [] },
    impact: { type: String, default: '', trim: true },
    evidenceUrl: { type: String, default: '', trim: true },
    status: {
      type: String,
      enum: ['completed', 'in_progress'],
      default: 'completed'
    }
  },
  { _id: true }
);

const dimensionScoreSchema = new mongoose.Schema(
  {
    score: { type: Number, required: true, min: 0 },
    max: { type: Number, required: true },
    weightPercent: { type: Number, required: true },
    feedback: { type: String, default: '' }
  },
  { _id: false }
);

const categoryBreakdownSchema = new mongoose.Schema(
  {
    category: { type: String, required: true },
    count: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    summary: { type: String, default: '' }
  },
  { _id: false }
);

const recommendedActivitySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    category: { type: String, required: true },
    rationale: { type: String, required: true },
    timeline: { type: String, default: '30 days' },
    status: { type: String, default: 'recommended' }
  },
  { _id: false }
);

const resumeLinkedInPresentationSchema = new mongoose.Schema(
  {
    achievementTitle: { type: String, required: true },
    bulletSuggestion: { type: String, required: true },
    linkedinTip: { type: String, default: '' }
  },
  { _id: false }
);

const achievementAssessmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    participationStatus: {
      type: String,
      enum: ['achievements', 'activities_no_formal', 'none_want_to_improve'],
      required: true
    },
    targetRole: {
      type: String,
      trim: true,
      default: 'Software Engineer'
    },
    academicYear: {
      type: String,
      trim: true,
      default: '3rd Year'
    },
    achievements: [singleAchievementSchema],
    dimensionScores: {
      relevance: { type: dimensionScoreSchema, required: true },
      contribution: { type: dimensionScoreSchema, required: true },
      outcomes: { type: dimensionScoreSchema, required: true },
      achievementLevel: { type: dimensionScoreSchema, required: true },
      consistency: { type: dimensionScoreSchema, required: true },
      evidence: { type: dimensionScoreSchema, required: true }
    },
    categoryBreakdown: [categoryBreakdownSchema],
    overallScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    baseline: {
      type: Boolean,
      default: false
    },
    strongestContributions: {
      type: [String],
      default: []
    },
    roleRelevantHighlights: {
      type: [String],
      default: []
    },
    improvementAreas: {
      type: [String],
      default: []
    },
    missingInformation: {
      type: [String],
      default: []
    },
    resumeLinkedInPresentation: [resumeLinkedInPresentationSchema],
    recommendedActivities: [recommendedActivitySchema],
    actionPlan30Days: {
      type: [String],
      default: []
    },
    actionPlan60Days: {
      type: [String],
      default: []
    },
    assessedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

achievementAssessmentSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('AchievementAssessment', achievementAssessmentSchema);
