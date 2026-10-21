/**
 * LinkedIn Profile Deterministic Scoring Service
 * Implements the 8-category 100-point rubric with strict mathematical consistency.
 */

class LinkedInScoringService {
  /**
   * Calculate deterministic category scores based on normalized profile data
   * @param {Object} profileData
   * @param {string} targetRole
   * @returns {Object} { categoryScores, overallScore, missingSections }
   */
  calculateRubricScores(profileData = {}, targetRole = 'Software Engineer') {
    const missingSections = [];

    // 1. Headline (Max: 10)
    const headline = (profileData.headline || '').trim();
    let headlineScore = 0;
    let headlineStatus = 'fail';
    let headlineFeedback = '';

    if (!headline) {
      headlineStatus = 'unavailable';
      headlineFeedback = 'No headline provided. A strong headline directly influences recruiter search visibility.';
      missingSections.push('Headline');
    } else {
      // Evaluate headline depth and positioning
      if (headline.length >= 15) headlineScore += 4;
      if (headline.length >= 30) headlineScore += 2;

      // Check for targeted role positioning or domain keywords
      const roleKeywords = this._getKeywordsForRole(targetRole);
      const headlineLower = headline.toLowerCase();
      const hasRoleKw = roleKeywords.some((kw) => headlineLower.includes(kw.toLowerCase()));
      if (hasRoleKw) headlineScore += 2;

      // Check if it includes tech stack or value proposition (separators like |, •, -, /)
      if (/\||•|-|\/|,/.test(headline)) headlineScore += 2;

      // Penalize purely generic titles like "Student at XYZ" or "Looking for opportunities"
      if (/student at|looking for|seeking job|unemployed/i.test(headline) && headlineScore > 4) {
        headlineScore -= 2;
      }

      headlineScore = Math.min(10, Math.max(2, headlineScore));
      headlineStatus = headlineScore >= 8 ? 'pass' : headlineScore >= 5 ? 'warning' : 'fail';
      headlineFeedback =
        headlineScore >= 8
          ? 'Strong headline with clear professional identity and relevant skill keywords.'
          : 'Headline is present but could better highlight core technical competencies and target role.';
    }

    // 2. About / Summary (Max: 15)
    const about = (profileData.about || '').trim();
    let aboutScore = 0;
    let aboutStatus = 'fail';
    let aboutFeedback = '';

    if (!about) {
      aboutStatus = 'unavailable';
      aboutFeedback = 'About section is missing. Recruiters prioritize candidates who articulate their engineering background and goals.';
      missingSections.push('About / Summary');
    } else {
      if (about.length >= 60) aboutScore += 5;
      if (about.length >= 180) aboutScore += 4;
      if (about.length >= 350) aboutScore += 3;

      // Mentions technical passions, stacks or accomplishments
      const techTerms = ['develop', 'engineer', 'code', 'build', 'framework', 'api', 'database', 'project', 'architecture', 'lead'];
      const aboutLower = about.toLowerCase();
      const hasTechTerms = techTerms.filter((t) => aboutLower.includes(t)).length;
      if (hasTechTerms >= 2) aboutScore += 3;

      aboutScore = Math.min(15, Math.max(3, aboutScore));
      aboutStatus = aboutScore >= 12 ? 'pass' : aboutScore >= 7 ? 'warning' : 'fail';
      aboutFeedback =
        aboutScore >= 12
          ? 'Engaging summary that effectively communicates technical background and career interests.'
          : 'About section is relatively brief. Expand on your project accomplishments, tech stack, and what drives you.';
    }

    // 3. Experience and responsibilities (Max: 15)
    const experience = Array.isArray(profileData.experience) ? profileData.experience : [];
    let expScore = 0;
    let expStatus = 'fail';
    let expFeedback = '';

    if (experience.length === 0) {
      expStatus = 'unavailable';
      expFeedback = 'No work experience or internships recorded. Consider detailing open-source or academic project leadership as experience.';
      missingSections.push('Experience');
    } else {
      expScore += Math.min(6, experience.length * 3); // up to 6 pts for having 1-2+ roles

      // Check descriptions for action verbs and responsibility detail
      let hasDetailedDesc = false;
      let hasMetrics = false;
      experience.forEach((e) => {
        const desc = (e.description || '').toLowerCase();
        if (desc.length > 50) hasDetailedDesc = true;
        if (/\d+%|\d+\s*(users|requests|ms|x|k|sec)|reduced|increased|improved|scaled|built/i.test(desc)) {
          hasMetrics = true;
        }
      });

      if (hasDetailedDesc) expScore += 5;
      if (hasMetrics) expScore += 4;

      expScore = Math.min(15, Math.max(3, expScore));
      expStatus = expScore >= 12 ? 'pass' : expScore >= 7 ? 'warning' : 'fail';
      expFeedback =
        expScore >= 12
          ? 'Well-structured experience entries demonstrating engineering responsibilities.'
          : 'Experience descriptions should emphasize personal contributions and measurable results.';
    }

    // 4. Projects and demonstrated work (Max: 15)
    const projects = Array.isArray(profileData.projects) ? profileData.projects : [];
    let projScore = 0;
    let projStatus = 'fail';
    let projFeedback = '';

    if (projects.length === 0) {
      projStatus = 'unavailable';
      projFeedback = 'No dedicated projects listed. Adding 2-3 substantial software projects is critical for campus placement selection.';
      missingSections.push('Projects');
    } else {
      projScore += Math.min(6, projects.length * 3); // 3-6 pts
      const hasTechStacks = projects.some((p) => (p.techStack && p.techStack.length > 0) || (p.description && /react|node|python|java|sql|api|docker/i.test(p.description)));
      if (hasTechStacks) projScore += 5;
      const hasLinks = projects.some((p) => p.link || /github|vercel|netlify|http/i.test(p.description || ''));
      if (hasLinks) projScore += 4;

      projScore = Math.min(15, Math.max(3, projScore));
      projStatus = projScore >= 12 ? 'pass' : projScore >= 7 ? 'warning' : 'fail';
      projFeedback =
        projScore >= 12
          ? 'Strong project portfolio with documented tools and demonstrable outcomes.'
          : 'Include clear tech stack tags and live demo/repository links for all listed projects.';
    }

    // 5. Skills and technical relevance (Max: 15)
    const skills = Array.isArray(profileData.skills) ? profileData.skills : [];
    let skillsScore = 0;
    let skillsStatus = 'fail';
    let skillsFeedback = '';

    if (skills.length === 0) {
      skillsStatus = 'unavailable';
      skillsFeedback = 'No technical skills listed. Skills directly drive LinkedIn recruiter algorithmic filtering.';
      missingSections.push('Skills');
    } else {
      if (skills.length >= 3) skillsScore += 5;
      if (skills.length >= 8) skillsScore += 4;
      if (skills.length >= 15) skillsScore += 3;

      // Check relevance to target role
      const roleKeywords = this._getKeywordsForRole(targetRole);
      const matchingCount = skills.filter((s) =>
        roleKeywords.some((rk) => s.toLowerCase().includes(rk.toLowerCase()))
      ).length;

      if (matchingCount >= 2) skillsScore += 3;

      skillsScore = Math.min(15, Math.max(3, skillsScore));
      skillsStatus = skillsScore >= 12 ? 'pass' : skillsScore >= 7 ? 'warning' : 'fail';
      skillsFeedback =
        skillsScore >= 12
          ? `Solid technical breadth with ${skills.length} skills aligning to ${targetRole}.`
          : `Add more core technologies and libraries relevant to ${targetRole}.`;
    }

    // 6. Education and relevant certifications (Max: 10)
    const education = Array.isArray(profileData.education) ? profileData.education : [];
    const certifications = Array.isArray(profileData.certifications) ? profileData.certifications : [];
    let eduScore = 0;
    let eduStatus = 'fail';
    let eduFeedback = '';

    if (education.length === 0 && certifications.length === 0) {
      eduStatus = 'unavailable';
      eduFeedback = 'Education details are missing. Add your degree, major, and graduation year.';
      missingSections.push('Education');
    } else {
      if (education.length > 0) {
        eduScore += 6;
        if (education.some((e) => e.degree && e.degree.length > 2)) eduScore += 2;
      }
      if (certifications.length > 0) {
        eduScore += 2;
      }

      eduScore = Math.min(10, Math.max(2, eduScore));
      eduStatus = eduScore >= 8 ? 'pass' : 'warning';
      eduFeedback =
        eduScore >= 8
          ? 'Clear educational background and verifiable qualifications.'
          : 'Education is listed; consider adding relevant industry certifications or coursework.';
    }

    // 7. Featured section, portfolio, and GitHub links (Max: 10)
    const featuredLinks = Array.isArray(profileData.featuredLinks) ? profileData.featuredLinks : [];
    let featuredScore = 0;
    let featuredStatus = 'fail';
    let featuredFeedback = '';

    // Also check if URLs exist in about or experience or headline
    const allProfileText = `${profileData.about || ''} ${JSON.stringify(profileData.experience || [])} ${JSON.stringify(profileData.projects || [])}`;
    const containsExternalLinks = /github\.com|gitlab\.com|portfolio|http/i.test(allProfileText);

    if (featuredLinks.length === 0 && !containsExternalLinks) {
      featuredStatus = 'unavailable';
      featuredFeedback = 'No featured links, GitHub profile, or portfolio URLs detected. Adding a Featured section boosts profile engagement by 3x.';
      missingSections.push('Featured Section / Portfolio Links');
    } else {
      if (featuredLinks.length > 0) featuredScore += 6;
      else if (containsExternalLinks) featuredScore += 4;

      if (/github\.com/i.test(allProfileText) || featuredLinks.some((f) => /github/i.test(f.url || f.title))) {
        featuredScore += 4;
      } else {
        featuredScore += 2;
      }

      featuredScore = Math.min(10, Math.max(2, featuredScore));
      featuredStatus = featuredScore >= 8 ? 'pass' : 'warning';
      featuredFeedback =
        featuredScore >= 8
          ? 'Strong online presence with accessible portfolio and code repository links.'
          : 'Link your GitHub or personal portfolio directly in your Featured section.';
    }

    // 8. Achievements, measurable impact, and presentation (Max: 10)
    const achievements = Array.isArray(profileData.achievements) ? profileData.achievements : [];
    let achScore = 0;
    let achStatus = 'fail';
    let achFeedback = '';

    if (achievements.length === 0) {
      achStatus = 'unavailable';
      achFeedback = 'No honors or achievements listed. Add hackathon placements, competitive programming ranks, or scholarships.';
      missingSections.push('Achievements / Honors');
    } else {
      achScore += Math.min(6, achievements.length * 3);
      const hasCompetitiveOrHonors = achievements.some((a) =>
        /winner|finalist|1st|2nd|3rd|hackathon|scholarship|rank|ieee|published/i.test(a)
      );
      if (hasCompetitiveOrHonors) achScore += 4;
      else achScore += 2;

      achScore = Math.min(10, Math.max(2, achScore));
      achStatus = achScore >= 8 ? 'pass' : 'warning';
      achFeedback =
        achScore >= 8
          ? 'Impressive record of verified achievements and competitive distinctions.'
          : 'Achievements listed; quantify results (e.g. rank out of participants) to increase impact.';
    }

    // Exact Mathematical Sum
    const overallScore =
      headlineScore +
      aboutScore +
      expScore +
      projScore +
      skillsScore +
      eduScore +
      featuredScore +
      achScore;

    const categoryScores = {
      headline: { score: headlineScore, max: 10, status: headlineStatus, feedback: headlineFeedback },
      about: { score: aboutScore, max: 15, status: aboutStatus, feedback: aboutFeedback },
      experience: { score: expScore, max: 15, status: expStatus, feedback: expFeedback },
      projects: { score: projScore, max: 15, status: projStatus, feedback: projFeedback },
      skills: { score: skillsScore, max: 15, status: skillsStatus, feedback: skillsFeedback },
      education: { score: eduScore, max: 10, status: eduStatus, feedback: eduFeedback },
      featured: { score: featuredScore, max: 10, status: featuredStatus, feedback: featuredFeedback },
      achievements: { score: achScore, max: 10, status: achStatus, feedback: achFeedback }
    };

    return {
      categoryScores,
      overallScore: Math.min(100, Math.max(0, overallScore)),
      missingSections
    };
  }

  _getKeywordsForRole(role = '') {
    const r = role.toLowerCase();
    if (r.includes('frontend') || r.includes('ui')) {
      return ['React', 'TypeScript', 'JavaScript', 'Next.js', 'HTML5', 'CSS3', 'Tailwind', 'Redux', 'Performance', 'Responsive Design'];
    }
    if (r.includes('backend') || r.includes('api')) {
      return ['Node.js', 'Express', 'Python', 'Java', 'PostgreSQL', 'MongoDB', 'REST APIs', 'Docker', 'Redis', 'Microservices', 'System Design'];
    }
    if (r.includes('data') || r.includes('ai') || r.includes('ml')) {
      return ['Python', 'PyTorch', 'TensorFlow', 'SQL', 'Pandas', 'Scikit-learn', 'NLP', 'Data Pipelines', 'Machine Learning'];
    }
    // Default Full-Stack / Software Engineer
    return ['React', 'Node.js', 'JavaScript', 'TypeScript', 'Python', 'SQL', 'Git', 'RESTful APIs', 'Cloud / AWS', 'Data Structures & Algorithms'];
  }
}

module.exports = new LinkedInScoringService();
