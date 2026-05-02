const express = require('express');
const router = express.Router();
const adminJobController = require('../controllers/adminJobController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.use(requireAuth);
router.use(requireAdmin);

router.get('/merged-jobs', adminJobController.listMergedJobs);
router.get('/job/:id', adminJobController.getJobDetail);
router.patch('/job/:id/rating', adminJobController.updateJobRating);
router.post('/job/:id/rate-with-ai', adminJobController.rateJobWithAI);
router.post('/jobs/bulk-approve', adminJobController.bulkApproveJobs);
router.post('/jobs/bulk-reject', adminJobController.bulkRejectJobs);
router.patch('/job/:id/approve', adminJobController.approveJob);
router.patch('/job/:id/reject', adminJobController.rejectJob);

module.exports = router;
