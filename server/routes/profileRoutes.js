const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  deleteProfile,
  exportProfileData,
  deleteAccount
} = require('../controllers/profileController');
const { requireAuth } = require('../middleware/authMiddleware');

router.get('/', requireAuth, getProfile);
router.put('/', requireAuth, updateProfile);
router.delete('/', requireAuth, deleteProfile);
router.get('/export', requireAuth, exportProfileData);
router.delete('/account', requireAuth, deleteAccount);

module.exports = router;
