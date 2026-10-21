const Profile = require('../../../models/Profile');
const AchievementAssessment = require('../../../models/AchievementAssessment');
const { READINESS_WEIGHTS, COMPONENT_METADATA } = require('../../../config/readinessWeights');

class AchievementsScoreAdapter {
  constructor() {
    this.key = 'achievements';
    this.weight = READINESS_WEIGHTS.achievements;
    this.label = COMPONENT_METADATA.achievements.label;
  }

  /**
   * Evaluates co-curricular achievements using a deterministic rubric
   * @param {string|ObjectId} userId
   * @returns {Promise<{ component: Object, findings: Array, sourceMeta: Object }>}
   */
  async evaluate(userId) {
    // 1. Check for dedicated comprehensive AchievementAssessment first
    const assessment = await AchievementAssessment.findOne({ userId }).sort({ createdAt: -1 });

    if (assessment) {
      const findings = [];
      if (assessment.improvementAreas && assessment.improvementAreas.length > 0) {
        assessment.improvementAreas.forEach((area, idx) => {
          findings.push({
            findingId: `ACHIEVEMENT_IMPROVEMENT_${idx + 1}`,
            title: `Co-Curricular Milestone: Area ${idx + 1}`,
            description: area,
            sourceComponent: 'achievements',
            priority: assessment.overallScore < 60 ? 'high' : 'medium',
            impact: 'low',
            actionSteps: [assessment.actionPlan30Days?.[idx] || 'Pursue relevant co-curricular competitions or open source initiatives.']
          });
        });
      }

      return {
        component: {
          key: this.key,
          label: this.label,
          weight: this.weight,
          score: assessment.overallScore,
          status: 'assessed',
          source: {
            type: 'co_curricular_assessment',
            id: assessment._id,
            count: assessment.achievements.length,
            baseline: assessment.baseline,
            dimensionScores: assessment.dimensionScores
          },
          assessedAt: assessment.assessedAt || assessment.createdAt,
          lastUpdatedAt: assessment.updatedAt,
          reasons: [
            assessment.baseline
              ? `Co-curricular baseline score: ${assessment.overallScore}/100. Action plan provided to build profile.`
              : `Co-curricular score: ${assessment.overallScore}/100 based on ${assessment.achievements.length} verified activity record(s).`
          ]
        },
        findings,
        sourceMeta: {
          assessmentId: assessment._id,
          overallScore: assessment.overallScore,
          baseline: assessment.baseline,
          count: assessment.achievements.length
        }
      };
    }

    // 2. Fallback to existing Profile.achievements logic for backward compatibility
    const profile = await Profile.findOne({ userId });


    // If candidate has not reviewed or completed the achievements section
    if (!profile || !profile.achievementsReviewed) {
      return {
        component: {
          key: this.key,
          label: this.label,
          weight: this.weight,
          score: null,
          status: 'not_assessed',
          source: { type: 'profile_achievements', reviewed: false, count: 0 },
          assessedAt: null,
          lastUpdatedAt: profile?.updatedAt || null,
          reasons: ['Co-curricular achievements section has not been reviewed or confirmed by candidate.']
        },
        findings: [
          {
            findingId: 'ACHIEVEMENTS_UNREVIEWED',
            title: 'Confirm Co-curricular Achievements',
            description: 'Your co-curricular record (hackathons, clubs, awards, certifications) has not been reviewed or confirmed.',
            sourceComponent: 'achievements',
            priority: 'medium',
            impact: 'low',
            actionSteps: ['Go to your Profile and confirm your co-curricular achievements or record that you have none to establish assessment coverage.']
          }
        ],
        sourceMeta: { reviewed: false, count: 0 }
      };
    }

    const achievementsList = Array.isArray(profile.achievements) ? profile.achievements.filter((a) => a && a.trim().length > 3) : [];

    // Candidate confirmed they have no co-curricular achievements
    if (achievementsList.length === 0) {
      return {
        component: {
          key: this.key,
          label: this.label,
          weight: this.weight,
          score: 50,
          status: 'assessed',
          source: { type: 'profile_achievements', reviewed: true, count: 0 },
          assessedAt: profile.updatedAt,
          lastUpdatedAt: profile.updatedAt,
          reasons: ['Candidate confirmed no current co-curricular achievements. Baseline score awarded.']
        },
        findings: [
          {
            findingId: 'ACHIEVEMENTS_NONE_RECORDED',
            title: 'Participate in Technical Co-Curriculars',
            description: 'Listing technical competitions, open source contributions, or campus technical societies strengthens engineering candidacy.',
            sourceComponent: 'achievements',
            priority: 'low',
            impact: 'low',
            actionSteps: ['Consider participating in engineering hackathons or technical clubs to boost your profile.']
          }
        ],
        sourceMeta: { reviewed: true, count: 0, score: 50 }
      };
    }

    // Deterministic rubric scoring based on evidence depth
    let rubricScore = 65; // base for at least 1 achievement

    if (achievementsList.length >= 2) rubricScore += 15;
    if (achievementsList.length >= 3) rubricScore += 10;

    // High impact keywords bonus
    const impactKeywords = ['winner', 'finalist', '1st', '2nd', '3rd', 'rank', 'hackathon', 'lead', 'president', 'published', 'ieee', 'gdg', 'patent', 'certified'];
    const hasHighImpact = achievementsList.some((ach) =>
      impactKeywords.some((kw) => ach.toLowerCase().includes(kw))
    );

    if (hasHighImpact) {
      rubricScore += 10;
    }

    const finalScore = Math.min(100, rubricScore);

    return {
      component: {
        key: this.key,
        label: this.label,
        weight: this.weight,
        score: finalScore,
        status: 'assessed',
        source: {
          type: 'profile_achievements',
          reviewed: true,
          count: achievementsList.length,
          achievementsSnippet: achievementsList.slice(0, 3)
        },
        assessedAt: profile.updatedAt,
        lastUpdatedAt: profile.updatedAt,
        reasons: [`${achievementsList.length} co-curricular achievement(s) documented and verified.`]
      },
      findings: [],
      sourceMeta: { reviewed: true, count: achievementsList.length, score: finalScore }
    };
  }
}

module.exports = new AchievementsScoreAdapter();
