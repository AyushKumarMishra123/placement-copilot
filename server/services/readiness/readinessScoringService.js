const { READINESS_WEIGHTS, COMPONENT_METADATA } = require('../../config/readinessWeights');

class ReadinessScoringService {
  /**
   * Validates individual component result
   * @param {Object} comp
   */
  validateComponentResult(comp) {
    if (!comp || typeof comp !== 'object') {
      throw new Error('Component result must be an object.');
    }

    if (!READINESS_WEIGHTS[comp.key]) {
      throw new Error(`Unknown component key: "${comp.key}".`);
    }

    const expectedWeight = READINESS_WEIGHTS[comp.key];
    if (comp.weight !== expectedWeight) {
      throw new Error(`Component weight mismatch for "${comp.key}": expected ${expectedWeight}, got ${comp.weight}.`);
    }

    const validStatuses = ['assessed', 'not_assessed', 'processing', 'failed', 'stale'];
    if (!validStatuses.includes(comp.status)) {
      throw new Error(`Invalid status "${comp.status}" for component "${comp.key}".`);
    }

    if (comp.status !== 'assessed') {
      if (comp.score !== null) {
        throw new Error(`Unassessed component "${comp.key}" with status "${comp.status}" must have a null score.`);
      }
    } else {
      if (typeof comp.score !== 'number' || comp.score < 0 || comp.score > 100) {
        throw new Error(`Assessed component "${comp.key}" must have a score between 0 and 100. Got: ${comp.score}`);
      }
    }

    return true;
  }

  /**
   * Calculates provisional or final score based on official weights
   * @param {Array} evaluatedComponents
   * @returns {Object} { score, scoreStatus, assessmentType, readinessLevel, assessedWeight, coveragePercent }
   */
  calculateReadiness(evaluatedComponents = []) {
    // 1. Validate all components
    for (const comp of evaluatedComponents) {
      this.validateComponentResult(comp);
    }

    // 2. Identify successfully assessed components
    const assessed = evaluatedComponents.filter(
      (c) => c.status === 'assessed' && typeof c.score === 'number'
    );

    const assessedWeight = assessed.reduce((sum, c) => sum + c.weight, 0);
    const coveragePercent = assessedWeight; // Since total weights sum to 100

    // Case 1: No components assessed yet
    if (assessed.length === 0 || assessedWeight === 0) {
      return {
        score: null,
        rawScore: null,
        scoreStatus: 'provisional',
        assessmentType: 'provisional',
        readinessLevel: 'Unassessed',
        assessedWeight: 0,
        coveragePercent: 0
      };
    }

    // Case 2: Incomplete assessment coverage -> Provisional score
    if (assessedWeight < 100) {
      // Formula: Sum(component score * component weight) / Sum(weights of assessed components)
      const weightedSum = assessed.reduce((sum, c) => sum + c.score * c.weight, 0);
      const rawScore = weightedSum / assessedWeight;
      const roundedScore = Math.round(rawScore);

      let readinessLevel = 'Provisional (Not Ready)';
      if (roundedScore >= 75) {
        readinessLevel = 'Provisional (Placement Ready)';
      } else if (roundedScore >= 50) {
        readinessLevel = 'Provisional (Almost Ready)';
      }

      return {
        score: roundedScore,
        rawScore,
        scoreStatus: 'provisional',
        assessmentType: 'provisional',
        readinessLevel,
        assessedWeight,
        coveragePercent
      };
    }

    // Case 3: Complete assessment coverage (100%) -> Final score
    // Formula: Sum(component score * component weight / 100)
    const weightedSum = assessed.reduce((sum, c) => sum + c.score * (c.weight / 100), 0);
    const rawScore = weightedSum;
    const roundedScore = Math.round(rawScore);

    let readinessLevel = 'Not Ready';
    if (roundedScore >= 75) {
      readinessLevel = 'Placement Ready';
    } else if (roundedScore >= 50) {
      readinessLevel = 'Almost Ready';
    }

    return {
      score: roundedScore,
      rawScore,
      scoreStatus: 'final',
      assessmentType: 'final',
      readinessLevel,
      assessedWeight: 100,
      coveragePercent: 100
    };
  }
}

module.exports = new ReadinessScoringService();
