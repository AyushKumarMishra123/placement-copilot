const request = require('supertest');
const app = require('../app');
require('./setup');

describe('Profile Endpoints (/api/profile)', () => {
  let user1Token;
  let user2Token;

  beforeEach(async () => {
    // Register user 1
    const res1 = await request(app).post('/api/auth/register').send({
      name: 'User One',
      email: 'user1@example.com',
      password: 'password123'
    });
    user1Token = res1.body.data.token;

    // Register user 2
    const res2 = await request(app).post('/api/auth/register').send({
      name: 'User Two',
      email: 'user2@example.com',
      password: 'password123'
    });
    user2Token = res2.body.data.token;
  });

  it('should allow authenticated user to read profile', async () => {
    const res = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.profile).toBeDefined();
  });

  it('should allow authenticated user to update and persist profile with projects', async () => {
    const profilePayload = {
      targetRole: 'Full Stack Engineer',
      location: 'Bangalore, India',
      skills: ['JavaScript', 'Node.js', 'React', 'MongoDB'],
      education: 'B.Tech in Computer Science',
      github: 'https://github.com/userone',
      linkedin: 'https://linkedin.com/in/userone',
      leetcode: 'https://leetcode.com/userone',
      achievements: ['Hackathon Finalist 2025'],
      projects: [
        {
          name: 'Placement Copilot',
          description: 'AI platform for students preparing for placements',
          techStack: ['Node.js', 'Express', 'React', 'MongoDB'],
          githubUrl: 'https://github.com/userone/copilot',
          liveUrl: 'https://copilot.example.com'
        }
      ]
    };

    const putRes = await request(app)
      .put('/api/profile')
      .set('Authorization', `Bearer ${user1Token}`)
      .send(profilePayload);

    expect(putRes.status).toBe(200);
    expect(putRes.body.success).toBe(true);
    expect(putRes.body.data.profile.targetRole).toBe('Full Stack Engineer');
    expect(putRes.body.data.profile.skills).toEqual(
      expect.arrayContaining(['JavaScript', 'Node.js', 'React', 'MongoDB'])
    );
    expect(putRes.body.data.profile.projects.length).toBe(1);
    expect(putRes.body.data.profile.projects[0].name).toBe('Placement Copilot');

    // Re-fetch to ensure database persistence
    const getRes = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.profile.targetRole).toBe('Full Stack Engineer');
    expect(getRes.body.data.profile.location).toBe('Bangalore, India');
  });

  it('ensures user cannot access or mutate another user profile (isolated per token)', async () => {
    // User 1 updates their profile
    await request(app)
      .put('/api/profile')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        targetRole: 'Frontend Developer',
        skills: ['React', 'CSS']
      });

    // User 2 reads their own profile, which must NOT contain user 1's data
    const user2Res = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${user2Token}`);

    expect(user2Res.status).toBe(200);
    expect(user2Res.body.data.profile.targetRole).not.toBe('Frontend Developer');
  });

  it('should allow user to permanently delete their profile data', async () => {
    // Create profile
    await request(app)
      .put('/api/profile')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        targetRole: 'Data Scientist',
        skills: ['Python', 'SQL']
      });

    // Delete profile
    const delRes = await request(app)
      .delete('/api/profile')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);

    // Reading profile should now indicate empty/new
    const getRes = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.isNew).toBe(true);
    expect(getRes.body.data.profile.targetRole).toBe('');
  });
});
