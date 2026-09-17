/**
 * Centralized API Error Handling Middleware
 */
function errorHandler(err, req, res, next) {
  if (process.env.NODE_ENV !== 'test' || (err.statusCode && err.statusCode >= 500)) {
    console.error('[ErrorHandler] Error caught:', err.message || err);
  }

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: messages,
    });
  }

  // PostgreSQL / Database Duplicate Key Error (e.g., duplicate SKU, username, or idempotencyKey)
  if (err.code === '23505' || err.code === 11000) {
    const detail = err.detail || '';
    return res.status(409).json({
      success: false,
      message: detail || 'A record with this unique value already exists.',
      code: 'DUPLICATE_KEY_ERROR',
      detail,
    });
  }

  // Mongoose Invalid Field / ObjectId Cast
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid format for ${err.path || 'identifier'}: ${err.value}`,
      code: 'INVALID_FORMAT',
      field: err.path,
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    code: err.code || (statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : 'API_ERROR'),
    ...(err.productId && { productId: err.productId }),
    ...(err.orderStatus && { orderStatus: err.orderStatus }),
  });
}

module.exports = errorHandler;
