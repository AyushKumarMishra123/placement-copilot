const Profile = require('../../../models/Profile');
const ProjectAnalysis = require('../../../models/ProjectAnalysis');
const { READINESS_WEIGHTS, COMPONENT_METADATA } = require('../../../config/readinessWeights');

class ProjectScoreAdapter {
  constructor() {
    this.key = 'projects';
    this.weight = READINESS_WEIGHTS.projects;
    this.label = COMPONENT_METADATA.projects.label;
  }

  /**
   * Deterministically aggregates portfolio project and live-link analyses
   * @param {string|ObjectId} userId
   * @returns {Promise<{ component: Object, findings: Array, sourceMeta: Object }>}
   */
  async evaluate(userId) {
    const profile = await Profile.findOne({ userId });
    const projects = profile?.projects || [];

    if (projects.length === 0) {
      return {
        component: {
          key: this.key,
          label: this.label,
          weight: this.weight,
          score: null,
          status: 'not_assessed',
          source: { type: 'project_analysis', totalProjects: 0, analyzedCount: 0 },
          assessedAt: null,
          lastUpdatedAt: null,
          reasons: ['No portfolio projects added to candidate profile yet.']
        },
        findings: [],
        sourceMeta: { totalProjects: 0, analyzedCount: 0, analysisIds: [] }
      };
    }

    // For each project, fetch its latest analysis record
    const analyzedProjects = [];
    const findings = [];
    let isAnyStale = false;
    let latestAssessedAt = null;

    for (const proj of projects) {
      const latestAnalysis = await ProjectAnalysis.findOne({
        projectId: proj._id,
        userId
      }).sort({ createdAt: -1 });

      if (latestAnalysis) {
        analyzedProjects.push({
          projectId: proj._id.toString(),
          projectName: proj.name,
          analysisId: latestAnalysis._id.toString(),
          score: latestAnalysis.scores?.overallProjectScore ?? 0,
          commitSha: latestAnalysis.commitSha || '',
          version: latestAnalysis.version || 1,
          createdAt: latestAnalysis.createdAt,
          liveReachable: Boolean(latestAnalysis.liveCheck?.reachable)
        });

        if (!latestAssessedAt || new Date(latestAnalysis.createdAt) > new Date(latestAssessedAt)) {
          latestAssessedAt = latestAnalysis.createdAt;
        }

        // Check if project definition (URL, details) updated after the analysis
        if (new Date(proj.updatedAt || 0).getTime() > new Date(latestAnalysis.createdAt).getTime() + 1000) {
          isAnyStale = true;
        }

        // 1. Critical Secrets Findings
        if (Array.isArray(latestAnalysis.secretFindings) && latestAnalysis.secretFindings.length > 0) {
          for (const sec of latestAnalysis.secretFindings) {
            findings.push({
              findingId: `SECRET_${proj._id}_${sec.category.replace(/\s+/g, '_')}`,
              title: `Security Alert: ${sec.category} in ${proj.name}`,
              description: `Potential credential detected in ${sec.filePath}. ${sec.explanation}`,
              sourceComponent: 'projects',
              priority: 'high',
              impact: 'high',
              actionSteps: [sec.suggestedFix]
            });
          }
        }

        // 2. README Issues
        if (latestAnalysis.READMEAnalysis && Array.isArray(latestAnalysis.READMEAnalysis.issues)) {
          for (const issue of latestAnalysis.READMEAnalysis.issues.slice(0, 2)) {
            findings.push({
              findingId: `README_${proj._id}_${issue.slice(0, 15).replace(/\s+/g, '_')}`,
              title: `Project Docs: ${proj.name} README Gap`,
              description: issue,
              sourceComponent: 'projects',
              priority: 'medium',
              impact: 'medium',
              actionSteps: [`Update ${proj.name} README.md to address: ${issue}`]
            });
          }
        }

        // 3. Code Findings (e.g. Missing Tests or Monolithic Files)
        if (Array.isArray(latestAnalysis.codeFindings)) {
          for (const cf of latestAnalysis.codeFindings) {
            if (cf.severity === 'critical' || cf.severity === 'warning') {
              findings.push({
                findingId: `CODE_${proj._id}_${cf.title.replace(/\s+/g, '_')}`,
                title: `Code Quality: ${cf.title} (${proj.name})`,
                description: cf.explanation,
                sourceComponent: 'projects',
                priority: cf.severity === 'critical' ? 'high' : 'medium',
                impact: 'medium',
                actionSteps: [cf.suggestedFix]
              });
            }
          }
        }

        // 4. Live Link Reachability Findings
        if (latestAnalysis.liveCheck?.attempted && !latestAnalysis.liveCheck?.reachable) {
          findings.push({
            findingId: `LIVELINK_${proj._id}`,
            title: `Live Deployment: ${proj.name} Unreachable`,
            description: `Live URL ${latestAnalysis.liveCheck.url} failed during browser verification: ${latestAnalysis.liveCheck.error || 'Connection error'}.`,
            sourceComponent: 'projects',
            priority: 'high',
            impact: 'medium',
            actionSteps: ['Verify public deployment server availability, SSL certificates, and correct URL configuration.']
          });
        }
      }
    }

    if (analyzedProjects.length === 0) {
      return {
        component: {
          key: this.key,
          label: this.label,
          weight: this.weight,
          score: null,
          status: 'not_assessed',
          source: { type: 'project_analysis', totalProjects: projects.length, analyzedCount: 0 },
          assessedAt: null,
          lastUpdatedAt: null,
          reasons: [`${projects.length} project(s) configured, but none have been analyzed yet.`]
        },
        findings: [],
        sourceMeta: { totalProjects: projects.length, analyzedCount: 0, analysisIds: [] }
      };
    }

    // Deterministic Aggregation: Average of latest scores across analyzed projects
    const totalScore = analyzedProjects.reduce((sum, p) => sum + p.score, 0);
    const aggregatedScore = Math.round(totalScore / analyzedProjects.length);

    return {
      component: {
        key: this.key,
        label: this.label,
        weight: this.weight,
        score: aggregatedScore,
        status: isAnyStale ? 'stale' : 'assessed',
        source: {
          type: 'project_analysis',
          totalProjects: projects.length,
          analyzedCount: analyzedProjects.length,
          projectsSummary: analyzedProjects.map((p) => ({
            projectId: p.projectId,
            projectName: p.projectName,
            score: p.score,
            commitSha: p.commitSha
          }))
        },
        assessedAt: latestAssessedAt,
        lastUpdatedAt: latestAssessedAt,
        reasons: isAnyStale ? ['Project repository URLs or descriptions were modified after review.'] : []
      },
      findings,
      sourceMeta: {
        totalProjects: projects.length,
        analyzedCount: analyzedProjects.length,
        analysisIds: analyzedProjects.map((p) => p.analysisId),
        score: aggregatedScore,
        updatedAt: latestAssessedAt
      }
    };
  }
}

module.exports = new ProjectScoreAdapter();
