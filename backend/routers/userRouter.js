const express = require('express');
const router = express.Router();
const userProfileController = require('../controllers/userProfileController');
const { requireAuth } = require('../middleware/auth');

router.post('/profile', requireAuth, userProfileController.upsertProfile);

module.exports = router;
