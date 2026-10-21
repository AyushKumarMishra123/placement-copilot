/**
 * Deterministic Resume Scoring Engine
 * Computes transparent, auditable scores out of 100 directly from benchmark check results.
 */

class ScoringEngine {
  /**
   * Calculate overall score and category breakdown from benchmark checks.
   * @param {Array<Object>} checks
   * @returns {{ score: number, categoryScores: Object, tier: string }}
   */
  calculateScore(checks) {
    let totalScore = 0;

    const categoryScores = {
      structure: 0,        // Max 15 (Check 1: 10 + Check 2: 5)
      projects: 0,         // Max 20 (Check 4: 20)
      measurableImpact: 0, // Max 25 (Check 7: 10 + Check 8: 15)
      skillsAts: 0,        // Max 20 (Check 3: 10 + Check 9: 10)
      profilesLinks: 0,    // Max 10 (Check 5: 10)
      achievements: 0      // Max 10 (Check 6: 10)
    };

    for (const check of checks) {
      const score = Math.max(0, check.score || 0);
      totalScore += score;

      switch (check.id) {
        case 'CHECK_PAGE_COUNT':
        case 'CHECK_VISUAL_STRUCTURE':
          categoryScores.structure += score;
          break;
        case 'CHECK_PROJECT_QUALITY':
          categoryScores.projects += score;
          break;
        case 'CHECK_ACTION_VERBS':
        case 'CHECK_MEASURABLE_RESULTS':
          categoryScores.measurableImpact += score;
          break;
        case 'CHECK_SPELLING_GRAMMAR':
        case 'CHECK_ATS_READABILITY':
          categoryScores.skillsAts += score;
          break;
        case 'CHECK_PROFILE_LINKS':
          categoryScores.profilesLinks += score;
          break;
        case 'CHECK_ACHIEVEMENTS':
          categoryScores.achievements += score;
          break;
        default:
          break;
      }
    }

    // Clamp total to 0-100
    const finalScore = Math.min(100, Math.max(0, Math.round(totalScore)));

    let tier = 'Needs Work';
    if (finalScore >= 85) tier = 'Placement Ready (Top Tier)';
    else if (finalScore >= 70) tier = 'Competitive';
    else if (finalScore >= 50) tier = 'Moderate (Key Fixes Needed)';
    else tier = 'Action Required';

    return {
      score: finalScore,
      categoryScores,
      tier
    };
  }
}

module.exports = new ScoringEngine();
