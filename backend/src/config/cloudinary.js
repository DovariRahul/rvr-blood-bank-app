const cloudinary = require('cloudinary').v2;
const { logger } = require('../utils/logger');

/**
 * Configure Cloudinary SDK for medical proof uploads.
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Verify configuration on startup
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
  logger.info('Cloudinary configured successfully.');
} else {
  logger.warn('Cloudinary credentials not configured. File uploads will fail.');
}

module.exports = cloudinary;
