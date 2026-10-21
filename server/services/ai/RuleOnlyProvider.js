const AIReviewProvider = require('./AIReviewProvider');

class RuleOnlyProvider extends AIReviewProvider {
  async reviewResume({ parsedResume, checks, score }) {
    const strengths = [];
    const weaknesses = [];
    const recommendations = [];

    const passedChecks = checks.filter((c) => c.status === 'pass');
    const failedChecks = checks.filter((c) => c.status === 'fail' || c.status === 'warning');

    const sections = parsedResume.sections || {};
    const skills = sections.skills || {};
    const projects = sections.projects || [];

    // Synthesize Strengths from genuine parsed achievements
    if (parsedResume.pageCount === 1) {
      strengths.push('Strict 1-page compliance suitable for fast-scanning campus recruiters.');
    }
    if (skills.allSkills && skills.allSkills.length >= 6) {
      strengths.push(`Diverse technical stack covering ${skills.allSkills.slice(0, 5).join(', ')}.`);
    }
    if (projects.length >= 2) {
      strengths.push(`Demonstrates active project portfolio with ${projects.length} distinct engineering projects.`);
    }
    if (sections.achievements && sections.achievements.length > 0) {
      strengths.push(`Co-curricular distinction: ${sections.achievements[0]}.`);
    }
    if (strengths.length === 0) {
      strengths.push('Document text is cleanly extractable by applicant tracking systems.');
    }

    // Synthesize Weaknesses from failed checks
    for (const failed of failedChecks) {
      if (failed.id === 'CHECK_MEASURABLE_RESULTS') {
        weaknesses.push('Project descriptions state what was built but lack quantifiable engineering metrics (users, latency, throughput).');
      } else if (failed.id === 'CHECK_PROJECT_QUALITY') {
        weaknesses.push('Projects lack public GitHub repository links or explicit tech stack tags.');
      } else if (failed.id === 'CHECK_PROFILE_LINKS') {
        weaknesses.push('Missing competitive coding (LeetCode) or active GitHub profile link in header.');
      } else if (failed.id === 'CHECK_PAGE_COUNT') {
        weaknesses.push(`Document length exceeds standard 1-page campus placement threshold (currently ${parsedResume.pageCount} pages).`);
      } else if (failed.id === 'CHECK_ACTION_VERBS') {
        weaknesses.push('Bullet points contain passive descriptions instead of strong ownership action verbs.');
      } else if (failed.id === 'CHECK_ACHIEVEMENTS') {
        weaknesses.push('Lacks verified co-curricular achievements, hackathons, or competitive coding honors.');
      }
    }

    if (weaknesses.length === 0) {
      weaknesses.push('Minor wording refinements could further sharpen bullet impact.');
    }

    // Synthesize Prioritized Recommendations
    if (failedChecks.some((c) => c.id === 'CHECK_PAGE_COUNT')) {
      recommendations.push('High Priority: Prune secondary school details and trim whitespace to enforce an exact 1-page layout.');
    }
    if (failedChecks.some((c) => c.id === 'CHECK_MEASURABLE_RESULTS')) {
      recommendations.push('High Priority: Quantify bullet points with truthful metrics (e.g. data volume, API response time, or active user count).');
    }
    if (failedChecks.some((c) => c.id === 'CHECK_PROFILE_LINKS')) {
      recommendations.push('Medium Priority: Insert direct hyperlinks to your GitHub and LeetCode profiles.');
    }
    if (failedChecks.some((c) => c.id === 'CHECK_PROJECT_QUALITY')) {
      recommendations.push('Medium Priority: Ensure every project lists tools used and links to an open-source repository.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Your resume meets all baseline benchmarks. Tailor keywords slightly for specific job descriptions.');
    }

    const summary = score >= 80
      ? `Strong candidate profile achieving a score of ${score}/100. Structure, technologies, and projects are well presented.`
      : score >= 60
      ? `Solid foundation (${score}/100), but addressing identified gaps in quantified project impact and links will significantly improve shortlisting rates.`
      : `Resume requires key updates (${score}/100) before campus drives. Focus on enforcing 1-page limit, adding GitHub links, and strengthening project bullet points.`;

    return {
      strengths: strengths.slice(0, 4),
      weaknesses: weaknesses.slice(0, 4),
      recommendations: recommendations.slice(0, 4),
      summary,
      provider: 'rule-engine'
    };
  }

  /**
   * Deterministic interview question generator tailored to candidate profile
   */
  async generateInterviewQuestions({ targetRole, durationMinutes = 15, focus = 'general', context = {} }) {
    const questions = [];
    const questionCount = durationMinutes === 20 ? 6 : 5;
    const role = targetRole || 'Software Engineer';
    const skills = context.skills || [];
    const projects = context.projects || [];
    const primarySkill = skills[0] || 'JavaScript';
    const secondarySkill = skills[1] || 'Databases';
    const topProject = projects[0] || { name: 'Capstone Project', techStack: 'Full-Stack' };

    // 1. Technical Fundamentals
    questions.push({
      id: 'Q1_TECH_FUNDAMENTALS',
      order: 1,
      category: 'technical',
      prompt: `In the context of ${role}, explain how asynchronous execution or concurrency works in ${primarySkill}, and how you prevent common performance bottlenecks or memory leaks.`,
      contextTarget: primarySkill
    });

    // 2. Project Architecture & Deep Dive
    const projectName = topProject.name || 'your primary engineering project';
    const projectTech = Array.isArray(topProject.techStack) ? topProject.techStack.join(', ') : (topProject.techStack || 'the stack');
    questions.push({
      id: 'Q2_PROJECT_DEEP_DIVE',
      order: 2,
      category: 'project',
      prompt: `In "${projectName}", what key architectural trade-offs did you make when choosing ${projectTech}? If you had to scale this application to 100,000 active users, what component would break first and how would you redesign it?`,
      contextTarget: projectName
    });

    // 3. Problem Solving / System Design
    questions.push({
      id: 'Q3_PROBLEM_SOLVING',
      order: 3,
      category: 'problem_solving',
      prompt: `Suppose an API endpoint in your service experiences sudden latency spikes from 50ms to 3000ms during peak campus placement hours. Walk through your systematic debugging strategy from client to database.`,
      contextTarget: 'System Debugging'
    });

    // 4. Data Structures / Applied Technology
    questions.push({
      id: 'Q4_APPLIED_TECH',
      order: 4,
      category: 'technical',
      prompt: `Compare how you handle data consistency, indexing, and query optimization when using ${secondarySkill}. Give an example of a query or schema choice you optimized.`,
      contextTarget: secondarySkill
    });

    // 5. Behavioral / Collaboration
    questions.push({
      id: 'Q5_BEHAVIORAL',
      order: 5,
      category: 'behavioral',
      prompt: `Describe a scenario during a college or team project where you disagreed with a teammate on technical implementation or deadlines. How did you resolve the disagreement and what was the outcome?`,
      contextTarget: 'Collaboration'
    });

    // 6. Optional 6th question for 20m sessions
    if (questionCount > 5) {
      questions.push({
        id: 'Q6_SECURITY_RELIABILITY',
        order: 6,
        category: 'technical',
        prompt: `How do you secure user authentication and protect sensitive configuration/secrets in production web services? Mention specific vulnerabilities like CSRF, XSS, or SQL/NoSQL injection.`,
        contextTarget: 'Security'
      });
    }

    return {
      questions,
      planSummary: `Generated ${questions.length} personalized questions for ${role} (${durationMinutes} min session).`,
      provider: 'rule-engine'
    };
  }

  /**
   * Deterministic 5-dimension rubric evaluator for interview transcript
   */
  async evaluateInterview({ targetRole, questions = [], transcript = [] }) {
    const totalQuestions = questions.length || transcript.length || 1;
    const answeredTranscripts = transcript.filter((t) => !t.skipped && t.answerText && t.answerText.trim().length > 10);
    const answeredCount = answeredTranscripts.length;

    // Evaluate each question
    const questionEvaluations = [];
    let technicalPoints = 0;
    let technicalMax = 0;
    let projectPoints = 0;
    let projectMax = 0;
    let problemPoints = 0;
    let problemMax = 0;
    let communicationPoints = 0;
    let hrPoints = 0;
    let hrMax = 0;

    for (const item of transcript) {
      const q = questions.find((x) => x.id === item.questionId) || { category: item.category || 'technical', prompt: item.questionText };
      const category = q.category || 'technical';
      const ans = item.answerText ? item.answerText.trim() : '';
      const wordCount = ans ? ans.split(/\s+/).length : 0;
      const isSkipped = item.skipped || wordCount < 5;

      let qScore = 0;
      let feedback = '';
      let improvement = '';

      if (isSkipped) {
        qScore = 0;
        feedback = 'Question was skipped or left unanswered.';
        improvement = 'Provide an answer using the STAR (Situation, Task, Action, Result) method even when partially unsure.';
      } else if (wordCount < 25) {
        qScore = 45;
        feedback = 'Answer is very brief and lacks technical depth, specific trade-offs, or concrete examples.';
        improvement = 'Expand on your reasoning by including specific engineering details and concrete metrics.';
      } else if (wordCount < 70) {
        qScore = 75;
        feedback = 'Good direct answer with clear conceptual understanding. Could be enhanced with real-world edge cases.';
        improvement = 'Discuss failure scenarios, error handling, or performance implications.';
      } else {
        qScore = 90;
        feedback = 'Strong, comprehensive response detailing technical reasoning, architecture, and practical considerations.';
        improvement = 'Ensure responses stay structured and directly address the interviewer prompt concisely.';
      }

      // Check for technical keyword presence in answer
      const techKeywords = ['async', 'await', 'index', 'latency', 'cache', 'database', 'scale', 'trade-off', 'component', 'auth', 'test', 'security'];
      const matchedKeywords = techKeywords.filter((k) => ans.toLowerCase().includes(k));
      if (matchedKeywords.length >= 3 && qScore > 0) {
        qScore = Math.min(100, qScore + 10);
      }

      questionEvaluations.push({
        questionId: item.questionId,
        category,
        score: qScore,
        feedback,
        suggestedImprovement: improvement
      });

      // Accumulate dimension stats
      if (category === 'technical') {
        technicalPoints += qScore;
        technicalMax += 100;
      } else if (category === 'project') {
        projectPoints += qScore;
        projectMax += 100;
      } else if (category === 'problem_solving') {
        problemPoints += qScore;
        problemMax += 100;
      } else if (category === 'behavioral') {
        hrPoints += qScore;
        hrMax += 100;
      }

      // Communication score depends on structure and clarity
      const commScore = isSkipped ? 0 : wordCount >= 30 && wordCount <= 200 ? 88 : wordCount > 200 ? 75 : 60;
      communicationPoints += commScore;
    }

    // Dimension percentage scores (0-100)
    const dimTechScore = technicalMax > 0 ? Math.round(technicalPoints / technicalMax * 100) : 70;
    const dimProjectScore = projectMax > 0 ? Math.round(projectPoints / projectMax * 100) : 70;
    const dimProblemScore = problemMax > 0 ? Math.round(problemPoints / problemMax * 100) : 70;
    const dimCommScore = transcript.length > 0 ? Math.round(communicationPoints / transcript.length) : 60;
    const dimHrScore = hrMax > 0 ? Math.round(hrPoints / hrMax * 100) : 70;

    // Weighted Overall Score based on official rubric:
    // Technical (30%) + Projects (25%) + Problem Solving (20%) + Communication (15%) + HR (10%)
    const overall = Math.round(
      dimTechScore * 0.30 +
      dimProjectScore * 0.25 +
      dimProblemScore * 0.20 +
      dimCommScore * 0.15 +
      dimHrScore * 0.10
    );

    const overallScore = Math.min(100, Math.max(0, overall));

    const dimensions = [
      {
        name: 'Technical Accuracy & Fundamentals',
        weight: 30,
        score: dimTechScore,
        feedback: dimTechScore >= 75 ? 'Demonstrates solid grasp of core technologies and system mechanics.' : 'Foundational concepts require review, particularly concurrency and performance trade-offs.'
      },
      {
        name: 'Project Understanding & Architecture',
        weight: 25,
        score: dimProjectScore,
        feedback: dimProjectScore >= 75 ? 'Articulates design decisions and architectural choices in portfolio projects effectively.' : 'Needs clearer articulation of why specific tools were selected and scalability bottlenecks.'
      },
      {
        name: 'Problem Solving & Debugging',
        weight: 20,
        score: dimProblemScore,
        feedback: dimProblemScore >= 75 ? 'Follows structured, methodical problem-decomposition under operational pressure.' : 'Practice root-cause analysis workflows from network logs down to database queries.'
      },
      {
        name: 'Communication & Structure',
        weight: 15,
        score: dimCommScore,
        feedback: dimCommScore >= 75 ? 'Answers are structured with clear context, action steps, and outcomes.' : 'Structure answers using the STAR format to avoid unstructured or overly brief explanations.'
      },
      {
        name: 'HR & Behavioral Competencies',
        weight: 10,
        score: dimHrScore,
        feedback: dimHrScore >= 75 ? 'Effective team collaboration and constructive conflict resolution demonstrated.' : 'Prepare concrete instances of overcoming team challenges and receiving code feedback.'
      }
    ];

    const strengths = [];
    const weaknesses = [];
    const recommendations = [];

    if (dimTechScore >= 75) strengths.push('Strong grasp of core technical concepts and engineering trade-offs.');
    if (dimProjectScore >= 75) strengths.push('In-depth knowledge of own portfolio architecture and component decisions.');
    if (dimCommScore >= 75) strengths.push('Structured, professional written answers that clearly convey engineering intent.');
    if (strengths.length === 0) strengths.push('Candidate completed the timed technical interview assessment.');

    if (answeredCount < totalQuestions) {
      weaknesses.push(`Skipped or incomplete responses (${totalQuestions - answeredCount} unanswered questions).`);
      recommendations.push('High Priority: Attempt every interview question, even with partial knowledge, to receive partial credit.');
    }
    if (dimTechScore < 75) {
      weaknesses.push('Technical depth in concurrency, system optimization, or API resilience was limited.');
      recommendations.push('High Priority: Review concurrency models and system debugging steps for your target tech stack.');
    }
    if (dimProjectScore < 75) {
      weaknesses.push('Could not fully explain scalability limitations in listed portfolio projects.');
      recommendations.push('Medium Priority: Prepare deep dives on each project listed on your resume, detailing how it scales to high load.');
    }
    if (recommendations.length === 0) {
      recommendations.push('Continue practicing system design and timed technical problem-solving to maintain interview readiness.');
    }

    return {
      overallScore,
      dimensions,
      strengths: strengths.slice(0, 4),
      weaknesses: weaknesses.slice(0, 4),
      recommendations: recommendations.slice(0, 4),
      questionEvaluations,
      provider: 'rule-engine'
    };
  }

  /**
   * Generates qualitative review, headline/about rewrites, and action checklist for LinkedIn
   */
  async reviewLinkedInProfile({ profileData, targetRole = 'Software Engineer', categoryScores = {}, overallScore = 0, missingSections = [] }) {
    const strengths = [];
    const weaknesses = [];
    const sectionSuggestions = [];

    // Synthesize 3 strengths from real data
    if (categoryScores.skills?.score >= 10 && (profileData.skills || []).length >= 5) {
      strengths.push(`Diverse technical keyword breadth with ${profileData.skills.length} verified technologies (${profileData.skills.slice(0, 4).join(', ')}).`);
    }
    if (categoryScores.projects?.score >= 10 && (profileData.projects || []).length > 0) {
      strengths.push(`Solid project portfolio documenting practical development work and software architecture.`);
    }
    if (categoryScores.experience?.score >= 10 && (profileData.experience || []).length > 0) {
      strengths.push(`Demonstrated hands-on engineering responsibilities and professional experience.`);
    }
    if (categoryScores.headline?.score >= 7) {
      strengths.push(`Headline clearly establishes your identity as an engineer aiming for ${targetRole}.`);
    }
    if (categoryScores.featured?.score >= 7) {
      strengths.push(`Includes external links to live code and portfolio repositories.`);
    }
    if (strengths.length === 0) {
      strengths.push('Profile data successfully extracted and analyzed across all 8 standard evaluation categories.');
    }

    // Synthesize 3 weaknesses
    if (missingSections.includes('About / Summary') || categoryScores.about?.score < 8) {
      weaknesses.push('About section is either missing or too brief to convey your engineering impact and career trajectory.');
      sectionSuggestions.push({
        section: 'About / Summary',
        issue: 'Current summary lacks a structured narrative connecting your skills to real engineering results.',
        suggestion: 'Write a 3-paragraph summary: 1) What drives you as an engineer, 2) Core technical stack with recent project wins, 3) Call to action / contact email.',
        example: `Engineer focused on ${targetRole} solutions. Proficient in ${(profileData.skills || ['modern web technologies']).slice(0, 3).join(', ')}. Passionate about building resilient, performant applications. Contact me at [your email].`
      });
    }

    if (missingSections.includes('Featured Section / Portfolio Links') || categoryScores.featured?.score < 7) {
      weaknesses.push('No GitHub, portfolio, or deployed project links in your Featured section.');
      sectionSuggestions.push({
        section: 'Featured Section',
        issue: 'Recruiters spend an average of 6 seconds on a profile; missing links prevent immediate verification of your code.',
        suggestion: 'Add 2-3 items to your Featured section: your GitHub profile link, your best deployed project demo, and your updated resume PDF.',
        example: 'Feature: "Full-Stack E-Commerce Platform | React + Node.js | Live Demo & GitHub Repo"'
      });
    }

    if (categoryScores.headline?.score < 8) {
      weaknesses.push('Headline does not fully leverage high-intent recruiter search keywords for your target role.');
      sectionSuggestions.push({
        section: 'Headline',
        issue: 'Headline is either too generic or missing key technologies recruiters search for.',
        suggestion: 'Format headline as: [Target Role] | [Core Tech Stack] | [Quantified Achievement or Focus Area].',
        example: `${targetRole} | ${(profileData.skills || ['React', 'Node.js', 'Python']).slice(0, 3).join(' • ')} | Building High-Performance Scalable Software`
      });
    }

    if (categoryScores.experience?.score < 10 && (profileData.experience || []).length > 0) {
      weaknesses.push('Experience descriptions lack quantifiable metrics (users, performance improvements, latency).');
      sectionSuggestions.push({
        section: 'Experience',
        issue: 'Descriptions describe job duties rather than ownership and measurable engineering outcomes.',
        suggestion: 'Rewrite bullet points using the XYZ formula: Accomplished [X] as measured by [Y] by doing [Z].',
        example: 'Optimized MongoDB database queries by introducing compound indexing, reducing average API response latency by 35%.'
      });
    }

    if (weaknesses.length === 0) {
      weaknesses.push('Further keyword density and social proof (recommendations, post engagement) will elevate your profile to Top 5% ranking.');
    }

    // Improved Headline based only on actual details and target role
    const candidateSkills = (profileData.skills || []).slice(0, 4);
    const skillsString = candidateSkills.length > 0 ? candidateSkills.join(' • ') : 'Full-Stack Development • Modern Architecture';
    const improvedHeadline = `${targetRole} | ${skillsString} | Focused on Scalable Systems & Clean Code`;

    // Improved About section based only on actual details
    const expSnippets = (profileData.experience || []).map((e) => e.title).filter(Boolean);
    const projSnippets = (profileData.projects || []).map((p) => p.name).filter(Boolean);
    const improvedAbout = `I am a dedicated software engineer specializing in ${targetRole} roles with a strong foundation in ${skillsString}.

Throughout my engineering journey${expSnippets.length > 0 ? `, including roles as ${expSnippets.slice(0, 2).join(' and ')}` : ''}, I have focused on writing maintainable, tested code and delivering reliable solutions${projSnippets.length > 0 ? ` such as ${projSnippets.slice(0, 2).join(', ')}` : ''}.

Technical Stack:
• Core: ${skillsString}
${profileData.education && profileData.education.length > 0 ? `• Education: ${profileData.education[0].degree || 'Engineering'} from ${profileData.education[0].school || 'University'}` : ''}

I am actively seeking full-time opportunities where I can contribute to high-impact engineering teams. Let's connect!`;

    // Action Checklist
    const actionChecklist = [
      {
        id: 'chk_headline',
        task: `Update headline to include "${targetRole}" and top skills: ${skillsString}`,
        priority: 'high',
        completed: categoryScores.headline?.score >= 8
      },
      {
        id: 'chk_about',
        task: 'Publish a structured 3-paragraph About section detailing your engineering journey and contact info',
        priority: 'high',
        completed: categoryScores.about?.score >= 12
      },
      {
        id: 'chk_featured',
        task: 'Add GitHub profile and live project demo links to your Featured section',
        priority: 'high',
        completed: categoryScores.featured?.score >= 8
      },
      {
        id: 'chk_skills',
        task: 'Pin your top 3 most relevant skills for campus recruiters and solicit endorsements',
        priority: 'medium',
        completed: categoryScores.skills?.score >= 12
      },
      {
        id: 'chk_metrics',
        task: 'Add at least 1 quantifiable metric to each experience and project description',
        priority: 'medium',
        completed: categoryScores.experience?.score >= 12
      }
    ];

    const impactPresentationTips = [
      'Lead with strong action verbs: "Architected", "Engineered", "Automated", "Optimized", not "Helped with" or "Worked on".',
      'Always include the tech stack in square brackets at the end of each project (e.g. [React, Express, Redis]).',
      'Provide a direct, working link to your GitHub repository or live URL for every project listed.'
    ];

    const recommendedKeywords = [
      targetRole,
      'Data Structures & Algorithms',
      'REST APIs',
      'Git & GitHub',
      'System Design',
      'Unit Testing',
      ...(profileData.skills || ['JavaScript', 'Python', 'SQL'])
    ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 10);

    return {
      strengths: strengths.slice(0, 3),
      weaknesses: weaknesses.slice(0, 3),
      sectionSuggestions,
      improvedHeadline,
      improvedAbout,
      impactPresentationTips,
      recommendedKeywords,
      actionChecklist,
      provider: 'rule-engine'
    };
  }

  /**
   * Generates qualitative evaluation and actionable recommendations for co-curricular achievements
   */
  async evaluateCoCurricularAchievements({ achievements = [], targetRole = 'Software Engineer', academicYear = '3rd Year', dimensionScores = {}, overallScore = 0 }) {
    const recommendedActivities = [];

    const hasHackathon = achievements.some((a) => a.category === 'hackathons');
    const hasOpenSource = achievements.some((a) => a.category === 'open_source');
    const hasLeadership = achievements.some((a) => a.category === 'leadership');
    const hasCert = achievements.some((a) => a.category === 'certifications');

    if (!hasHackathon) {
      recommendedActivities.push({
        title: 'Participate in a 48-Hour Online or Campus Hackathon',
        category: 'hackathons',
        rationale: `Building an MVP under time constraints demonstrates rapid prototyping and teamwork for ${targetRole} drives.`,
        timeline: 'Next 30 days',
        status: 'recommended'
      });
    }

    if (!hasOpenSource) {
      recommendedActivities.push({
        title: 'Submit 2 Pull Requests to an Open Source Project',
        category: 'open_source',
        rationale: 'Reviewing real codebase conventions and receiving maintainer code reviews simulates day-1 software engineering.',
        timeline: 'Next 45 days',
        status: 'recommended'
      });
    }

    if (!hasLeadership) {
      recommendedActivities.push({
        title: 'Lead a Technical Workshop or Hackathon Team',
        category: 'leadership',
        rationale: 'Organizing peers demonstrates ownership, cross-functional collaboration, and communication skills.',
        timeline: 'Next 60 days',
        status: 'recommended'
      });
    }

    if (!hasCert) {
      recommendedActivities.push({
        title: `Earn an Industry Certification aligned to ${targetRole} (AWS / GCP / Meta / Oracle)`,
        category: 'certifications',
        rationale: 'Standardized external certification provides immediate verifiability for recruiters.',
        timeline: 'Next 60 days',
        status: 'recommended'
      });
    }

    return {
      recommendedActivities: recommendedActivities.slice(0, 4),
      provider: 'rule-engine'
    };
  }
}

module.exports = RuleOnlyProvider;

