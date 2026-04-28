const express = require('express');
const router = express.Router();
const studentJobController = require('../controllers/studentJobController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/jobs', studentJobController.listStudentJobs);

module.exports = router;
