const githubAnalysisService = require('../services/github/githubAnalysisService');

describe('Project and Repository Analysis Engine Tests', () => {
  describe('Potential Secret Detection and Safe Masking', () => {
    test('masks AWS Access Key without exposing raw secret in evidence', () => {
      const sourceFiles = [
        {
          path: 'src/config/aws.js',
          content: 'const AWS_KEY = "AKIAIOSFODNN7WXYZ987";'
        }
      ];
      const repoTree = [{ path: 'src/config/aws.js', type: 'blob' }];

      const findings = githubAnalysisService.scanForPotentialSecrets(sourceFiles, repoTree);
      expect(findings.length).toBe(1);
      expect(findings[0].category).toBe('AWS Access Key');
      expect(findings[0].maskedEvidence).toContain('AKIA****************');
      expect(findings[0].maskedEvidence).not.toContain('AKIAIOSFODNN7WXYZ987');
      expect(findings[0].severity).toBe('critical');
    });

    test('masks GitHub Personal Access Token', () => {
      const sourceFiles = [
        {
          path: 'src/scripts/deploy.js',
          content: 'const token = "ghp_123456789012345678901234567890123456";'
        }
      ];
      const repoTree = [{ path: 'src/scripts/deploy.js', type: 'blob' }];

      const findings = githubAnalysisService.scanForPotentialSecrets(sourceFiles, repoTree);
      expect(findings.length).toBe(1);
      expect(findings[0].category).toBe('GitHub Personal Access Token');
      expect(findings[0].maskedEvidence).toContain('ghp_********************************');
      expect(findings[0].maskedEvidence).not.toContain('ghp_123456789012345678901234567890123456');
    });

    test('masks Database Connection URI password', () => {
      const sourceFiles = [
        {
          path: 'server/db.js',
          content: 'const uri = "mongodb+srv://admin_user:SuperSecretPassword123@cluster0.abc.mongodb.net/prod";'
        }
      ];
      const repoTree = [{ path: 'server/db.js', type: 'blob' }];

      const findings = githubAnalysisService.scanForPotentialSecrets(sourceFiles, repoTree);
      expect(findings.length).toBe(1);
      expect(findings[0].category).toBe('Database Connection String with Credentials');
      expect(findings[0].maskedEvidence).toContain('mongodb+srv://admin_user:********@cluster0.abc.mongodb.net/prod');
      expect(findings[0].maskedEvidence).not.toContain('SuperSecretPassword123');
    });

    test('flags committed .env file from repository tree', () => {
      const sourceFiles = [];
      const repoTree = [
        { path: '.env', type: 'blob' },
        { path: '.env.example', type: 'blob' },
        { path: 'src/index.js', type: 'blob' }
      ];

      const findings = githubAnalysisService.scanForPotentialSecrets(sourceFiles, repoTree);
      expect(findings.length).toBe(1);
      expect(findings[0].category).toBe('Committed .env File');
      expect(findings[0].filePath).toBe('.env');
    });

    test('ignores harmless placeholders and example tokens', () => {
      const sourceFiles = [
        {
          path: 'README.md',
          content: 'Set your API_KEY="your_api_key_here_placeholder"'
        }
      ];
      const repoTree = [{ path: 'README.md', type: 'blob' }];

      const findings = githubAnalysisService.scanForPotentialSecrets(sourceFiles, repoTree);
      expect(findings.length).toBe(0);
    });
  });

  describe('README Documentation Review & Script Cross-Referencing', () => {
    test('cross-references scripts in README against package.json and flags missing scripts', () => {
      const readme = `
        # My Awesome App
        ## Overview
        Full-stack React and Express web application for task tracking.
        ## Installation
        Run \`npm install\`
        ## Getting Started
        Run \`npm run dev\` to launch the server.
        ## Environment Variables
        Configure \`.env\` with PORT=5000.
      `;

      const packageJson = {
        name: 'my-app',
        scripts: {
          start: 'node server.js'
          // notice: 'dev' script is missing!
        }
      };

      const result = githubAnalysisService.analyzeReadme(readme, packageJson);
      expect(result.qualityScore).toBeGreaterThanOrEqual(70);
      expect(result.hasInstallation).toBe(true);
      expect(result.hasEnvInstructions).toBe(true);
      expect(result.hasTechStack).toBe(true);
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.stringContaining('README references script "npm run dev", but it is not defined in package.json')
        ])
      );
    });

    test('verifies referenced scripts when present in package.json', () => {
      const readme = `
        # My App
        Run \`npm run dev\` and \`npm test\`
        Built with React and Node.
        Setup .env configuration.
        Run npm install.
      `;

      const packageJson = {
        scripts: {
          dev: 'vite',
          test: 'jest'
        }
      };

      const result = githubAnalysisService.analyzeReadme(readme, packageJson);
      expect(result.scriptsCrossReferenced).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Verified script "dev" exists in package.json'),
          expect.stringContaining('Verified script "test" exists in package.json')
        ])
      );
    });

    test('handles missing or empty README with appropriate low score and issues', () => {
      const result = githubAnalysisService.analyzeReadme('', null);
      expect(result.qualityScore).toBe(10);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.hasInstallation).toBe(false);
    });
  });

  describe('Code Quality Heuristics', () => {
    test('flags missing tests when testFiles is empty', () => {
      const sourceFiles = [
        { path: 'src/index.js', content: 'console.log("hello world");' }
      ];
      const treeEntries = [{ path: 'src/index.js', type: 'blob' }];
      const testFiles = [];

      const result = githubAnalysisService.inspectCodeQuality(sourceFiles, treeEntries, testFiles);
      expect(result.hasTests).toBe(false);
      const testFinding = result.findings.find((f) => f.title === 'No Automated Tests Detected');
      expect(testFinding).toBeDefined();
      expect(testFinding.severity).toBe('warning');
    });

    test('flags oversized files (>400 lines)', () => {
      const longContent = new Array(450).fill('const x = 1;').join('\n');
      const sourceFiles = [
        { path: 'src/giantFile.js', content: longContent }
      ];
      const treeEntries = [{ path: 'src/giantFile.js', type: 'blob' }];
      const testFiles = ['tests/giant.test.js'];

      const result = githubAnalysisService.inspectCodeQuality(sourceFiles, treeEntries, testFiles);
      expect(result.largeFiles).toContain('src/giantFile.js');
      const largeFileFinding = result.findings.find((f) => f.title === 'Monolithic / Overly Large File');
      expect(largeFileFinding).toBeDefined();
      expect(largeFileFinding.evidence).toContain('450 lines');
    });
  });

  describe('Claim Verification Logic', () => {
    test('verifies project claim when live page title and visible content match project name', () => {
      const liveCheck = {
        attempted: true,
        reachable: true,
        pageTitle: 'Placement Readiness Copilot',
        visibleTextSnippet: 'Comprehensive dashboard preparing engineering students for campus placements and technical interviews.'
      };

      const result = githubAnalysisService.verifyProjectClaims({
        projectName: 'Placement Copilot',
        projectDescription: 'Dashboard for campus placement preparation and interviews',
        readmeText: '# Placement Copilot',
        liveCheck
      });

      expect(['Verified', 'Partially verified']).toContain(result.status);
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });

    test('returns "Unable to verify" if live website was unreachable', () => {
      const liveCheck = {
        attempted: true,
        reachable: false,
        error: 'Connection timed out'
      };

      const result = githubAnalysisService.verifyProjectClaims({
        projectName: 'My Project',
        projectDescription: 'Description',
        readmeText: '',
        liveCheck
      });

      expect(result.status).toBe('Unable to verify');
    });
  });
});
