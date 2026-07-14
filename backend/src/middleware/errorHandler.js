const { logger } = require('../utils/logger');

/**
 * 404 handler for undefined routes.
 * Preserved from original server.
 */
function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    error_code: 'NOT_FOUND',
  });
}

/**
 * Global error handler.
 * Migrated from original server — updated for MongoDB error types.
 * 
 * Changes:
 * - MySQL ER_DUP_ENTRY → MongoDB error code 11000
 * - Added Mongoose ValidationError and CastError handling
 */
function globalErrorHandler(err, req, res, next) {
  // Log the error
  logger.error(`${err.statusCode || 500} - ${err.message}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // Handle validation errors from express-validator
  if (err.errors && err.statusCode === 400) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors: err.errors,
      error_code: 'VALIDATION_ERROR',
    });
  }

  // Handle known operational errors (AppError and subclasses)
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error_code: err.errorCode,
      ...(err.errors && { errors: err.errors }),
    });
  }

  // Handle MongoDB duplicate key error (replaces MySQL ER_DUP_ENTRY)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0];
    return res.status(409).json({
      success: false,
      message: field
        ? `A record with this ${field} already exists.`
        : 'A record with this information already exists.',
      error_code: 'CONFLICT',
    });
  }

  // Handle Mongoose ValidationError
  if (err.name === 'ValidationError' && err.errors) {
    const formattedErrors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
      value: e.value,
    }));
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors: formattedErrors,
      error_code: 'VALIDATION_ERROR',
    });
  }

  // Handle Mongoose CastError (invalid ObjectId, etc.)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid ${err.path}: ${err.value}`,
      error_code: 'INVALID_ID',
    });
  }

  // Unknown errors — don't leak details in production
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred.',
    error_code: 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

module.exports = { notFoundHandler, globalErrorHandler };
