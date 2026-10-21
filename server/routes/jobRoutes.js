const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const jobController = require('../controllers/jobController');

const router = express.Router();

// Require student authentication to access search with personalized match scores
router.use(requireAuth);

router.get('/', jobController.getJobs);
router.get('/search', jobController.searchJobs);
router.get('/recommended', jobController.getRecommendedJobs);
router.get('/sources/status', jobController.getSourceStatus);
router.post('/refresh-sources', jobController.refreshSources);
router.get('/:jobId', jobController.getJobById);

module.exports = router;
