/**
 * Resilient GitHub REST API Client
 */

class GitHubClientError extends Error {
  constructor(message, code, status = 500, details = null) {
    super(message);
    this.name = 'GitHubClientError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

class GitHubClient {
  constructor() {
    this.baseUrl = 'https://api.github.com';
    this.timeoutMs = 10000;
    this.cache = new Map(); // Simple in-memory cache: url -> { data, expiresAt }
    this.cacheTtlMs = 5 * 60 * 1000; // 5 minutes
  }

  getHeaders() {
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'PlacementCopilot-Agent/1.0'
    };

    const token = process.env.GITHUB_TOKEN;
    if (token && token.trim()) {
      headers['Authorization'] = `Bearer ${token.trim()}`;
    }

    return headers;
  }

  async get(endpoint, { useCache = true, timeoutMs = this.timeoutMs } = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    if (useCache && this.cache.has(url)) {
      const cached = this.cache.get(url);
      if (Date.now() < cached.expiresAt) {
        return cached.data;
      }
      this.cache.delete(url);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Handle Rate Limiting
      const remaining = response.headers.get('x-ratelimit-remaining');
      const resetTimeEpoch = response.headers.get('x-ratelimit-reset');

      if (response.status === 403 && remaining === '0') {
        const resetDate = resetTimeEpoch ? new Date(parseInt(resetTimeEpoch, 10) * 1000).toLocaleTimeString() : 'soon';
        throw new GitHubClientError(
          `GitHub API rate limit exceeded. Capacity will reset at ${resetDate}. Please configure a GITHUB_TOKEN on the server or try again later.`,
          'GITHUB_RATE_LIMITED',
          429,
          { resetTime: resetTimeEpoch }
        );
      }

      if (response.status === 404) {
        throw new GitHubClientError(
          'GitHub profile or repository not found, or it is private.',
          'GITHUB_NOT_FOUND',
          404
        );
      }

      if (!response.ok) {
        let errBody = '';
        try {
          const json = await response.json();
          errBody = json.message || '';
        } catch (_) {
          errBody = response.statusText;
        }

        throw new GitHubClientError(
          `GitHub API returned error (${response.status}): ${errBody}`,
          'GITHUB_API_ERROR',
          response.status
        );
      }

      const data = await response.json();

      if (useCache) {
        this.cache.set(url, {
          data,
          expiresAt: Date.now() + this.cacheTtlMs
        });
      }

      return data;
    } catch (err) {
      clearTimeout(timeoutId);

      if (err.name === 'AbortError') {
        throw new GitHubClientError(
          'GitHub request timed out after 10 seconds.',
          'GITHUB_TIMEOUT',
          504
        );
      }

      if (err instanceof GitHubClientError) {
        throw err;
      }

      throw new GitHubClientError(
        `Failed to communicate with GitHub API: ${err.message}`,
        'GITHUB_NETWORK_ERROR',
        502
      );
    }
  }

  clearCache() {
    this.cache.clear();
  }
}

module.exports = {
  GitHubClient,
  GitHubClientError,
  githubClient: new GitHubClient()
};
