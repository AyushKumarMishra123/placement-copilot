/**
 * Deterministic Resume Benchmark Engine
 * Evaluates parsed resume structure against the placement readiness benchmark rules.
 */

// Common action verbs expected in engineering resumes
const STRONG_ACTION_VERBS = new Set([
  'built', 'developed', 'implemented', 'designed', 'optimized', 'automated',
  'created', 'led', 'integrated', 'deployed', 'architected', 'spearheaded',
  'engineered', 'configured', 'reduced', 'accelerated', 'formulated', 'orchestrated',
  'constructed', 'refactored', 'benchmarked', 'established', 'delivered', 'scaled',
  'streamlined', 'monitored', 'migrated', 'modeled', 'synthesized'
]);

// Weak passive phrasing to detect
const WEAK_PHRASES = [
  'worked on', 'responsible for', 'helped with', 'was involved in',
  'assisted in', 'handled', 'took care of', 'duties included', 'participated in'
];

// Technical capitalization errors
const TECH_SPELLING_RULES = [
  { regex: /\bjavascript\b/i, correct: 'JavaScript', target: 'Javascript' },
  { regex: /\btypescript\b/i, correct: 'TypeScript', target: 'Typescript' },
  { regex: /\bgithub\b/i, correct: 'GitHub', target: 'Github' },
  { regex: /\bnodejs\b|\bnode\.js\b/i, correct: 'Node.js', target: 'Nodejs' },
  { regex: /\bmongodb\b|\bmongo db\b/i, correct: 'MongoDB', target: 'Mongodb' },
  { regex: /\bpostgresql\b|\bpostgres\b/i, correct: 'PostgreSQL', target: 'Postgresql' },
  { regex: /\breactjs\b|\breact\.js\b/i, correct: 'React', target: 'Reactjs' },
  { regex: /\bexperiance\b/i, correct: 'experience', target: 'experiance' },
  { regex: /\bmanagment\b/i, correct: 'management', target: 'managment' },
  { regex: /\bproffesional\b/i, correct: 'professional', target: 'proffesional' },
  { regex: /\bcurriculum\s+vitae\b/i, correct: 'Resume', target: 'Curriculum Vitae' }
];

class BenchmarkEngine {
  /**
   * Run all 9 deterministic benchmark checks on parsed resume data.
   * @param {Object} parsedResume
   * @returns {Array<Object>} List of evaluated checks
   */
  runChecks(parsedResume) {
    const checks = [];

    checks.push(this.checkPageCount(parsedResume));
    checks.push(this.checkVisualStructure(parsedResume));
    checks.push(this.checkSpellingGrammar(parsedResume));
    checks.push(this.checkProjectQuality(parsedResume));
    checks.push(this.checkProfileLinks(parsedResume));
    checks.push(this.checkAchievements(parsedResume));
    checks.push(this.checkActionVerbs(parsedResume));
    checks.push(this.checkMeasurableResults(parsedResume));
    checks.push(this.checkAtsReadability(parsedResume));

    return checks;
  }

  /**
   * Check 1: Exactly one page
   */
  checkPageCount(parsed) {
    const pageCount = parsed.pageCount || 1;
    const isPass = pageCount === 1;

    return {
      id: 'CHECK_PAGE_COUNT',
      name: 'Single Page Format',
      category: 'structure',
      status: isPass ? 'pass' : 'fail',
      score: isPass ? 10 : 0,
      weight: 10,
      evidence: `Actual document length: ${pageCount} page${pageCount > 1 ? 's' : ''}`,
      explanation: isPass
        ? 'Resume strictly conforms to the 1-page standard for campus recruitment.'
        : `Resume spans ${pageCount} pages. Campus recruiters and ATS screeners strictly expect a concise 1-page resume for university placements.`,
      suggestion: isPass
        ? 'Maintain this 1-page constraint when adding future achievements by pruning older school-level entries.'
        : 'Condense spacing, remove redundant secondary school details, and refine bullet points so all relevant content fits cleanly on exactly 1 page.',
      source: 'rule'
    };
  }

  /**
   * Check 2: Clean visual structure & layout
   */
  checkVisualStructure(parsed) {
    const layout = parsed.layout || {};
    const anomalies = layout.layoutAnomalies || [];
    const isScanned = layout.isScanned || false;
    const confidence = typeof layout.confidence === 'number' ? layout.confidence : 1.0;
    const wordCount = layout.wordCount || 0;

    const hasLayoutIssue = isScanned || anomalies.length > 0 || (wordCount > 0 && wordCount < 180);
    const status = hasLayoutIssue ? (isScanned ? 'fail' : 'warning') : 'pass';
    const score = status === 'pass' ? 5 : status === 'warning' ? 3 : 0;

    let explanation = `Visual layout confidence evaluated at ${(confidence * 100).toFixed(0)}%.`;
    if (isScanned) {
      explanation += ' Critical: Document was flagged as an image scan lacking selectable text layers.';
    } else if (anomalies.length > 0) {
      explanation += ` Layout issues detected: ${anomalies.join('; ')}.`;
    } else if (wordCount < 180 && wordCount > 0) {
      explanation += ` Word count (${wordCount} words) is unusually sparse for an engineering profile.`;
    } else {
      explanation += ' Document has balanced text density and clear structure.';
    }

    return {
      id: 'CHECK_VISUAL_STRUCTURE',
      name: 'Visual Structure & Formatting',
      category: 'structure',
      status,
      score,
      weight: 5,
      evidence: `Word count: ${wordCount}, Layout confidence: ${(confidence * 100).toFixed(0)}%`,
      explanation,
      suggestion: status === 'pass'
        ? 'Visual hierarchy is clear. Continue to use consistent font sizes for headings.'
        : 'Avoid multi-column tables with overlapping margins, export directly from LaTeX or Word without rasterizing to image, and keep total word count between 350-600 words.',
      source: 'rule'
    };
  }

  /**
   * Check 3: Spelling and grammar / Technical terminology
   */
  checkSpellingGrammar(parsed) {
    let fullText = parsed.cleanText || parsed.text || '';
    // Strip URLs so domain names like github.com don't trigger capitalization warnings
    const textWithoutUrls = fullText.replace(/https?:\/\/[^\s]+/gi, '').replace(/\b[\w-]+\.(?:com|org|io|dev|in|me)\b/gi, '');
    const issuesFound = [];

    // Check tech naming rules
    for (const rule of TECH_SPELLING_RULES) {
      if (rule.regex.test(textWithoutUrls)) {
        const matches = textWithoutUrls.match(new RegExp(rule.regex, 'gi')) || [];
        for (const m of matches) {
          if (m !== rule.correct && !issuesFound.some((i) => i.found === m)) {
            issuesFound.push({
              found: m,
              correct: rule.correct,
              type: 'capitalization'
            });
          }
        }
      }
    }

    // Check repeated words (e.g. "in in", "the the")
    const repeatedWords = fullText.match(/\b([a-zA-Z]{3,})\s+\1\b/gi);
    if (repeatedWords) {
      for (const rep of repeatedWords) {
        issuesFound.push({
          found: rep,
          correct: rep.split(' ')[0],
          type: 'repeated_word'
        });
      }
    }

    // Check double punctuation (e.g. "..", ",,")
    const doublePunct = fullText.match(/(\.\.|\,\,|\;\;)/g);
    if (doublePunct) {
      issuesFound.push({
        found: doublePunct[0],
        correct: doublePunct[0][0],
        type: 'punctuation'
      });
    }

    const isPass = issuesFound.length === 0;
    const status = isPass ? 'pass' : issuesFound.length <= 2 ? 'warning' : 'fail';
    const score = isPass ? 10 : status === 'warning' ? 6 : 2;

    const evidence = isPass
      ? 'No obvious typos or non-standard technical casing detected.'
      : `Found: ${issuesFound.map((i) => `"${i.found}" -> "${i.correct}"`).slice(0, 4).join(', ')}`;

    return {
      id: 'CHECK_SPELLING_GRAMMAR',
      name: 'Spelling & Technical Accuracy',
      category: 'writing',
      status,
      score,
      weight: 10,
      evidence,
      explanation: isPass
        ? 'Technical terms, punctuation, and wording demonstrate standard professional attention to detail.'
        : `Identified ${issuesFound.length} technical casing or grammatical discrepancies. Minor errors in core technology names undermine engineering credibility.`,
      suggestion: isPass
        ? 'Run a final spellcheck before submitting to formal campus drives.'
        : `Fix detected terms: ${issuesFound.map((i) => `replace "${i.found}" with "${i.correct}"`).slice(0, 3).join(', ')}. Standardize industry capitalization.`,
      source: 'rule'
    };
  }

  /**
   * Check 4: Project Quality
   */
  checkProjectQuality(parsed) {
    const projects = parsed.sections?.projects || [];
    if (!projects || projects.length === 0) {
      return {
        id: 'CHECK_PROJECT_QUALITY',
        name: 'Technical Project Depth',
        category: 'projects',
        status: 'fail',
        score: 0,
        weight: 20,
        evidence: 'No projects section or entries parsed from the resume.',
        explanation: 'FAIL: Resume contains no technical projects. Engineering placement benchmarks require at least 2 substantial technical projects.',
        suggestion: 'Add 2-3 technical projects. For each project include: project title, tech stack used, detailed 2-3 bullet descriptions, and public GitHub repository link.',
        source: 'rule'
      };
    }

    const auditResults = [];
    let passedCount = 0;

    for (const proj of projects) {
      const hasDesc = Boolean(proj.description || (proj.highlights && proj.highlights.length > 0));
      const hasStack = Boolean(proj.techStack && proj.techStack.length > 0);
      const hasGithub = Boolean(proj.githubLink);
      const hasImpact = Boolean(proj.impact);
      
      // Classify live link status
      const liveLinkStatus = proj.liveLink ? 'Present' : (proj.techStack?.some(t => ['cli', 'embedded', 'c++', 'c', 'os'].includes(t.toLowerCase())) ? 'Not applicable' : 'Missing');

      const missingElements = [];
      if (!hasDesc) missingElements.push('description');
      if (!hasStack) missingElements.push('tech stack');
      if (!hasGithub) missingElements.push('GitHub repository link');
      if (!hasImpact) missingElements.push('measurable impact/result');

      const isProjSolid = missingElements.length === 0 || (missingElements.length === 1 && missingElements[0] === 'measurable impact/result');
      if (isProjSolid) passedCount++;

      auditResults.push({
        name: proj.name,
        missing: missingElements,
        liveLinkStatus
      });
    }

    const allPassed = passedCount === projects.length && projects.length >= 2;
    const partialPassed = passedCount >= 1;
    const status = allPassed ? 'pass' : partialPassed ? 'warning' : 'fail';
    const score = allPassed ? 20 : partialPassed ? 12 : 5;

    const issues = auditResults.filter((r) => r.missing.length > 0);
    const evidence = `${projects.length} project(s) analyzed. ${issues.length > 0 ? issues.map((i) => `"${i.name}" lacks ${i.missing.join(', ')}`).slice(0, 2).join('; ') : 'All projects have descriptions and technologies listed.'}`;

    return {
      id: 'CHECK_PROJECT_QUALITY',
      name: 'Technical Project Depth',
      category: 'projects',
      status,
      score,
      weight: 20,
      evidence,
      explanation: allPassed
        ? `All ${projects.length} projects include detailed descriptions, technologies, and reference links.`
        : `Projects need improvement. Recruiters evaluate whether you explain what technologies were chosen, why, and provide a verifiable GitHub link.`,
      suggestion: issues.length > 0
        ? `For "${issues[0].name}": Explicitly list the tech stack, provide a working GitHub repository link, and explain the architecture or problem solved.`
        : 'Consider adding a deployed live demo URL if applicable for your web/cloud projects.',
      source: 'rule'
    };
  }

  /**
   * Check 5: Profile Links (GitHub & LeetCode)
   */
  checkProfileLinks(parsed) {
    const contact = parsed.sections?.contact || {};
    const allLinks = (parsed.sections?.links || []).join(' ');

    const hasGithub = Boolean(contact.github || /github\.com\/[a-zA-Z0-9_\-]+/i.test(allLinks));
    const hasLeetcode = Boolean(contact.leetcode || /leetcode\.com\/(?:u\/)?[a-zA-Z0-9_\-]+/i.test(allLinks));
    const hasLinkedin = Boolean(contact.linkedin || /linkedin\.com\/in\/[a-zA-Z0-9_\-]+/i.test(allLinks));

    let score = 0;
    if (hasGithub) score += 5;
    if (hasLeetcode) score += 3;
    if (hasLinkedin) score += 2;

    const status = hasGithub && hasLeetcode ? 'pass' : hasGithub ? 'warning' : 'fail';

    const evidenceParts = [];
    if (hasGithub) evidenceParts.push(`GitHub: ${contact.github || 'detected'}`);
    else evidenceParts.push('GitHub: Missing');
    if (hasLeetcode) evidenceParts.push(`LeetCode: ${contact.leetcode || 'detected'}`);
    else evidenceParts.push('LeetCode: Missing');
    if (hasLinkedin) evidenceParts.push(`LinkedIn: ${contact.linkedin || 'detected'}`);

    return {
      id: 'CHECK_PROFILE_LINKS',
      name: 'Coding & Professional Profiles',
      category: 'profilesLinks',
      status,
      score,
      weight: 10,
      evidence: evidenceParts.join(' | '),
      explanation: status === 'pass'
        ? 'Both active development (GitHub) and problem solving (LeetCode) profile links are clearly presented.'
        : !hasGithub
        ? 'FAIL: GitHub profile link is missing. Technical interviewers require a public repository profile to inspect code quality and commit history.'
        : 'WARNING: LeetCode/problem-solving profile link is missing. For entry-level software engineer roles, demonstrating data structures proficiency is highly beneficial.',
      suggestion: !hasGithub
        ? 'Add your active GitHub profile URL (e.g., https://github.com/your-username) in the contact header.'
        : !hasLeetcode
        ? 'Add your LeetCode or CodeChef/HackerRank profile link in the header alongside GitHub to showcase DSA preparation.'
        : 'Verify all profile hyperlinks are active and direct to updated accounts.',
      source: 'rule'
    };
  }

  /**
   * Check 6: Co-curricular achievements
   */
  checkAchievements(parsed) {
    const achievements = parsed.sections?.achievements || [];
    const fullText = (parsed.cleanText || '').toLowerCase();
    
    // Check keywords if achievements list is empty
    const keywordMatches = ['hackathon', 'first place', 'winner', 'rank', 'contest', 'certification', 'certified', 'aws certified', 'top '].filter(kw => fullText.includes(kw));

    const hasAchievements = achievements.length > 0 || keywordMatches.length > 0;
    const isPass = hasAchievements && (achievements.length >= 2 || keywordMatches.length >= 2);
    const status = isPass ? 'pass' : hasAchievements ? 'warning' : 'fail';
    const score = isPass ? 10 : status === 'warning' ? 6 : 0;

    const evidence = achievements.length > 0
      ? `Listed: ${achievements.slice(0, 2).join('; ')}`
      : keywordMatches.length > 0
      ? `Detected keywords: ${keywordMatches.join(', ')}`
      : 'No achievements, awards, or hackathon participations detected.';

    return {
      id: 'CHECK_ACHIEVEMENTS',
      name: 'Achievements & Co-Curriculars',
      category: 'achievements',
      status,
      score,
      weight: 10,
      evidence,
      explanation: status === 'pass'
        ? 'Demonstrates initiative and competitive distinction beyond standard coursework.'
        : status === 'warning'
        ? 'Minimal co-curricular entries listed. Highlighting competitive achievements differentiates candidates in crowded pools.'
        : 'FAIL: No achievements, hackathons, certifications, or awards found in the resume.',
      suggestion: status === 'pass'
        ? 'Keep achievements focused on college-level technical recognitions rather than school events.'
        : 'Add 2-3 genuine achievements: e.g., hackathon participation (Smart India Hackathon, MLH), coding contest ratings/percentiles, academic scholarships, or verified cloud certifications.',
      source: 'rule'
    };
  }

  /**
   * Check 7: Action verbs
   */
  checkActionVerbs(parsed) {
    const bullets = this.extractAllBulletPoints(parsed);
    if (bullets.length === 0) {
      return {
        id: 'CHECK_ACTION_VERBS',
        name: 'Action-Oriented Phrasing',
        category: 'writing',
        status: 'fail',
        score: 0,
        weight: 10,
        evidence: 'No bullet points found in experience or project sections.',
        explanation: 'FAIL: Content is not formatted as structured bullet points.',
        suggestion: 'Format experience and project details into 2-4 bullet points per item, each starting with an active past-tense verb.',
        source: 'rule'
      };
    }

    let strongVerbCount = 0;
    let weakPhraseCount = 0;
    const weakExamples = [];

    for (const b of bullets) {
      const lower = b.toLowerCase();
      // Check first word
      const firstWord = lower.split(/[\s,]+/)[0];
      if (STRONG_ACTION_VERBS.has(firstWord)) {
        strongVerbCount++;
      }

      for (const weak of WEAK_PHRASES) {
        if (lower.startsWith(weak) || lower.includes(` ${weak} `)) {
          weakPhraseCount++;
          if (weakExamples.length < 2) weakExamples.push(`"${b.slice(0, 45)}..."`);
          break;
        }
      }
    }

    const verbRatio = strongVerbCount / bullets.length;
    const isPass = verbRatio >= 0.6 && weakPhraseCount === 0;
    const isWarning = verbRatio >= 0.35 || weakPhraseCount <= 1;
    const status = isPass ? 'pass' : isWarning ? 'warning' : 'fail';
    const score = isPass ? 10 : isWarning ? 6 : 2;

    const evidence = `${strongVerbCount} of ${bullets.length} bullet points start with strong action verbs.${weakExamples.length > 0 ? ` Passive phrasing: ${weakExamples.join(', ')}` : ''}`;

    return {
      id: 'CHECK_ACTION_VERBS',
      name: 'Action-Oriented Phrasing',
      category: 'writing',
      status,
      score,
      weight: 10,
      evidence,
      explanation: isPass
        ? 'Excellent use of proactive action verbs (e.g. Built, Engineered, Optimized) demonstrating ownership.'
        : `Bullet points use passive or weak construction. Recruiters look for active ownership instead of passive participation.`,
      suggestion: isPass
        ? 'Continue maintaining active voice across all project descriptions.'
        : 'Begin each bullet with a powerful action verb: replace "Worked on backend" with "Engineered backend REST APIs", or "Helped with UI" with "Implemented responsive React dashboard".',
      source: 'rule'
    };
  }

  /**
   * Check 8: Measurable results & quantified impact
   */
  checkMeasurableResults(parsed) {
    const bullets = this.extractAllBulletPoints(parsed);
    const quantifiedBullets = [];
    const unquantifiedBullets = [];

    // Regex for measurable metrics: numbers (including commas or decimals) followed by %, ms, users, req/s, x, k, etc.
    const metricPattern = /(?:\b\d+(?:\.\d+)?|\b\d{1,3}(?:,\d{3})+)\s*(?:%|users?|ms|x|k|queries|req\/s|qps|downloads|stars|\+)/i;

    for (const b of bullets) {
      if (metricPattern.test(b)) {
        quantifiedBullets.push(b);
      } else if (b.length > 25) {
        unquantifiedBullets.push(b);
      }
    }

    const hasImpact = quantifiedBullets.length >= 2;
    const hasSomeImpact = quantifiedBullets.length === 1;
    const status = hasImpact ? 'pass' : hasSomeImpact ? 'warning' : 'fail';
    const score = hasImpact ? 15 : hasSomeImpact ? 8 : 0;

    let sampleUnquantified = unquantifiedBullets[0] ? `"${unquantifiedBullets[0].slice(0, 55)}..."` : 'general project bullets';

    return {
      id: 'CHECK_MEASURABLE_RESULTS',
      name: 'Measurable Impact & Metrics',
      category: 'measurableImpact',
      status,
      score,
      weight: 15,
      evidence: `${quantifiedBullets.length} bullet(s) contain quantified metrics out of ${bullets.length} total.`,
      explanation: status === 'pass'
        ? `Found ${quantifiedBullets.length} quantified results with metrics demonstrating real-world impact.`
        : `Problem: Projects and experience describe what was built, but lack measurable impact or quantifiable results (e.g., in ${sampleUnquantified}).`,
      suggestion: status === 'pass'
        ? 'Keep metrics truthful and be prepared to explain how each number was measured during technical interviews.'
        : 'Suggested fix: Add a measurable result such as users served, performance improvement, data size, response time, or another truthful metric supported by your actual experience (e.g. "Reduced query latency by 30%", "Served 500+ active users", "Processed 10,000+ records"). Do not invent numbers.',
      source: 'rule'
    };
  }

  /**
   * Check 9: ATS readability & standard headings
   */
  checkAtsReadability(parsed) {
    const sections = parsed.sections || {};
    const text = parsed.cleanText || parsed.text || '';
    
    const hasEducation = Boolean(sections.education && sections.education.length > 0);
    const hasProjects = Boolean(sections.projects && sections.projects.length > 0);
    const hasSkills = Boolean(sections.skills && sections.skills.allSkills && sections.skills.allSkills.length > 0);
    const isTextExtractable = text.length > 200 && !(parsed.layout?.isScanned);

    const issues = [];
    if (!hasEducation) issues.push('Education section missing standard heading');
    if (!hasProjects) issues.push('Projects section missing standard heading');
    if (!hasSkills) issues.push('Skills section missing standard heading');
    if (!isTextExtractable) issues.push('Potential ATS text extraction barrier (unselectable text)');

    const isPass = issues.length === 0;
    const status = isPass ? 'pass' : issues.length === 1 ? 'warning' : 'fail';
    const score = isPass ? 10 : status === 'warning' ? 6 : 2;

    return {
      id: 'CHECK_ATS_READABILITY',
      name: 'ATS Readability & Standard Structure',
      category: 'skillsAts',
      status,
      score,
      weight: 10,
      evidence: isPass
        ? 'Likely ATS-friendly: Standard headings detected and text is cleanly extractable.'
        : `Potential ATS issue: ${issues.join(', ')}`,
      explanation: isPass
        ? 'Likely ATS-friendly: Standard headings (Education, Projects, Skills) detected, linear reading order, and selectable text layer.'
        : `Potential ATS issue: Applicant Tracking Systems rely on predictable headings to parse candidate credentials into recruiter databases.`,
      suggestion: isPass
        ? 'Maintain standard headings and avoid complex multi-column floating text boxes.'
        : 'Use standard, clear section headers: "EDUCATION", "TECHNICAL SKILLS", "PROJECTS", "EXPERIENCE". Avoid icons or non-standard graphics for headers.',
      source: 'rule'
    };
  }

  /**
   * Helper to gather all bullet points across experience & projects
   */
  extractAllBulletPoints(parsed) {
    const bullets = [];
    const projects = parsed.sections?.projects || [];
    for (const p of projects) {
      if (p.highlights && Array.isArray(p.highlights)) {
        bullets.push(...p.highlights);
      } else if (p.description) {
        bullets.push(p.description);
      }
    }

    const exp = parsed.sections?.experience || [];
    for (const e of exp) {
      if (e.responsibilities && Array.isArray(e.responsibilities)) {
        bullets.push(...e.responsibilities);
      }
    }

    return bullets.filter((b) => b && b.trim().length > 10);
  }
}

module.exports = new BenchmarkEngine();
