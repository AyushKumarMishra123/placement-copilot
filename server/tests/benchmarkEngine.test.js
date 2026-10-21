const benchmarkEngine = require('../services/review/benchmarkEngine');
const scoringEngine = require('../services/review/scoringEngine');

describe('Resume Benchmark & Scoring Engine Unit Tests', () => {
  const perfectResume = {
    pageCount: 1,
    cleanText: `
John Doe
john.doe@example.com | +1 555-0199
GitHub: https://github.com/johndoe | LeetCode: https://leetcode.com/johndoe | LinkedIn: https://linkedin.com/in/johndoe

EDUCATION
ABC University
Bachelor of Technology in Computer Science (2020 - 2024)
CGPA: 8.9/10

TECHNICAL SKILLS
Languages: Python, JavaScript, TypeScript, C++, SQL
Frameworks: React, Node.js, Express.js
Databases: MongoDB, PostgreSQL, Redis
Cloud & Tools: Docker, Git, AWS

PROJECTS
Placement Readiness Copilot | React, Node.js, MongoDB
- Architected full-stack resume analysis platform serving 500+ student profiles.
- Optimized database indexing reducing query response time by 45%.
- GitHub: https://github.com/johndoe/placement-copilot
- Live: https://placement-copilot.demo.com

Distributed Task Queue | Go, Redis, Docker
- Engineered distributed job scheduler handling 10,000 req/s.
- Reduced memory overhead by 30% through zero-copy buffer pooling.
- GitHub: https://github.com/johndoe/task-queue

ACHIEVEMENTS
- Winner, National Smart India Hackathon 2023 out of 1,200 teams.
- Solved 400+ problems on LeetCode with top 8% global contest rating.
`,
    sections: {
      contact: {
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1 555-0199',
        github: 'https://github.com/johndoe',
        leetcode: 'https://leetcode.com/johndoe',
        linkedin: 'https://linkedin.com/in/johndoe'
      },
      education: [
        {
          institution: 'ABC University',
          degree: 'B.Tech',
          field: 'Computer Science',
          graduationYear: '2024',
          score: '8.9/10'
        }
      ],
      experience: [],
      projects: [
        {
          name: 'Placement Readiness Copilot',
          description: 'Architected full-stack resume analysis platform serving 500+ student profiles.',
          techStack: ['React', 'Node.js', 'MongoDB'],
          githubLink: 'https://github.com/johndoe/placement-copilot',
          liveLink: 'https://placement-copilot.demo.com',
          impact: 'serving 500+ student profiles',
          highlights: [
            'Architected full-stack resume analysis platform serving 500+ student profiles.',
            'Optimized database indexing reducing query response time by 45%.'
          ]
        },
        {
          name: 'Distributed Task Queue',
          description: 'Engineered distributed job scheduler handling 10,000 req/s.',
          techStack: ['Go', 'Redis', 'Docker'],
          githubLink: 'https://github.com/johndoe/task-queue',
          liveLink: null,
          impact: 'handling 10,000 req/s',
          highlights: [
            'Engineered distributed job scheduler handling 10,000 req/s.',
            'Reduced memory overhead by 30% through zero-copy buffer pooling.'
          ]
        }
      ],
      skills: {
        languages: ['Python', 'JavaScript', 'TypeScript', 'C++', 'SQL'],
        frameworks: ['React', 'Node.js', 'Express.js'],
        databases: ['MongoDB', 'PostgreSQL', 'Redis'],
        cloud: ['AWS', 'Docker'],
        tools: ['Git'],
        allSkills: ['Python', 'JavaScript', 'TypeScript', 'C++', 'SQL', 'React', 'Node.js', 'Express.js', 'MongoDB', 'PostgreSQL', 'Redis', 'AWS', 'Docker', 'Git']
      },
      achievements: [
        'Winner, National Smart India Hackathon 2023 out of 1,200 teams.',
        'Solved 400+ problems on LeetCode with top 8% global contest rating.'
      ],
      links: [
        'https://github.com/johndoe',
        'https://leetcode.com/johndoe',
        'https://linkedin.com/in/johndoe'
      ]
    },
    layout: {
      isScanned: false,
      confidence: 1.0,
      layoutAnomalies: [],
      wordCount: 380,
      lineCount: 35
    }
  };

  it('evaluates all 9 benchmark checks and passes for a compliant resume', () => {
    const checks = benchmarkEngine.runChecks(perfectResume);
    expect(checks).toHaveLength(9);

    const checkIds = checks.map((c) => c.id);
    expect(checkIds).toContain('CHECK_PAGE_COUNT');
    expect(checkIds).toContain('CHECK_VISUAL_STRUCTURE');
    expect(checkIds).toContain('CHECK_SPELLING_GRAMMAR');
    expect(checkIds).toContain('CHECK_PROJECT_QUALITY');
    expect(checkIds).toContain('CHECK_PROFILE_LINKS');
    expect(checkIds).toContain('CHECK_ACHIEVEMENTS');
    expect(checkIds).toContain('CHECK_ACTION_VERBS');
    expect(checkIds).toContain('CHECK_MEASURABLE_RESULTS');
    expect(checkIds).toContain('CHECK_ATS_READABILITY');

    // All should pass for perfectResume
    const failed = checks.filter((c) => c.status === 'fail');
    expect(failed).toHaveLength(0);

    const { score, categoryScores, tier } = scoringEngine.calculateScore(checks);
    expect(score).toBeGreaterThanOrEqual(90);
    expect(tier).toContain('Placement Ready');
    expect(categoryScores.structure).toBe(15);
    expect(categoryScores.projects).toBe(20);
    expect(categoryScores.measurableImpact).toBe(25);
  });

  it('fails Check 1 when pageCount > 1 and gives specific explanation', () => {
    const multiPageResume = {
      ...perfectResume,
      pageCount: 3
    };

    const checks = benchmarkEngine.runChecks(multiPageResume);
    const pageCheck = checks.find((c) => c.id === 'CHECK_PAGE_COUNT');
    expect(pageCheck.status).toBe('fail');
    expect(pageCheck.score).toBe(0);
    expect(pageCheck.evidence).toContain('3 pages');
    expect(pageCheck.explanation).toContain('3 pages');
    expect(pageCheck.suggestion).toContain('Condense spacing');
  });

  it('fails Check 5 when GitHub link is missing and provides actionable fix', () => {
    const noGithubResume = {
      ...perfectResume,
      sections: {
        ...perfectResume.sections,
        contact: {
          ...perfectResume.sections.contact,
          github: null
        },
        links: ['https://linkedin.com/in/johndoe']
      }
    };

    const checks = benchmarkEngine.runChecks(noGithubResume);
    const profileCheck = checks.find((c) => c.id === 'CHECK_PROFILE_LINKS');
    expect(profileCheck.status).toBe('fail');
    expect(profileCheck.explanation).toContain('GitHub profile link is missing');
    expect(profileCheck.suggestion).toContain('Add your active GitHub profile URL');
  });

  it('fails Check 8 when projects lack measurable metrics and does not invent metrics', () => {
    const nonQuantifiedResume = {
      ...perfectResume,
      sections: {
        ...perfectResume.sections,
        projects: [
          {
            name: 'Blog App',
            description: 'Built a simple web application for posting articles and comments.',
            techStack: ['Node.js'],
            githubLink: 'https://github.com/johndoe/blog',
            impact: null,
            highlights: ['Created database schemas and API routes.']
          }
        ]
      }
    };

    const checks = benchmarkEngine.runChecks(nonQuantifiedResume);
    const impactCheck = checks.find((c) => c.id === 'CHECK_MEASURABLE_RESULTS');
    expect(impactCheck.status).toBe('fail');
    expect(impactCheck.score).toBe(0);
    expect(impactCheck.explanation).toContain('lack measurable impact');
    expect(impactCheck.suggestion).toContain('Add a measurable result such as users served');
  });
});
