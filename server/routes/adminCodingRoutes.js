const express = require('express');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const adminCodingController = require('../controllers/adminCodingController');

const router = express.Router();

// Enforce authentication and strict administrator authorization
router.use(requireAuth);
router.use(requireRole('admin'));

router.get('/problems', adminCodingController.getAdminProblems);
router.post('/problems', adminCodingController.createProblem);
router.get('/problems/:id', adminCodingController.getAdminProblemById);
router.put('/problems/:id', adminCodingController.updateProblem);
router.delete('/problems/:id', adminCodingController.deleteProblem);

router.post('/problems/:id/validate', adminCodingController.validateProblem);
router.patch('/problems/:id/status', adminCodingController.toggleProblemStatus);

router.post('/problems/:id/testcases', adminCodingController.addTestCase);
router.put('/problems/:id/testcases/:tcId', adminCodingController.updateTestCase);
router.delete('/problems/:id/testcases/:tcId', adminCodingController.deleteTestCase);

module.exports = router;
