const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const Profile = require('../models/Profile');
const Job = require('../models/Job');
const Application = require('../models/Application');
const serpApiService = require('../services/jobs/serpApiService');

describe('SerpApi Google Jobs Search & Tracker Integration Suite', () => {
  let mongoServer;
  let studentToken;
  let studentUser;
  let originalApiKey;
  let originalFetch;

  beforeAll(async () => {
    originalApiKey = process.env.SERPAPI_API_KEY;
    originalFetch = global.fetch;

    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Register test student
    const studentRes = await request(app).post('/api/auth/register').send({
      name: 'Priya Sharma',
      email: 'priya.jobs@example.com',
      password: 'Password123!',
      role: 'student'
    });
    studentToken = studentRes.body.data.token;
    studentUser = studentRes.body.data.user;

    // Create student profile
    await Profile.create({
      userId: studentUser._id || studentUser.id,
      targetRole: 'Software Engineer',
      location: 'Bengaluru',
      skills: ['React', 'Node.js', 'JavaScript', 'MongoDB', 'Python']
    });
  });

  afterAll(async () => {
    process.env.SERPAPI_API_KEY = originalApiKey;
    global.fetch = originalFetch;
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(() => {
    // Clear in-memory cache between tests
    serpApiService.cache.clear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.SERPAPI_API_KEY = originalApiKey;
  });

  describe('Service Configuration & Parameter Validation', () => {
    test('isConfigured() returns false when SERPAPI_API_KEY is empty or missing', () => {
      delete process.env.SERPAPI_API_KEY;
      expect(serpApiService.isConfigured()).toBe(false);

      process.env.SERPAPI_API_KEY = '   ';
      expect(serpApiService.isConfigured()).toBe(false);
    });

    test('searchJobs() throws SERPAPI_NOT_CONFIGURED error when key is missing', async () => {
      delete process.env.SERPAPI_API_KEY;
      await expect(serpApiService.searchJobs({ q: 'internship' })).rejects.toMatchObject({
        code: 'SERPAPI_NOT_CONFIGURED',
        status: 503
      });
    });

    test('searchJobs() formats parameters safely using URLSearchParams with engine=google_jobs', async () => {
      process.env.SERPAPI_API_KEY = 'test_secret_key_12345';

      let requestedUrl = null;
      global.fetch = jest.fn().mockImplementation((url) => {
        requestedUrl = url;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            jobs_results: [
              {
                title: 'Junior Frontend Developer',
                company_name: 'TechCorp India',
                location: 'Bengaluru, Karnataka',
                via: 'via LinkedIn',
                description: 'Looking for a React developer with Node.js and MongoDB skills.',
                thumbnail: 'https://example.com/logo.png',
                job_id: 'job_test_001',
                share_link: 'https://google.com/jobs/001',
                apply_options: [
                  { title: 'Apply on Company Site', link: 'https://techcorp.com/careers/001' }
                ],
                detected_extensions: {
                  posted_at: '2 days ago',
                  schedule_type: 'Full-time',
                  work_from_home: false
                }
              }
            ],
            serpapi_pagination: {
              next_page_token: 'token_page_2_xyz'
            }
          })
        });
      });

      const result = await serpApiService.searchJobs({
        q: 'frontend developer',
        location: 'Bengaluru',
        gl: 'in',
        hl: 'en'
      });

      expect(requestedUrl).toBeDefined();
      const parsedUrl = new URL(requestedUrl);
      expect(parsedUrl.searchParams.get('engine')).toBe('google_jobs');
      expect(parsedUrl.searchParams.get('q')).toBe('frontend developer');
      expect(parsedUrl.searchParams.get('location')).toBe('Bengaluru');
      expect(parsedUrl.searchParams.get('gl')).toBe('in');
      expect(parsedUrl.searchParams.get('hl')).toBe('en');
      expect(parsedUrl.searchParams.get('api_key')).toBe('test_secret_key_12345');

      // Verify normalized output
      expect(result.jobs).toHaveLength(1);
      const job = result.jobs[0];
      expect(job.title).toBe('Junior Frontend Developer');
      expect(job.company).toBe('TechCorp India');
      expect(job.via).toBe('via LinkedIn');
      expect(job.applyUrl).toBe('https://techcorp.com/careers/001');
      expect(job.externalId).toBe('job_test_001');
      expect(job.thumbnail).toBe('https://example.com/logo.png');
      expect(job.workplaceType).toBe('on-site');
      expect(job.employmentType).toBe('full-time');
      expect(job.requiredSkills).toContain('React');
      expect(job.requiredSkills).toContain('Node.js');
      expect(result.nextPageToken).toBe('token_page_2_xyz');
    });
  });

  describe('URL Protocol Validation and Security', () => {
    test('rejects unsafe URL protocols (javascript:, data:) and falls back to share_link', () => {
      process.env.SERPAPI_API_KEY = 'test_key';

      const jobWithUnsafeApply = {
        title: 'Security Analyst',
        company_name: 'SecCorp',
        apply_options: [{ title: 'Unsafe Link', link: 'javascript:alert(1)' }],
        related_links: [{ link: 'data:text/html;base64,PHNjcmlwdD4=' }],
        share_link: 'https://google.com/jobs/safe_share'
      };

      const resolved = serpApiService.resolveApplyUrl(jobWithUnsafeApply);
      expect(resolved).toBe('https://google.com/jobs/safe_share');
    });

    test('returns empty string if no valid http/https application links exist', () => {
      const jobNoLinks = {
        title: 'Tester',
        company_name: 'TestCorp',
        apply_options: [{ title: 'Broken', link: 'ftp://files.example.com' }]
      };
      const resolved = serpApiService.resolveApplyUrl(jobNoLinks);
      expect(resolved).toBe('');
    });
  });

  describe('Pagination & In-Memory Caching', () => {
    test('subsequent identical query uses in-memory cache without hitting network', async () => {
      process.env.SERPAPI_API_KEY = 'test_key';
      let fetchCount = 0;

      global.fetch = jest.fn().mockImplementation(() => {
        fetchCount++;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            jobs_results: [{ title: 'Cached Dev', company_name: 'CacheCorp', job_id: 'cache_1' }]
          })
        });
      });

      const firstCall = await serpApiService.searchJobs({ q: 'react developer', location: 'Remote' });
      expect(firstCall.cached).toBe(false);
      expect(fetchCount).toBe(1);

      const secondCall = await serpApiService.searchJobs({ q: 'react developer', location: 'Remote' });
      expect(secondCall.cached).toBe(true);
      expect(fetchCount).toBe(1); // fetch was not called again
    });

    test('nextPageToken forwards pagination token in request', async () => {
      process.env.SERPAPI_API_KEY = 'test_key';
      let capturedUrl = null;

      global.fetch = jest.fn().mockImplementation((url) => {
        capturedUrl = url;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ jobs_results: [] })
        });
      });

      await serpApiService.searchJobs({
        q: 'software',
        nextPageToken: 'page_token_token_abc_123'
      });

      const parsed = new URL(capturedUrl);
      expect(parsed.searchParams.get('next_page_token')).toBe('page_token_token_abc_123');
    });
  });

  describe('Provider Error Handling', () => {
    test('handles 401/403 authentication failures with clear error', async () => {
      process.env.SERPAPI_API_KEY = 'invalid_key';

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Invalid API key.' })
      });

      await expect(serpApiService.searchJobs({ q: 'python' })).rejects.toMatchObject({
        code: 'INVALID_API_KEY',
        status: 401
      });
    });

    test('handles 429 quota exhaustion gracefully', async () => {
      process.env.SERPAPI_API_KEY = 'test_key';

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ error: 'Your searches have run out.' })
      });

      await expect(serpApiService.searchJobs({ q: 'python' })).rejects.toMatchObject({
        code: 'RATE_LIMIT_EXCEEDED',
        status: 429
      });
    });

    test('handles request timeout cleanly', async () => {
      process.env.SERPAPI_API_KEY = 'test_key';

      global.fetch = jest.fn().mockImplementation(() => {
        const timeoutError = new Error('The operation was aborted');
        timeoutError.name = 'TimeoutError';
        return Promise.reject(timeoutError);
      });

      await expect(serpApiService.searchJobs({ q: 'python' })).rejects.toMatchObject({
        code: 'PROVIDER_TIMEOUT',
        status: 504
      });
    });

    test('handles empty results without fabricating listings', async () => {
      process.env.SERPAPI_API_KEY = 'test_key';

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ jobs_results: [] })
      });

      const result = await serpApiService.searchJobs({ q: 'nonexistent role xyz99' });
      expect(result.jobs).toEqual([]);
      expect(result.nextPageToken).toBeNull();
    });
  });

  describe('API Endpoint Integration (GET /api/jobs/search)', () => {
    test('requires student authentication', async () => {
      const res = await request(app).get('/api/jobs/search?q=developer');
      expect(res.status).toBe(401);
    });

    test('returns live search results with deterministic match scoring against student profile', async () => {
      process.env.SERPAPI_API_KEY = 'test_key';

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          jobs_results: [
            {
              title: 'Software Engineer - Full Stack',
              company_name: 'Nexus Cloud',
              location: 'Bengaluru',
              via: 'via Google',
              description: 'We require React, Node.js, and MongoDB for our full-stack engineering team.',
              job_id: 'serp_job_101',
              share_link: 'https://google.com/jobs/101',
              apply_options: [{ title: 'Apply on Nexus', link: 'https://nexus.com/jobs/101' }]
            }
          ]
        })
      });

      const res = await request(app)
        .get('/api/jobs/search?q=Software%20Engineer&location=Bengaluru')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.jobs).toHaveLength(1);

      const job = res.body.data.jobs[0];
      expect(job.title).toBe('Software Engineer - Full Stack');
      expect(job.matchScore).toBeGreaterThanOrEqual(60); // High match due to React, Node.js, MongoDB + Software Engineer role
      expect(job.matchingReasons.length).toBeGreaterThan(0);
      expect(job.externalId).toBe('serp_job_101');
      expect(job.applyUrl).toBe('https://nexus.com/jobs/101');
    });

    test('saving SerpApi job creates persistent Job & Application record without auto-applying', async () => {
      const savePayload = {
        jobId: 'serp_external_job_777',
        status: 'Saved',
        notes: 'Targeting for next week',
        jobData: {
          title: 'Frontend Intern',
          company: 'InnovateX',
          location: 'Bengaluru',
          description: 'Frontend internship focusing on React and modern CSS.',
          applyUrl: 'https://innovatex.io/apply/777',
          workplaceType: 'remote',
          employmentType: 'internship',
          requiredSkills: ['React', 'JavaScript'],
          externalId: 'serp_external_job_777'
        }
      };

      const saveRes = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(savePayload);

      expect([200, 201]).toContain(saveRes.status);
      expect(saveRes.body.success).toBe(true);
      expect(saveRes.body.data.application.status).toBe('Saved');

      // Verify Job was created in DB with sourceType serpapi
      const savedJobInDb = await Job.findOne({ externalId: 'serp_external_job_777' });
      expect(savedJobInDb).not.toBeNull();
      expect(savedJobInDb.sourceType).toBe('serpapi');
      expect(savedJobInDb.company).toBe('InnovateX');

      // Now verify explicitly confirming application updates tracker to Applied
      const applyRes = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          jobId: 'serp_external_job_777',
          status: 'Applied',
          notes: 'Completed interview task and submitted'
        });

      expect(applyRes.status).toBe(200);
      expect(applyRes.body.data.application.status).toBe('Applied');

      // Verify in Application collection
      const appRecord = await Application.findOne({
        userId: studentUser._id || studentUser.id,
        jobId: savedJobInDb._id
      });
      expect(appRecord.status).toBe('Applied');
      expect(appRecord.appliedAt).toBeDefined();
    });
  });
});
