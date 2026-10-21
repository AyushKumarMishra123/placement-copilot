const request = require('supertest');
const app = require('../app');
const pythonParserClient = require('../services/pythonParserClient');
require('./setup');

describe('Full End-to-End Resume Intelligence Pipeline Integration', () => {
  let userToken;

  beforeEach(async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Rohan Sharma',
      email: 'rohan.sharma@example.com',
      password: 'password123'
    });
    userToken = res.body.data.token;
  });

  it('runs complete flow: upload -> GridFS storage -> PyMuPDF parse -> benchmark checks -> score -> review', async () => {
    // Check if Python parser service is healthy before running live microservice call
    const health = await pythonParserClient.checkHealth();
    if (health.status !== 'healthy') {
      console.log('Skipping live E2E microservice assertion because ai-service is not running in this test runner.');
      return;
    }

    // A real raw PDF buffer containing sample resume text
    const sampleResumeText = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 500 >> stream
BT
/F1 12 Tf
50 720 Td
(Rohan Sharma) Tj
0 -20 Td
(rohan@example.com | 9876543210 | GitHub: https://github.com/rohansharma | LeetCode: https://leetcode.com/rohansharma) Tj
0 -30 Td
(EDUCATION) Tj
0 -15 Td
(Indian Institute of Technology - B.Tech CSE 2024 - CGPA 9.2) Tj
0 -30 Td
(PROJECTS) Tj
0 -15 Td
(AI Resume Reviewer | React, Node.js, FastAPI, MongoDB) Tj
0 -15 Td
(- Built automated resume benchmark engine serving 1000+ students.) Tj
0 -15 Td
(- Reduced latency by 50% using Redis caching and PyMuPDF.) Tj
0 -15 Td
(- GitHub: https://github.com/rohansharma/resume-reviewer) Tj
0 -30 Td
(TECHNICAL SKILLS) Tj
0 -15 Td
(Python, JavaScript, TypeScript, C++, React, Node.js, MongoDB, Docker, Git) Tj
0 -30 Td
(ACHIEVEMENTS) Tj
0 -15 Td
(Winner - Smart India Hackathon 2023 - 1st place.) Tj
ET
endstream
endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000800 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
880
%%EOF`;

    const pdfBuffer = Buffer.from(sampleResumeText);

    // 1. Upload via POST /api/resumes
    const uploadRes = await request(app)
      .post('/api/resumes')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('resume', pdfBuffer, {
        filename: 'rohan_resume.pdf',
        contentType: 'application/pdf'
      });

    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.success).toBe(true);

    const resumeId = uploadRes.body.data.resume.id;
    expect(resumeId).toBeDefined();

    // 2. Fetch single resume details via GET /api/resumes/:id
    const getRes = await request(app)
      .get(`/api/resumes/${resumeId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.resume.status).toBe('processed');
    expect(getRes.body.data.latestReview).toBeDefined();
    expect(getRes.body.data.latestReview.score).toBeGreaterThan(0);
    expect(getRes.body.data.latestReview.checks).toHaveLength(9);

    // 3. Verify benchmark review checks
    const review = getRes.body.data.latestReview;
    expect(review.checks.some((c) => c.id === 'CHECK_PAGE_COUNT' && c.status === 'pass')).toBe(true);
    expect(review.checks.some((c) => c.id === 'CHECK_PROJECT_QUALITY')).toBe(true);
    expect(review.categoryScores.structure).toBeGreaterThan(0);
    expect(review.categoryScores.projects).toBeGreaterThan(0);
  });
});
