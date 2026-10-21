const { getAIProvider } = require('../ai');

class InterviewEvaluationService {
  /**
   * Evaluates the completed interview transcript against the official 5-dimension rubric
   * @param {Object} params
   * @param {string} params.targetRole
   * @param {number} params.durationMinutes
   * @param {string} params.focus
   * @param {Array} params.questions
   * @param {Array} params.transcript
   * @param {Object} params.context
   * @returns {Promise<Object>}
   */
  async evaluateSession({ targetRole, durationMinutes, focus, questions, transcript, context }) {
    const provider = getAIProvider();

    const evaluationResult = await provider.evaluateInterview({
      targetRole,
      durationMinutes,
      focus,
      questions,
      transcript,
      context
    });

    if (!evaluationResult || typeof evaluationResult.overallScore !== 'number') {
      throw new Error('Interview evaluation service returned malformed evaluation result.');
    }

    const overallScore = Math.min(100, Math.max(0, Math.round(evaluationResult.overallScore)));

    const dimensions = Array.isArray(evaluationResult.dimensions)
      ? evaluationResult.dimensions.map((d) => ({
          name: d.name,
          weight: d.weight || 20,
          score: Math.min(100, Math.max(0, Math.round(d.score))),
          feedback: d.feedback || ''
        }))
      : [];

    return {
      overallScore,
      dimensions,
      strengths: Array.isArray(evaluationResult.strengths) ? evaluationResult.strengths : [],
      weaknesses: Array.isArray(evaluationResult.weaknesses) ? evaluationResult.weaknesses : [],
      recommendations: Array.isArray(evaluationResult.recommendations) ? evaluationResult.recommendations : [],
      questionEvaluations: Array.isArray(evaluationResult.questionEvaluations)
        ? evaluationResult.questionEvaluations.map((qe) => ({
            questionId: qe.questionId,
            category: qe.category || 'technical',
            score: Math.min(100, Math.max(0, Math.round(qe.score))),
            feedback: qe.feedback || '',
            suggestedImprovement: qe.suggestedImprovement || ''
          }))
        : []
    };
  }
}

module.exports = new InterviewEvaluationService();
