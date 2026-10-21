const GitHubReview = require('../models/GitHubReview');
const Profile = require('../models/Profile');
const githubProfileService = require('../services/github/githubProfileService');
const githubAnalysisService = require('../services/github/githubAnalysisService');
const { getAIProvider } = require('../services/ai');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * Run GitHub profile analysis
 * POST /api/github/analyze
 */
const analyzeGitHubProfile = async (req, res, next) => {
  try {
    const { username } = req.body;
    if (!username) {
      return errorResponse(res, 'GitHub username or profile URL is required.', 'MISSING_FIELD', 400);
    }

    // 1. Fetch public profile, repos, and events
    const profilePayload = await githubProfileService.fetchUserProfile(username);

    // 2. Save GitHub username to student's profile if not already set
    await Profile.findOneAndUpdate(
      { userId: req.user.id },
      { $set: { github: profilePayload.username } },
      { new: true, upsert: true }
    );

    // 3. Run deterministic profile analysis
    const { score, findings } = githubAnalysisService.analyzeProfile(profilePayload);

    // 4. Qualitative AI Review
    let aiSynthesis = {
      strengths: [],
      weaknesses: [],
      recommendations: [],
      summary: ''
    };

    try {
      const aiProvider = getAIProvider();
      // Provide bounded context
      const promptContext = {
        username: profilePayload.username,
        score,
        bio: profilePayload.profileSnapshot.bio,
        hasProfileReadme: profilePayload.profileSnapshot.hasProfileReadme,
        repoCount: profilePayload.profileSnapshot.publicRepos,
        repos: profilePayload.repositories.slice(0, 5).map((r) => ({
          name: r.name,
          desc: r.description,
          lang: r.language,
          stars: r.stars
        })),
        findings: findings.map((f) => ({ id: f.id, status: f.status, evidence: f.evidence }))
      };

      if (aiProvider.generateGitHubSynthesis) {
        aiSynthesis = await aiProvider.generateGitHubSynthesis(promptContext);
      } else {
        // Fallback rule synthesis
        const passFindings = findings.filter((f) => f.status === 'pass').map((f) => f.title);
        const issueFindings = findings.filter((f) => f.status !== 'pass').map((f) => f.suggestedAction);

        aiSynthesis = {
          strengths: passFindings.length > 0 ? passFindings : ['Public GitHub account linked.'],
          weaknesses: findings.filter((f) => f.status === 'fail').map((f) => f.title),
          recommendations: issueFindings.length > 0 ? issueFindings.slice(0, 3) : ['Continue publishing active project repositories.'],
          summary: `GitHub profile analysis score: ${score}/100. ${profilePayload.profileSnapshot.publicRepos} public repositories evaluated.`
        };
      }
    } catch (aiErr) {
      console.warn('[GitHubController] AI Synthesis fallback:', aiErr.message);
      aiSynthesis = {
        strengths: ['Public GitHub account established.'],
        weaknesses: [],
        recommendations: findings.filter((f) => f.status !== 'pass').map((f) => f.suggestedAction).slice(0, 3),
        summary: `GitHub profile analysis score: ${score}/100.`
      };
    }

    // 5. Store Review Record in MongoDB
    const review = await GitHubReview.create({
      userId: req.user.id,
      username: profilePayload.username,
      profileUrl: profilePayload.profileUrl,
      score,
      profileSnapshot: profilePayload.profileSnapshot,
      findings,
      repositories: profilePayload.repositories,
      aiSynthesis
    });

    return successResponse(res, { review }, 'GitHub profile analyzed successfully.', 201);
  } catch (error) {
    if (error.name === 'GitHubClientError') {
      return errorResponse(res, error.message, error.code, error.status);
    }
    next(error);
  }
};

/**
 * Get all previous GitHub reviews for authenticated student
 * GET /api/github/reviews
 */
const getGitHubReviews = async (req, res, next) => {
  try {
    const reviews = await GitHubReview.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .select('-repositories');

    return successResponse(res, { reviews });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single GitHub review by ID
 * GET /api/github/reviews/:reviewId
 */
const getGitHubReviewById = async (req, res, next) => {
  try {
    const review = await GitHubReview.findOne({
      _id: req.params.reviewId,
      userId: req.user.id
    });

    if (!review) {
      return errorResponse(res, 'GitHub review not found or unauthorized.', 'REVIEW_NOT_FOUND', 404);
    }

    return successResponse(res, { review });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  analyzeGitHubProfile,
  getGitHubReviews,
  getGitHubReviewById
};
