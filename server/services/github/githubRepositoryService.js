const { githubClient, GitHubClientError } = require('./githubClient');

class GitHubRepositoryService {
  /**
   * Parse owner and repository name from URL or string
   * @param {string} input
   * @returns {{ owner: string, repo: string }}
   */
  parseRepoUrl(input) {
    if (!input || typeof input !== 'string') {
      throw new GitHubClientError('Repository URL or slug is required.', 'INVALID_REPO_URL', 400);
    }

    let cleaned = input.trim().replace(/\.git$/i, '').replace(/\/+$/, '');

    // Match https://github.com/owner/repo or owner/repo
    const match = cleaned.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_\-\.]+)\/([a-zA-Z0-9_\-\.]+)/i) ||
                  cleaned.match(/^([a-zA-Z0-9_\-\.]+)\/([a-zA-Z0-9_\-\.]+)$/);

    if (!match) {
      throw new GitHubClientError(
        `"${input}" is not a valid GitHub repository URL. Expected format: https://github.com/owner/repo`,
        'INVALID_REPO_URL',
        400
      );
    }

    const owner = match[1];
    const repo = match[2];

    if (!owner || !repo) {
      throw new GitHubClientError('Could not determine repository owner or name.', 'INVALID_REPO_URL', 400);
    }

    return { owner, repo };
  }

  /**
   * Fetches bounded repository details, tree structure, README, and key source files
   */
  async fetchRepositorySnapshot(rawRepoUrl) {
    const { owner, repo } = this.parseRepoUrl(rawRepoUrl);

    // 1. Fetch Repo Metadata
    const repoData = await githubClient.get(`/repos/${owner}/${repo}`);
    const defaultBranch = repoData.default_branch || 'main';

    // 2. Fetch Languages
    let languages = {};
    try {
      languages = await githubClient.get(`/repos/${owner}/${repo}/languages`);
    } catch (_) {
      languages = {};
    }

    // 3. Fetch README
    let readmeText = '';
    let hasReadme = false;
    try {
      const readmeRes = await githubClient.get(`/repos/${owner}/${repo}/readme`);
      if (readmeRes && readmeRes.content) {
        readmeText = Buffer.from(readmeRes.content, 'base64').toString('utf-8');
        hasReadme = true;
      }
    } catch (_) {
      hasReadme = false;
      readmeText = '';
    }

    // 4. Fetch Recent Commits (to get current commit SHA & messages)
    let commits = [];
    let latestCommitSha = '';
    try {
      commits = await githubClient.get(`/repos/${owner}/${repo}/commits?per_page=15`);
      if (Array.isArray(commits) && commits.length > 0) {
        latestCommitSha = commits[0].sha;
      }
    } catch (_) {
      commits = [];
    }

    // 5. Fetch Repository Tree (bounded to 100 entries)
    let treeEntries = [];
    try {
      const treeRes = await githubClient.get(`/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`);
      if (treeRes && Array.isArray(treeRes.tree)) {
        treeEntries = treeRes.tree.slice(0, 100);
      }
    } catch (_) {
      // Fallback to top-level contents if trees API fails
      try {
        const contentsRes = await githubClient.get(`/repos/${owner}/${repo}/contents`);
        if (Array.isArray(contentsRes)) {
          treeEntries = contentsRes.map((c) => ({ path: c.path, type: c.type === 'dir' ? 'tree' : 'blob', size: c.size }));
        }
      } catch (_) {
        treeEntries = [];
      }
    }

    // 6. Inspect manifests and configuration files
    let packageJson = null;
    let requirementsTxt = null;

    const packageJsonEntry = treeEntries.find((f) => f.path.toLowerCase() === 'package.json');
    if (packageJsonEntry) {
      try {
        const pkgContent = await this.fetchFileContent(owner, repo, packageJsonEntry.path);
        packageJson = JSON.parse(pkgContent);
      } catch (_) {
        packageJson = null;
      }
    }

    const reqTxtEntry = treeEntries.find((f) => f.path.toLowerCase() === 'requirements.txt');
    if (reqTxtEntry) {
      try {
        requirementsTxt = await this.fetchFileContent(owner, repo, reqTxtEntry.path);
      } catch (_) {
        requirementsTxt = null;
      }
    }

    // 7. Detect test files
    const testFilePatterns = [
      /\btest(s)?\b/i,
      /\.test\.[a-z0-9]+$/i,
      /\.spec\.[a-z0-9]+$/i,
      /__tests__/i,
      /^test_.*\.py$/i,
      /.*_test\.go$/i
    ];

    const testFiles = treeEntries
      .filter((item) => item.type === 'blob' && testFilePatterns.some((pat) => pat.test(item.path)))
      .map((item) => item.path);

    // 8. Fetch small sample of top source files for code review & secret check (Max 8 files, max 50KB each)
    const sourceCandidates = treeEntries.filter((item) => {
      if (item.type !== 'blob') return false;
      const p = item.path.toLowerCase();
      // Exclude build artifacts and locks
      if (p.includes('node_modules/') || p.includes('dist/') || p.includes('build/') || p.includes('.min.') || p.includes('package-lock.json') || p.includes('yarn.lock')) {
        return false;
      }
      return /\.(js|jsx|ts|tsx|py|go|java|cpp|c|rs|php|rb|html|css|json|env|yaml|yml)$/i.test(p);
    });

    // Prioritize entry points and core files
    const prioritizedFiles = sourceCandidates.sort((a, b) => {
      const isEntryA = /^(src\/)?(index|app|server|main)\.[a-z0-9]+$/i.test(a.path);
      const isEntryB = /^(src\/)?(index|app|server|main)\.[a-z0-9]+$/i.test(b.path);
      if (isEntryA && !isEntryB) return -1;
      if (!isEntryA && isEntryB) return 1;
      return 0;
    }).slice(0, 8);

    const sourceFiles = [];
    for (const fileItem of prioritizedFiles) {
      try {
        const content = await this.fetchFileContent(owner, repo, fileItem.path);
        sourceFiles.push({
          path: fileItem.path,
          size: fileItem.size || content.length,
          content: content.slice(0, 30000) // bounded to 30KB
        });
      } catch (_) {
        // continue
      }
    }

    return {
      owner,
      repo,
      repoUrl: repoData.html_url,
      description: repoData.description || '',
      stars: repoData.stargazers_count || 0,
      forks: repoData.forks_count || 0,
      defaultBranch,
      latestCommitSha,
      hasReadme,
      readmeText,
      languages,
      tree: treeEntries,
      testFiles,
      packageJson,
      requirementsTxt,
      sourceFiles,
      recentCommits: commits.slice(0, 10).map((c) => ({
        sha: c.sha,
        message: c.commit?.message || '',
        date: c.commit?.author?.date || null
      }))
    };
  }

  /**
   * Helper to fetch individual file text content
   */
  async fetchFileContent(owner, repo, filePath) {
    const res = await githubClient.get(`/repos/${owner}/${repo}/contents/${filePath}`);
    if (res && res.content) {
      return Buffer.from(res.content, 'base64').toString('utf-8');
    }
    return '';
  }
}

module.exports = new GitHubRepositoryService();
