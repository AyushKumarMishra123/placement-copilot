/**
 * GitHub and Repository Analysis Service
 * Implements deterministic checks for profile, README, code quality, and secret heuristics.
 */

const SECRET_PATTERNS = [
  {
    category: 'AWS Access Key',
    regex: /\b(AKIA[0-9A-Z]{16})\b/g,
    mask: (match) => match.slice(0, 4) + '****************'
  },
  {
    category: 'GitHub Personal Access Token',
    regex: /\b(ghp_[a-zA-Z0-9]{36})\b/g,
    mask: (match) => match.slice(0, 4) + '********************************'
  },
  {
    category: 'GitHub Fine-Grained Token',
    regex: /\b(github_pat_[a-zA-Z0-9_]{50,})\b/g,
    mask: (match) => match.slice(0, 11) + '********************************'
  },
  {
    category: 'Private Key Material',
    regex: /-----BEGIN (?:RSA|EC|DSA|OPENSSH) PRIVATE KEY-----[\s\S]*?-----END (?:RSA|EC|DSA|OPENSSH) PRIVATE KEY-----/g,
    mask: () => '-----BEGIN PRIVATE KEY----- [MASKED PRIVATE KEY CONTENT] -----END PRIVATE KEY-----'
  },
  {
    category: 'Database Connection String with Credentials',
    regex: /\b(mongodb(?:\+srv)?|postgres(?:ql)?|mysql):\/\/([^:\s]+):([^@\s]+)@([^\s"']+)\b/gi,
    mask: (match, proto, user, pass, host) => `${proto}://${user}:********@${host}`
  },
  {
    category: 'Generic API Key / Token',
    regex: /(?:api[_-]?key|secret[_-]?key|access[_-]?token|auth[_-]?token)\s*[:=]\s*["']([a-zA-Z0-9_\-\.]{24,})["']/gi,
    mask: (match) => match.replace(/(["'])(.{4}).*(.{4})(["'])/, '$1$2********$3$4')
  }
];

class GitHubAnalysisService {
  /**
   * Evaluates public GitHub profile setup, activity, and presentation
   * @param {Object} profilePayload
   * @returns {{ score: number, findings: Array, aiSynthesis: Object }}
   */
  analyzeProfile(profilePayload) {
    const { profileSnapshot, repositories } = profilePayload;
    const findings = [];
    let score = 0;

    // 1. Check: Profile README (25 pts)
    if (profileSnapshot.hasProfileReadme) {
      score += 25;
      findings.push({
        id: 'PROFILE_README',
        title: 'Profile README Present',
        category: 'profile_setup',
        status: 'pass',
        evidence: 'Profile README repository detected on account.',
        whyItMatters: 'A personal profile README introduces recruiters to your skills and directs them to your best repositories.',
        suggestedAction: 'Keep your profile README updated with current tech stacks and featured projects.',
        confidence: 1.0
      });
    } else {
      findings.push({
        id: 'PROFILE_README',
        title: 'Missing Profile README',
        category: 'profile_setup',
        status: 'fail',
        evidence: 'No profile README repository found (expected username/username).',
        whyItMatters: 'A short profile README can introduce your technical interests and direct recruiters to your strongest work.',
        suggestedAction: `Create a public repository named "${profilePayload.username}" with a README.md introducing your skills, achievements, and top projects.`,
        confidence: 1.0
      });
    }

    // 2. Check: Bio & Profile Details (20 pts)
    const hasBio = Boolean(profileSnapshot.bio && profileSnapshot.bio.trim().length > 5);
    if (hasBio) {
      score += 20;
      findings.push({
        id: 'PROFILE_BIO',
        title: 'Professional Bio Configured',
        category: 'profile_setup',
        status: 'pass',
        evidence: `Bio: "${profileSnapshot.bio}"`,
        whyItMatters: 'A clear bio communicates career direction and technical focus.',
        suggestedAction: 'Ensure your bio highlights your target engineering role.',
        confidence: 1.0
      });
    } else {
      score += 5;
      findings.push({
        id: 'PROFILE_BIO',
        title: 'Incomplete Profile Bio',
        category: 'profile_setup',
        status: 'warning',
        evidence: 'Bio is either empty or very minimal.',
        whyItMatters: 'Recruiters scan profile headers to understand your technical interests and target roles.',
        suggestedAction: 'Add a 1-2 sentence bio stating your engineering specialization (e.g., "Full-Stack Software Engineer | React, Node.js, Cloud").',
        confidence: 1.0
      });
    }

    // 3. Check: Repository Descriptions (25 pts)
    const reposWithDesc = repositories.filter((r) => r.description && r.description.trim().length > 10);
    const descRatio = repositories.length > 0 ? reposWithDesc.length / repositories.length : 0;

    if (descRatio >= 0.75) {
      score += 25;
      findings.push({
        id: 'REPO_DESCRIPTIONS',
        title: 'Repository Descriptions Present',
        category: 'presentation',
        status: 'pass',
        evidence: `${reposWithDesc.length} of ${repositories.length} public repositories have descriptions.`,
        whyItMatters: 'Clear repository descriptions allow technical screeners to rapidly identify project functionality.',
        suggestedAction: 'Continue providing clear 1-line problem statements on newly published repositories.',
        confidence: 1.0
      });
    } else if (descRatio >= 0.4) {
      score += 15;
      findings.push({
        id: 'REPO_DESCRIPTIONS',
        title: 'Partial Repository Descriptions',
        category: 'presentation',
        status: 'warning',
        evidence: `Only ${reposWithDesc.length} of ${repositories.length} public repositories have descriptions.`,
        whyItMatters: 'Repositories without descriptions force recruiters to guess what was built or click away.',
        suggestedAction: 'Add short, informative descriptions and topic tags to all public repositories.',
        confidence: 1.0
      });
    } else {
      score += 5;
      findings.push({
        id: 'REPO_DESCRIPTIONS',
        title: 'Missing Repository Descriptions',
        category: 'presentation',
        status: 'fail',
        evidence: `Most repositories lack descriptions (${reposWithDesc.length}/${repositories.length} described).`,
        whyItMatters: 'Unlabeled repositories look incomplete or abandoned during candidate evaluations.',
        suggestedAction: 'Edit repository settings to provide a one-line summary and topics for your featured code.',
        confidence: 1.0
      });
    }

    // 4. Check: Pinned / Featured Work (15 pts)
    const hasPinned = Boolean(profileSnapshot.pinnedRepositories && profileSnapshot.pinnedRepositories.length > 0);
    if (hasPinned) {
      score += 15;
      findings.push({
        id: 'PINNED_REPOSITORIES',
        title: 'Featured Projects Highlighted',
        category: 'presentation',
        status: 'pass',
        evidence: `${profileSnapshot.pinnedRepositories.length} featured/pinned repositories identified.`,
        whyItMatters: 'Pinning your best projects ensures interviewers inspect your strongest code first.',
        suggestedAction: 'Keep pinned projects limited to your 3-4 most complex, fully completed applications.',
        confidence: 1.0
      });
    } else {
      findings.push({
        id: 'PINNED_REPOSITORIES',
        title: 'No Pinned Repositories',
        category: 'presentation',
        status: 'warning',
        evidence: 'No pinned repositories detected on public profile.',
        whyItMatters: 'Without pins, GitHub displays repositories by recent updates rather than technical depth.',
        suggestedAction: 'Pin your top 3-4 portfolio projects on your GitHub homepage.',
        confidence: 1.0
      });
    }

    // 5. Check: Public Activity Distribution (15 pts)
    const activity = profileSnapshot.recentActivity || {};
    const commitsCount = activity.commitsInWindow || 0;
    const eventsCount = activity.publicEventsCount || 0;

    if (commitsCount >= 10 || eventsCount >= 15) {
      score += 15;
      findings.push({
        id: 'RECENT_ACTIVITY',
        title: 'Active Public Contributions',
        category: 'activity',
        status: 'pass',
        evidence: `${commitsCount} public commits detected in the last 90-day window across ${eventsCount} events.`,
        whyItMatters: 'Demonstrates active coding habit and ongoing engagement with version control.',
        suggestedAction: 'Maintain steady development cadence with descriptive commit messages.',
        confidence: 1.0
      });
    } else if (eventsCount > 0 || profileSnapshot.publicRepos >= 2) {
      score += 10;
      findings.push({
        id: 'RECENT_ACTIVITY',
        title: 'Moderate / Bounded Activity Window',
        category: 'activity',
        status: 'pass',
        evidence: `${commitsCount} public commits in the 90-day window (${profileSnapshot.publicRepos} total public repos).`,
        whyItMatters: 'Public commit frequency varies by academic schedule; repository substance matters more than volume.',
        suggestedAction: 'Push active project updates regularly so recruiters see recent activity.',
        confidence: 0.9
      });
    } else {
      score += 5;
      findings.push({
        id: 'RECENT_ACTIVITY',
        title: 'Low Public Activity in Monitored Window',
        category: 'activity',
        status: 'warning',
        evidence: `Few public events (${eventsCount}) recorded in the last 90 days.`,
        whyItMatters: 'Interviewers look for evidence of continuous hands-on software development.',
        suggestedAction: 'Contribute regularly to personal repositories or open-source projects.',
        confidence: 0.8
      });
    }

    return {
      score: Math.min(100, Math.max(0, score)),
      findings
    };
  }

  /**
   * Analyzes README documentation quality & cross-references scripts
   */
  analyzeReadme(readmeText, packageJson) {
    if (!readmeText || readmeText.trim().length < 30) {
      return {
        qualityScore: 10,
        passed: [],
        issues: [
          'No README or virtually empty README file detected.',
          'Missing project purpose, setup, and run instructions.'
        ],
        hasInstallation: false,
        hasEnvInstructions: false,
        hasTestInstructions: false,
        hasTechStack: false,
        hasRunInstructions: false,
        scriptsCrossReferenced: []
      };
    }

    const lower = readmeText.toLowerCase();
    const passed = [];
    const issues = [];
    let score = 20; // baseline for having a non-empty README

    // 1. Project Purpose / Features
    const hasPurpose = lower.includes('about') || lower.includes('overview') || lower.includes('features') || lower.includes('description') || lower.includes('purpose') || lower.includes('introduction');
    if (hasPurpose || readmeText.split('\n').length > 10) {
      passed.push('Project purpose and features documented.');
      score += 20;
    } else {
      issues.push('Project purpose or feature summary is brief or unclear.');
    }

    // 2. Tech Stack Identification
    const techKeywords = ['react', 'node', 'express', 'python', 'fastapi', 'django', 'mongodb', 'postgresql', 'docker', 'typescript', 'tech stack', 'built with', 'technologies'];
    const hasTechStack = techKeywords.filter((k) => lower.includes(k)).length >= 2;
    if (hasTechStack) {
      passed.push('Technology stack and architecture identified.');
      score += 15;
    } else {
      issues.push('Technology stack is not clearly listed.');
    }

    // 3. Installation Steps
    const hasInstallation = lower.includes('npm install') || lower.includes('yarn') || lower.includes('pnpm') || lower.includes('pip install') || lower.includes('installation') || lower.includes('install');
    if (hasInstallation) {
      passed.push('Installation instructions provided.');
      score += 15;
    } else {
      issues.push('Installation steps (e.g. npm install / pip install) not found.');
    }

    // 4. Run / Development Instructions
    const hasRunInstructions = lower.includes('npm start') || lower.includes('npm run dev') || lower.includes('uvicorn') || lower.includes('python main') || lower.includes('how to run') || lower.includes('getting started') || lower.includes('usage');
    if (hasRunInstructions) {
      passed.push('Execution and run instructions provided.');
      score += 15;
    } else {
      issues.push('Run or development instructions are missing.');
    }

    // 5. Environment Variables
    const hasEnvInstructions = lower.includes('.env') || lower.includes('environment variable') || lower.includes('api_key') || lower.includes('config');
    if (hasEnvInstructions) {
      passed.push('Configuration or environment variable guidance included.');
      score += 10;
    } else {
      issues.push('Required environment variables are not explained.');
    }

    // 6. Test Instructions
    const hasTestInstructions = lower.includes('npm test') || lower.includes('pytest') || lower.includes('jest') || lower.includes('running tests') || lower.includes('unit test');
    if (hasTestInstructions) {
      passed.push('Testing instructions documented.');
      score += 5;
    } else {
      issues.push('No test instructions found.');
    }

    // 7. Cross-reference referenced scripts against package.json
    const scriptsCrossReferenced = [];
    if (packageJson && packageJson.scripts) {
      const referencedScripts = ['dev', 'start', 'test', 'build'];
      for (const scriptName of referencedScripts) {
        const regex = new RegExp(`npm\\s+run\\s+${scriptName}|npm\\s+${scriptName}`, 'i');
        if (regex.test(readmeText)) {
          if (!packageJson.scripts[scriptName]) {
            issues.push(`README references script "npm run ${scriptName}", but it is not defined in package.json.`);
          } else {
            scriptsCrossReferenced.push(`Verified script "${scriptName}" exists in package.json.`);
          }
        }
      }
    }

    return {
      qualityScore: Math.min(100, score),
      passed,
      issues,
      hasInstallation,
      hasEnvInstructions,
      hasTestInstructions,
      hasTechStack,
      hasRunInstructions,
      scriptsCrossReferenced
    };
  }

  /**
   * Heuristic scanner for potential committed secrets (Masks all evidence!)
   */
  scanForPotentialSecrets(sourceFiles, repoTree) {
    const findings = [];

    // Check for committed sensitive .env files in tree
    for (const item of repoTree) {
      const p = item.path.toLowerCase();
      if ((p === '.env' || p.endsWith('/.env') || p.includes('.env.local') || p.includes('.env.production')) && !p.includes('.env.example') && !p.includes('.env.sample') && !p.includes('.env.template')) {
        findings.push({
          category: 'Committed .env File',
          filePath: item.path,
          maskedEvidence: 'Committed environment file found in repository tree: ' + item.path,
          explanation: 'Sensitive environment files containing production or secret credentials should be excluded via .gitignore.',
          suggestedFix: 'Remove this file from the repository, add it to .gitignore, and provide a safe template (e.g. .env.example). Rotate any real keys immediately.',
          severity: 'critical'
        });
      }
    }

    // Scan source files for patterns
    for (const file of sourceFiles) {
      // Skip test mocks or examples
      if (file.path.includes('.example') || file.path.includes('.test.') || file.path.includes('mock')) {
        continue;
      }

      for (const pattern of SECRET_PATTERNS) {
        pattern.regex.lastIndex = 0;
        let match;
        while ((match = pattern.regex.exec(file.content)) !== null) {
          const rawMatch = match[0];
          // Filter obvious placeholder values
          const lowerMatch = rawMatch.toLowerCase();
          if (lowerMatch.includes('your_') || lowerMatch.includes('placeholder') || lowerMatch.includes('dummy') || lowerMatch.includes('example') || lowerMatch.includes('xxx')) {
            continue;
          }

          const maskedEvidence = pattern.mask(rawMatch, match[1], match[2], match[3], match[4]);

          findings.push({
            category: pattern.category,
            filePath: file.path,
            maskedEvidence,
            explanation: `Heuristic match for ${pattern.category}. If this credential is genuine, it can be abused by automated bots scanning public GitHub repos.`,
            suggestedFix: 'Immediately rotate or revoke this credential with your provider. Move all configuration values to environment variables and do not commit secrets.',
            severity: 'critical'
          });

          // Break to avoid multiple duplicate findings on the same file
          break;
        }
      }
    }

    return findings;
  }

  /**
   * Code quality inspection across bounded source files
   */
  inspectCodeQuality(sourceFiles, treeEntries, testFiles) {
    const findings = [];
    const largeFiles = [];
    let totalLines = 0;

    for (const file of sourceFiles) {
      const lines = file.content.split('\n');
      totalLines += lines.length;

      // 1. Large files check (> 400 lines)
      if (lines.length > 400) {
        largeFiles.push(file.path);
        findings.push({
          title: 'Monolithic / Overly Large File',
          severity: 'warning',
          filePath: file.path,
          evidence: `File contains ${lines.length} lines of code.`,
          explanation: 'Very large files often indicate high coupling and violate the Single Responsibility Principle.',
          suggestedFix: 'Decompose large modules into focused helper functions, sub-components, or dedicated services.',
          confidence: 0.9
        });
      }

      // 2. Missing error handling check in async methods
      if (file.content.includes('async ') && (file.content.includes('fetch(') || file.content.includes('axios.'))) {
        if (!file.content.includes('try') && !file.content.includes('.catch(')) {
          findings.push({
            title: 'Uncaught Asynchronous Operations',
            severity: 'warning',
            filePath: file.path,
            evidence: 'Asynchronous network calls detected without try/catch or .catch() handlers.',
            explanation: 'Unhandled Promise rejections cause silent UI failures or server crashes in production.',
            suggestedFix: 'Wrap asynchronous I/O operations in try/catch blocks and return descriptive fallback states.',
            confidence: 0.85
          });
        }
      }

      // 3. Obvious console.log left in production code
      const logMatches = (file.content.match(/console\.log\(/g) || []).length;
      if (logMatches > 6) {
        findings.push({
          title: 'Excessive Debug Logging',
          severity: 'info',
          filePath: file.path,
          evidence: `Detected ${logMatches} instances of console.log.`,
          explanation: 'Leaving debug logs in production repositories can degrade performance and leak internal state.',
          suggestedFix: 'Clean up debug logs or replace them with a structured logger.',
          confidence: 0.95
        });
      }
    }

    // 4. Test presence check
    const hasTests = testFiles && testFiles.length > 0;
    if (!hasTests) {
      findings.push({
        title: 'No Automated Tests Detected',
        severity: 'warning',
        filePath: 'Repository Root',
        evidence: 'No test files (e.g. *.test.js, test_*.py, etc.) identified in repository tree.',
        whyItMatters: 'Automated unit or integration tests are a standard hiring requirement for production software roles.',
        explanation: 'Lack of automated tests makes software difficult to maintain and verify.',
        suggestedFix: 'Add unit tests for core application logic using a framework like Jest, Vitest, or Pytest.',
        confidence: 0.95
      });
    }

    return {
      totalFilesInspected: sourceFiles.length,
      totalLinesInspected: totalLines,
      hasTests,
      testFilesFound: testFiles || [],
      configFilesFound: treeEntries
        .filter((t) => /^\.(eslintrc|prettierrc|dockerignore|gitignore)|(tsconfig|vite\.config|webpack\.config)\.[a-z]+$/i.test(t.path))
        .map((t) => t.path),
      largeFiles,
      findings
    };
  }

  /**
   * Evaluates overall repository score
   */
  calculateRepoScores(readmeAnalysis, codeAnalysis, secretFindings, liveCheck) {
    let repoQuality = 0;

    // README: max 30 pts
    const readmePts = Math.round((readmeAnalysis.qualityScore / 100) * 30);
    repoQuality += readmePts;

    // Tests: max 25 pts
    if (codeAnalysis.hasTests) {
      repoQuality += 25;
    } else if (codeAnalysis.testFilesFound.length > 0) {
      repoQuality += 15;
    }

    // Code Quality: max 25 pts (deduct 5 for warnings)
    let codePts = 25;
    for (const f of codeAnalysis.findings) {
      if (f.severity === 'warning') codePts = Math.max(10, codePts - 4);
    }
    repoQuality += codePts;

    // Configuration & Structure: max 20 pts
    let configPts = 20;
    if (codeAnalysis.configFilesFound.length === 0) configPts -= 6;
    repoQuality += configPts;

    // Secret deductions: critical vulnerability
    if (secretFindings.length > 0) {
      repoQuality = Math.max(20, repoQuality - (secretFindings.length * 15));
    }

    // Live Website: max 15 pts
    let liveScore = 0;
    if (liveCheck && liveCheck.attempted) {
      if (liveCheck.reachable) {
        liveScore = 15;
        if (liveCheck.consoleErrors && liveCheck.consoleErrors.length > 0) {
          liveScore = Math.max(8, liveScore - liveCheck.consoleErrors.length * 2);
        }
      }
    }

    const overall = Math.min(100, Math.round(repoQuality));

    return {
      overallProjectScore: overall,
      repositoryQuality: Math.round(repoQuality),
      readmeQuality: readmeAnalysis.qualityScore,
      codeQuality: codePts,
      liveWebsiteQuality: liveScore
    };
  }

  /**
   * Compares student supplied claims with live website findings
   */
  verifyProjectClaims({ projectName, projectDescription, readmeText, liveCheck }) {
    if (!liveCheck || !liveCheck.attempted || !liveCheck.reachable) {
      return {
        status: 'Unable to verify',
        explanation: 'Live website could not be reached or was not provided.',
        evidence: liveCheck?.error || 'No reachable website inspected.',
        confidence: 1.0
      };
    }

    const title = (liveCheck.pageTitle || '').toLowerCase();
    const visibleText = (liveCheck.visibleTextSnippet || '').toLowerCase();
    const nameLower = (projectName || '').toLowerCase();
    const descLower = (projectDescription || '').toLowerCase();

    // Check title or visible text correlation
    const hasNameMatch = nameLower.length > 2 && (title.includes(nameLower) || visibleText.includes(nameLower));
    
    // Extract key tokens from description
    const tokens = descLower.split(/\s+/).filter((w) => w.length > 4);
    const matchedTokens = tokens.filter((t) => visibleText.includes(t) || title.includes(t));
    const tokenRatio = tokens.length > 0 ? matchedTokens.length / tokens.length : 0;

    if (hasNameMatch && tokenRatio >= 0.25) {
      return {
        status: 'Verified',
        explanation: `Live application title ("${liveCheck.pageTitle}") and visible content correlate with the project description.`,
        evidence: `Matched project keywords: ${matchedTokens.slice(0, 4).join(', ')}`,
        confidence: 0.9
      };
    } else if (hasNameMatch || tokenRatio >= 0.2) {
      return {
        status: 'Partially verified',
        explanation: `Live website rendered successfully with matching title or keywords, but content is minimal.`,
        evidence: `Page title: "${liveCheck.pageTitle}". Matched: ${matchedTokens.slice(0, 3).join(', ')}`,
        confidence: 0.75
      };
    } else {
      return {
        status: 'Not verified',
        explanation: 'Live site rendered but visible page content does not appear related to the claimed functionality.',
        evidence: `Page title: "${liveCheck.pageTitle}". Visible content lacked project keywords.`,
        confidence: 0.7
      };
    }
  }
}

module.exports = new GitHubAnalysisService();
