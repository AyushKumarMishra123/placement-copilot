const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const interviewController = require('../controllers/interviewController');

const router = express.Router();

// All interview endpoints require authenticated student identity
router.use(requireAuth);

router.post('/', interviewController.startInterview);
router.get('/', interviewController.getInterviews);
router.get('/:id', interviewController.getInterviewById);

router.post('/:id/answer', interviewController.submitAnswer);
router.post('/:id/skip', interviewController.skipQuestion);
router.post('/:id/complete', interviewController.completeInterview);
router.post('/:id/evaluate', interviewController.retryEvaluation);

module.exports = router;
