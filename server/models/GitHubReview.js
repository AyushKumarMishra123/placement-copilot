const mongoose = require('mongoose');

const findingSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    category: {
      type: String,
      enum: ['profile_setup', 'activity', 'presentation'],
      required: true
    },
    status: {
      type: String,
      enum: ['pass', 'fail', 'warning', 'unavailable'],
      required: true
    },
    evidence: { type: String, default: '' },
    whyItMatters: { type: String, required: true },
    suggestedAction: { type: String, required: true },
    confidence: { type: Number, default: 1.0 }
  },
  { _id: false }
);

const repoOverviewSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    fullName: { type: String, required: true },
    description: { type: String, default: '' },
    language: { type: String, default: '' },
    stars: { type: Number, default: 0 },
    forks: { type: Number, default: 0 },
    isPinned: { type: Boolean, default: false },
    defaultBranch: { type: String, default: 'main' },
    updatedAt: { type: Date },
    url: { type: String, required: true }
  },
  { _id: false }
);

const gitHubReviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    username: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    profileUrl: {
      type: String,
      required: true
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    profileSnapshot: {
      name: { type: String, default: '' },
      bio: { type: String, default: '' },
      publicRepos: { type: Number, default: 0 },
      publicGists: { type: Number, default: 0 },
      followers: { type: Number, default: 0 },
      following: { type: Number, default: 0 },
      avatarUrl: { type: String, default: '' },
      createdAt: { type: Date },
      updatedAt: { type: Date },
      hasProfileReadme: { type: Boolean, default: false },
      profileReadmeSnippet: { type: String, default: '' },
      pinnedRepositories: [repoOverviewSchema],
      recentActivity: {
        publicEventsCount: { type: Number, default: 0 },
        commitsInWindow: { type: Number, default: 0 },
        windowDays: { type: Number, default: 90 },
        lastActiveDate: { type: Date, default: null }
      }
    },
    findings: [findingSchema],
    repositories: [repoOverviewSchema],
    aiSynthesis: {
      strengths: [{ type: String }],
      weaknesses: [{ type: String }],
      recommendations: [{ type: String }],
      summary: { type: String, default: '' }
    }
  },
  {
    timestamps: true
  }
);

gitHubReviewSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const GitHubReview = mongoose.model('GitHubReview', gitHubReviewSchema);

module.exports = GitHubReview;
