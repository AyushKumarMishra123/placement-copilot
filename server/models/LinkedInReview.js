const mongoose = require('mongoose');

const categoryScoreSchema = new mongoose.Schema(
  {
    score: { type: Number, required: true, min: 0 },
    max: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pass', 'warning', 'fail', 'unavailable'],
      default: 'warning'
    },
    feedback: { type: String, default: '' },
    details: { type: [String], default: [] }
  },
  { _id: false }
);

const sectionSuggestionSchema = new mongoose.Schema(
  {
    section: { type: String, required: true },
    issue: { type: String, required: true },
    suggestion: { type: String, required: true },
    example: { type: String, default: '' }
  },
  { _id: false }
);

const checklistItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    task: { type: String, required: true },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium'
    },
    completed: { type: Boolean, default: false }
  },
  { _id: false }
);

const linkedInReviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    inputMethod: {
      type: String,
      enum: ['url', 'pdf', 'manual'],
      required: true
    },
    profileUrl: {
      type: String,
      trim: true,
      default: ''
    },
    targetRole: {
      type: String,
      trim: true,
      default: 'Software Engineer'
    },
    profileData: {
      fullName: { type: String, default: '' },
      headline: { type: String, default: '' },
      location: { type: String, default: '' },
      about: { type: String, default: '' },
      experience: [
        {
          title: String,
          company: String,
          duration: String,
          description: String,
          isCurrent: Boolean
        }
      ],
      projects: [
        {
          name: String,
          description: String,
          techStack: [String],
          link: String
        }
      ],
      skills: { type: [String], default: [] },
      education: [
        {
          school: String,
          degree: String,
          fieldOfStudy: String,
          year: String
        }
      ],
      certifications: [
        {
          name: String,
          issuer: String,
          year: String,
          url: String
        }
      ],
      featuredLinks: [
        {
          title: String,
          url: String
        }
      ],
      achievements: { type: [String], default: [] }
    },
    categoryScores: {
      headline: { type: categoryScoreSchema, required: true },
      about: { type: categoryScoreSchema, required: true },
      experience: { type: categoryScoreSchema, required: true },
      projects: { type: categoryScoreSchema, required: true },
      skills: { type: categoryScoreSchema, required: true },
      education: { type: categoryScoreSchema, required: true },
      featured: { type: categoryScoreSchema, required: true },
      achievements: { type: categoryScoreSchema, required: true }
    },
    overallScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    strengths: {
      type: [String],
      default: []
    },
    weaknesses: {
      type: [String],
      default: []
    },
    sectionSuggestions: [sectionSuggestionSchema],
    missingSections: {
      type: [String],
      default: []
    },
    improvedHeadline: {
      type: String,
      default: ''
    },
    improvedAbout: {
      type: String,
      default: ''
    },
    impactPresentationTips: {
      type: [String],
      default: []
    },
    recommendedKeywords: {
      type: [String],
      default: []
    },
    actionChecklist: [checklistItemSchema],
    reviewedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

linkedInReviewSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('LinkedInReview', linkedInReviewSchema);
