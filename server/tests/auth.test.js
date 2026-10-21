const request = require('supertest');
const app = require('../app');
require('./setup');

describe('Authentication & Health Endpoints', () => {
  describe('GET /api/health', () => {
    it('should return health check confirmation', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Placement Copilot API is running');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe('POST /api/auth/register', () => {
    it('should register successfully with valid credentials and return JWT', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'password123'
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('jane@example.com');
      expect(res.body.data.user.role).toBe('student');
      expect(res.body.data.user.passwordHash).toBeUndefined();
      expect(res.body.data.token).toBeDefined();
    });

    it('should reject duplicate email registration', async () => {
      // Initial registration
      await request(app).post('/api/auth/register').send({
        name: 'Jane Doe',
        email: 'duplicate@example.com',
        password: 'password123'
      });

      // Attempt duplicate
      const res = await request(app).post('/api/auth/register').send({
        name: 'Jane Duplicate',
        email: 'duplicate@example.com',
        password: 'password123'
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('AUTH_EMAIL_EXISTS');
    });

    it('should reject invalid input (short password, invalid email)', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: '',
        email: 'not-an-email',
        password: '123'
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('VALIDATION_FAILED');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/register').send({
        name: 'John Smith',
        email: 'john@example.com',
        password: 'correctPassword123'
      });
    });

    it('should login successfully with valid credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'john@example.com',
        password: 'correctPassword123'
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('john@example.com');
      expect(res.body.data.token).toBeDefined();
    });

    it('should reject incorrect password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'john@example.com',
        password: 'wrongPassword!'
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('AUTH_INVALID_CREDENTIALS');
    });
  });

  describe('GET /api/auth/me (Protected Route)', () => {
    it('should reject requests with missing token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('AUTH_TOKEN_MISSING');
    });

    it('should reject requests with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.payload');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('AUTH_TOKEN_INVALID');
    });

    it('should return authenticated user details with valid token', async () => {
      const regRes = await request(app).post('/api/auth/register').send({
        name: 'Alice Wonder',
        email: 'alice@example.com',
        password: 'secretPassword456'
      });

      const token = regRes.body.data.token;

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.name).toBe('Alice Wonder');
      expect(res.body.data.user.email).toBe('alice@example.com');
      expect(res.body.data.user.passwordHash).toBeUndefined();
    });
  });
});
