const cloudinary = require('../config/cloudinary');
const { logger } = require('../utils/logger');

/**
 * Upload a file buffer to Cloudinary.
 * 
 * @param {Buffer} buffer - File buffer from multer
 * @param {string} folder - Cloudinary folder path (e.g., 'lifelink/medical-proofs')
 * @param {string} resourceType - 'image' or 'raw' (for PDFs)
 * @returns {Object} { url, publicId }
 */
async function uploadToCloudinary(buffer, folder = 'lifelink/medical-proofs', resourceType = 'auto') {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
        max_bytes: 5 * 1024 * 1024, // 5MB
        transformation: resourceType === 'image' ? [{ quality: 'auto', fetch_format: 'auto' }] : undefined,
      },
      (error, result) => {
        if (error) {
          logger.error('Cloudinary upload error:', error.message);
          return reject(error);
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    stream.end(buffer);
  });
}

/**
 * Delete a file from Cloudinary by public ID.
 */
async function deleteFromCloudinary(publicId, resourceType = 'image') {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    logger.info(`Cloudinary file deleted: ${publicId}, result: ${result.result}`);
    return result;
  } catch (error) {
    logger.error(`Failed to delete Cloudinary file ${publicId}:`, error.message);
    throw error;
  }
}

module.exports = { uploadToCloudinary, deleteFromCloudinary };
