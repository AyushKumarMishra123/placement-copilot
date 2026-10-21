const readinessRecommendationService = require('../services/readiness/readinessRecommendationService');
const { READINESS_WEIGHTS } = require('../config/readinessWeights');

describe('Readiness Recommendation Service Tests', () => {
  test('returns empty array when no findings are present (no fake actions generated)', () => {
    const recs = readinessRecommendationService.prioritize([], READINESS_WEIGHTS);
    expect(recs).toEqual([]);
  });

  test('prioritizes high severity and high weight component findings over low severity', () => {
    const findings = [
      {
        findingId: 'GITHUB_NO_README',
        title: 'Missing GitHub Profile README',
        description: 'Profile README is missing.',
        sourceComponent: 'github', // weight 10
        priority: 'medium',
        impact: 'medium'
      },
      {
        findingId: 'PROJECT_CRITICAL_SECRET',
        title: 'Exposed AWS Key in Project Repository',
        description: 'Committed API credential found.',
        sourceComponent: 'projects', // weight 25
        priority: 'high',
        impact: 'high'
      },
      {
        findingId: 'RESUME_METRICS_FAIL',
        title: 'Missing Measurable Metrics in Experience',
        description: 'Action verbs lack quantifiable results.',
        sourceComponent: 'resume', // weight 25
        priority: 'high',
        impact: 'high'
      },
      {
        findingId: 'ACHIEVEMENTS_LOW',
        title: 'Add Co-curricular Activities',
        description: 'Listing technical clubs helps candidacy.',
        sourceComponent: 'achievements', // weight 5
        priority: 'low',
        impact: 'low'
      }
    ];

    const recs = readinessRecommendationService.prioritize(findings, READINESS_WEIGHTS);

    expect(recs.length).toBe(4);
    // Highest ranked should be high priority from 25% weight components
    expect(recs[0].sourceComponent).toBe('projects');
    expect(recs[0].title).toContain('Exposed AWS Key');
    expect(recs[1].sourceComponent).toBe('resume');
    expect(recs[1].title).toContain('Measurable Metrics');
    // Lowest ranked should be achievements
    expect(recs[3].sourceComponent).toBe('achievements');
  });

  test('deduplicates identical findings', () => {
    const duplicateFindings = [
      {
        findingId: 'PROJECT_TEST_MISSING',
        title: 'No Automated Tests Detected',
        description: 'Repository lacks test suite.',
        sourceComponent: 'projects',
        priority: 'medium'
      },
      {
        findingId: 'PROJECT_TEST_MISSING',
        title: 'No Automated Tests Detected',
        description: 'Repository lacks test suite.',
        sourceComponent: 'projects',
        priority: 'medium'
      }
    ];

    const recs = readinessRecommendationService.prioritize(duplicateFindings, READINESS_WEIGHTS);
    expect(recs.length).toBe(1);
    expect(recs[0].title).toBe('No Automated Tests Detected');
  });

  test('caps recommendations to exactly top 5 when more than 5 findings exist', () => {
    const manyFindings = Array.from({ length: 12 }, (_, i) => ({
      findingId: `FINDING_${i}`,
      title: `Improvement Item ${i}`,
      description: `Description ${i}`,
      sourceComponent: i % 2 === 0 ? 'resume' : 'projects',
      priority: i < 3 ? 'high' : i < 7 ? 'medium' : 'low'
    }));

    const recs = readinessRecommendationService.prioritize(manyFindings, READINESS_WEIGHTS);
    expect(recs.length).toBe(5);
  });
});
