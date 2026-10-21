const { GoogleGenerativeAI } = require('@google/generative-ai');
const AIReviewProvider = require('./AIReviewProvider');
const RuleOnlyProvider = require('./RuleOnlyProvider');

class GeminiProvider extends AIReviewProvider {
  constructor(apiKey = process.env.GEMINI_API_KEY, modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash') {
    super();
    this.apiKey = apiKey;
    this.modelName = modelName;
    this.fallbackProvider = new RuleOnlyProvider();

    if (this.apiKey) {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
    }
  }

  async reviewResume({ parsedResume, checks, score }) {
    if (!this.apiKey || !this.genAI) {
      return this.fallbackProvider.reviewResume({ parsedResume, checks, score });
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2
        }
      });

      const failedChecks = checks
        .filter((c) => c.status === 'fail' || c.status === 'warning')
        .map((c) => ({
          id: c.id,
          name: c.name,
          status: c.status,
          evidence: c.evidence,
          currentSuggestion: c.suggestion
        }));

      const prompt = `
You are a senior technical hiring manager reviewing an undergraduate engineering student's resume for campus placements.

Resume Details:
- Page Count: ${parsedResume.pageCount}
- Detected Technologies: ${JSON.stringify(parsedResume.sections?.skills?.allSkills || [])}
- Projects: ${JSON.stringify(
        (parsedResume.sections?.projects || []).map((p) => ({
          name: p.name,
          techStack: p.techStack,
          impact: p.impact,
          highlights: p.highlights
        }))
      )}
- Extracted Clean Text:
"""
${(parsedResume.cleanText || parsedResume.text || '').slice(0, 3000)}
"""

Deterministic Benchmark Check Failures / Warnings:
${JSON.stringify(failedChecks, null, 2)}

Calculated Deterministic Benchmark Score: ${score}/100

CRITICAL INSTRUCTIONS:
1. Do NOT hallucinate metrics, achievements, or project facts not present in the resume.
2. Produce specific, constructive, actionable feedback. Avoid generic advice like "Improve your resume".
3. For failed checks (especially project impact and phrasing), identify the specific project/bullet from the text and suggest concrete ways the student can rephrase with truthful metrics supported by their own experience.
4. Return a valid JSON object matching this schema:
{
  "strengths": ["string", "string"],
  "weaknesses": ["string", "string"],
  "recommendations": ["string", "string"],
  "summary": "string",
  "refinedSuggestions": {
    "CHECK_ID": "specific actionable fix without hallucinating metrics"
  }
}
`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const parsed = JSON.parse(text);

      return {
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 4) : [],
        weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses.slice(0, 4) : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.slice(0, 4) : [],
        summary: typeof parsed.summary === 'string' ? parsed.summary : '',
        refinedSuggestions: parsed.refinedSuggestions || {},
        provider: 'gemini'
      };
    } catch (err) {
      console.warn(`[GeminiProvider] Review generation failed: ${err.message}. Falling back to RuleEngine.`);
      const fallbackResult = await this.fallbackProvider.reviewResume({ parsedResume, checks, score });
      fallbackResult.fallbackReason = err.message;
      return fallbackResult;
    }
  }

  async generateInterviewQuestions(context) {
    if (!this.apiKey || !this.genAI) {
      return this.fallbackProvider.generateInterviewQuestions(context);
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.3
        }
      });

      const prompt = `
You are a senior technical interviewer conducting a mock placement interview for a candidate seeking a role as "${context.targetRole || 'Software Engineer'}".
Session Duration: ${context.durationMinutes || 15} minutes.
Focus Domain: ${context.focus || 'general software engineering'}.

Candidate Context:
- Skills: ${JSON.stringify(context.context?.skills || [])}
- Projects: ${JSON.stringify((context.context?.projects || []).slice(0, 3).map((p) => ({ name: p.name, techStack: p.techStack, desc: p.description })))}

Generate a personalized interview plan with exactly ${context.durationMinutes === 20 ? 6 : 5} questions containing:
1. Technical fundamentals for the target role/skills
2. Deep dive into the candidate's actual projects and design decisions
3. Applied problem-solving/debugging scenario
4. Behavioral / teamwork question

CRITICAL: Return valid JSON matching:
{
  "questions": [
    {
      "id": "Q1_TECH",
      "order": 1,
      "category": "technical",
      "prompt": "question string",
      "contextTarget": "skill or topic"
    }
  ],
  "planSummary": "1-2 sentence plan summary"
}
`;

      const result = await model.generateContent(prompt);
      const text = (await result.response).text();
      const parsed = JSON.parse(text);

      if (Array.isArray(parsed.questions) && parsed.questions.length >= 3) {
        return {
          questions: parsed.questions,
          planSummary: parsed.planSummary || 'Interview plan ready.',
          provider: 'gemini'
        };
      }
      throw new Error('AI returned insufficient question structure');
    } catch (err) {
      console.warn(`[GeminiProvider] Question generation fallback: ${err.message}`);
      return this.fallbackProvider.generateInterviewQuestions(context);
    }
  }

  async evaluateInterview(context) {
    if (!this.apiKey || !this.genAI) {
      return this.fallbackProvider.evaluateInterview(context);
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2
        }
      });

      const prompt = `
You are evaluating a candidate's completed text-based placement mock interview for "${context.targetRole || 'Software Engineer'}".
Evaluate the transcript strictly against this official 100-point rubric:
1. Technical accuracy and fundamentals (30%)
2. Project understanding (25%)
3. Problem-solving and reasoning (20%)
4. Communication and answer structure (15%)
5. HR/behavioral responses (10%)

Transcript:
${JSON.stringify(
  (context.transcript || []).map((t) => ({
    questionId: t.questionId,
    question: t.questionText,
    answer: t.skipped ? '[SKIPPED]' : t.answerText
  }))
)}

CRITICAL RULES:
- If a question was skipped or answered with few words, award 0 or low marks for that question.
- Do NOT hallucinate spoken tone or body language (this is a text interview).
- Provide evidence-based constructive feedback grounded in candidate's actual answers.
- Return valid JSON matching:
{
  "overallScore": number (0-100),
  "dimensions": [
    { "name": "Technical Accuracy & Fundamentals", "weight": 30, "score": number, "feedback": "string" },
    { "name": "Project Understanding & Architecture", "weight": 25, "score": number, "feedback": "string" },
    { "name": "Problem Solving & Debugging", "weight": 20, "score": number, "feedback": "string" },
    { "name": "Communication & Structure", "weight": 15, "score": number, "feedback": "string" },
    { "name": "HR & Behavioral Competencies", "weight": 10, "score": number, "feedback": "string" }
  ],
  "strengths": ["string", "string"],
  "weaknesses": ["string", "string"],
  "recommendations": ["string", "string"],
  "questionEvaluations": [
    { "questionId": "string", "category": "string", "score": number, "feedback": "string", "suggestedImprovement": "string" }
  ]
}
`;

      const result = await model.generateContent(prompt);
      const text = (await result.response).text();
      const parsed = JSON.parse(text);

      if (typeof parsed.overallScore === 'number' && Array.isArray(parsed.dimensions)) {
        return {
          ...parsed,
          overallScore: Math.min(100, Math.max(0, Math.round(parsed.overallScore))),
          provider: 'gemini'
        };
      }
      throw new Error('Malformed evaluation response from AI');
    } catch (err) {
      console.warn(`[GeminiProvider] Interview evaluation fallback: ${err.message}`);
      return this.fallbackProvider.evaluateInterview(context);
    }
  }

  async reviewLinkedInProfile(context) {
    if (!this.apiKey || !this.genAI) {
      return this.fallbackProvider.reviewLinkedInProfile(context);
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2
        }
      });

      const { profileData, targetRole, categoryScores, overallScore, missingSections } = context;

      const prompt = `
You are a senior tech recruiter reviewing an undergraduate engineer's LinkedIn profile for ${targetRole} campus placements.
Profile Details:
- Target Role: ${targetRole}
- Current Headline: "${profileData.headline || ''}"
- About: "${profileData.about || ''}"
- Skills: ${JSON.stringify(profileData.skills || [])}
- Experience: ${JSON.stringify(profileData.experience || [])}
- Projects: ${JSON.stringify(profileData.projects || [])}
- Education: ${JSON.stringify(profileData.education || [])}
- Missing Sections: ${JSON.stringify(missingSections || [])}
- Category Scores (0-100 rubric): ${JSON.stringify(categoryScores || {})}

Rules:
1. Base feedback STRICTLY on the actual details provided. Do NOT fabricate experience, skills, metrics, or education.
2. Provide exactly 3 specific strengths and 3 specific weaknesses.
3. Generate an improved headline tailored to the candidate's actual skills and target role.
4. Generate an improved About section based only on the candidate's actual details.
5. Provide actionable section suggestions with concrete examples.
6. Return valid JSON matching:
{
  "strengths": ["string", "string", "string"],
  "weaknesses": ["string", "string", "string"],
  "sectionSuggestions": [
    { "section": "string", "issue": "string", "suggestion": "string", "example": "string" }
  ],
  "improvedHeadline": "string",
  "improvedAbout": "string",
  "impactPresentationTips": ["string", "string", "string"],
  "recommendedKeywords": ["string"],
  "actionChecklist": [
    { "id": "string", "task": "string", "priority": "high"|"medium"|"low", "completed": boolean }
  ]
}
`;

      const result = await model.generateContent(prompt);
      const text = (await result.response).text();
      const parsed = JSON.parse(text);

      if (Array.isArray(parsed.strengths) && Array.isArray(parsed.weaknesses) && parsed.improvedHeadline) {
        return {
          ...parsed,
          provider: 'gemini'
        };
      }
      throw new Error('Malformed LinkedIn review response from Gemini');
    } catch (err) {
      console.warn(`[GeminiProvider] LinkedIn review fallback: ${err.message}`);
      return this.fallbackProvider.reviewLinkedInProfile(context);
    }
  }

  async evaluateCoCurricularAchievements(context) {
    if (!this.apiKey || !this.genAI) {
      return this.fallbackProvider.evaluateCoCurricularAchievements(context);
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2
        }
      });

      const prompt = `
You are a campus placement coach. Suggest next co-curricular activities appropriate to the candidate's current skill level for ${context.targetRole}.
Achievements: ${JSON.stringify(context.achievements || [])}
Return valid JSON:
{
  "recommendedActivities": [
    { "title": "string", "category": "hackathons"|"leadership"|"open_source"|"projects"|"certifications"|"extracurricular", "rationale": "string", "timeline": "string", "status": "recommended" }
  ]
}
`;
      const result = await model.generateContent(prompt);
      const text = (await result.response).text();
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed.recommendedActivities)) {
        return {
          ...parsed,
          provider: 'gemini'
        };
      }
      throw new Error('Malformed achievements response from Gemini');
    } catch (err) {
      console.warn(`[GeminiProvider] Achievements evaluation fallback: ${err.message}`);
      return this.fallbackProvider.evaluateCoCurricularAchievements(context);
    }
  }
}

module.exports = GeminiProvider;

