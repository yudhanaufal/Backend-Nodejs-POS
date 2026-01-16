const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// POST login
router.post('/login', authController.login);

// GET profile (protected)
router.get('/profile', authMiddleware, authController.profile);

module.exports = router;