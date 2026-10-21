/**
 * Official Placement Readiness Scoring Component Weights
 * Single Source of Truth for the entire backend application.
 */

const READINESS_WEIGHTS = Object.freeze({
  resume: 25,
  projects: 25,
  interview: 20,
  github: 10,
  coding: 10,
  linkedin: 5,
  achievements: 5
});

const COMPONENT_METADATA = Object.freeze({
  resume: {
    key: 'resume',
    label: 'Resume Quality',
    weight: 25,
    description: 'Deterministic ATS benchmarks, structural checks, and measurable impact metrics.'
  },
  projects: {
    key: 'projects',
    label: 'Projects & Code Quality',
    weight: 25,
    description: 'Repository organization, README documentation, testing, secret detection, and live website verification.'
  },
  interview: {
    key: 'interview',
    label: 'Mock Interview Performance',
    weight: 20,
    description: 'Simulated technical problem solving, system design, and behavioral interview mastery.'
  },
  github: {
    key: 'github',
    label: 'GitHub Profile & Activity',
    weight: 10,
    description: 'Public profile setup, profile README, commit consistency, and portfolio presentation.'
  },
  coding: {
    key: 'coding',
    label: 'Coding Practice Assessment',
    weight: 10,
    description: 'Verified DSA problem counts, difficulty distribution, and contest activity.'
  },
  linkedin: {
    key: 'linkedin',
    label: 'LinkedIn Profile Review',
    weight: 5,
    description: 'Professional headline, about narrative, skills alignment, and recommendation presence.'
  },
  achievements: {
    key: 'achievements',
    label: 'Co-curricular Achievements',
    weight: 5,
    description: 'Hackathons, engineering certifications, awards, technical clubs, and leadership roles.'
  }
});

/**
 * Validates that component weights sum up to exactly 100.
 * @param {Object} weights
 * @returns {boolean}
 */
function validateWeights(weights = READINESS_WEIGHTS) {
  const sum = Object.values(weights).reduce((acc, curr) => acc + curr, 0);
  if (sum !== 100) {
    throw new Error(`Invalid readiness weights configuration: sum is ${sum}, must be 100.`);
  }
  return true;
}

// Ensure validity on module initialization
validateWeights();

module.exports = {
  READINESS_WEIGHTS,
  COMPONENT_METADATA,
  validateWeights
};
