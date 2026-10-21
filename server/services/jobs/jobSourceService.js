const Job = require('../../models/Job');
const jobNormalizationService = require('./jobNormalizationService');
const jobDeduplicationService = require('./jobDeduplicationService');

class JobSourceService {
  constructor() {
    this.sources = [
      {
        id: 'greenhouse',
        name: 'Greenhouse Public Job Boards',
        type: 'greenhouse',
        enabled: process.env.JOB_SOURCE_GREENHOUSE_ENABLED !== 'false',
        boards: (process.env.GREENHOUSE_BOARDS || 'canonical,cloudflare').split(',').map((s) => s.trim()).filter(Boolean),
        lastRefresh: null,
        lastError: null,
        jobsFetched: 0
      },
      {
        id: 'lever',
        name: 'Lever Public Postings API',
        type: 'lever',
        enabled: process.env.JOB_SOURCE_LEVER_ENABLED !== 'false',
        companies: (process.env.LEVER_COMPANIES || 'postman,automattic').split(',').map((s) => s.trim()).filter(Boolean),
        lastRefresh: null,
        lastError: null,
        jobsFetched: 0
      },
      {
        id: 'admin',
        name: 'Campus / MSOT Admin Postings',
        type: 'admin',
        enabled: true,
        lastRefresh: new Date(),
        lastError: null,
        jobsFetched: 0
      }
    ];
  }

  /**
   * Helper to perform fetch with timeout
   */
  async fetchWithTimeout(url, timeoutMs = 8000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: controller.signal
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      return await res.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Get all registered source statuses
   */
  getSourceRegistry() {
    return this.sources.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      enabled: s.enabled,
      lastRefresh: s.lastRefresh,
      lastError: s.lastError,
      jobsFetched: s.jobsFetched
    }));
  }

  /**
   * Ingest jobs from Greenhouse public board API
   */
  async ingestFromGreenhouse(boardToken) {
    const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs?content=true`;
    const data = await this.fetchWithTimeout(url, 8000);
    const rawJobs = data?.jobs || [];
    const ingested = [];

    for (const raw of rawJobs) {
      const cleanDesc = jobNormalizationService.cleanDescription(raw.content || '');
      const skills = jobNormalizationService.extractSkills(`${raw.title} ${cleanDesc}`);
      const workplaceType = jobNormalizationService.detectWorkplaceType(raw.location?.name, cleanDesc);
      const employmentType = jobNormalizationService.detectEmploymentType(raw.title, cleanDesc);

      const jobData = {
        title: raw.title,
        company: boardToken.charAt(0).toUpperCase() + boardToken.slice(1),
        description: cleanDesc.slice(0, 5000),
        location: raw.location?.name || 'Remote',
        workplaceType,
        employmentType,
        requiredSkills: skills.slice(0, 8),
        applyUrl: raw.absolute_url,
        sourceType: 'greenhouse',
        sourceName: `Greenhouse (${boardToken})`,
        externalId: String(raw.id),
        sourceUrl: raw.absolute_url,
        publishedAt: raw.updated_at ? new Date(raw.updated_at) : new Date(),
        lastVerifiedAt: new Date(),
        isActive: true
      };

      const existing = await jobDeduplicationService.findDuplicate(jobData);
      if (!existing) {
        const created = await Job.create(jobData);
        ingested.push(created);
      } else {
        existing.lastVerifiedAt = new Date();
        await existing.save();
        ingested.push(existing);
      }
    }

    return ingested;
  }

  /**
   * Ingest jobs from Lever public postings API
   */
  async ingestFromLever(companyName) {
    const url = `https://api.lever.co/v0/postings/${encodeURIComponent(companyName)}?mode=json`;
    const data = await this.fetchWithTimeout(url, 8000);
    const rawJobs = Array.isArray(data) ? data : [];
    const ingested = [];

    for (const raw of rawJobs) {
      const cleanDesc = jobNormalizationService.cleanDescription(raw.descriptionPlain || raw.description || '');
      const skills = jobNormalizationService.extractSkills(`${raw.text} ${cleanDesc}`);
      const location = raw.categories?.location || 'Remote';
      const workplaceType = jobNormalizationService.detectWorkplaceType(location, cleanDesc);
      const employmentType = jobNormalizationService.detectEmploymentType(raw.text, cleanDesc);

      const jobData = {
        title: raw.text,
        company: companyName.charAt(0).toUpperCase() + companyName.slice(1),
        description: cleanDesc.slice(0, 5000),
        location,
        workplaceType,
        employmentType,
        requiredSkills: skills.slice(0, 8),
        applyUrl: raw.applyUrl || raw.hostedUrl,
        sourceType: 'lever',
        sourceName: `Lever (${companyName})`,
        externalId: String(raw.id),
        sourceUrl: raw.hostedUrl,
        publishedAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
        lastVerifiedAt: new Date(),
        isActive: true
      };

      const existing = await jobDeduplicationService.findDuplicate(jobData);
      if (!existing) {
        const created = await Job.create(jobData);
        ingested.push(created);
      } else {
        existing.lastVerifiedAt = new Date();
        await existing.save();
        ingested.push(existing);
      }
    }

    return ingested;
  }

  /**
   * Refresh all configured job sources safely
   */
  async refreshSources() {
    const results = {
      totalIngested: 0,
      errors: []
    };

    // 1. Greenhouse sources
    const ghSource = this.sources.find((s) => s.id === 'greenhouse');
    if (ghSource && ghSource.enabled) {
      for (const board of ghSource.boards) {
        try {
          const jobs = await this.ingestFromGreenhouse(board);
          ghSource.jobsFetched += jobs.length;
          ghSource.lastRefresh = new Date();
          results.totalIngested += jobs.length;
        } catch (err) {
          const errMsg = `Greenhouse (${board}): ${err.message}`;
          console.warn(`[JobSourceService] ${errMsg}`);
          ghSource.lastError = errMsg;
          results.errors.push(errMsg);
        }
      }
    }

    // 2. Lever sources
    const leverSource = this.sources.find((s) => s.id === 'lever');
    if (leverSource && leverSource.enabled) {
      for (const comp of leverSource.companies) {
        try {
          const jobs = await this.ingestFromLever(comp);
          leverSource.jobsFetched += jobs.length;
          leverSource.lastRefresh = new Date();
          results.totalIngested += jobs.length;
        } catch (err) {
          const errMsg = `Lever (${comp}): ${err.message}`;
          console.warn(`[JobSourceService] ${errMsg}`);
          leverSource.lastError = errMsg;
          results.errors.push(errMsg);
        }
      }
    }

    return results;
  }
}

module.exports = new JobSourceService();
