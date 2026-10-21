const { githubClient, GitHubClientError } = require('./githubClient');

class GitHubProfileService {
  /**
   * Sanitizes and parses a GitHub username from username string or URL
   * @param {string} input
   * @returns {string} clean username
   */
  normalizeUsername(input) {
    if (!input || typeof input !== 'string') {
      throw new GitHubClientError('GitHub username or profile URL is required.', 'INVALID_USERNAME', 400);
    }

    let cleaned = input.trim();
    // Strip trailing slashes
    cleaned = cleaned.replace(/\/+$/, '');

    // Extract from full or partial URL
    const urlMatch = cleaned.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)/i);
    if (urlMatch) {
      cleaned = urlMatch[1];
    }

    // GitHub username rules: alphanumeric, max 39 chars, single hyphens, no leading/trailing hyphen
    if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/.test(cleaned)) {
      throw new GitHubClientError(
        `"${input}" is not a valid GitHub username format.`,
        'INVALID_USERNAME',
        400
      );
    }

    return cleaned;
  }

  /**
   * Fetches public GitHub profile and associated repositories
   * @param {string} username
   * @returns {Promise<Object>}
   */
  async fetchUserProfile(rawUsername) {
    const username = this.normalizeUsername(rawUsername);

    // 1. Fetch user profile
    const userProfile = await githubClient.get(`/users/${username}`);

    // 2. Fetch public repositories (bounded to top 30 recently updated)
    let repos = [];
    try {
      repos = await githubClient.get(`/users/${username}/repos?sort=updated&per_page=30`);
      if (!Array.isArray(repos)) repos = [];
    } catch (err) {
      console.warn(`[GitHubProfileService] Could not fetch repos for ${username}: ${err.message}`);
      repos = [];
    }

    // 3. Fetch Profile README (special repo username/username)
    let hasProfileReadme = false;
    let profileReadmeSnippet = '';
    try {
      const readmeData = await githubClient.get(`/repos/${username}/${username}/readme`);
      if (readmeData && readmeData.content) {
        const decoded = Buffer.from(readmeData.content, 'base64').toString('utf-8');
        hasProfileReadme = true;
        profileReadmeSnippet = decoded.slice(0, 500);
      }
    } catch (err) {
      // 404 is normal if candidate has not created a special profile README repo
      hasProfileReadme = false;
    }

    // 4. Fetch recent public activity events (last 30 public events)
    let events = [];
    let recentCommitsCount = 0;
    let lastActiveDate = null;
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;

    try {
      events = await githubClient.get(`/users/${username}/events/public?per_page=30`);
      if (Array.isArray(events)) {
        for (const evt of events) {
          const eventTime = new Date(evt.created_at).getTime();
          if (!lastActiveDate) {
            lastActiveDate = new Date(evt.created_at);
          }

          if (eventTime >= ninetyDaysAgo) {
            if (evt.type === 'PushEvent' && evt.payload?.commits) {
              recentCommitsCount += evt.payload.commits.length;
            }
          }
        }
      }
    } catch (err) {
      // Non-fatal if events API returns 403 or empty
      events = [];
    }

    // Identify candidate's top repositories (sort by stargazers + forks)
    const sortedRepos = [...repos].sort((a, b) => {
      const scoreA = (a.stargazers_count || 0) * 2 + (a.forks_count || 0);
      const scoreB = (b.stargazers_count || 0) * 2 + (b.forks_count || 0);
      return scoreB - scoreA;
    });

    // Pinned or prominent repos (top 4)
    const pinnedRepositories = sortedRepos.slice(0, 4).map((r) => ({
      name: r.name,
      fullName: r.full_name,
      description: r.description || '',
      language: r.language || '',
      stars: r.stargazers_count || 0,
      forks: r.forks_count || 0,
      isPinned: true,
      defaultBranch: r.default_branch || 'main',
      updatedAt: r.updated_at ? new Date(r.updated_at) : null,
      url: r.html_url
    }));

    const formattedRepos = repos.map((r) => ({
      name: r.name,
      fullName: r.full_name,
      description: r.description || '',
      language: r.language || '',
      stars: r.stargazers_count || 0,
      forks: r.forks_count || 0,
      isPinned: pinnedRepositories.some((p) => p.fullName === r.full_name),
      defaultBranch: r.default_branch || 'main',
      updatedAt: r.updated_at ? new Date(r.updated_at) : null,
      url: r.html_url
    }));

    return {
      username: userProfile.login,
      profileUrl: userProfile.html_url,
      profileSnapshot: {
        name: userProfile.name || userProfile.login,
        bio: userProfile.bio || '',
        publicRepos: userProfile.public_repos || 0,
        publicGists: userProfile.public_gists || 0,
        followers: userProfile.followers || 0,
        following: userProfile.following || 0,
        avatarUrl: userProfile.avatar_url || '',
        createdAt: userProfile.created_at ? new Date(userProfile.created_at) : null,
        updatedAt: userProfile.updated_at ? new Date(userProfile.updated_at) : null,
        hasProfileReadme,
        profileReadmeSnippet,
        pinnedRepositories,
        recentActivity: {
          publicEventsCount: Array.isArray(events) ? events.length : 0,
          commitsInWindow: recentCommitsCount,
          windowDays: 90,
          lastActiveDate
        }
      },
      repositories: formattedRepos
    };
  }
}

module.exports = new GitHubProfileService();
