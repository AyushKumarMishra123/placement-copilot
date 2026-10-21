const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const achievementController = require('../controllers/achievementController');

const router = express.Router();

// All achievement routes require authentication
router.use(requireAuth);

router.post('/assess', achievementController.assessAchievements);
router.get('/latest', achievementController.getLatestAssessment);
router.get('/history', achievementController.getAssessmentHistory);

module.exports = router;
