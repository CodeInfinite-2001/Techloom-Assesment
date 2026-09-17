const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

// Public route: login for both user and admin
router.post('/login', (req, res, next) => authController.login(req, res, next));

// Authenticated route: get current user
router.get('/me', requireAuth, (req, res, next) => authController.getMe(req, res, next));

// Admin-only routes: register a new user & list all stored users
router.post('/users', requireAuth, requireAdmin, (req, res, next) =>
  authController.createUser(req, res, next)
);
router.get('/users', requireAuth, requireAdmin, (req, res, next) =>
  authController.listUsers(req, res, next)
);

module.exports = router;
