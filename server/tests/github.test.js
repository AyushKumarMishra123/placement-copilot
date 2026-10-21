const { GitHubClient, GitHubClientError } = require('../services/github/githubClient');
const githubProfileService = require('../services/github/githubProfileService');
const githubRepositoryService = require('../services/github/githubRepositoryService');

describe('GitHub API Service Layer Tests', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('Username Normalization and Validation', () => {
    test('extracts username from valid username string', () => {
      expect(githubProfileService.normalizeUsername('octocat')).toBe('octocat');
    });

    test('extracts username from full github URL with trailing slash', () => {
      expect(githubProfileService.normalizeUsername('https://github.com/torvalds/')).toBe('torvalds');
    });

    test('rejects invalid characters in username', () => {
      expect(() => githubProfileService.normalizeUsername('bad$user!name')).toThrow(GitHubClientError);
    });

    test('rejects empty input', () => {
      expect(() => githubProfileService.normalizeUsername('')).toThrow(GitHubClientError);
    });
  });

  describe('Repository URL Parsing', () => {
    test('parses standard GitHub URL', () => {
      const parsed = githubRepositoryService.parseRepoUrl('https://github.com/facebook/react');
      expect(parsed).toEqual({ owner: 'facebook', repo: 'react' });
    });

    test('parses owner/repo slug format', () => {
      const parsed = githubRepositoryService.parseRepoUrl('expressjs/express');
      expect(parsed).toEqual({ owner: 'expressjs', repo: 'express' });
    });

    test('strips .git extension', () => {
      const parsed = githubRepositoryService.parseRepoUrl('https://github.com/nodejs/node.git');
      expect(parsed).toEqual({ owner: 'nodejs', repo: 'node' });
    });

    test('rejects non-github URLs or malformed input', () => {
      expect(() => githubRepositoryService.parseRepoUrl('https://evil.com/fake/repo')).toThrow(GitHubClientError);
    });
  });

  describe('GitHubClient Resilience and Error Handling', () => {
    test('handles 404 unknown user/repo with GITHUB_NOT_FOUND error', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        headers: new Headers(),
        statusText: 'Not Found'
      });

      const client = new GitHubClient();
      await expect(client.get('/users/nonexistent-user-12345')).rejects.toMatchObject({
        code: 'GITHUB_NOT_FOUND',
        status: 404
      });
    });

    test('handles 403 Rate Limit Exceeded with GITHUB_RATE_LIMITED error', async () => {
      const headers = new Headers();
      headers.set('x-ratelimit-remaining', '0');
      headers.set('x-ratelimit-reset', '1893456000');

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 403,
        headers,
        statusText: 'Forbidden'
      });

      const client = new GitHubClient();
      await expect(client.get('/users/anyuser')).rejects.toMatchObject({
        code: 'GITHUB_RATE_LIMITED',
        status: 429
      });
    });

    test('handles network/abort timeout with GITHUB_TIMEOUT error', async () => {
      global.fetch = jest.fn().mockImplementation(() => {
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      const client = new GitHubClient();
      await expect(client.get('/users/slow-response')).rejects.toMatchObject({
        code: 'GITHUB_TIMEOUT',
        status: 504
      });
    });
  });

  describe('Profile Fetching and Graceful Degradation', () => {
    test('successfully fetches user profile and handles missing profile README gracefully', async () => {
      const mockProfileData = {
        login: 'student-dev',
        name: 'Student Dev',
        bio: 'Full-stack software engineer',
        public_repos: 12,
        followers: 5,
        following: 10,
        avatar_url: 'https://avatars.github.com/u/123',
        html_url: 'https://github.com/student-dev',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const mockReposData = [
        {
          name: 'project-one',
          full_name: 'student-dev/project-one',
          description: 'A React application',
          language: 'JavaScript',
          stargazers_count: 5,
          forks_count: 1,
          default_branch: 'main',
          html_url: 'https://github.com/student-dev/project-one'
        }
      ];

      global.fetch = jest.fn().mockImplementation((url) => {
        if (url.includes('/users/student-dev/repos')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers(),
            json: async () => mockReposData
          });
        }
        if (url.includes('/repos/student-dev/student-dev/readme')) {
          // Profile README does not exist (404)
          return Promise.resolve({
            ok: false,
            status: 404,
            headers: new Headers(),
            statusText: 'Not Found'
          });
        }
        if (url.includes('/users/student-dev/events/public')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers(),
            json: async () => []
          });
        }
        if (url.includes('/users/student-dev')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers(),
            json: async () => mockProfileData
          });
        }
        return Promise.reject(new Error('Unexpected URL: ' + url));
      });

      const result = await githubProfileService.fetchUserProfile('student-dev');
      expect(result.username).toBe('student-dev');
      expect(result.profileSnapshot.hasProfileReadme).toBe(false);
      expect(result.profileSnapshot.bio).toBe('Full-stack software engineer');
      expect(result.repositories.length).toBe(1);
      expect(result.repositories[0].name).toBe('project-one');
    });
  });

  describe('Repository Snapshot Fetching and Test File Detection', () => {
    test('fetches repo metadata, tree, and correctly detects absence of test files', async () => {
      const mockRepo = {
        name: 'sample-project',
        description: 'Sample project without tests',
        html_url: 'https://github.com/student/sample-project',
        default_branch: 'main',
        stargazers_count: 2,
        forks_count: 0
      };

      const mockTree = {
        tree: [
          { path: 'package.json', type: 'blob', size: 250 },
          { path: 'README.md', type: 'blob', size: 500 },
          { path: 'src/index.js', type: 'blob', size: 1000 }
        ]
      };

      global.fetch = jest.fn().mockImplementation((url) => {
        if (url.includes('/git/trees/main')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers(),
            json: async () => mockTree
          });
        }
        if (url.includes('/readme')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers(),
            json: async () => ({
              content: Buffer.from('# Sample Project\n\nRuns a basic express server.').toString('base64')
            })
          });
        }
        if (url.includes('/languages') || url.includes('/commits')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers(),
            json: async () => []
          });
        }
        if (url.includes('/repos/student/sample-project/contents/package.json')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers(),
            json: async () => ({
              content: Buffer.from(JSON.stringify({ name: 'sample', scripts: { start: 'node src/index.js' } })).toString('base64')
            })
          });
        }
        if (url.includes('/repos/student/sample-project')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers(),
            json: async () => mockRepo
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => ({})
        });
      });

      const snapshot = await githubRepositoryService.fetchRepositorySnapshot('student/sample-project');
      expect(snapshot.repo).toBe('sample-project');
      expect(snapshot.hasReadme).toBe(true);
      expect(snapshot.testFiles).toEqual([]);
      expect(snapshot.packageJson).not.toBeNull();
      expect(snapshot.packageJson.scripts.start).toBe('node src/index.js');
    });
  });
});
