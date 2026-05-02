const express = require('express');
const router = express.Router();
const adminAllJobsController = require('../controllers/adminAllJobsController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.use(requireAuth);
router.use(requireAdmin);

router.get('/merged-jobs', adminAllJobsController.listMergedJobs);

module.exports = router;
