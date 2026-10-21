const jobNormalizationService = require('./jobNormalizationService');

class SerpApiService {
  constructor() {
    this.baseUrl = 'https://serpapi.com/search.json';
    // In-memory query cache with 15-minute TTL to preserve SerpApi credits
    this.cache = new Map();
    this.cacheTTL = 15 * 60 * 1000; // 15 minutes
  }

  /**
   * Check if SerpApi is configured
   * @returns {boolean}
   */
  isConfigured() {
    const key = process.env.SERPAPI_API_KEY;
    return Boolean(key && key.trim().length > 0);
  }

  /**
   * Helper to validate that a URL has a safe http/https protocol
   * @param {string} urlString
   * @returns {boolean}
   */
  isValidHttpUrl(urlString) {
    if (!urlString || typeof urlString !== 'string') return false;
    try {
      const parsed = new URL(urlString.trim());
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (_) {
      return false;
    }
  }

  /**
   * Safely determine destination application URL
   * Priority:
   * 1. apply_options[0].link (if valid HTTP/HTTPS)
   * 2. related_links[0].link (if valid HTTP/HTTPS)
   * 3. share_link (if valid HTTP/HTTPS)
   * 4. empty string
   */
  resolveApplyUrl(jobData = {}) {
    if (Array.isArray(jobData.apply_options)) {
      for (const opt of jobData.apply_options) {
        if (opt && opt.link && this.isValidHttpUrl(opt.link)) {
          return opt.link.trim();
        }
      }
    }

    if (Array.isArray(jobData.related_links)) {
      for (const rel of jobData.related_links) {
        if (rel && rel.link && this.isValidHttpUrl(rel.link)) {
          return rel.link.trim();
        }
      }
    }

    if (jobData.share_link && this.isValidHttpUrl(jobData.share_link)) {
      return jobData.share_link.trim();
    }

    return '';
  }

  /**
   * Normalize raw SerpApi job record
   * @param {Object} raw
   * @returns {Object}
   */
  normalizeJob(raw = {}) {
    const title = (raw.title || 'Untitled Position').trim();
    const company = (raw.company_name || 'Unknown Company').trim();
    const location = (raw.location || 'Bengaluru, Karnataka, India').trim();
    const description = jobNormalizationService.cleanDescription(raw.description || '');
    const via = (raw.via || '').trim();
    const thumbnail = this.isValidHttpUrl(raw.thumbnail) ? raw.thumbnail.trim() : '';
    const shareLink = this.isValidHttpUrl(raw.share_link) ? raw.share_link.trim() : '';
    const jobId = raw.job_id || `${company.toLowerCase()}-${title.toLowerCase()}`.replace(/[^a-z0-9]/g, '-');

    const applyUrl = this.resolveApplyUrl(raw);

    // Apply options array normalized
    const applyOptions = Array.isArray(raw.apply_options)
      ? raw.apply_options
          .filter((opt) => opt && opt.link && this.isValidHttpUrl(opt.link))
          .map((opt) => ({
            title: opt.title || 'Apply on Company Site',
            link: opt.link.trim()
          }))
      : [];

    const detected = raw.detected_extensions || {};
    const isWorkFromHome = Boolean(detected.work_from_home);

    // Workplace type detection
    let workplaceType = 'on-site';
    if (isWorkFromHome) {
      workplaceType = 'remote';
    } else {
      workplaceType = jobNormalizationService.detectWorkplaceType(location, description);
    }

    // Employment type detection
    let employmentType = 'full-time';
    if (detected.schedule_type) {
      const scheduleLower = detected.schedule_type.toLowerCase();
      if (scheduleLower.includes('intern')) employmentType = 'internship';
      else if (scheduleLower.includes('contract')) employmentType = 'contract';
      else if (scheduleLower.includes('part-time') || scheduleLower.includes('part time')) employmentType = 'part-time';
      else if (scheduleLower.includes('full-time') || scheduleLower.includes('full time')) employmentType = 'full-time';
      else employmentType = jobNormalizationService.detectEmploymentType(title, description);
    } else {
      employmentType = jobNormalizationService.detectEmploymentType(title, description);
    }

    // Extract skills deterministically
    const extractedSkills = jobNormalizationService.extractSkills(`${title} ${description}`);

    return {
      externalId: jobId,
      title,
      company,
      location,
      via,
      description,
      thumbnail,
      shareLink,
      applyUrl,
      applyOptions,
      workplaceType,
      employmentType,
      experienceLevel: employmentType === 'internship' ? 'internship' : 'entry',
      requiredSkills: extractedSkills.slice(0, 10),
      preferredSkills: extractedSkills.slice(10, 15),
      sourceType: 'serpapi',
      sourceName: via ? `Google Jobs (${via})` : 'Google Jobs (SerpApi)',
      postedAtText: detected.posted_at || (Array.isArray(raw.extensions) ? raw.extensions[0] : null) || 'Recently posted',
      extensions: Array.isArray(raw.extensions) ? raw.extensions : []
    };
  }

  /**
   * Search Google Jobs via SerpApi
   * @param {Object} options
   * @param {string} options.q
   * @param {string} [options.location]
   * @param {string} [options.gl]
   * @param {string} [options.hl]
   * @param {string} [options.nextPageToken]
   * @param {string} [options.employmentType]
   * @param {string} [options.workMode]
   * @returns {Promise<{ jobs: Array, nextPageToken: string|null, cached: boolean, totalFetched: number }>}
   */
  async searchJobs(options = {}) {
    const apiKey = process.env.SERPAPI_API_KEY;

    if (!apiKey || !apiKey.trim()) {
      const err = new Error(
        'SerpApi API key is not configured on the server. Please add SERPAPI_API_KEY to your server/.env file to enable live Google Jobs search.'
      );
      err.code = 'SERPAPI_NOT_CONFIGURED';
      err.status = 503;
      throw err;
    }

    const q = (options.q || 'software engineer internship').trim();
    const location = (
      options.location ||
      process.env.JOBS_DEFAULT_LOCATION ||
      'Bengaluru, Karnataka, India'
    ).trim();
    const gl = (options.gl || process.env.JOBS_DEFAULT_COUNTRY || 'in').trim().toLowerCase();
    const hl = (options.hl || process.env.JOBS_DEFAULT_LANGUAGE || 'en').trim().toLowerCase();
    const nextPageToken = options.nextPageToken ? options.nextPageToken.trim() : null;

    // Cache key construction
    const cacheKey = JSON.stringify({
      q: q.toLowerCase(),
      loc: location.toLowerCase(),
      gl,
      hl,
      nextPageToken,
      emp: options.employmentType || '',
      wm: options.workMode || ''
    });

    const cachedEntry = this.cache.get(cacheKey);
    if (cachedEntry && Date.now() - cachedEntry.timestamp < this.cacheTTL) {
      return { ...cachedEntry.data, cached: true };
    }

    // Build URL query safely using URLSearchParams
    const params = new URLSearchParams();
    params.set('engine', 'google_jobs');
    params.set('q', q);
    params.set('api_key', apiKey.trim());
    if (location) params.set('location', location);
    if (gl) params.set('gl', gl);
    if (hl) params.set('hl', hl);
    if (nextPageToken) params.set('next_page_token', nextPageToken);

    const targetUrl = `${this.baseUrl}?${params.toString()}`;

    let response;
    try {
      response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json'
        },
        signal: AbortSignal.timeout(10000) // 10 second bounded timeout
      });
    } catch (networkErr) {
      if (networkErr.name === 'TimeoutError' || networkErr.name === 'AbortError') {
        const err = new Error('SerpApi Google Jobs request timed out. Please try your search again.');
        err.code = 'PROVIDER_TIMEOUT';
        err.status = 504;
        throw err;
      }
      const err = new Error(`Network failure connecting to SerpApi: ${networkErr.message}`);
      err.code = 'PROVIDER_NETWORK_ERROR';
      err.status = 502;
      throw err;
    }

    // Check HTTP status
    if (!response.ok) {
      let errorBody = {};
      try {
        errorBody = await response.json();
      } catch (_) {}

      const providerMessage = errorBody.error || `HTTP ${response.status} from SerpApi`;

      if (response.status === 401 || response.status === 403) {
        const err = new Error(
          'SerpApi authentication failed. Please verify that your SERPAPI_API_KEY is active and valid.'
        );
        err.code = 'INVALID_API_KEY';
        err.status = 401;
        throw err;
      }

      if (response.status === 429) {
        const err = new Error(
          'SerpApi search quota exceeded or rate limit reached. Please check your SerpApi plan or wait before retrying.'
        );
        err.code = 'RATE_LIMIT_EXCEEDED';
        err.status = 429;
        throw err;
      }

      const err = new Error(`SerpApi service error: ${providerMessage}`);
      err.code = 'PROVIDER_ERROR';
      err.status = response.status >= 500 ? 502 : response.status;
      throw err;
    }

    let data;
    try {
      data = await response.json();
    } catch (parseErr) {
      const err = new Error('Failed to parse response from SerpApi Google Jobs.');
      err.code = 'MALFORMED_RESPONSE';
      err.status = 502;
      throw err;
    }

    // Handle provider error inside JSON payload
    if (data.error) {
      const isQuota =
        data.error.toLowerCase().includes('run out of searches') ||
        data.error.toLowerCase().includes('quota');
      const err = new Error(data.error);
      err.code = isQuota ? 'RATE_LIMIT_EXCEEDED' : 'PROVIDER_ERROR';
      err.status = isQuota ? 429 : 502;
      throw err;
    }

    const rawResults = Array.isArray(data.jobs_results) ? data.jobs_results : [];
    const nextToken = data.serpapi_pagination?.next_page_token || null;

    // Normalize results
    const normalizedList = rawResults.map((r) => this.normalizeJob(r));

    // Deduplicate within the result batch by externalId
    const seenIds = new Set();
    let deduplicated = [];
    for (const job of normalizedList) {
      if (!seenIds.has(job.externalId)) {
        seenIds.add(job.externalId);
        deduplicated.push(job);
      }
    }

    // Apply optional client-side filters if requested
    if (options.employmentType) {
      const filterEmp = options.employmentType.toLowerCase();
      deduplicated = deduplicated.filter((j) => j.employmentType === filterEmp);
    }

    if (options.workMode) {
      const filterMode = options.workMode.toLowerCase();
      deduplicated = deduplicated.filter((j) => j.workplaceType === filterMode);
    }

    const result = {
      jobs: deduplicated,
      nextPageToken: nextToken,
      cached: false,
      totalFetched: rawResults.length
    };

    // Store in cache
    this.cache.set(cacheKey, {
      timestamp: Date.now(),
      data: result
    });

    // Prune stale cache entries if cache grows
    if (this.cache.size > 200) {
      const now = Date.now();
      for (const [k, v] of this.cache.entries()) {
        if (now - v.timestamp > this.cacheTTL) {
          this.cache.delete(k);
        }
      }
    }

    return result;
  }
}

module.exports = new SerpApiService();
