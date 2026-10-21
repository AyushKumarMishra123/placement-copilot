const express = require('express');
const router = express.Router();
const {
  analyzeGitHubProfile,
  getGitHubReviews,
  getGitHubReviewById
} = require('../controllers/githubController');
const { requireAuth } = require('../middleware/authMiddleware');

router.post('/analyze', requireAuth, analyzeGitHubProfile);
router.get('/reviews', requireAuth, getGitHubReviews);
router.get('/reviews/:reviewId', requireAuth, getGitHubReviewById);

module.exports = router;
