const LinkedInReview = require('../../../models/LinkedInReview');
const { READINESS_WEIGHTS, COMPONENT_METADATA } = require('../../../config/readinessWeights');

class LinkedInScoreAdapter {
  constructor() {
    this.key = 'linkedin';
    this.weight = READINESS_WEIGHTS.linkedin;
    this.label = COMPONENT_METADATA.linkedin.label;
  }

  /**
   * Adapts LinkedIn profile assessment to placement readiness engine
   * @param {string|ObjectId} userId
   * @returns {Promise<{ component: Object, findings: Array, sourceMeta: Object }>}
   */
  async evaluate(userId) {
    const review = await LinkedInReview.findOne({ userId }).sort({ createdAt: -1 });

    if (!review) {
      return {
        component: {
          key: this.key,
          label: this.label,
          weight: this.weight,
          score: null,
          status: 'not_assessed',
          source: { type: 'linkedin_review', id: null },
          assessedAt: null,
          lastUpdatedAt: null,
          reasons: ['Detailed LinkedIn profile review has not been performed yet.']
        },
        findings: [
          {
            findingId: 'LINKEDIN_NOT_REVIEWED',
            title: 'Analyze Your LinkedIn Profile',
            description: 'Recruiters cross-check LinkedIn profiles during shortlisting. Complete a profile review to identify missing keywords and boost visibility.',
            sourceComponent: 'linkedin',
            priority: 'medium',
            impact: 'low',
            actionSteps: ['Submit your LinkedIn profile URL, upload your profile PDF, or enter your profile details in the LinkedIn Review module.']
          }
        ],
        sourceMeta: { reviewId: null }
      };
    }

    const findings = [];
    if (review.weaknesses && review.weaknesses.length > 0) {
      review.weaknesses.forEach((w, idx) => {
        findings.push({
          findingId: `LINKEDIN_WEAKNESS_${idx + 1}`,
          title: `Improve LinkedIn: ${review.sectionSuggestions?.[idx]?.section || 'Profile Section'}`,
          description: w,
          sourceComponent: 'linkedin',
          priority: review.overallScore < 60 ? 'high' : 'medium',
          impact: 'low',
          actionSteps: [review.sectionSuggestions?.[idx]?.suggestion || 'Review your profile against the recommended checklist.']
        });
      });
    }

    return {
      component: {
        key: this.key,
        label: this.label,
        weight: this.weight,
        score: review.overallScore,
        status: 'assessed',
        source: {
          type: 'linkedin_review',
          id: review._id,
          inputMethod: review.inputMethod,
          categoryScores: review.categoryScores
        },
        assessedAt: review.reviewedAt || review.createdAt,
        lastUpdatedAt: review.updatedAt,
        reasons: [
          `LinkedIn Profile score: ${review.overallScore}/100 across 8 evaluation categories.`
        ]
      },
      findings,
      sourceMeta: {
        reviewId: review._id,
        overallScore: review.overallScore,
        categoryScores: review.categoryScores
      }
    };
  }
}

module.exports = new LinkedInScoreAdapter();

