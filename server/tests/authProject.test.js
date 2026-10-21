const request = require('supertest');
const app = require('../app');
const Profile = require('../models/Profile');
const ProjectAnalysis = require('../models/ProjectAnalysis');
require('./setup');

describe('Project Authorization & Multi-Tenant Isolation Tests', () => {
  let user1Token;
  let user2Token;
  let user1Id;
  let user2Id;

  beforeEach(async () => {
    const res1 = await request(app).post('/api/auth/register').send({
      name: 'Alice Developer',
      email: 'alice@example.com',
      password: 'password123'
    });
    user1Token = res1.body.data.token;
    user1Id = res1.body.data.user._id || res1.body.data.user.id;

    const res2 = await request(app).post('/api/auth/register').send({
      name: 'Bob Attacker',
      email: 'bob@example.com',
      password: 'password123'
    });
    user2Token = res2.body.data.token;
    user2Id = res2.body.data.user._id || res2.body.data.user.id;
  });

  test('rejects unauthenticated requests to project endpoints', async () => {
    const res = await request(app).get('/api/projects');
    expect(res.status).toBe(401);
  });

  test('allows authenticated user to create a project in their profile', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        name: 'Portfolio Website',
        description: 'Personal portfolio built with React and Node',
        techStack: ['React', 'Node.js', 'Express'],
        githubUrl: 'https://github.com/alice/portfolio',
        liveUrl: 'https://alice-portfolio.example.com'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.project.name).toBe('Portfolio Website');
    expect(res.body.data.project._id).toBeDefined();
  });

  test('prevents User 2 from updating User 1 project', async () => {
    // Alice creates project
    const createRes = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        name: 'Alice Secret Project',
        description: 'Top secret code',
        techStack: ['Python'],
        githubUrl: 'https://github.com/alice/secret'
      });
    const projectId = createRes.body.data.project._id;

    // Bob tries to update Alice's project
    const updateRes = await request(app)
      .put(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${user2Token}`)
      .send({
        name: 'Hacked by Bob'
      });

    expect(updateRes.status).toBe(404);
  });

  test('prevents User 2 from deleting User 1 project', async () => {
    const createRes = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        name: 'Alice Stable Project'
      });
    const projectId = createRes.body.data.project._id;

    // Bob tries to delete it
    const deleteRes = await request(app)
      .delete(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${user2Token}`);

    expect(deleteRes.status).toBe(404);
  });

  test('prevents User 2 from accessing User 1 project analysis records', async () => {
    // Create project in Alice profile
    const profile = await Profile.findOneAndUpdate(
      { userId: user1Id },
      {
        $push: {
          projects: {
            name: 'Alice Project',
            githubUrl: 'https://github.com/alice/project'
          }
        }
      },
      { new: true, upsert: true }
    );
    const projectId = profile.projects[0]._id;

    // Create an analysis record owned by Alice
    const analysis = await ProjectAnalysis.create({
      userId: user1Id,
      projectId,
      projectName: 'Alice Project',
      repositoryUrl: 'https://github.com/alice/project',
      repositorySnapshot: {
        owner: 'alice',
        repo: 'project',
        defaultBranch: 'main'
      },
      scores: {
        overallProjectScore: 85,
        repositoryQuality: 80,
        readmeQuality: 80,
        codeQuality: 25,
        liveWebsiteQuality: 0
      },
      READMEAnalysis: { qualityScore: 80 },
      secretFindings: []
    });

    // Bob attempts to get Alice's analysis
    const getRes = await request(app)
      .get(`/api/projects/${projectId}/analysis`)
      .set('Authorization', `Bearer ${user2Token}`);

    expect(getRes.status).toBe(404);
  });

  test('prevents User 2 from accessing User 1 screenshot endpoint', async () => {
    const fakeProjectId = '60d5ec49f1b2c8b1f8e4e1a1';
    const fakeScreenshotId = '60d5ec49f1b2c8b1f8e4e1a2';

    // Bob tries to access a screenshot under a project he doesn't own
    const res = await request(app)
      .get(`/api/projects/${fakeProjectId}/screenshots/${fakeScreenshotId}`)
      .set('Authorization', `Bearer ${user2Token}`);

    expect(res.status).toBe(403);
  });
});
