const { getAIProvider } = require('../ai');

class InterviewQuestionService {
  /**
   * Generates a balanced set of technical, project, problem-solving, and HR questions
   * @param {Object} params
   * @param {string} params.targetRole
   * @param {number} params.durationMinutes
   * @param {string} params.focus
   * @param {Object} params.context
   * @returns {Promise<{ questions: Array, planSummary: string, provider: string }>}
   */
  async generateInterviewPlan({ targetRole, durationMinutes, focus, context }) {
    const provider = getAIProvider();
    const result = await provider.generateInterviewQuestions({
      targetRole,
      durationMinutes,
      focus,
      context
    });

    // Validate generated questions
    if (!result || !Array.isArray(result.questions) || result.questions.length === 0) {
      throw new Error('Interview question generation returned no valid questions.');
    }

    const sanitizedQuestions = result.questions.map((q, idx) => ({
      id: q.id || `Q${idx + 1}_${(q.category || 'tech').toUpperCase()}`,
      order: q.order || idx + 1,
      category: ['technical', 'project', 'problem_solving', 'behavioral'].includes(q.category)
        ? q.category
        : 'technical',
      prompt: q.prompt,
      contextTarget: q.contextTarget || ''
    }));

    return {
      questions: sanitizedQuestions,
      planSummary: result.planSummary || 'Personalized interview plan ready.',
      provider: result.provider || 'ai'
    };
  }
}

module.exports = new InterviewQuestionService();
