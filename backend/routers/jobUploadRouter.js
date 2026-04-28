const express = require('express');
const router = express.Router();
const multer = require('multer');
const jobUploadController = require('../controllers/jobUploadController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Multer config for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const ok = /\.(xlsx|xls)$/i.test(file.originalname);
    cb(ok ? null : new Error('Only .xlsx/.xls files are allowed'), ok);
  },
});

// All routes require admin
router.use(requireAuth, requireAdmin);

// Upload pipeline
router.post('/preview', upload.single('file'), jobUploadController.preview);
router.post('/:upload_id/save', jobUploadController.save);

// Management
router.get('/', jobUploadController.listUploads);
router.get('/master-jobs', jobUploadController.listJobs);
router.delete('/:upload_id', jobUploadController.deleteUpload);
router.delete('/purge-all', jobUploadController.purgeAll);

module.exports = router;
