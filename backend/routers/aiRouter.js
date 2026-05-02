const express = require('express');
const router = express.Router();
const aiAdminController = require('../controllers/aiAdminController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.use(requireAuth);
router.use(requireAdmin);

router.post('/playground', aiAdminController.playground);
router.post('/estimate', aiAdminController.estimate);
// Pipeline DB browser moved to AdminDBRouter (5 GET routes under /api/admin/database/)
// router.get('/pipeline-tables', aiAdminController.listPipelineTables);
// Company admin routes moved to adminCompaniesRouter → /api/admin/companies/*
// router.get('/merged-companies', aiAdminController.listMergedCompanies);
// Pipeline job routes moved to adminJobRouter → /api/admin/jobs/*
// router.get('/merged-jobs', aiAdminController.listMergedJobs);
// router.get('/job/:id', aiAdminController.getJobDetail);
// router.get('/company/:id', aiAdminController.getCompanyDetail);
// router.patch('/company/:id/rating', aiAdminController.updateCompanyRating);
// router.post('/company/:id/rate-with-ai', aiAdminController.rateCompanyWithAI);
// router.patch('/job/:id/rating', aiAdminController.updateJobRating);
// router.post('/job/:id/rate-with-ai', aiAdminController.rateJobWithAI);
// router.post('/jobs/bulk-approve', aiAdminController.bulkApproveJobs);
// router.post('/jobs/bulk-reject', aiAdminController.bulkRejectJobs);
// router.patch('/job/:id/approve', aiAdminController.approveJob);
// router.patch('/job/:id/reject', aiAdminController.rejectJob);

module.exports = router;
