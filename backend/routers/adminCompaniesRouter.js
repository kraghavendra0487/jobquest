const express = require('express');
const router = express.Router();
const adminCompaniesController = require('../controllers/adminCompaniesController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.use(requireAuth);
router.use(requireAdmin);

router.get('/merged-companies', adminCompaniesController.listMergedCompanies);
router.get('/company/:id', adminCompaniesController.getCompanyDetail);
router.patch('/company/:id/rating', adminCompaniesController.updateCompanyRating);
router.post('/company/:id/rate-with-ai', adminCompaniesController.rateCompanyWithAI);

module.exports = router;
