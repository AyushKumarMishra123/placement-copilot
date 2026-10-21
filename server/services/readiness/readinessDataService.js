const resumeScoreAdapter = require('./components/resumeScoreAdapter');
const projectScoreAdapter = require('./components/projectScoreAdapter');
const githubScoreAdapter = require('./components/githubScoreAdapter');
const interviewScoreAdapter = require('./components/interviewScoreAdapter');
const codingScoreAdapter = require('./components/codingScoreAdapter');
const linkedinScoreAdapter = require('./components/linkedinScoreAdapter');
const achievementsScoreAdapter = require('./components/achievementsScoreAdapter');

class ReadinessDataService {
  constructor() {
    this.adapters = [
      resumeScoreAdapter,
      projectScoreAdapter,
      interviewScoreAdapter,
      githubScoreAdapter,
      codingScoreAdapter,
      linkedinScoreAdapter,
      achievementsScoreAdapter
    ];
  }

  /**
   * Evaluates all 7 components across source models
   * @param {string|ObjectId} userId
   * @returns {Promise<{ components: Array, findings: Array, sourceSnapshot: Object }>}
   */
  async collectAllComponentData(userId) {
    const results = await Promise.all(
      this.adapters.map((adapter) => adapter.evaluate(userId))
    );

    const components = [];
    const allFindings = [];
    const sourceSnapshot = {};

    for (let i = 0; i < this.adapters.length; i++) {
      const adapter = this.adapters[i];
      const res = results[i];

      components.push(res.component);
      if (Array.isArray(res.findings)) {
        allFindings.push(...res.findings);
      }
      sourceSnapshot[adapter.key] = res.sourceMeta || {};
    }

    sourceSnapshot.evaluatedAt = new Date();

    return {
      components,
      findings: allFindings,
      sourceSnapshot
    };
  }

  /**
   * Compares a stored sourceSnapshot with current underlying data to detect staleness
   * @param {Object} oldSnapshot
   * @param {Object} newSnapshot
   * @returns {boolean}
   */
  isSnapshotStale(oldSnapshot, newSnapshot) {
    if (!oldSnapshot || !newSnapshot) return true;

    // Check resume source change
    if (oldSnapshot.resume?.reviewId !== newSnapshot.resume?.reviewId) return true;

    // Check github source change
    if (oldSnapshot.github?.reviewId !== newSnapshot.github?.reviewId) return true;

    // Check project source change
    const oldProjIds = (oldSnapshot.projects?.analysisIds || []).sort().join(',');
    const newProjIds = (newSnapshot.projects?.analysisIds || []).sort().join(',');
    if (oldProjIds !== newProjIds) return true;

    // Check achievements change
    if (oldSnapshot.achievements?.reviewed !== newSnapshot.achievements?.reviewed) return true;
    if (oldSnapshot.achievements?.count !== newSnapshot.achievements?.count) return true;

    return false;
  }
}

module.exports = new ReadinessDataService();
