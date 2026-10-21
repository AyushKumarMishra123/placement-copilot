const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const codingController = require('../controllers/codingController');

const router = express.Router();

// Diagnostic health check for Judge0
router.get('/health', codingController.getCodingHealth);

// Require student/user authentication
router.use(requireAuth);

router.get('/problems', codingController.getActiveProblems);
router.get('/problems/:id', codingController.getProblemById);
router.post('/problems/:id/run', codingController.runSampleTests);
router.post('/problems/:id/submit', codingController.submitSolution);
router.get('/submissions', codingController.getUserSubmissions);
router.get('/stats', codingController.getUserCodingStats);

module.exports = router;
