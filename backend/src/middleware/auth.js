const jwt = require('jsonwebtoken');
const { UnauthorizedError } = require('../utils/errors');
const User = require('../models/User');

/**
 * JWT authentication middleware.
 * Migrated from MySQL queryOne() to Mongoose User.findById().
 * Logic preserved from original server.
 */
async function authenticate(req, res, next) {
  try {
    let token = null;

    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      throw new UnauthorizedError('Authentication required. No token provided.');
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user from DB to ensure they still exist and are active
    const user = await User.findById(decoded.id).select(
      'fullName email phone role isVerified isActive bloodGroup'
    );

    if (!user) {
      throw new UnauthorizedError('User no longer exists.');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account has been deactivated. Contact support.');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new UnauthorizedError('Invalid token.'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Token expired. Please login again.'));
    }
    next(error);
  }
}

/**
 * Optional authentication — attaches user if token present, but doesn't block.
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select(
        'fullName email phone role isVerified isActive bloodGroup'
      );
      if (user && user.isActive) {
        req.user = user;
      }
    }
  } catch {
    // Ignore auth errors — user remains null
  }
  next();
}

module.exports = { authenticate, optionalAuth };
