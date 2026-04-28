const express = require('express');
const router = express.Router();
const schoolController = require('../controllers/schoolController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Publicly available to authenticated users
router.get('/', requireAuth, schoolController.getSchools);

// Admin only routes
router.post('/admin', requireAuth, requireAdmin, schoolController.createSchool);
router.patch('/admin/:id', requireAuth, requireAdmin, schoolController.updateSchool);
router.delete('/admin/:id', requireAuth, requireAdmin, schoolController.deleteSchool);

module.exports = router;
