const multer = require('multer');
const { AppError } = require('../utils/errors');

/**
 * Multer middleware for file uploads.
 * Stores files in memory buffer (uploaded to Cloudinary from buffer).
 * 
 * Validates:
 * - File type: JPEG, PNG, PDF only
 * - File size: max 5MB
 */
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        'Invalid file type. Only JPEG, PNG, and PDF files are allowed.',
        400,
        'VALIDATION_ERROR'
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1,
  },
});

// Single file upload field name: 'medical_proof'
const uploadMedicalProof = upload.single('medical_proof');

// Single file upload for avatar
const uploadAvatar = upload.single('avatar');

module.exports = { uploadMedicalProof, uploadAvatar };
