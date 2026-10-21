const Profile = require('../../../models/Profile');
const GitHubReview = require('../../../models/GitHubReview');
const { READINESS_WEIGHTS, COMPONENT_METADATA } = require('../../../config/readinessWeights');

class GitHubScoreAdapter {
  constructor() {
    this.key = 'github';
    this.weight = READINESS_WEIGHTS.github;
    this.label = COMPONENT_METADATA.github.label;
  }

  /**
   * Adapts latest GitHub profile analysis
   * @param {string|ObjectId} userId
   * @returns {Promise<{ component: Object, findings: Array, sourceMeta: Object }>}
   */
  async evaluate(userId) {
    const latestReview = await GitHubReview.findOne({ userId }).sort({ createdAt: -1 });

    if (!latestReview) {
      return {
        component: {
          key: this.key,
          label: this.label,
          weight: this.weight,
          score: null,
          status: 'not_assessed',
          source: { type: 'github_review', id: null },
          assessedAt: null,
          lastUpdatedAt: null,
          reasons: ['GitHub profile has not been analyzed yet.']
        },
        findings: [],
        sourceMeta: { reviewId: null, username: null, updatedAt: null }
      };
    }

    // Check if user changed their linked GitHub handle in Profile
    const profile = await Profile.findOne({ userId });
    let isStale = false;
    if (profile?.github) {
      const cleanProfileUser = profile.github
        .replace(/https?:\/\/(www\.)?github\.com\//i, '')
        .replace(/\/+$/, '')
        .toLowerCase();
      if (cleanProfileUser && cleanProfileUser !== latestReview.username.toLowerCase()) {
        isStale = true;
      }
    }

    const findings = [];
    if (Array.isArray(latestReview.findings)) {
      for (const f of latestReview.findings) {
        if (f.status === 'fail' || f.status === 'warning') {
          findings.push({
            findingId: `GITHUB_${f.id || f.title.replace(/\s+/g, '_')}`,
            title: `GitHub Profile: ${f.title}`,
            description: f.whyItMatters || f.evidence,
            sourceComponent: 'github',
            priority: f.status === 'fail' ? 'high' : 'medium',
            impact: 'medium',
            actionSteps: [f.suggestedAction || 'Update public GitHub profile presentation.']
          });
        }
      }
    }

    const reviewScore = typeof latestReview.score === 'number' ? latestReview.score : (latestReview.githubScore || 0);

    return {
      component: {
        key: this.key,
        label: this.label,
        weight: this.weight,
        score: reviewScore,
        status: isStale ? 'stale' : 'assessed',
        source: {
          type: 'github_review',
          id: latestReview._id.toString(),
          username: latestReview.username,
          publicRepos: latestReview.profileSnapshot?.publicRepos ?? 0
        },
        assessedAt: latestReview.createdAt,
        lastUpdatedAt: latestReview.updatedAt,
        reasons: isStale ? ['Profile GitHub username was updated after the review was performed.'] : []
      },
      findings,
      sourceMeta: {
        reviewId: latestReview._id.toString(),
        username: latestReview.username,
        score: reviewScore,
        updatedAt: latestReview.createdAt
      }
    };
  }
}

module.exports = new GitHubScoreAdapter();
