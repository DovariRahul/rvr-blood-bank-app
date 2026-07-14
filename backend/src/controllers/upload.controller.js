const { uploadToCloudinary, deleteFromCloudinary } = require('../services/cloudinary.service');
const { asyncHandler } = require('../utils/helpers');
const { AppError } = require('../utils/errors');
const { logger } = require('../utils/logger');

/**
 * POST /api/upload/medical-proof
 * Upload a medical proof document to Cloudinary.
 */
const uploadMedicalProof = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('No file uploaded. Please attach a medical proof document.', 400, 'VALIDATION_ERROR');
  }

  const result = await uploadToCloudinary(
    req.file.buffer,
    'lifelink/medical-proofs',
    req.file.mimetype === 'application/pdf' ? 'raw' : 'image'
  );

  logger.info(`Medical proof uploaded by user ${req.user._id}: ${result.publicId}`);

  res.status(201).json({
    success: true,
    data: {
      url: result.url,
      public_id: result.publicId,
    },
    message: 'Medical proof uploaded successfully.',
  });
});

/**
 * POST /api/upload/avatar
 * Upload a profile avatar to Cloudinary.
 */
const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('No file uploaded.', 400, 'VALIDATION_ERROR');
  }

  if (req.file.mimetype === 'application/pdf') {
    throw new AppError('Avatar must be an image (JPEG or PNG).', 400, 'VALIDATION_ERROR');
  }

  const result = await uploadToCloudinary(req.file.buffer, 'lifelink/avatars', 'image');

  // Update user avatar
  const User = require('../models/User');
  await User.findByIdAndUpdate(req.user._id, { avatar: result.url });

  logger.info(`Avatar uploaded by user ${req.user._id}: ${result.publicId}`);

  res.status(201).json({
    success: true,
    data: {
      url: result.url,
      public_id: result.publicId,
    },
    message: 'Avatar uploaded successfully.',
  });
});

/**
 * DELETE /api/upload/:publicId
 * Delete a file from Cloudinary.
 */
const deleteUpload = asyncHandler(async (req, res) => {
  const { publicId } = req.params;

  await deleteFromCloudinary(publicId);

  res.json({
    success: true,
    message: 'File deleted successfully.',
  });
});

module.exports = { uploadMedicalProof, uploadAvatar, deleteUpload };
