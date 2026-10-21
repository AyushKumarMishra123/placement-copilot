/**
 * Base AI Review Provider Interface
 */
class AIReviewProvider {
  /**
   * Reviews resume content and enhances benchmark findings
   * @param {Object} context
   * @param {Object} context.parsedResume
   * @param {Array<Object>} context.checks
   * @param {number} context.score
   * @returns {Promise<{
   *   strengths: Array<string>,
   *   weaknesses: Array<string>,
   *   recommendations: Array<string>,
   *   summary: string,
   *   refinedSuggestions?: Record<string, string>,
   *   provider: string
   * }>}
   */
  /**
   * Reviews resume content and enhances benchmark findings
   */
  async reviewResume(context) {
    throw new Error('reviewResume() must be implemented by the provider');
  }

  /**
   * Generates structured mock interview questions tailored to student profile
   */
  async generateInterviewQuestions(context) {
    throw new Error('generateInterviewQuestions() must be implemented by the provider');
  }

  /**
   * Reviews LinkedIn profile data and generates qualitative improvement advice
   */
  async reviewLinkedInProfile(context) {
    throw new Error('reviewLinkedInProfile() must be implemented by the provider');
  }

  /**
   * Evaluates co-curricular achievements and generates tailored guidance
   */
  async evaluateCoCurricularAchievements(context) {
    throw new Error('evaluateCoCurricularAchievements() must be implemented by the provider');
  }
}

module.exports = AIReviewProvider;

