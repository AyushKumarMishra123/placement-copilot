const express = require('express');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const adminJobController = require('../controllers/adminJobController');

const router = express.Router();

// Enforce authentication and strict administrator role authorization
router.use(requireAuth);
router.use(requireRole('admin'));

router.post('/', adminJobController.createAdminJob);
router.get('/', adminJobController.getAdminJobs);
router.get('/:jobId', adminJobController.getAdminJobById);
router.put('/:jobId', adminJobController.updateAdminJob);
router.patch('/:jobId/publish', adminJobController.togglePublishJob);
router.delete('/:jobId', adminJobController.deleteAdminJob);

router.get('/:jobId/applicants', adminJobController.getJobApplicants);
router.patch('/:jobId/applicants/:applicationId/status', adminJobController.updateApplicantStatus);

module.exports = router;
