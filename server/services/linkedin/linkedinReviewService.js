const LinkedInReview = require('../../models/LinkedInReview');
const Profile = require('../../models/Profile');
const linkedinPdfParser = require('./linkedinPdfParser');
const linkedinScoringService = require('./linkedinScoringService');
const { getAIProvider } = require('../ai');

class LinkedInReviewService {
  /**
   * Validate LinkedIn Profile URL
   * @param {string} url
   * @returns {{ isValid: boolean, error?: string, username?: string }}
   */
  validateLinkedInUrl(url) {
    if (!url || typeof url !== 'string') {
      return { isValid: false, error: 'LinkedIn profile URL is required.' };
    }

    const trimmed = url.trim();
    // Validate LinkedIn URL structure: https://(www.)linkedin.com/in/{username}/?
    const linkedInRegex = /^https?:\/\/(www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)\/?(?:\?.*)?$/i;
    const match = trimmed.match(linkedInRegex);

    if (!match) {
      return {
        isValid: false,
        error: 'Invalid LinkedIn URL. Must be in the format: https://www.linkedin.com/in/username'
      };
    }

    return {
      isValid: true,
      username: match[2],
      cleanUrl: `https://www.linkedin.com/in/${match[2]}`
    };
  }

  /**
   * Analyze LinkedIn Profile from URL, PDF, or Manual Entry
   * @param {Object} params
   * @param {string} params.userId
   * @param {string} params.inputMethod - 'url' | 'pdf' | 'manual'
   * @param {string} [params.url]
   * @param {Buffer} [params.pdfBuffer]
   * @param {Object} [params.profileData]
   * @param {string} [params.targetRole]
   * @returns {Promise<Object>}
   */
  async analyzeProfile({
    userId,
    inputMethod,
    url,
    pdfBuffer,
    profileData = {},
    targetRole
  }) {
    // Determine effective target role (use parameter or user's saved Profile)
    let effectiveTargetRole = targetRole;
    if (!effectiveTargetRole) {
      const userProfile = await Profile.findOne({ userId });
      effectiveTargetRole = userProfile?.targetRole || 'Software Engineer';
    }

    let normalizedProfile = {
      fullName: '',
      headline: '',
      location: '',
      about: '',
      experience: [],
      projects: [],
      skills: [],
      education: [],
      certifications: [],
      featuredLinks: [],
      achievements: []
    };

    let validatedUrl = '';

    // Handle Input Source
    if (inputMethod === 'url') {
      const val = this.validateLinkedInUrl(url);
      if (!val.isValid) {
        const err = new Error(val.error);
        err.status = 400;
        throw err;
      }
      validatedUrl = val.cleanUrl;

      // LinkedIn enforces strict login walls and Cloudflare / bot protection on public profile views.
      // In compliance with platform terms and the prompt constraints, we must not perform unauthorized scraping.
      // If manual profileData was also provided alongside the URL, use it. Otherwise, return a transparent limitation instruction.
      const hasUserData =
        (profileData.headline && profileData.headline.trim()) ||
        (profileData.about && profileData.about.trim()) ||
        (Array.isArray(profileData.skills) && profileData.skills.length > 0) ||
        (Array.isArray(profileData.experience) && profileData.experience.length > 0);

      if (!hasUserData) {
        const limitationErr = new Error(
          'LinkedIn restricts automated unauthenticated access to public profiles. To evaluate your actual profile accurately without simulated or scraped data, please upload your LinkedIn Profile PDF ("More > Save to PDF" on LinkedIn) or paste your profile information.'
        );
        limitationErr.status = 422;
        limitationErr.code = 'LINKEDIN_AUTH_RESTRICTED';
        limitationErr.suggestedAction = 'USE_PDF_OR_MANUAL';
        throw limitationErr;
      }

      normalizedProfile = this._normalizeProfileData(profileData);
    } else if (inputMethod === 'pdf') {
      if (!pdfBuffer) {
        const err = new Error('PDF document buffer is required for PDF review.');
        err.status = 400;
        throw err;
      }
      normalizedProfile = await linkedinPdfParser.parse(pdfBuffer);
    } else if (inputMethod === 'manual') {
      if (!profileData || typeof profileData !== 'object') {
        const err = new Error('Profile details are required for manual review.');
        err.status = 400;
        throw err;
      }
      normalizedProfile = this._normalizeProfileData(profileData);
    } else {
      const err = new Error('Invalid inputMethod. Must be "url", "pdf", or "manual".');
      err.status = 400;
      throw err;
    }

    // Verify that at least some profile content was obtained
    const hasAnyContent =
      (normalizedProfile.headline && normalizedProfile.headline.trim()) ||
      (normalizedProfile.about && normalizedProfile.about.trim()) ||
      (normalizedProfile.skills && normalizedProfile.skills.length > 0) ||
      (normalizedProfile.experience && normalizedProfile.experience.length > 0) ||
      (normalizedProfile.projects && normalizedProfile.projects.length > 0) ||
      (normalizedProfile.education && normalizedProfile.education.length > 0);

    if (!hasAnyContent) {
      const err = new Error(
        'No usable profile information was extracted from the submitted input. Please provide your profile text or upload a valid LinkedIn PDF.'
      );
      err.status = 400;
      throw err;
    }

    // 1. Calculate deterministic rubric scores (0-100)
    const { categoryScores, overallScore, missingSections } =
      linkedinScoringService.calculateRubricScores(normalizedProfile, effectiveTargetRole);

    // 2. Enhance with AI qualitative critique (grounded without hallucination)
    const aiProvider = getAIProvider();
    const qualitativeReview = await aiProvider.reviewLinkedInProfile({
      profileData: normalizedProfile,
      targetRole: effectiveTargetRole,
      categoryScores,
      overallScore,
      missingSections
    });

    // 3. Persist review record in database
    const reviewRecord = await LinkedInReview.create({
      userId,
      inputMethod,
      profileUrl: validatedUrl || normalizedProfile.profileUrl || '',
      targetRole: effectiveTargetRole,
      profileData: normalizedProfile,
      categoryScores,
      overallScore,
      strengths: qualitativeReview.strengths || [],
      weaknesses: qualitativeReview.weaknesses || [],
      sectionSuggestions: qualitativeReview.sectionSuggestions || [],
      missingSections,
      improvedHeadline: qualitativeReview.improvedHeadline || '',
      improvedAbout: qualitativeReview.improvedAbout || '',
      impactPresentationTips: qualitativeReview.impactPresentationTips || [],
      recommendedKeywords: qualitativeReview.recommendedKeywords || [],
      actionChecklist: qualitativeReview.actionChecklist || []
    });

    return reviewRecord;
  }

  /**
   * Get latest LinkedIn review for a user
   * @param {string} userId
   * @returns {Promise<Object|null>}
   */
  async getLatestReview(userId) {
    return LinkedInReview.findOne({ userId }).sort({ createdAt: -1 });
  }

  /**
   * Get review history for score progression
   * @param {string} userId
   * @returns {Promise<Array>}
   */
  async getReviewHistory(userId) {
    return LinkedInReview.find({ userId })
      .sort({ createdAt: -1 })
      .select('overallScore categoryScores inputMethod reviewedAt createdAt')
      .limit(10);
  }

  /**
   * Normalize user-submitted or parsed profile data
   * @param {Object} raw
   * @returns {Object}
   */
  _normalizeProfileData(raw) {
    return {
      fullName: (raw.fullName || '').trim(),
      headline: (raw.headline || '').trim(),
      location: (raw.location || '').trim(),
      about: (raw.about || '').trim(),
      experience: Array.isArray(raw.experience)
        ? raw.experience.map((e) => ({
            title: (e.title || '').trim(),
            company: (e.company || '').trim(),
            duration: (e.duration || '').trim(),
            description: (e.description || '').trim(),
            isCurrent: Boolean(e.isCurrent)
          }))
        : [],
      projects: Array.isArray(raw.projects)
        ? raw.projects.map((p) => ({
            name: (p.name || '').trim(),
            description: (p.description || '').trim(),
            techStack: Array.isArray(p.techStack)
              ? p.techStack.map((t) => t.trim()).filter(Boolean)
              : typeof p.techStack === 'string'
              ? p.techStack.split(',').map((t) => t.trim()).filter(Boolean)
              : [],
            link: (p.link || '').trim()
          }))
        : [],
      skills: Array.isArray(raw.skills)
        ? raw.skills.map((s) => s.trim()).filter(Boolean)
        : typeof raw.skills === 'string'
        ? raw.skills.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      education: Array.isArray(raw.education)
        ? raw.education.map((ed) => ({
            school: (ed.school || '').trim(),
            degree: (ed.degree || '').trim(),
            fieldOfStudy: (ed.fieldOfStudy || '').trim(),
            year: (ed.year || '').trim()
          }))
        : [],
      certifications: Array.isArray(raw.certifications)
        ? raw.certifications.map((c) => ({
            name: (c.name || '').trim(),
            issuer: (c.issuer || '').trim(),
            year: (c.year || '').trim(),
            url: (c.url || '').trim()
          }))
        : [],
      featuredLinks: Array.isArray(raw.featuredLinks)
        ? raw.featuredLinks.map((f) => ({
            title: (f.title || '').trim(),
            url: (f.url || '').trim()
          }))
        : [],
      achievements: Array.isArray(raw.achievements)
        ? raw.achievements.map((a) => a.trim()).filter(Boolean)
        : typeof raw.achievements === 'string'
        ? raw.achievements.split('\n').map((a) => a.trim()).filter(Boolean)
        : []
    };
  }
}

module.exports = new LinkedInReviewService();
