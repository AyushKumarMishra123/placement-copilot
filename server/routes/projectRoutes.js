const express = require('express');
const router = express.Router();
const {
  getProjects,
  addProject,
  updateProject,
  deleteProject,
  analyzeProject,
  getProjectAnalysis,
  getProjectAnalysesHistory,
  checkProjectLiveLink,
  getProjectScreenshot
} = require('../controllers/projectController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/', getProjects);
router.post('/', addProject);
router.put('/:projectId', updateProject);
router.delete('/:projectId', deleteProject);
router.post('/:projectId/analyze', analyzeProject);
router.get('/:projectId/analysis', getProjectAnalysis);
router.get('/:projectId/analyses', getProjectAnalysesHistory);
router.post('/:projectId/check-live-link', checkProjectLiveLink);
router.get('/:projectId/screenshots/:screenshotId', getProjectScreenshot);

module.exports = router;
