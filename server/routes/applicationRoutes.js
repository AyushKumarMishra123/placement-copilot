const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const applicationController = require('../controllers/applicationController');

const router = express.Router();

// Require student authentication
router.use(requireAuth);

router.post('/', applicationController.createApplication);
router.get('/', applicationController.getApplications);
router.get('/:applicationId', applicationController.getApplicationById);
router.patch('/:applicationId', applicationController.updateApplication);
router.delete('/:applicationId', applicationController.deleteApplication);

module.exports = router;
