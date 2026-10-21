/**
 * Explicit canonical skill alias dictionary for unambiguous tech stack normalization
 */
const SKILL_ALIASES = {
  'js': 'javascript',
  'javascript': 'javascript',
  'ts': 'typescript',
  'typescript': 'typescript',
  'react': 'react',
  'reactjs': 'react',
  'react.js': 'react',
  'node': 'node.js',
  'nodejs': 'node.js',
  'node.js': 'node.js',
  'express': 'express',
  'expressjs': 'express',
  'express.js': 'express',
  'mongo': 'mongodb',
  'mongodb': 'mongodb',
  'postgres': 'postgresql',
  'postgresql': 'postgresql',
  'py': 'python',
  'python': 'python',
  'py3': 'python',
  'golang': 'go',
  'go': 'go',
  'docker': 'docker',
  'k8s': 'kubernetes',
  'kubernetes': 'kubernetes',
  'aws': 'aws',
  'gcp': 'gcp',
  'azure': 'azure',
  'nextjs': 'next.js',
  'next.js': 'next.js',
  'vue': 'vue',
  'vuejs': 'vue',
  'vue.js': 'vue',
  'html': 'html',
  'css': 'css',
  'sql': 'sql',
  'nosql': 'nosql',
  'git': 'git',
  'rest': 'rest api',
  'rest api': 'rest api',
  'restful': 'rest api',
  'graphql': 'graphql',
  'ci/cd': 'ci/cd',
  'cicd': 'ci/cd',
  'c++': 'c++',
  'cpp': 'c++',
  'c#': 'c#',
  'csharp': 'c#',
  '.net': '.net',
  'dotnet': '.net',
  'java': 'java'
};

class JobMatchingService {
  /**
   * Normalize a skill to its canonical name
   * @param {string} skill
   * @returns {string}
   */
  normalizeSkill(skill) {
    if (!skill || typeof skill !== 'string') return '';
    const cleaned = skill.trim().toLowerCase();
    return SKILL_ALIASES[cleaned] || cleaned;
  }

  /**
   * Determine whether two skills match accurately without treating unrelated tech as equivalent
   * @param {string} studentSkill
   * @param {string} jobSkill
   * @returns {boolean}
   */
  areSkillsMatching(studentSkill, jobSkill) {
    const normA = this.normalizeSkill(studentSkill);
    const normB = this.normalizeSkill(jobSkill);
    if (!normA || !normB) return false;

    // Strict equality after canonical normalization
    if (normA === normB) return true;

    // Guard: Java and JavaScript must NEVER be treated as equivalent
    if ((normA === 'java' && normB === 'javascript') || (normA === 'javascript' && normB === 'java')) {
      return false;
    }

    // Guard: C, C++, C# must not conflate
    const cFamily = ['c', 'c++', 'c#'];
    if (cFamily.includes(normA) && cFamily.includes(normB) && normA !== normB) {
      return false;
    }

    // Exact word boundary containment for multi-word phrases (e.g. "rest api" vs "api" or "express framework")
    const wordsA = normA.split(/[\s/]+/);
    const wordsB = normB.split(/[\s/]+/);
    if (wordsA.length > 1 && wordsA.includes(normB) && normB.length > 2) return true;
    if (wordsB.length > 1 && wordsB.includes(normA) && normA.length > 2) return true;

    return false;
  }

  /**
   * Evaluates match between student profile and job listing using official 5-factor formula
   * @param {Object} studentProfile
   * @param {Object} job
   * @returns {{ matchScore: number, matchedSkills: Array<string>, missingSkills: Array<string>, matchingReasons: Array<string>, qualificationWarnings: Array<string> }}
   */
  calculateMatch(studentProfile = {}, job = {}) {
    const rawStudentSkills = studentProfile.skills || [];
    const rawJobRequired = job.requiredSkills || [];
    const rawJobPreferred = job.preferredSkills || [];

    const matchedSkills = [];
    const missingSkills = [];

    // Factor 1: Required Skills Match (50% max)
    let skillFactorScore = 0;
    if (rawJobRequired.length === 0) {
      // If job doesn't specify explicit hard skills, check description or provide neutral baseline
      skillFactorScore = 30;
    } else {
      for (const reqSkill of rawJobRequired) {
        const found = rawStudentSkills.find((s) => this.areSkillsMatching(s, reqSkill));
        if (found) {
          matchedSkills.push(this.normalizeSkill(reqSkill));
        } else {
          missingSkills.push(this.normalizeSkill(reqSkill));
        }
      }

      const matchRatio = matchedSkills.length / rawJobRequired.length;
      skillFactorScore = Math.round(matchRatio * 50);
    }

    // Bonus for preferred skills (up to 5 extra points within skill factor)
    if (rawJobPreferred.length > 0) {
      const preferredMatches = rawJobPreferred.filter((pref) =>
        rawStudentSkills.some((s) => this.areSkillsMatching(s, pref))
      );
      if (preferredMatches.length > 0) {
        skillFactorScore = Math.min(50, skillFactorScore + Math.min(5, preferredMatches.length * 2));
      }
    }

    // Factor 2: Target Role Similarity (25% max)
    let roleFactorScore = 0;
    const targetRole = (studentProfile.targetRole || '').toLowerCase().trim();
    const jobTitle = (job.title || '').toLowerCase().trim();

    if (!targetRole) {
      roleFactorScore = 15; // neutral baseline if target role not specified
    } else {
      const roleTokens = targetRole.split(/\s+/).filter((w) => w.length > 2);
      const matchedTokens = roleTokens.filter((token) => jobTitle.includes(token));

      if (jobTitle === targetRole || jobTitle.includes(targetRole) || targetRole.includes(jobTitle)) {
        roleFactorScore = 25;
      } else if (matchedTokens.length > 0) {
        roleFactorScore = Math.round((matchedTokens.length / roleTokens.length) * 20);
      } else {
        roleFactorScore = 5;
      }
    }

    // Factor 3: Location / Workplace Preference (10% max)
    let locationFactorScore = 0;
    const studentPrefLoc = (studentProfile.location || '').toLowerCase().trim();
    const jobLoc = (job.location || '').toLowerCase().trim();
    const jobWorkplace = (job.workplaceType || 'remote').toLowerCase().trim();

    if (jobWorkplace === 'remote') {
      locationFactorScore = 10;
    } else if (studentPrefLoc && (jobLoc.includes(studentPrefLoc) || studentPrefLoc.includes(jobLoc))) {
      locationFactorScore = 10;
    } else if (!studentPrefLoc) {
      locationFactorScore = 7; // neutral baseline if no location preference
    } else {
      locationFactorScore = 3;
    }

    // Factor 4: Experience / Eligibility (10% max)
    let expFactorScore = 10;
    const warnings = [];

    const expLevel = (job.experienceLevel || '').toLowerCase();
    if (expLevel === 'senior') {
      expFactorScore = 3;
      warnings.push('This listing typically seeks senior industry experience.');
    } else if (expLevel === 'mid') {
      expFactorScore = 7;
    } else {
      expFactorScore = 10; // entry or internship
    }

    // Factor 5: Listing Recency (5% max)
    let recencyScore = 5;
    if (job.publishedAt) {
      const ageInDays = (Date.now() - new Date(job.publishedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (ageInDays > 30) recencyScore = 2;
      else if (ageInDays > 14) recencyScore = 3;
      else recencyScore = 5;
    }

    // Total Match Score (0 - 100)
    const totalScore = Math.min(
      100,
      Math.max(0, skillFactorScore + roleFactorScore + locationFactorScore + expFactorScore + recencyScore)
    );

    // Construct Transparent Matching Reasons
    const matchingReasons = [];
    if (matchedSkills.length > 0) {
      matchingReasons.push(`Matches your ${matchedSkills.slice(0, 3).join(', ')} skills.`);
    }
    if (roleFactorScore >= 20) {
      matchingReasons.push(`The role aligns closely with your target position "${studentProfile.targetRole}".`);
    } else if (roleFactorScore >= 12) {
      matchingReasons.push(`Role relates to your career interests in ${studentProfile.targetRole}.`);
    }

    if (jobWorkplace === 'remote') {
      matchingReasons.push('Fully remote opportunity matching flexible placement preferences.');
    } else if (locationFactorScore === 10 && job.location) {
      matchingReasons.push(`Located in your preferred area (${job.location}).`);
    }

    if (recencyScore === 5) {
      matchingReasons.push('Recently verified active opening.');
    }

    return {
      matchScore: totalScore,
      matchedSkills,
      missingSkills,
      matchingReasons: matchingReasons.slice(0, 4),
      qualificationWarnings: warnings
    };
  }
}

module.exports = new JobMatchingService();
