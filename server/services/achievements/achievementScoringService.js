/**
 * Co-Curricular Achievement Scoring Service
 * Implements the 6-dimension weighted rubric (100% total) with strict mathematical consistency.
 */

class AchievementScoringService {
  /**
   * Evaluate achievements and calculate dimension scores deterministically
   * @param {Object} params
   * @param {string} params.participationStatus - 'achievements' | 'activities_no_formal' | 'none_want_to_improve'
   * @param {string} params.targetRole
   * @param {string} params.academicYear
   * @param {Array<Object>} params.achievements
   * @returns {Object}
   */
  evaluateAchievements({
    participationStatus = 'achievements',
    targetRole = 'Software Engineer',
    academicYear = '3rd Year',
    achievements = []
  }) {
    const isBaseline =
      participationStatus === 'none_want_to_improve' ||
      !achievements ||
      achievements.length === 0;

    // Academic year sensitivity factor (1st year gets higher grace baseline than final year)
    let yearBaselineModifier = 0;
    const yearLower = (academicYear || '').toLowerCase();
    if (yearLower.includes('1st') || yearLower.includes('first')) yearBaselineModifier = 10;
    else if (yearLower.includes('2nd') || yearLower.includes('second')) yearBaselineModifier = 5;

    // Handle baseline scenario (Candidate confirmed no achievements yet)
    if (isBaseline) {
      const baseRelevance = 8 + Math.round(yearBaselineModifier * 0.25);
      const baseContrib = 6 + Math.round(yearBaselineModifier * 0.20);
      const baseOutcomes = 5 + Math.round(yearBaselineModifier * 0.20);
      const baseAchLevel = 4 + Math.round(yearBaselineModifier * 0.15);
      const baseConsistency = 4 + Math.round(yearBaselineModifier * 0.10);
      const baseEvidence = 3 + Math.round(yearBaselineModifier * 0.10);

      const baselineTotal =
        baseRelevance +
        baseContrib +
        baseOutcomes +
        baseAchLevel +
        baseConsistency +
        baseEvidence;

      return {
        overallScore: baselineTotal,
        baseline: true,
        dimensionScores: {
          relevance: {
            score: baseRelevance,
            max: 25,
            weightPercent: 25,
            feedback: `Baseline starter evaluation for ${academicYear}. You have an open slate to align future activities directly to ${targetRole}.`
          },
          contribution: {
            score: baseContrib,
            max: 20,
            weightPercent: 20,
            feedback: 'No personal initiatives or leadership projects logged yet. Beginning your first technical project or club role will quickly grow this dimension.'
          },
          outcomes: {
            score: baseOutcomes,
            max: 20,
            weightPercent: 20,
            feedback: 'No demonstrable metrics or deployed solutions yet. Focus on building working software or publishing reproducible demos.'
          },
          achievementLevel: {
            score: baseAchLevel,
            max: 15,
            weightPercent: 15,
            feedback: 'No formal competition awards recorded. Honest baseline established without fabrication.'
          },
          consistency: {
            score: baseConsistency,
            max: 10,
            weightPercent: 10,
            feedback: 'Participating in recurring activities across the semester will demonstrate strong engineering commitment.'
          },
          evidence: {
            score: baseEvidence,
            max: 10,
            weightPercent: 10,
            feedback: 'No supporting repository or certificate links provided yet.'
          }
        },
        categoryBreakdown: [
          { category: 'hackathons', count: 0, score: 0, summary: 'No hackathon participation recorded yet.' },
          { category: 'leadership', count: 0, score: 0, summary: 'No club or society leadership roles recorded yet.' },
          { category: 'open_source', count: 0, score: 0, summary: 'No public open-source contributions recorded yet.' },
          { category: 'projects', count: 0, score: 0, summary: 'No exhibition or showcase projects recorded yet.' },
          { category: 'certifications', count: 0, score: 0, summary: 'No technical certifications recorded yet.' },
          { category: 'extracurricular', count: 0, score: 0, summary: 'No extracurricular activities recorded yet.' }
        ],
        strongestContributions: [
          'Proactive commitment to establishing an authentic baseline and following a structured improvement plan.'
        ],
        roleRelevantHighlights: [
          `Targeting ${targetRole} early allows you to select highly focused competitions, certifications, and club projects.`
        ],
        improvementAreas: [
          'Enter an entry-level college hackathon or virtual coding competition with a small team.',
          'Join a campus technical club (e.g. Google Developer Groups on Campus, IEEE, Open Source Club) and volunteer for an event.',
          'Publish a polished GitHub repository solving a real-world problem.'
        ],
        missingInformation: [
          'No activity or project records were submitted.'
        ],
        actionPlan30Days: [
          'Step 1: Identify 1 upcoming local or online hackathon (Devfolio, Unstop, or MLH) and register as a participant.',
          'Step 2: Pick 1 core skill needed for your target role and complete a foundational mini-project.',
          'Step 3: Document your project with a clean README and host the live demo.'
        ],
        actionPlan60Days: [
          'Step 4: Take on a coordinator or volunteer role in a student technical committee.',
          'Step 5: Contribute a documentation fix or small bug resolution to a beginner-friendly open-source project (Good First Issue).',
          'Step 6: Re-run this assessment with your new achievements to measure verified growth.'
        ]
      };
    }

    // Process valid achievements
    // Clean deduplicated list
    const validItems = achievements.filter((a) => a && a.title && a.title.trim().length > 1);

    // 1. Relevance to target career (Weight: 25)
    let relevanceScore = 10; // Baseline for reporting validated technical achievements
    const targetKeywords = this._getKeywordsForRole(targetRole);

    validItems.forEach((item) => {
      let itemRelevance = 0;
      const text = `${item.title} ${item.organizer || ''} ${item.problemSolved || ''} ${item.contribution || ''} ${(item.technologies || []).join(' ')}`.toLowerCase();

      // Technical categories carry higher relevance for software roles
      if (['hackathons', 'open_source', 'projects'].includes(item.category)) {
        itemRelevance += 4;
      } else if (['certifications', 'leadership'].includes(item.category)) {
        itemRelevance += 3;
      } else {
        itemRelevance += 1;
      }

      // Keyword match with target role
      const matches = targetKeywords.filter((kw) => text.includes(kw.toLowerCase())).length;
      if (matches >= 2) itemRelevance += 2;
      else if (matches >= 1) itemRelevance += 1;

      relevanceScore += itemRelevance;
    });

    const categoriesPresent = new Set(validItems.map((v) => v.category));
    if (categoriesPresent.size >= 2) relevanceScore += 2;
    if (categoriesPresent.size >= 3) relevanceScore += 2;
    relevanceScore = Math.min(25, Math.max(5, relevanceScore));

    // 2. Level of contribution, initiative, and ownership (Weight: 20)
    let contribScore = 8; // Baseline for active initiative
    validItems.forEach((item) => {
      let c = 0;
      const roleLower = (item.role || '').toLowerCase();
      const descLower = (item.contribution || '').toLowerCase();

      // Leadership or core contribution
      if (
        roleLower.includes('lead') ||
        roleLower.includes('president') ||
        roleLower.includes('head') ||
        roleLower.includes('founder') ||
        roleLower.includes('captain')
      ) {
        c += 4;
      } else if (roleLower.includes('core') || roleLower.includes('developer') || roleLower.includes('coordinator')) {
        c += 3;
      } else {
        c += 1; // Participant
      }

      // Depth of personal contribution description
      if (descLower.length > 50) c += 2;
      if (/built|designed|implemented|architected|managed|spearheaded|organized|created/i.test(descLower)) {
        c += 1;
      }

      contribScore += c;
    });
    contribScore = Math.min(20, Math.max(4, contribScore));

    // 3. Demonstrated outcomes and impact (Weight: 20)
    let outcomesScore = 8; // Baseline for completed deliverables
    validItems.forEach((item) => {
      let o = 0;
      const impactText = `${item.impact || ''} ${item.resultAward || ''} ${item.problemSolved || ''}`.toLowerCase();

      // Quantified impact
      if (/\d+%\s*|\d+\s*(users|participants|attendees|downloads|stars|views|colleges|teams)/i.test(impactText)) {
        o += 4;
      } else if (impactText.length > 20) {
        o += 2;
      }

      // Deployment or completion outcome
      if (/deployed|published|launched|production|hosted|live/i.test(impactText)) {
        o += 3;
      }

      outcomesScore += o;
    });
    outcomesScore = Math.min(20, Math.max(3, outcomesScore));

    // 4. Achievement level and recognition (Weight: 15)
    let topAwardPoints = 3; // Baseline for participation
    let additionalAwardPoints = 0;

    validItems.forEach((item) => {
      const resultLower = (item.resultAward || '').toLowerCase();
      let pts = 2;

      if (/winner|1st|first\s*place|champion|gold/i.test(resultLower)) {
        pts = 9;
      } else if (/finalist|runner|2nd|3rd|second|third|special\s*mention/i.test(resultLower)) {
        pts = 7;
      } else if (/published|certified|cleared|merit|honors/i.test(resultLower)) {
        pts = 6;
      } else if (/completed|organized/i.test(resultLower)) {
        pts = 4;
      }

      if (pts > topAwardPoints) {
        additionalAwardPoints += Math.min(3, topAwardPoints);
        topAwardPoints = pts;
      } else {
        additionalAwardPoints += Math.min(2, pts);
      }
    });

    const achLevelScore = Math.min(15, Math.max(3, topAwardPoints + additionalAwardPoints));


    // 5. Consistency and sustained participation (Weight: 10)
    let consistencyScore = 0;
    if (validItems.length >= 1) consistencyScore += 3;
    if (validItems.length >= 2) consistencyScore += 3;
    if (validItems.length >= 4) consistencyScore += 2;
    if (categoriesPresent.size >= 3) consistencyScore += 2;
    consistencyScore = Math.min(10, Math.max(2, consistencyScore));

    // 6. Supporting evidence and verifiability (Weight: 10)
    let evidenceScore = 0;
    const itemsWithEvidence = validItems.filter(
      (item) => item.evidenceUrl && /^https?:\/\//i.test(item.evidenceUrl.trim())
    );
    if (itemsWithEvidence.length >= 1) evidenceScore += 5;
    if (itemsWithEvidence.length >= 2) evidenceScore += 3;
    if (itemsWithEvidence.length >= 3) evidenceScore += 2;
    evidenceScore = Math.min(10, Math.max(1, evidenceScore));

    const overallScore = Math.min(
      100,
      relevanceScore +
        contribScore +
        outcomesScore +
        achLevelScore +
        consistencyScore +
        evidenceScore
    );

    // Build Category breakdown
    const categoryNames = [
      { key: 'hackathons', name: 'Hackathons & Technical Competitions' },
      { key: 'leadership', name: 'Leadership & College Clubs' },
      { key: 'open_source', name: 'Open-Source Contributions' },
      { key: 'projects', name: 'Projects & Innovation' },
      { key: 'certifications', name: 'Certifications & Technical Events' },
      { key: 'extracurricular', name: 'Volunteering & Extracurriculars' }
    ];

    const categoryBreakdown = categoryNames.map((cat) => {
      const itemsInCat = validItems.filter((i) => i.category === cat.key);
      const scoreInCat = Math.min(
        100,
        itemsInCat.length === 0
          ? 0
          : 50 + itemsInCat.length * 15 + (itemsInCat.some((i) => i.evidenceUrl) ? 10 : 0)
      );
      return {
        category: cat.key,
        count: itemsInCat.length,
        score: scoreInCat,
        summary:
          itemsInCat.length > 0
            ? `${itemsInCat.length} activity recorded: ${itemsInCat.map((i) => i.title).slice(0, 2).join(', ')}`
            : `No entries recorded yet in ${cat.name}.`
      };
    });

    // Synthesize qualitative findings
    const strongestContributions = [];
    const roleRelevantHighlights = [];
    const improvementAreas = [];
    const missingInformation = [];
    const resumeLinkedInPresentation = [];

    validItems.forEach((item) => {
      // Presentation tip
      const verb = (item.role || '').toLowerCase().includes('lead') ? 'Spearheaded' : 'Contributed to';
      const bullet = `${verb} ${item.title} ${item.organizer ? `organized by ${item.organizer}` : ''}: ${item.problemSolved || item.contribution || 'built solution'} resulting in ${item.impact || item.resultAward || 'successful project delivery'}.`;
      resumeLinkedInPresentation.push({
        achievementTitle: item.title,
        bulletSuggestion: bullet,
        linkedinTip: `Feature ${item.title} under your LinkedIn Projects or Honors section, linking ${item.evidenceUrl || 'a repository or live demo'}.`
      });

      if (['hackathons', 'open_source', 'projects'].includes(item.category)) {
        roleRelevantHighlights.push(
          `${item.title} demonstrates hands-on application of engineering skills relevant to ${targetRole}.`
        );
      }

      if (
        (item.resultAward || '').toLowerCase().includes('winner') ||
        (item.resultAward || '').toLowerCase().includes('1st') ||
        (item.role || '').toLowerCase().includes('lead')
      ) {
        strongestContributions.push(
          `${item.title}: Distinctive ${item.role || 'ownership'} with outcome "${item.resultAward || item.impact || 'successful execution'}".`
        );
      }
    });

    if (strongestContributions.length === 0 && validItems[0]) {
      strongestContributions.push(
        `Active participation in ${validItems[0].title} with demonstrated initiative.`
      );
    }

    if (itemsWithEvidence.length < validItems.length) {
      missingInformation.push(
        `${validItems.length - itemsWithEvidence.length} of your achievements lack supporting URLs (certificate, GitHub repo, or public proof).`
      );
    }

    if (!validItems.some((v) => v.category === 'hackathons')) {
      improvementAreas.push('No hackathon participation recorded. Hackathons are heavily weighted by campus placement interviewers.');
    }
    if (!validItems.some((v) => v.category === 'open_source')) {
      improvementAreas.push('No open-source contributions logged. Public pull requests demonstrate asynchronous collaboration and code hygiene.');
    }
    if (!validItems.some((v) => v.category === 'leadership')) {
      improvementAreas.push('No leadership or society positions logged. Student club leadership demonstrates communication and project management.');
    }

    return {
      overallScore,
      baseline: false,
      dimensionScores: {
        relevance: {
          score: relevanceScore,
          max: 25,
          weightPercent: 25,
          feedback: `Evaluates how closely your co-curriculars align with ${targetRole} competencies.`
        },
        contribution: {
          score: contribScore,
          max: 20,
          weightPercent: 20,
          feedback: 'Measures personal ownership, leadership roles, and technical initiative taken in each activity.'
        },
        outcomes: {
          score: outcomesScore,
          max: 20,
          weightPercent: 20,
          feedback: 'Assesses quantifiable impact, deployment, users served, or concrete project outcomes.'
        },
        achievementLevel: {
          score: achLevelScore,
          max: 15,
          weightPercent: 15,
          feedback: 'Recognizes competitive distinctions, awards, publications, and verified completion.'
        },
        consistency: {
          score: consistencyScore,
          max: 10,
          weightPercent: 10,
          feedback: 'Reflects sustained, multi-semester involvement across complementary technical and leadership domains.'
        },
        evidence: {
          score: evidenceScore,
          max: 10,
          weightPercent: 10,
          feedback: `${itemsWithEvidence.length} of ${validItems.length} activities contain supporting links or certificates.`
        }
      },
      categoryBreakdown,
      strongestContributions,
      roleRelevantHighlights: roleRelevantHighlights.slice(0, 3),
      improvementAreas: improvementAreas.slice(0, 3),
      missingInformation,
      resumeLinkedInPresentation: resumeLinkedInPresentation.slice(0, 4),
      actionPlan30Days: [
        'Document all unverified achievements with public certificate or repository links.',
        'Convert existing project experiences into STAR-format (Situation, Task, Action, Result) resume bullet points.',
        'Prepare a 2-minute elevator pitch for your primary co-curricular achievement for technical interviews.'
      ],
      actionPlan60Days: [
        'Select one missing co-curricular category (e.g. Open Source or Hackathons) and execute 1 tangible initiative.',
        'Take on mentorship or leadership in an upcoming campus technical workshop.',
        'Retake this assessment to refresh your Placement Readiness Score.'
      ]
    };
  }

  _getKeywordsForRole(role = '') {
    const r = role.toLowerCase();
    if (r.includes('frontend') || r.includes('ui')) {
      return ['react', 'vue', 'javascript', 'typescript', 'css', 'ui', 'frontend', 'web'];
    }
    if (r.includes('backend') || r.includes('api')) {
      return ['node', 'express', 'python', 'java', 'sql', 'database', 'api', 'docker', 'backend'];
    }
    if (r.includes('ai') || r.includes('ml') || r.includes('data')) {
      return ['python', 'machine learning', 'ai', 'data', 'pytorch', 'model', 'analysis', 'sql'];
    }
    return ['software', 'programming', 'code', 'web', 'algorithm', 'system', 'developer', 'engineering'];
  }
}

module.exports = new AchievementScoringService();
