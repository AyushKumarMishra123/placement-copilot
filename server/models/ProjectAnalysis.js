const mongoose = require('mongoose');

const codeFindingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    severity: {
      type: String,
      enum: ['critical', 'warning', 'info'],
      required: true
    },
    filePath: { type: String, default: '' },
    evidence: { type: String, default: '' },
    explanation: { type: String, required: true },
    suggestedFix: { type: String, required: true },
    confidence: { type: Number, default: 1.0 }
  },
  { _id: false }
);

const secretFindingSchema = new mongoose.Schema(
  {
    category: { type: String, required: true },
    filePath: { type: String, required: true },
    maskedEvidence: { type: String, required: true },
    explanation: { type: String, required: true },
    suggestedFix: { type: String, required: true },
    severity: { type: String, default: 'critical' }
  },
  { _id: false }
);

const projectAnalysisSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },
    projectName: { type: String, required: true },
    projectDescription: { type: String, default: '' },
    techStack: [{ type: String }],
    repositoryUrl: { type: String, default: '' },
    commitSha: { type: String, default: '' },
    scores: {
      overallProjectScore: { type: Number, required: true, min: 0, max: 100 },
      repositoryQuality: { type: Number, default: 0 },
      readmeQuality: { type: Number, default: 0 },
      codeQuality: { type: Number, default: 0 },
      liveWebsiteQuality: { type: Number, default: 0 }
    },
    READMEAnalysis: {
      qualityScore: { type: Number, default: 0 },
      passed: [{ type: String }],
      issues: [{ type: String }],
      hasInstallation: { type: Boolean, default: false },
      hasEnvInstructions: { type: Boolean, default: false },
      hasTestInstructions: { type: Boolean, default: false },
      hasTechStack: { type: Boolean, default: false },
      hasRunInstructions: { type: Boolean, default: false },
      scriptsCrossReferenced: [{ type: String }]
    },
    codeAnalysis: {
      totalFilesInspected: { type: Number, default: 0 },
      totalLinesInspected: { type: Number, default: 0 },
      hasTests: { type: Boolean, default: false },
      testFilesFound: [{ type: String }],
      configFilesFound: [{ type: String }],
      largeFiles: [{ type: String }],
      findings: [codeFindingSchema]
    },
    secretFindings: [secretFindingSchema],
    liveCheck: {
      attempted: { type: Boolean, default: false },
      url: { type: String, default: '' },
      reachable: { type: Boolean, default: false },
      httpStatus: { type: Number, default: null },
      finalUrl: { type: String, default: '' },
      pageTitle: { type: String, default: '' },
      hasReadableContent: { type: Boolean, default: false },
      desktopScreenshotId: { type: String, default: null },
      mobileScreenshotId: { type: String, default: null },
      consoleErrors: [{ type: String }],
      pageErrors: [{ type: String }],
      claimVerification: {
        status: {
          type: String,
          enum: ['Verified', 'Partially verified', 'Not verified', 'Unable to verify'],
          default: 'Unable to verify'
        },
        explanation: { type: String, default: '' },
        evidence: { type: String, default: '' },
        confidence: { type: Number, default: 1.0 }
      }
    },
    aiSynthesis: {
      documentationClarity: { type: String, default: '' },
      codeReadabilityFeedback: { type: String, default: '' },
      recommendations: [{ type: String }]
    },
    version: { type: Number, default: 1 }
  },
  {
    timestamps: true
  }
);

projectAnalysisSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const ProjectAnalysis = mongoose.model('ProjectAnalysis', projectAnalysisSchema);

module.exports = ProjectAnalysis;
