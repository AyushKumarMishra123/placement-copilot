const Resume = require('../../../models/Resume');
const ResumeReview = require('../../../models/ResumeReview');
const { READINESS_WEIGHTS, COMPONENT_METADATA } = require('../../../config/readinessWeights');

class ResumeScoreAdapter {
  constructor() {
    this.key = 'resume';
    this.weight = READINESS_WEIGHTS.resume;
    this.label = COMPONENT_METADATA.resume.label;
  }

  /**
   * Adapts the latest valid review of the active resume for the student
   * @param {string|ObjectId} userId
   * @returns {Promise<{ component: Object, findings: Array, sourceMeta: Object }>}
   */
  async evaluate(userId) {
    // 1. Identify active resume (most recently created/uploaded resume)
    const activeResume = await Resume.findOne({ userId }).sort({ createdAt: -1 });

    if (!activeResume) {
      return {
        component: {
          key: this.key,
          label: this.label,
          weight: this.weight,
          score: null,
          status: 'not_assessed',
          source: { type: 'resume', id: null },
          assessedAt: null,
          lastUpdatedAt: null,
          reasons: ['No resume document uploaded yet.']
        },
        findings: [],
        sourceMeta: { resumeId: null, reviewId: null, updatedAt: null }
      };
    }

    if (activeResume.status === 'processing' || activeResume.status === 'uploaded') {
      return {
        component: {
          key: this.key,
          label: this.label,
          weight: this.weight,
          score: null,
          status: 'processing',
          source: { type: 'resume', id: activeResume._id.toString() },
          assessedAt: null,
          lastUpdatedAt: activeResume.updatedAt,
          reasons: ['Resume is currently being processed by parsing microservice.']
        },
        findings: [],
        sourceMeta: { resumeId: activeResume._id.toString(), reviewId: null, updatedAt: activeResume.updatedAt }
      };
    }

    if (activeResume.status === 'failed') {
      return {
        component: {
          key: this.key,
          label: this.label,
          weight: this.weight,
          score: null,
          status: 'failed',
          source: { type: 'resume', id: activeResume._id.toString() },
          assessedAt: null,
          lastUpdatedAt: activeResume.updatedAt,
          reasons: [activeResume.errorMessage || 'Resume parsing failed.']
        },
        findings: [],
        sourceMeta: { resumeId: activeResume._id.toString(), reviewId: null, updatedAt: activeResume.updatedAt }
      };
    }

    // 2. Fetch latest review for active resume
    const latestReview = await ResumeReview.findOne({
      resumeId: activeResume._id,
      userId
    }).sort({ createdAt: -1 });

    if (!latestReview) {
      return {
        component: {
          key: this.key,
          label: this.label,
          weight: this.weight,
          score: null,
          status: 'not_assessed',
          source: { type: 'resume', id: activeResume._id.toString() },
          assessedAt: null,
          lastUpdatedAt: activeResume.updatedAt,
          reasons: ['Resume uploaded but automated benchmark review is pending.']
        },
        findings: [],
        sourceMeta: { resumeId: activeResume._id.toString(), reviewId: null, updatedAt: activeResume.updatedAt }
      };
    }

    // 3. Stale check: has resume document been re-uploaded / modified after review?
    const isStale = new Date(activeResume.updatedAt).getTime() > new Date(latestReview.createdAt).getTime() + 1000;

    // 4. Extract actionable failed/warning benchmark checks
    const findings = [];
    if (Array.isArray(latestReview.checks)) {
      for (const check of latestReview.checks) {
        if (check.status === 'fail' || check.status === 'warning') {
          findings.push({
            findingId: `RESUME_${check.id}`,
            title: `Resume: ${check.name}`,
            description: check.explanation,
            sourceComponent: 'resume',
            priority: check.status === 'fail' ? (check.weight >= 15 ? 'high' : 'medium') : 'low',
            impact: check.weight >= 15 ? 'high' : 'medium',
            actionSteps: [check.suggestion]
          });
        }
      }
    }

    return {
      component: {
        key: this.key,
        label: this.label,
        weight: this.weight,
        score: latestReview.score,
        status: isStale ? 'stale' : 'assessed',
        source: {
          type: 'resume_review',
          id: latestReview._id.toString(),
          resumeId: activeResume._id.toString(),
          version: latestReview.version || 1,
          filename: activeResume.originalFilename
        },
        assessedAt: latestReview.createdAt,
        lastUpdatedAt: latestReview.updatedAt,
        reasons: isStale ? ['A newer resume version was uploaded since the last review.'] : []
      },
      findings,
      sourceMeta: {
        resumeId: activeResume._id.toString(),
        reviewId: latestReview._id.toString(),
        version: latestReview.version || 1,
        score: latestReview.score,
        updatedAt: latestReview.createdAt
      }
    };
  }
}

module.exports = new ResumeScoreAdapter();
