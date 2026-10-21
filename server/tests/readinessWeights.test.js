const { READINESS_WEIGHTS, COMPONENT_METADATA, validateWeights } = require('../config/readinessWeights');

describe('Readiness Weights Configuration Tests', () => {
  test('official weights match exact problem specification', () => {
    expect(READINESS_WEIGHTS).toEqual({
      resume: 25,
      projects: 25,
      interview: 20,
      github: 10,
      coding: 10,
      linkedin: 5,
      achievements: 5
    });
  });

  test('official weights sum to exactly 100', () => {
    const sum = Object.values(READINESS_WEIGHTS).reduce((acc, curr) => acc + curr, 0);
    expect(sum).toBe(100);
    expect(validateWeights(READINESS_WEIGHTS)).toBe(true);
  });

  test('validateWeights throws an error if sum is not 100', () => {
    expect(() => {
      validateWeights({ ...READINESS_WEIGHTS, resume: 30 });
    }).toThrow(/Invalid readiness weights configuration/);
  });

  test('all component metadata definitions have matching weights', () => {
    for (const [key, weight] of Object.entries(READINESS_WEIGHTS)) {
      expect(COMPONENT_METADATA[key]).toBeDefined();
      expect(COMPONENT_METADATA[key].weight).toBe(weight);
      expect(COMPONENT_METADATA[key].label).toBeDefined();
    }
  });
});
