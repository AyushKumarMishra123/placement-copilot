const readinessScoringService = require('../services/readiness/readinessScoringService');

describe('Placement Readiness Scoring Engine Formula Tests', () => {
  const mockBaseComponents = [
    { key: 'resume', label: 'Resume Quality', weight: 25, score: null, status: 'not_assessed', source: {} },
    { key: 'projects', label: 'Projects & Code Quality', weight: 25, score: null, status: 'not_assessed', source: {} },
    { key: 'interview', label: 'Mock Interview Performance', weight: 20, score: null, status: 'not_assessed', source: {} },
    { key: 'github', label: 'GitHub Profile & Activity', weight: 10, score: null, status: 'not_assessed', source: {} },
    { key: 'coding', label: 'Coding Practice Assessment', weight: 10, score: null, status: 'not_assessed', source: {} },
    { key: 'linkedin', label: 'LinkedIn Profile Review', weight: 5, score: null, status: 'not_assessed', source: {} },
    { key: 'achievements', label: 'Co-curricular Achievements', weight: 5, score: null, status: 'not_assessed', source: {} }
  ];

  test('returns score: null and level: Unassessed when no components are assessed', () => {
    const result = readinessScoringService.calculateReadiness(mockBaseComponents);
    expect(result.score).toBeNull();
    expect(result.rawScore).toBeNull();
    expect(result.scoreStatus).toBe('provisional');
    expect(result.assessmentType).toBe('provisional');
    expect(result.readinessLevel).toBe('Unassessed');
    expect(result.coveragePercent).toBe(0);
    expect(result.assessedWeight).toBe(0);
  });

  test('calculates accurate provisional score and coverage for partially assessed student', () => {
    // Scenario: Student has Resume (score: 80, weight: 25), Projects (score: 90, weight: 25), GitHub (score: 70, weight: 10)
    // Assessed weight = 25 + 25 + 10 = 60
    // Weighted sum = (80 * 25) + (90 * 25) + (70 * 10) = 2000 + 2250 + 700 = 4950
    // Provisional score = 4950 / 60 = 82.5 -> rounded = 83
    const components = mockBaseComponents.map((c) => {
      if (c.key === 'resume') return { ...c, score: 80, status: 'assessed' };
      if (c.key === 'projects') return { ...c, score: 90, status: 'assessed' };
      if (c.key === 'github') return { ...c, score: 70, status: 'assessed' };
      return c;
    });

    const result = readinessScoringService.calculateReadiness(components);
    expect(result.score).toBe(83);
    expect(result.rawScore).toBeCloseTo(82.5, 2);
    expect(result.scoreStatus).toBe('provisional');
    expect(result.assessmentType).toBe('provisional');
    expect(result.coveragePercent).toBe(60);
    expect(result.assessedWeight).toBe(60);
    expect(result.readinessLevel).toBe('Provisional (Placement Ready)');
  });

  test('unassessed components are NOT treated as zero in provisional calculation', () => {
    // If unassessed components were treated as 0:
    // (80*25 + 90*25 + 70*10 + 0*40) / 100 = 49.5 (which would erroneously fail the student)
    // Our formula must divide ONLY by the assessed weight (60), giving 82.5 (Provisional Ready)
    const components = mockBaseComponents.map((c) => {
      if (c.key === 'resume') return { ...c, score: 80, status: 'assessed' };
      if (c.key === 'projects') return { ...c, score: 90, status: 'assessed' };
      if (c.key === 'github') return { ...c, score: 70, status: 'assessed' };
      return c; // remaining 4 components are status: 'not_assessed', score: null
    });

    const result = readinessScoringService.calculateReadiness(components);
    expect(result.score).toBe(83); // NOT 50!
  });

  test('calculates official final score when all 7 components are assessed (100% coverage)', () => {
    // Resume: 80 * 0.25 = 20
    // Projects: 84 * 0.25 = 21
    // Interview: 75 * 0.20 = 15
    // GitHub: 70 * 0.10 = 7
    // Coding: 80 * 0.10 = 8
    // LinkedIn: 60 * 0.05 = 3
    // Achievements: 90 * 0.05 = 4.5
    // Total sum = 20 + 21 + 15 + 7 + 8 + 3 + 4.5 = 78.5 -> rounded = 79
    const components = [
      { key: 'resume', label: 'Resume', weight: 25, score: 80, status: 'assessed', source: {} },
      { key: 'projects', label: 'Projects', weight: 25, score: 84, status: 'assessed', source: {} },
      { key: 'interview', label: 'Interview', weight: 20, score: 75, status: 'assessed', source: {} },
      { key: 'github', label: 'GitHub', weight: 10, score: 70, status: 'assessed', source: {} },
      { key: 'coding', label: 'Coding', weight: 10, score: 80, status: 'assessed', source: {} },
      { key: 'linkedin', label: 'LinkedIn', weight: 5, score: 60, status: 'assessed', source: {} },
      { key: 'achievements', label: 'Achievements', weight: 5, score: 90, status: 'assessed', source: {} }
    ];

    const result = readinessScoringService.calculateReadiness(components);
    expect(result.score).toBe(79);
    expect(result.rawScore).toBeCloseTo(78.5, 2);
    expect(result.scoreStatus).toBe('final');
    expect(result.assessmentType).toBe('final');
    expect(result.coveragePercent).toBe(100);
    expect(result.readinessLevel).toBe('Placement Ready');
  });

  test('verifies readiness level bands for final score', () => {
    // 0–49: Not Ready
    const notReadyComp = mockBaseComponents.map((c) => ({ ...c, score: 40, status: 'assessed' }));
    expect(readinessScoringService.calculateReadiness(notReadyComp).readinessLevel).toBe('Not Ready');

    // 50–74: Almost Ready
    const almostReadyComp = mockBaseComponents.map((c) => ({ ...c, score: 65, status: 'assessed' }));
    expect(readinessScoringService.calculateReadiness(almostReadyComp).readinessLevel).toBe('Almost Ready');

    // 75–100: Placement Ready
    const placementReadyComp = mockBaseComponents.map((c) => ({ ...c, score: 85, status: 'assessed' }));
    expect(readinessScoringService.calculateReadiness(placementReadyComp).readinessLevel).toBe('Placement Ready');
  });

  test('throws on invalid score value in assessed component', () => {
    const invalidComp = [
      { key: 'resume', label: 'Resume', weight: 25, score: 150, status: 'assessed', source: {} }
    ];
    expect(() => readinessScoringService.calculateReadiness(invalidComp)).toThrow(/between 0 and 100/);
  });

  test('throws if unassessed component provides a non-null score', () => {
    const invalidComp = [
      { key: 'resume', label: 'Resume', weight: 25, score: 50, status: 'not_assessed', source: {} }
    ];
    expect(() => readinessScoringService.calculateReadiness(invalidComp)).toThrow(/must have a null score/);
  });
});
