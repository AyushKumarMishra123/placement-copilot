const express = require('express');
const router = express.Router();
const {
  getReadiness,
  recalculateReadiness,
  getReadinessHistory,
  getReadinessById
} = require('../controllers/readinessController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/', getReadiness);
router.post('/recalculate', recalculateReadiness);
router.get('/history', getReadinessHistory);
router.get('/:assessmentId', getReadinessById);

module.exports = router;
