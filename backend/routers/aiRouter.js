// backend/routers/aiRouter.js 
const express = require('express'); 
const router = express.Router(); 
const aiAdminController = require('../controllers/aiAdminController'); 
const aiCompanyController = require('../controllers/aiCompanyController'); 
const aiJobController = require('../controllers/aiJobController'); 
const { requireAuth, requireAdmin } = require('../middleware/auth'); 
 
// All routes here require admin privileges
router.use(requireAuth); 
router.use(requireAdmin); 
 
// AI Utility & Playground
router.get('/preflight', aiAdminController.preflight); 
router.get('/pricing', aiAdminController.getPricing); 
router.post('/playground', aiAdminController.playground); 
router.post('/estimate', aiAdminController.estimate); 
 
// Batch Management
router.get('/batches', aiAdminController.listBatches); 
router.get('/batches/:id', aiAdminController.getBatch); 
router.post('/batches/:id/cancel', aiAdminController.cancelBatch); 
 
// Core AI Operations
router.post('/companies/rate-batch', aiCompanyController.rateBatch); 
router.post('/companies/:id/rate-ai', aiCompanyController.rateSingle);
router.post('/jobs/categorize-batch', aiJobController.categorizeBatch); 
 
module.exports = router; 
