const express = require('express');
const multer = require('multer');
const { requireAuth } = require('../middleware/authMiddleware');
const linkedinController = require('../controllers/linkedinController');

const router = express.Router();

// Configure memory storage for multer with 10MB limit and PDF filter
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF documents are allowed.'), false);
    }
  }
});

// All LinkedIn routes require authentication
router.use(requireAuth);

router.post('/analyze', linkedinController.analyzeProfile);
router.post('/upload-pdf', upload.single('file'), linkedinController.uploadPdfAndAnalyze);
router.get('/latest', linkedinController.getLatestReview);
router.get('/history', linkedinController.getReviewHistory);

module.exports = router;
