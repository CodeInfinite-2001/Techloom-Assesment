const authService = require('../services/authService');

/**
 * Middleware: Require a valid Bearer token
 */
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please provide a valid Bearer token.',
    });
  }

  const token = authHeader.split(' ')[1];
  const payload = authService.verifyToken(token);

  if (!payload) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired session token. Please log in again.',
    });
  }

  req.user = payload;
  next();
};

/**
 * Middleware: Require Admin role
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Forbidden. Only administrators can perform this action.',
    });
  }
  next();
};

/**
 * Middleware: Optional authentication (attaches user if present)
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const payload = authService.verifyToken(token);
    if (payload) {
      req.user = payload;
    }
  }
  next();
};

module.exports = {
  requireAuth,
  requireAdmin,
  optionalAuth,
};
