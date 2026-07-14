const rateLimit = require('express-rate-limit');

/**
 * Rate limiters — preserved from original server.
 */

// General API rate limiter: 100 requests per 15 minutes per IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again in 15 minutes.',
    error_code: 'RATE_LIMITED',
  },
});

// Auth limiter: 20 requests per 15 minutes per IP (stricter for auth)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again in 15 minutes.',
    error_code: 'RATE_LIMITED',
  },
});

// Upload limiter: 10 uploads per 15 minutes
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many upload attempts. Please try again later.',
    error_code: 'RATE_LIMITED',
  },
});

module.exports = { generalLimiter, authLimiter, uploadLimiter };
