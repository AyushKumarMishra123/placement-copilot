const AchievementAssessment = require('../../models/AchievementAssessment');
const Profile = require('../../models/Profile');
const achievementScoringService = require('./achievementScoringService');
const { getAIProvider } = require('../ai');

class AchievementAssessmentService {
  /**
   * Conduct Co-Curricular Assessment
   * @param {Object} params
   * @param {string} params.userId
   * @param {string} params.participationStatus - 'achievements' | 'activities_no_formal' | 'none_want_to_improve'
   * @param {string} [params.targetRole]
   * @param {string} [params.academicYear]
   * @param {Array<Object>} [params.achievements]
   * @returns {Promise<Object>}
   */
  async assessAchievements({
    userId,
    participationStatus,
    targetRole,
    academicYear,
    achievements = []
  }) {
    if (!['achievements', 'activities_no_formal', 'none_want_to_improve'].includes(participationStatus)) {
      const err = new Error('Invalid participationStatus selection.');
      err.status = 400;
      throw err;
    }

    // Determine targetRole and academicYear (use params or fallback to user Profile)
    let effectiveTargetRole = targetRole;
    let effectiveAcademicYear = academicYear;

    if (!effectiveTargetRole || !effectiveAcademicYear) {
      const userProfile = await Profile.findOne({ userId });
      if (!effectiveTargetRole) effectiveTargetRole = userProfile?.targetRole || 'Software Engineer';
      if (!effectiveAcademicYear) effectiveAcademicYear = '3rd Year';
    }

    // Normalize achievements
    const normalizedAchievements = Array.isArray(achievements)
      ? achievements.map((a) => ({
          category: a.category || 'projects',
          title: (a.title || '').trim(),
          organizer: (a.organizer || '').trim(),
          date: (a.date || '').trim(),
          participationType: a.participationType === 'team' ? 'team' : 'individual',
          role: (a.role || '').trim(),
          teamSize: Number(a.teamSize) || 1,
          resultAward: (a.resultAward || '').trim(),
          problemSolved: (a.problemSolved || '').trim(),
          contribution: (a.contribution || '').trim(),
          technologies: Array.isArray(a.technologies)
            ? a.technologies.map((t) => t.trim()).filter(Boolean)
            : typeof a.technologies === 'string'
            ? a.technologies.split(',').map((t) => t.trim()).filter(Boolean)
            : [],
          impact: (a.impact || '').trim(),
          evidenceUrl: (a.evidenceUrl || '').trim(),
          status: a.status === 'in_progress' ? 'in_progress' : 'completed'
        }))
      : [];

    // 1. Deterministic Rubric Evaluation
    const evaluation = achievementScoringService.evaluateAchievements({
      participationStatus,
      targetRole: effectiveTargetRole,
      academicYear: effectiveAcademicYear,
      achievements: normalizedAchievements
    });

    // 2. AI Enhancements for forward-looking recommendations
    const aiProvider = getAIProvider();
    const aiRecommendations = await aiProvider.evaluateCoCurricularAchievements({
      achievements: normalizedAchievements,
      targetRole: effectiveTargetRole,
      academicYear: effectiveAcademicYear,
      dimensionScores: evaluation.dimensionScores,
      overallScore: evaluation.overallScore
    });

    // Merge recommended activities
    const finalRecommendedActivities =
      aiRecommendations.recommendedActivities && aiRecommendations.recommendedActivities.length > 0
        ? aiRecommendations.recommendedActivities
        : [
            {
              title: `Enter a College Hackathon targeting ${effectiveTargetRole}`,
              category: 'hackathons',
              rationale: 'Demonstrates time-bound MVP delivery and practical problem solving.',
              timeline: 'Next 30 days',
              status: 'recommended'
            },
            {
              title: 'Publish a Clean Open Source Pull Request',
              category: 'open_source',
              rationale: 'Demonstrates collaborative code hygiene and Git proficiency.',
              timeline: 'Next 45 days',
              status: 'recommended'
            }
          ];

    // 3. Persist in database
    const record = await AchievementAssessment.create({
      userId,
      participationStatus,
      targetRole: effectiveTargetRole,
      academicYear: effectiveAcademicYear,
      achievements: normalizedAchievements,
      dimensionScores: evaluation.dimensionScores,
      categoryBreakdown: evaluation.categoryBreakdown,
      overallScore: evaluation.overallScore,
      baseline: evaluation.baseline,
      strongestContributions: evaluation.strongestContributions,
      roleRelevantHighlights: evaluation.roleRelevantHighlights,
      improvementAreas: evaluation.improvementAreas,
      missingInformation: evaluation.missingInformation,
      resumeLinkedInPresentation: evaluation.resumeLinkedInPresentation,
      recommendedActivities: finalRecommendedActivities,
      actionPlan30Days: evaluation.actionPlan30Days,
      actionPlan60Days: evaluation.actionPlan60Days
    });

    // Also update Profile.achievementsReviewed so readiness engine syncs smoothly
    await Profile.findOneAndUpdate(
      { userId },
      {
        achievementsReviewed: true,
        achievements: normalizedAchievements.map((a) => `${a.title} (${a.category}): ${a.resultAward || a.role || 'Participated'}`)
      },
      { upsert: false }
    );

    return record;
  }

  /**
   * Get latest achievement assessment
   * @param {string} userId
   * @returns {Promise<Object|null>}
   */
  async getLatestAssessment(userId) {
    return AchievementAssessment.findOne({ userId }).sort({ createdAt: -1 });
  }

  /**
   * Get historical progression of assessments
   * @param {string} userId
   * @returns {Promise<Array>}
   */
  async getAssessmentHistory(userId) {
    return AchievementAssessment.find({ userId })
      .sort({ createdAt: -1 })
      .select('overallScore dimensionScores participationStatus baseline assessedAt createdAt')
      .limit(10);
  }
}

module.exports = new AchievementAssessmentService();
