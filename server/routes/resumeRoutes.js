const express = require('express');
const router = express.Router();
const {
  uploadResume,
  getResumes,
  getResumeById,
  getResumeReview,
  getResumeReviewsHistory,
  reReviewResume,
  deleteResume
} = require('../controllers/resumeController');
const { requireAuth } = require('../middleware/authMiddleware');
const { handleResumeUpload } = require('../middleware/uploadMiddleware');

router.post('/', requireAuth, handleResumeUpload, uploadResume);
router.get('/', requireAuth, getResumes);
router.get('/:id', requireAuth, getResumeById);
router.get('/:id/review', requireAuth, getResumeReview);
router.get('/:id/reviews', requireAuth, getResumeReviewsHistory);
router.post('/:id/re-review', requireAuth, reReviewResume);
router.delete('/:id', requireAuth, deleteResume);

module.exports = router;
