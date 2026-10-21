import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 15000
});

// Request Interceptor: Attach JWT bearer token if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle global errors like token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if expired or unauthorized, except during login attempt itself
      const requestUrl = error.config?.url || '';
      if (!requestUrl.includes('/auth/login') && !requestUrl.includes('/auth/register')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (payload) => api.post('/auth/register', payload),
  login: (payload) => api.post('/auth/login', payload),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me')
};

export const profileAPI = {
  get: () => api.get('/profile'),
  update: (data) => api.put('/profile', data),
  delete: () => api.delete('/profile'),
  exportData: () => api.get('/profile/export'),
  deleteAccount: () => api.delete('/profile/account')
};

export const resumeAPI = {
  upload: (formData) =>
    api.post('/resumes', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }),
  get: () => api.get('/resumes'),
  getById: (id) => api.get(`/resumes/${id}`),
  getReview: (id) => api.get(`/resumes/${id}/review`),
  getReviewsHistory: (id) => api.get(`/resumes/${id}/reviews`),
  reReview: (id) => api.post(`/resumes/${id}/re-review`),
  delete: (id) => api.delete(`/resumes/${id}`)
};

export const githubAPI = {
  analyze: (username) => api.post('/github/analyze', { username }),
  getReviews: () => api.get('/github/reviews'),
  getReviewById: (id) => api.get(`/github/reviews/${id}`)
};

export const projectAPI = {
  getProjects: () => api.get('/projects'),
  addProject: (data) => api.post('/projects', data),
  updateProject: (id, data) => api.put(`/projects/${id}`, data),
  deleteProject: (id) => api.delete(`/projects/${id}`),
  analyzeProject: (id) => api.post(`/projects/${id}/analyze`),
  getAnalysis: (id) => api.get(`/projects/${id}/analysis`),
  getAnalysesHistory: (id) => api.get(`/projects/${id}/analyses`),
  checkLiveLink: (id) => api.post(`/projects/${id}/check-live-link`),
  getScreenshotUrl: (projectId, screenshotId) => `${API_BASE_URL}/projects/${projectId}/screenshots/${screenshotId}`
};

export const readinessAPI = {
  get: () => api.get('/readiness'),
  recalculate: () => api.post('/readiness/recalculate'),
  getHistory: () => api.get('/readiness/history'),
  getById: (id) => api.get(`/readiness/${id}`)
};

export const interviewAPI = {
  start: (data) => api.post('/interviews', data),
  getAll: () => api.get('/interviews'),
  getById: (id) => api.get(`/interviews/${id}`),
  submitAnswer: (id, data) => api.post(`/interviews/${id}/answer`, data),
  skipQuestion: (id, data) => api.post(`/interviews/${id}/skip`, data),
  complete: (id) => api.post(`/interviews/${id}/complete`),
  retryEvaluation: (id) => api.post(`/interviews/${id}/evaluate`)
};

export const jobAPI = {
  getAll: (params) => api.get('/jobs', { params }),
  search: (params) => api.get('/jobs/search', { params }),
  getRecommended: () => api.get('/jobs/recommended'),
  getById: (id) => api.get(`/jobs/${id}`),
  getSources: () => api.get('/jobs/sources/status'),
  refreshSources: () => api.post('/jobs/refresh-sources')
};

export const applicationAPI = {
  create: (data) => api.post('/applications', data),
  getAll: (params) => api.get('/applications', { params }),
  getById: (id) => api.get(`/applications/${id}`),
  update: (id, data) => api.patch(`/applications/${id}`, data),
  delete: (id) => api.delete(`/applications/${id}`)
};

export const adminJobAPI = {
  getAll: () => api.get('/admin/jobs'),
  getById: (id) => api.get(`/admin/jobs/${id}`),
  create: (data) => api.post('/admin/jobs', data),
  update: (id, data) => api.put(`/admin/jobs/${id}`, data),
  togglePublish: (id) => api.patch(`/admin/jobs/${id}/publish`),
  delete: (id) => api.delete(`/admin/jobs/${id}`),
  getApplicants: (id) => api.get(`/admin/jobs/${id}/applicants`),
  updateApplicantStatus: (jobId, applicationId, data) =>
    api.patch(`/admin/jobs/${jobId}/applicants/${applicationId}/status`, data)
};

export const codingAPI = {
  getProblems: (params) => api.get('/coding/problems', { params }),
  getById: (id) => api.get(`/coding/problems/${id}`),
  runSample: (id, data) => api.post(`/coding/problems/${id}/run`, data, { timeout: 45000 }),
  submit: (id, data) => api.post(`/coding/problems/${id}/submit`, data, { timeout: 60000 }),
  getSubmissions: () => api.get('/coding/submissions'),
  getStats: () => api.get('/coding/stats'),
  getHealth: () => api.get('/coding/health')
};

export const adminCodingAPI = {
  getProblems: (params) => api.get('/admin/coding/problems', { params }),
  getById: (id) => api.get(`/admin/coding/problems/${id}`),
  create: (data) => api.post('/admin/coding/problems', data),
  update: (id, data) => api.put(`/admin/coding/problems/${id}`, data),
  delete: (id) => api.delete(`/admin/coding/problems/${id}`),
  validate: (id) => api.post(`/admin/coding/problems/${id}/validate`),
  toggleStatus: (id, isActive) => api.patch(`/admin/coding/problems/${id}/status`, { isActive }),
  addTestCase: (id, data) => api.post(`/admin/coding/problems/${id}/testcases`, data),
  updateTestCase: (id, tcId, data) => api.put(`/admin/coding/problems/${id}/testcases/${tcId}`, data),
  deleteTestCase: (id, tcId) => api.delete(`/admin/coding/problems/${id}/testcases/${tcId}`)
};

export const linkedinAPI = {
  analyze: (payload) => api.post('/linkedin/analyze', payload),
  uploadPdf: (formData) =>
    api.post('/linkedin/upload-pdf', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }),
  getLatest: () => api.get('/linkedin/latest'),
  getHistory: () => api.get('/linkedin/history')
};

export const achievementAPI = {
  assess: (payload) => api.post('/achievements/assess', payload),
  getLatest: () => api.get('/achievements/latest'),
  getHistory: () => api.get('/achievements/history')
};

export const adminStudentAPI = {
  getOverview: () => api.get('/admin/overview'),
  getStudents: (params) => api.get('/admin/students', { params }),
  getStudentById: (studentId) => api.get(`/admin/students/${studentId}`),
  getReadiness: (studentId) => api.get(`/admin/students/${studentId}/readiness`),
  refreshReadiness: (studentId) => api.post(`/admin/students/${studentId}/refresh-readiness`),
  getResumes: (studentId) => api.get(`/admin/students/${studentId}/resumes`),
  getResumeDownloadUrl: (studentId, resumeId) => `/api/admin/students/${studentId}/resumes/${resumeId}/download`,
  getLinkedInReviews: (studentId) => api.get(`/admin/students/${studentId}/linkedin-reviews`),
  getGitHubReviews: (studentId) => api.get(`/admin/students/${studentId}/github-reviews`),
  getProjects: (studentId) => api.get(`/admin/students/${studentId}/projects`),
  getInterviews: (studentId) => api.get(`/admin/students/${studentId}/interviews`),
  getCodingAssessments: (studentId) => api.get(`/admin/students/${studentId}/coding-assessments`),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
  getReadinessOverview: () => api.get('/admin/readiness-overview'),
  getResumesOverview: () => api.get('/admin/resumes-overview'),
  getLinkedInOverview: () => api.get('/admin/linkedin-overview'),
  getProjectsOverview: () => api.get('/admin/projects-overview'),
  getInterviewsOverview: () => api.get('/admin/interviews-overview'),
  getCodingOverview: () => api.get('/admin/coding-overview')
};

export default api;


