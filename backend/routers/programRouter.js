const express = require('express');
const router = express.Router();
const programController = require('../controllers/programController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Publicly available to authenticated users
router.get('/', requireAuth, programController.getPrograms);

// Admin only routes
router.post('/admin', requireAuth, requireAdmin, programController.createProgram);
router.patch('/admin/:id', requireAuth, requireAdmin, programController.updateProgram);
router.delete('/admin/:id', requireAuth, requireAdmin, programController.deleteProgram);

module.exports = router;
