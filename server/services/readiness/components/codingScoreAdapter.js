const { READINESS_WEIGHTS, COMPONENT_METADATA } = require('../../../config/readinessWeights');
const CodingSubmission = require('../../../models/CodingSubmission');

class CodingScoreAdapter {
  constructor() {
    this.key = 'coding';
    this.weight = READINESS_WEIGHTS.coding;
    this.label = COMPONENT_METADATA.coding.label;
  }

  /**
   * Adapts coding assessment submissions to readiness score
   * @param {string|ObjectId} userId
   * @returns {Promise<{ component: Object, findings: Array, sourceMeta: Object }>}
   */
  async evaluate(userId) {
    if (!userId) {
      return this.getUnassessedResult('User ID not provided');
    }

    try {
      const acceptedSubmissions = await CodingSubmission.find({
        userId,
        status: 'Accepted'
      }).populate('problemId', 'difficulty topic title maxScore');

      if (!acceptedSubmissions || acceptedSubmissions.length === 0) {
        return this.getUnassessedResult('Verified coding practice / DSA assessment has not been conducted yet.');
      }

      // Collect unique solved problems
      const solvedProblemsMap = new Map();
      for (const sub of acceptedSubmissions) {
        if (sub.problemId) {
          solvedProblemsMap.set(sub.problemId._id.toString(), sub.problemId);
        }
      }

      const uniqueSolvedCount = solvedProblemsMap.size;
      if (uniqueSolvedCount === 0) {
        return this.getUnassessedResult('No coding problems solved yet.');
      }

      let easySolved = 0;
      let mediumSolved = 0;
      let hardSolved = 0;

      for (const prob of solvedProblemsMap.values()) {
        if (prob.difficulty === 'Easy') easySolved++;
        else if (prob.difficulty === 'Medium') mediumSolved++;
        else if (prob.difficulty === 'Hard') hardSolved++;
      }

      // Scoring formula:
      // Easy: up to 30 pts (6 pts each, max 5 problems)
      // Medium: up to 50 pts (10 pts each, max 5 problems)
      // Hard: up to 20 pts (10 pts each, max 2 problems)
      const easyScore = Math.min(30, easySolved * 6);
      const mediumScore = Math.min(50, mediumSolved * 10);
      const hardScore = Math.min(20, hardSolved * 10);
      const finalScore = Math.min(100, easyScore + mediumScore + hardScore);

      const reasons = [
        `Solved ${uniqueSolvedCount} verified coding problems across DSA topics.`,
        `Difficulty distribution: ${easySolved} Easy, ${mediumSolved} Medium, ${hardSolved} Hard.`
      ];

      return {
        component: {
          key: this.key,
          label: this.label,
          weight: this.weight,
          score: finalScore,
          status: 'assessed',
          source: { type: 'coding_assessment', id: userId.toString() },
          assessedAt: new Date(),
          lastUpdatedAt: new Date(),
          reasons
        },
        findings: [
          {
            type: 'strength',
            message: `Completed ${uniqueSolvedCount} original coding challenges with validated test suites.`
          }
        ],
        sourceMeta: {
          uniqueSolvedCount,
          easySolved,
          mediumSolved,
          hardSolved
        }
      };
    } catch (err) {
      console.warn('[CodingScoreAdapter Error]:', err.message);
      return this.getUnassessedResult('Failed to evaluate coding submissions.');
    }
  }

  getUnassessedResult(reason) {
    return {
      component: {
        key: this.key,
        label: this.label,
        weight: this.weight,
        score: null,
        status: 'not_assessed',
        source: { type: 'coding_assessment', id: null },
        assessedAt: null,
        lastUpdatedAt: null,
        reasons: [reason]
      },
      findings: [],
      sourceMeta: { assessmentId: null }
    };
  }
}

module.exports = new CodingScoreAdapter();
