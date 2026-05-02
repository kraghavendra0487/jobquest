const express = require('express');
const router = express.Router();
const adminDBController = require('../controllers/adminDBController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.use(requireAuth);
router.use(requireAdmin);

router.get('/step1-output', adminDBController.listPipelineStep1Output);
router.get('/job-links', adminDBController.listPipelineJobLinks);
router.get('/companies', adminDBController.listPipelineCompanies);
router.get('/job-details', adminDBController.listPipelineJobDetails);
router.get('/company-details', adminDBController.listPipelineCompanyDetails);

module.exports = router;
