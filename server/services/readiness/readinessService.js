const ReadinessAssessment = require('../../models/ReadinessAssessment');
const readinessDataService = require('./readinessDataService');
const readinessScoringService = require('./readinessScoringService');
const readinessRecommendationService = require('./readinessRecommendationService');
const { READINESS_WEIGHTS } = require('../../config/readinessWeights');

class ReadinessService {
  /**
   * Recalculates and persists readiness assessment from underlying data
   * @param {string|ObjectId} userId
   * @returns {Promise<Object>} Persisted ReadinessAssessment
   */
  async recalculate(userId) {
    // 1. Collect all component data and findings
    const { components, findings, sourceSnapshot } = await readinessDataService.collectAllComponentData(userId);

    // 2. Compute score and readiness level
    const scoreResult = readinessScoringService.calculateReadiness(components);

    // 3. Extract top 5 actionable recommendations
    const recommendations = readinessRecommendationService.prioritize(findings, READINESS_WEIGHTS);

    // 4. Fetch currently active assessment to check for exact duplicate values
    const latestAssessment = await ReadinessAssessment.findOne({ userId, isCurrent: true });

    if (latestAssessment) {
      const isStale = readinessDataService.isSnapshotStale(latestAssessment.sourceSnapshot, sourceSnapshot);
      // If nothing changed in the underlying sources, reuse the current assessment
      if (!isStale && latestAssessment.score === scoreResult.score && latestAssessment.coveragePercent === scoreResult.coveragePercent) {
        return latestAssessment;
      }

      // Mark older assessments as not current
      await ReadinessAssessment.updateMany({ userId, isCurrent: true }, { isCurrent: false });
    }

    // 5. Persist fresh assessment snapshot
    const assessment = await ReadinessAssessment.create({
      userId,
      assessmentType: scoreResult.assessmentType,
      score: scoreResult.score,
      scoreStatus: scoreResult.scoreStatus,
      readinessLevel: scoreResult.readinessLevel,
      assessedWeight: scoreResult.assessedWeight,
      coveragePercent: scoreResult.coveragePercent,
      components,
      recommendations,
      sourceSnapshot,
      calculationVersion: '1.0',
      isCurrent: true
    });

    return assessment;
  }

  /**
   * Retrieves the current readiness assessment or recalculates if stale/missing
   * @param {string|ObjectId} userId
   * @returns {Promise<Object>}
   */
  async getLatestOrRecalculate(userId) {
    const currentAssessment = await ReadinessAssessment.findOne({ userId, isCurrent: true });

    if (!currentAssessment) {
      return this.recalculate(userId);
    }

    // Check if underlying source data has changed since this assessment was saved
    const { sourceSnapshot: currentSourceSnapshot } = await readinessDataService.collectAllComponentData(userId);
    const isStale = readinessDataService.isSnapshotStale(currentAssessment.sourceSnapshot, currentSourceSnapshot);

    if (isStale) {
      return this.recalculate(userId);
    }

    return currentAssessment;
  }

  /**
   * Retrieves assessment history for authenticated student
   * @param {string|ObjectId} userId
   * @returns {Promise<Array>}
   */
  async getHistory(userId) {
    return ReadinessAssessment.find({ userId })
      .sort({ createdAt: -1 })
      .limit(30);
  }

  /**
   * Retrieves specific assessment snapshot by ID with ownership enforcement
   * @param {string|ObjectId} assessmentId
   * @param {string|ObjectId} userId
   * @returns {Promise<Object>}
   */
  async getById(assessmentId, userId) {
    const assessment = await ReadinessAssessment.findOne({
      _id: assessmentId,
      userId
    });

    if (!assessment) {
      const error = new Error('Readiness assessment not found or unauthorized.');
      error.statusCode = 404;
      error.code = 'ASSESSMENT_NOT_FOUND';
      throw error;
    }

    return assessment;
  }
}

module.exports = new ReadinessService();
