/**
 * Readiness Recommendation Engine
 * Ranks and selects the five highest-priority improvement actions
 * grounded strictly in actual assessment findings.
 */

class ReadinessRecommendationService {
  /**
   * Prioritizes and deduplicates findings into top 5 recommendations
   * @param {Array} allFindings - Raw findings collected from component adapters
   * @param {Object} componentWeights - Weight mapping per component key
   * @returns {Array} - Up to 5 prioritized recommendation objects
   */
  prioritize(allFindings = [], componentWeights = {}) {
    if (!Array.isArray(allFindings) || allFindings.length === 0) {
      return [];
    }

    // 1. Deduplicate findings by title or findingId
    const seen = new Set();
    const uniqueFindings = [];

    for (const f of allFindings) {
      const dedupKey = (f.findingId || f.title).toLowerCase().trim();
      if (!seen.has(dedupKey)) {
        seen.add(dedupKey);
        uniqueFindings.push(f);
      }
    }

    // 2. Score each finding for deterministic ranking
    // Priority weight: high = 3, medium = 2, low = 1
    // Component weight: resume = 25, projects = 25, interview = 20, github = 10, coding = 10, achievements = 5, linkedin = 5
    const priorityMultiplier = {
      high: 3,
      medium: 2,
      low: 1
    };

    const scoredFindings = uniqueFindings.map((f, index) => {
      const prioScore = priorityMultiplier[f.priority] || 1;
      const compWeight = componentWeights[f.sourceComponent] || 10;
      // Primary score: priority * component weight. Secondary tie-breaker: order of detection
      const rankScore = prioScore * 100 + compWeight * 2 - index;

      return {
        ...f,
        rankScore
      };
    });

    // 3. Sort descending by rank score
    scoredFindings.sort((a, b) => b.rankScore - a.rankScore);

    // 4. Select top 5 and map to standardized recommendation schema
    const top5 = scoredFindings.slice(0, 5).map((f, idx) => ({
      id: `REC_${idx + 1}_${f.findingId || 'ACTION'}`,
      title: f.title,
      description: f.description,
      sourceComponent: f.sourceComponent,
      sourceFindingId: f.findingId || '',
      priority: f.priority || 'medium',
      impact: f.impact || 'medium',
      actionSteps: Array.isArray(f.actionSteps) && f.actionSteps.length > 0 ? f.actionSteps : [f.description],
      status: 'pending'
    }));

    return top5;
  }
}

module.exports = new ReadinessRecommendationService();
