const authService = require('../services/authService');

class AuthController {
  /**
   * POST /api/auth/login
   */
  async login(req, res, next) {
    try {
      const { username, password } = req.body || {};
      const result = await authService.authenticate(username, password);
      return res.status(200).json({
        success: true,
        message: 'Authentication successful',
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/auth/me
   */
  async getMe(req, res, next) {
    try {
      return res.status(200).json({
        success: true,
        user: req.user,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/users (Admin only)
   */
  async createUser(req, res, next) {
    try {
      const { username, password, role, name } = req.body || {};
      const newUser = await authService.createUser({ username, password, role, name });
      return res.status(201).json({
        success: true,
        message: `User '${newUser.username}' registered successfully with role '${newUser.role}'`,
        user: newUser,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/auth/users (Admin only)
   */
  async listUsers(req, res, next) {
    try {
      const users = await authService.listUsers();
      return res.status(200).json({
        success: true,
        users,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();
