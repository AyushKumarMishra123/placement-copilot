const InterviewSession = require('../../../models/InterviewSession');
const { READINESS_WEIGHTS, COMPONENT_METADATA } = require('../../../config/readinessWeights');

class InterviewScoreAdapter {
  constructor() {
    this.key = 'interview';
    this.weight = READINESS_WEIGHTS.interview;
    this.label = COMPONENT_METADATA.interview.label;
  }

  /**
   * Adapts completed mock interview results for the Day 4 readiness scoring engine
   * @param {string|ObjectId} userId
   * @returns {Promise<{ component: Object, findings: Array, sourceMeta: Object }>}
   */
  async evaluate(userId) {
    const latestSession = await InterviewSession.findOne({
      userId,
      status: 'completed',
      evaluationStatus: 'completed'
    }).sort({ completedAt: -1, createdAt: -1 });

    if (!latestSession || !latestSession.evaluation || typeof latestSession.evaluation.overallScore !== 'number') {
      return {
        component: {
          key: this.key,
          label: this.label,
          weight: this.weight,
          score: null,
          status: 'not_assessed',
          source: { type: 'mock_interview', id: null },
          assessedAt: null,
          lastUpdatedAt: null,
          reasons: ['No completed mock interview evaluation found. Complete an interview to assess this component.']
        },
        findings: [],
        sourceMeta: { interviewId: null, completedAt: null }
      };
    }

    const evaluation = latestSession.evaluation;
    const score = evaluation.overallScore;

    // Extract actionable recommendations and findings
    const findings = [];
    if (Array.isArray(evaluation.weaknesses)) {
      evaluation.weaknesses.forEach((weakness, idx) => {
        findings.push({
          findingId: `INTERVIEW_WEAKNESS_${idx + 1}`,
          title: `Interview Area: ${weakness.slice(0, 50)}`,
          description: weakness,
          sourceComponent: 'interview',
          priority: score < 60 ? 'high' : 'medium',
          impact: 'high',
          actionSteps: [
            evaluation.recommendations?.[idx] ||
            'Practice answering role-specific technical questions using the STAR framework.'
          ]
        });
      });
    }

    return {
      component: {
        key: this.key,
        label: this.label,
        weight: this.weight,
        score,
        status: 'assessed',
        source: {
          type: 'mock_interview',
          id: latestSession._id.toString(),
          targetRole: latestSession.targetRole,
          durationMinutes: latestSession.durationMinutes,
          evaluationVersion: latestSession.evaluationVersion || 1
        },
        assessedAt: latestSession.completedAt || latestSession.updatedAt,
        lastUpdatedAt: latestSession.updatedAt,
        reasons: []
      },
      findings,
      sourceMeta: {
        interviewId: latestSession._id.toString(),
        score,
        completedAt: latestSession.completedAt
      }
    };
  }
}

module.exports = new InterviewScoreAdapter();
