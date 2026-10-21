const request = require('supertest');
const fs = require('fs');
const app = require('../app');
require('./setup');

describe('Resume Upload Endpoints (/api/resumes)', () => {
  let userToken;

  beforeEach(async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Resume Candidate',
      email: 'candidate@example.com',
      password: 'password123'
    });
    userToken = res.body.data.token;
  });

  it('should accept a valid PDF file and record metadata', async () => {
    const pdfBuffer = Buffer.from('%PDF-1.4 sample pdf content for testing purposes');

    const res = await request(app)
      .post('/api/resumes')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('resume', pdfBuffer, {
        filename: 'my_resume.pdf',
        contentType: 'application/pdf'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.resume.originalFilename).toBe('my_resume.pdf');
    expect(res.body.data.resume.mimeType).toBe('application/pdf');
    expect(res.body.data.resume.documentId).toBeDefined();
  });

  it('should accept a valid DOCX file', async () => {
    const docxBuffer = Buffer.from('PK sample docx file buffer content');

    const res = await request(app)
      .post('/api/resumes')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('resume', docxBuffer, {
        filename: 'cv_document.docx',
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.resume.originalFilename).toBe('cv_document.docx');
  });

  it('should reject unsupported file types (e.g. .txt, .exe, image)', async () => {
    const textBuffer = Buffer.from('plain text file');

    const res = await request(app)
      .post('/api/resumes')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('resume', textBuffer, {
        filename: 'script.txt',
        contentType: 'text/plain'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('INVALID_FILE_TYPE');
  });

  it('should reject an oversized file exceeding 5MB limit', async () => {
    // Generate a buffer larger than 5MB (5.2MB)
    const largeBuffer = Buffer.alloc(5.2 * 1024 * 1024, 'a');

    const res = await request(app)
      .post('/api/resumes')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('resume', largeBuffer, {
        filename: 'large_resume.pdf',
        contentType: 'application/pdf'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('FILE_TOO_LARGE');
  });
});
