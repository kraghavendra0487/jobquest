const express = require('express');
const router = express.Router();
const aiAdminController = require('../controllers/aiAdminController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.use(requireAuth);
router.use(requireAdmin);

router.post('/playground', aiAdminController.playground);
router.post('/estimate', aiAdminController.estimate);

module.exports = router;
